# Negozio online: Supabase self-hosted + Stripe + stampa automatica

Come funziona un ordine:

```
Cliente su printbadge.com ── progetta, carica le persone, sceglie prodotto e accessori
        │  1. il sito genera i PDF dei badge (300 dpi, formato esatto) e li carica nel bucket privato "order-files"
        │  2. chiama la funzione create-checkout: il prezzo viene ricalcolato dal server
        ▼
Stripe Checkout ── il cliente paga e inserisce l'indirizzo di spedizione
        │  3. Stripe chiama la funzione stripe-webhook (firma verificata) → ordine "paid"
        ▼
Agente di stampa sul computer collegato alla stampante
        │  4. ogni 10 secondi prende il primo ordine pagato, scarica i PDF e li stampa con il driver
        ▼
Ordine "printed" → lo spedisci e lo segni "shipped"
```

Stati di un ordine: `pending` (in attesa di pagamento) → `paid` (in coda) → `printing` → `printed` → `shipped`.
In caso di problemi: `print_error`, `expired`, `payment_failed`, `cancelled`.

---

## 1. Database (una volta sola)

In Supabase Studio apri **SQL Editor**, incolla tutto [`supabase/migrations/20261101120000_shop.sql`](../supabase/migrations/20261101120000_shop.sql) ed esegui.

Crea:
- le tabelle `products`, `shop_settings` e `orders`;
- il bucket privato `order-files`, dove il sito può solo caricare file nuovi, senza leggerli;
- la funzione `claim_next_order` (coda di stampa senza doppioni);
- la funzione `get_order_status` per la pagina di conferma.

**I prezzi inseriti sono di esempio.** Cambiali in Studio → Table editor → `products`:
- `tiers` è la lista degli scaglioni, per esempio `[{"min":1,"unit_cents":490},{"min":10,"unit_cents":290}]` vuol dire 4,90 € fino a 9 badge e 2,90 € da 10 in su;
- gli accessori (laccio, porta badge) usano `unit_cents`;
- il prodotto fronte/retro è disattivato (`active = false`) perché la Badgy100 stampa solo il fronte. Attivalo se compri una stampante fronte/retro.

In `shop_settings` imposti:
- spedizione (`shipping_cents`) e soglia di spedizione gratuita (`free_shipping_from_cents`, vuoto = mai gratuita);
- massimo di badge per ordine;
- paesi in cui spedisci;
- `orders_open`: mettilo a `false` per chiudere temporaneamente gli ordini.

## 2. Edge Functions

1. Copia le cartelle `supabase/functions/_shared`, `supabase/functions/create-checkout` e `supabase/functions/stripe-webhook` dentro `volumes/functions/` della tua installazione self-hosted (accanto a `main`).
2. Nel `docker-compose.yml`, servizio `functions`, aggiungi a `environment:`:
   ```yaml
   STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
   STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
   SITE_URL: https://printbadge.com
   ```
   e metti i valori nel file `.env` di Supabase.
3. Sempre nel `.env` imposta `FUNCTIONS_VERIFY_JWT=false`. Stripe non può inviare il token di Supabase: le due funzioni controllano da sole input e firma del webhook.
4. Riavvia il servizio:
   ```bash
   docker compose up -d functions
   ```

Le funzioni rispondono a `https://IL-TUO-SUPABASE/functions/v1/create-checkout` e `…/stripe-webhook`.

## 3. Stripe

