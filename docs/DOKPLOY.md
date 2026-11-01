# Pubblicazione su Dokploy

Nel progetto **PRINTBADGE / production** servono due servizi:

| Servizio | Tipo | Cosa fa |
| --- | --- | --- |
| `WEB` | Application (Dockerfile) | il sito printbadge.com, servito da Nginx sulla porta 80 |
| `supabase` | Compose (template Supabase) | database, file degli ordini, Edge Functions per Stripe |

L'**agente di stampa** non va su Dokploy: deve girare sul computer collegato alla stampante, in ufficio (vedi [NEGOZIO.md](NEGOZIO.md#5-agente-di-stampa-computer-in-ufficio)).

---

## 1. Servizio WEB

1. **General → Provider:** GitHub.
   - Repository: `Alessiolucini/printbadge`.
   - Branch: `main`.
   - Build Path: `/`.
   - Se Dokploy non vede il repository, collega prima GitHub in *Settings → Git*.
2. **Build Type:** `Dockerfile`.
   - Docker File: `Dockerfile`.
   - Docker Context Path: `.`.
   - Build Stage: lascia vuoto.
3. **Environment:** queste sono variabili lette all'**avvio** del container. Se le cambi basta un *Redeploy*, non serve ricompilare.
   ```env
   SUPABASE_URL=https://supabase.printbadge.com
   SUPABASE_ANON_KEY=la-chiave-ANON_KEY-del-servizio-supabase
   TERMS_URL=https://printbadge.com/condizioni.html
   PRIVACY_URL=https://printbadge.com/privacy.html
   ```
   Usa la chiave **anon** (pubblica), mai la `SERVICE_ROLE_KEY`. Finché `SUPABASE_URL` è vuota il sito funziona come editor senza negozio.
4. **Domains:**
   - aggiungi `printbadge.com`: *Container Port* `80`, *HTTPS* attivo, certificato *Let's Encrypt*;
   - ripeti per `www.printbadge.com`.
5. **Deploy.** Nei log di avvio deve comparire `printbadge: negozio collegato a https://…`.
6. Attiva **Auto Deploy**: a ogni push su `main` Dokploy ricostruisce il sito.

Controllo rapido: `https://printbadge.com/healthz` deve rispondere `ok`.

## 2. DNS di printbadge.com

Nel pannello del registrar:

| Tipo | Nome | Valore |
| --- | --- | --- |
| A | `@` | IP del server Dokploy |
| A | `www` | IP del server Dokploy |
| A | `supabase` | IP del server Dokploy (per l'API di Supabase) |

Non usare i record di GitHub Pages (185.199.108–111.153): il sito ora è servito da Dokploy.

## 3. Servizio supabase

1. **Domini:** l'API (servizio `kong`, porta `8000`) deve avere un dominio pubblico con HTTPS, per esempio `supabase.printbadge.com`. Lo stesso indirizzo va nelle variabili del template:
   - `SUPABASE_PUBLIC_URL` e `API_EXTERNAL_URL` = `https://supabase.printbadge.com`;
   - `SITE_URL` = `https://printbadge.com`.
2. **Database:** apri Studio, vai in *SQL Editor* e incolla ed esegui [`supabase/migrations/20261101120000_shop.sql`](../supabase/migrations/20261101120000_shop.sql).
3. **Edge Functions.** Nel compose del template, il servizio `functions` monta una cartella del server, per esempio `../files/volumes/functions:/home/deno/functions`. La trovi sul server sotto `/etc/dokploy/compose/<nome-del-servizio>/files/volumes/functions/`. Copia lì le tre cartelle del progetto:
   ```bash
   scp -r supabase/functions/_shared supabase/functions/create-checkout supabase/functions/stripe-webhook \
     root@IP-SERVER:/etc/dokploy/compose/<nome-del-servizio>/files/volumes/functions/
   ```
4. **Variabili delle funzioni:**
   - nell'*Environment* del servizio supabase aggiungi:
     ```env
     STRIPE_SECRET_KEY=sk_test_…
     STRIPE_WEBHOOK_SECRET=whsec_…
     FUNCTIONS_VERIFY_JWT=false
     ```
   - nel compose, sotto `functions → environment`, aggiungi:
     ```yaml
     STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
     STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
     SITE_URL: https://printbadge.com
     ```
   - poi fai *Deploy* del servizio supabase.

   `FUNCTIONS_VERIFY_JWT=false` serve perché Stripe non può mandare il token di Supabase: le funzioni verificano da sole i dati e la firma del webhook.
5. **Stripe:** crea il webhook verso `https://supabase.printbadge.com/functions/v1/stripe-webhook`. Gli eventi da selezionare e la prova con la carta di test sono in [NEGOZIO.md](NEGOZIO.md#3-stripe).

## 4. Prova finale

1. Apri `https://printbadge.com`, scegli un modello, vai al passo **Ordina**: devono comparire prodotti e prezzi.
2. Fai un ordine con la carta di test `4242 4242 4242 4242`.
3. In Studio → `orders` l'ordine deve passare a `paid`.
4. Sul computer in ufficio avvia l'agente:
   ```bash
   cd agent
   DRY_RUN=true npm run once
   ```
   Poi `npm start` per la stampa vera.

## Provare l'immagine in locale

```bash
docker build -t printbadge-web .
docker run --rm -p 8088:80 -e SUPABASE_URL=… -e SUPABASE_ANON_KEY=… printbadge-web
```