1. Parti in **modalità test**: chiave `sk_test_…` in `STRIPE_SECRET_KEY`.
2. Dashboard Stripe → **Developers → Webhooks → Add endpoint**:
   - URL: `https://IL-TUO-SUPABASE/functions/v1/stripe-webhook`;
   - eventi: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`.
3. Copia il **Signing secret** (`whsec_…`) in `STRIPE_WEBHOOK_SECRET` e riavvia `functions`.
4. Per mandare la ricevuta al cliente: Dashboard → Settings → Emails → *Successful payments*.
5. Fai un ordine di prova con la carta `4242 4242 4242 4242` (qualsiasi data futura e CVC). Quando tutto funziona, sostituisci le chiavi con quelle live.

Le chiavi segrete restano solo sul server Supabase: nel sito c'è solo la chiave pubblica `anon`.

## 4. Sito printbadge.com

Su **Dokploy** imposti queste variabili nell'*Environment* del servizio WEB. Il container le legge all'avvio, quindi non serve ricompilare (vedi [DOKPLOY.md](DOKPLOY.md)):

| Variabile | Valore |
| --- | --- |
| `SUPABASE_URL` | indirizzo pubblico del tuo Supabase |
| `SUPABASE_ANON_KEY` | chiave **anon** (mai la service_role) |
| `TERMS_URL` | pagina delle condizioni di vendita |
| `PRIVACY_URL` | pagina dell'informativa privacy |

Se invece pubblichi la cartella `dist/` su un hosting statico, passa gli stessi valori al build con il prefisso `VITE_` (vedi [`.env.example`](../.env.example)).

Senza queste variabili il sito resta un editor con stampa in proprio, senza negozio.

## 5. Agente di stampa (computer in ufficio)

Requisiti:
- computer sempre acceso con il **driver ufficiale** della stampante installato;
- Node.js 20 o più recente.

Funziona su macOS e Linux con CUPS. Su Windows serve anche SumatraPDF.

```bash
cd agent
npm install
cp .env.example .env      # poi compila .env
npm run printers          # elenca i nomi delle stampanti installate
```

Nel file `.env` imposta:
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Questa chiave è segreta: lasciala solo su questo computer.
- `PRINTER_NAME`, per esempio `EVOLIS_Badgy100`.
- Le opzioni del driver. Per la Badgy100 vanno già bene quelle dell'esempio: `PageSize=Card` e `Orientation`. Per un'altra stampante le vedi con:
  ```bash
  lpoptions -p NOME -l
  ```

Prima prova senza sprecare card:

```bash
DRY_RUN=true npm run once   # prende un ordine pagato e mostra il comando di stampa
npm start                   # avvio normale: resta in ascolto
```

**Avvio automatico su macOS:**
1. Modifica i percorsi in [`agent/com.printbadge.agent.plist`](../agent/com.printbadge.agent.plist).
2. Esegui:
   ```bash
   cp agent/com.printbadge.agent.plist ~/Library/LaunchAgents/
   launchctl load ~/Library/LaunchAgents/com.printbadge.agent.plist
   ```
3. I log finiscono in `agent/agent.log`.

**Su Windows:** installa SumatraPDF e avvia `npm start` con l'Utilità di pianificazione all'accesso.

Se l'agente si ferma durante una stampa, al riavvio segna quell'ordine come `print_error` invece di ristamparlo da solo. Controlli le card e rimetti lo stato a `paid` per ristampare.

## 6. Gestione quotidiana

Tutto da Supabase Studio → Table editor → `orders`:
- **da spedire:** filtra `status = printed`; l'indirizzo è in `shipping_address`. Dopo la spedizione imposta `status = shipped`.
- **errori di stampa:** filtra `status = print_error` e leggi `print_error`. Per ristampare rimetti `status = paid`.
- **file dell'ordine:** bucket `order-files`. Ci trovi il PDF stampato, l'anteprima e `project.json`, che si apre con *File → Apri progetto* e serve per ristampe o modifiche.

## Da completare prima di andare online

- **Condizioni di vendita e informativa privacy.** Il negozio salva nomi, email, foto e indirizzi: serve un'informativa GDPR adeguata, e le condizioni devono indicare che i prodotti personalizzati sono esclusi dal recesso. Falle verificare da un consulente.
- **Dati dell'attività** (ragione sociale, partita IVA) nel footer del sito e in Stripe.
- **Pulizia periodica dei file** degli ordini non pagati (`pending`/`expired`) nel bucket `order-files`.

## Prova in locale

Nella cartella del progetto c'è una configurazione Supabase locale (porte 58421–58429), avviabile con:
```bash
supabase start
```
I pagamenti si simulano con `stripe/stripe-mock`. Vedi `supabase/functions/.env`, che contiene solo valori di prova.
