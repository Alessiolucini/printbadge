# BadgeOK

**Il tuo badge, stampato e spedito subito.** Su [badgeok.com](https://badgeok.com) si crea online un badge, un pass per eventi o una tessera: appena il cliente ordina e paga, l'ordine arriva direttamente alla nostra stampante, va in stampa in automatico e parte subito con la spedizione. Chi ha già una stampante può anche stamparlo da sé: card printer (Evolis, Zebra, HID FARGO, Entrust/Datacard, Magicard, IDP, Matica, DNP, HiTi…), stampanti di etichette (Brother, DYMO, Zebra ZPL, Epson ColorWorks) o una normale stampante A4/Letter.

Il sito è in **italiano, inglese, spagnolo, francese e tedesco** e si apre da solo nella lingua del browser; la lingua si cambia dal selettore in alto o con `?lang=es` (`it`, `en`, `es`, `fr`, `de`) nell'indirizzo.

![BadgeOK](public/brand/og.jpg)

## Come funziona: 3 passi

1. **Progetta** – parti da un modello (partecipante, relatore, staff, dipendente, visitatore, evento 4×3″, tessera socio) e modifica tutto con un clic. Selezionando un elemento compare una barra rapida con dimensione del testo, grassetto, colori del brand, duplica ed elimina.
2. **Persone** – trascina un file `.xlsx` o `.csv`, oppure incolla le celle da Excel/Numbers/Google Fogli. Ogni riga diventa un badge; i campi `{{NomeColonna}}` nei testi e nei codici vengono riempiti da soli. Le foto si abbinano per nome file o URL. Anteprima dal vivo per ogni persona.
3. **Ordina** – scegli il prodotto e gli accessori e paghi: il badge viene stampato subito e spedito. In alternativa, con **Stampa da te**, scegli la marca e il modello della stampante, il supporto (card/etichetta o fogli A4/Letter) e stampi in proprio.

Altre funzioni: fronte/retro, codici QR, Data Matrix, Aztec, PDF417, Code 128, Code 39, EAN, UPC, ITF e Codabar; testo che si riduce da solo per i nomi lunghi; foto da webcam; forme e onde sfumate; livelli, blocco, annulla/ripeti; salvataggio automatico e progetti `.badgeok` (si aprono anche i vecchi `.printbadge`); interfaccia in 5 lingue; installabile come app (PWA) e utilizzabile offline dopo la prima visita.

## Negozio online

Con Supabase (anche self-hosted) e Stripe il passo 3 diventa **Ordina**, ed è qui che nasce la promessa "stampato e spedito subito":
1. il cliente sceglie il prodotto e gli accessori;
2. paga con carta su Stripe Checkout (nella sua lingua);
3. appena il pagamento è confermato, l'ordine entra nella coda di stampa;
4. l'[agente di stampa](agent/printbadge-agent.mjs), sul computer collegato alla stampante in ufficio, lo prende e lo stampa da solo;
5. il badge stampato viene imbustato e spedito.

La stampa in proprio resta disponibile con il pulsante *Stampa da te*.

Installazione e configurazione passo per passo: [docs/NEGOZIO.md](docs/NEGOZIO.md).

## Perché funziona con tutte le stampanti

I programmi dei produttori (come Badge Studio di Evolis, basato su cardPresso) controllano il modello di stampante e si attivano solo con quelli del marchio. BadgeOK non usa protocolli proprietari: prepara pagine della **misura esatta della card o dell'etichetta** alla risoluzione della stampante e le consegna al **driver di sistema** (CUPS su macOS e Linux, spooler di Windows). Ogni stampante che ha un driver funziona.

| Uscita | Quando usarla |
| --- | --- |
| **Stampa** (dialogo di sistema) | Stampanti di card e di etichette con driver installato. Una pagina = una card, fronte/retro automatico o manuale in due passaggi. |
| **Fogli A4 / Letter** | Stampanti da ufficio con fogli di badge da ritagliare; segni di taglio e retri specchiati per il fronte/retro. |
| **PDF** | Ripiego universale: si apre in Anteprima o Acrobat e si stampa a dimensione reale con qualsiasi driver (utile con Safari, che ignora `@page size`). |
| **PNG** | Immagini ad alta risoluzione da usare in altri programmi. |
| **ZPL** | Stampanti termiche Zebra o compatibili: file `.zpl` da inviare con l'utility della stampante o via rete (porta 9100). |

I profili in [`src/config/printers.js`](src/config/printers.js) precompilano risoluzione, fronte/retro e abbondanza; sono valori iniziali modificabili. Per ogni stampante si salvano **spostamento X/Y e scala**: si stampa la *card di calibrazione*, si misura e si corregge.

## Identità visiva

Colori presi dal logo, pieni e senza sfumature né viola: navy `#08204F` e blu `#0567CF` come colori principali, verde `#22AE2E` (la "ok" del logo) per conferme, pagamento e messaggi di stampa e spedizione. Caratteri: Poppins per il marchio, Montserrat per titoli e pulsanti, Inter per il testo.

Il logo originale è in [`public/brand/logo-badgeok.png`](public/brand/logo-badgeok.png); il simbolo usato nell'intestazione è ritagliato da quello. L'illustrazione principale, le tre illustrazioni del percorso ordine → stampa → spedizione, le icone dell'app, l'immagine per i social e le foto delle persone di esempio sono state generate con Higgsfield a partire dal logo; si trovano in [`public/brand`](public/brand), [`public/icons`](public/icons) e [`public/samples`](public/samples).

## Sviluppo

Serve Node.js 20 o più recente.

```bash
npm install
npm run dev
```

Per creare la versione da pubblicare:

```bash
npm run build
```

Il risultato è nella cartella `dist/`: un sito statico pubblicabile su qualsiasi hosting.

## Pubblicazione su Dokploy (consigliata con Supabase self-hosted)

Il progetto ha un [`Dockerfile`](Dockerfile):
- compila il sito con Node;
- lo serve con Nginx sulla porta 80;
- legge `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TERMS_URL` e `PRIVACY_URL` all'avvio del container.

Guida passo per passo per il servizio WEB, il servizio supabase e i DNS: [docs/DOKPLOY.md](docs/DOKPLOY.md).

Senza Docker, `npm run build` produce un sito statico in `dist/` da caricare su qualsiasi hosting. In quel caso le variabili del negozio vanno passate al build come `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TERMS_URL` e `VITE_PRIVACY_URL` (vedi [`.env.example`](.env.example)).

## Struttura

```
supabase/
  migrations/          tabelle, sicurezza, coda di stampa, catalogo di esempio
  functions/           create-checkout, stripe-webhook, prezzi condivisi
agent/                 agente di stampa per il computer in ufficio
docker/                configurazione Nginx e script di avvio del container
Dockerfile             immagine del sito per Dokploy
src/
  main.js              avvio, passi Progetta → Persone → Stampa, menu e scorciatoie
  editor/editor.js     editor su canvas (Fabric.js): oggetti, livelli, cronologia, salvataggio
  editor/barcode.js    codici a barre e 2D (bwip-js)
  data/                importazione Excel/CSV, foto, campi {{…}}
  print/render.js      rendering ad alta risoluzione con i dati uniti
  print/output.js      impaginazione card/fogli, stampa, PDF, ZPL
  ui/home.js           schermata iniziale e galleria modelli
  ui/people.js         passo Persone
  ui/printView.js      passo Stampa
  ui/quickbar.js       barra rapida sopra l'elemento selezionato
  ui/panels.js         pannelli Modifica e Livelli
  ui/orderView.js      passo Ordina (negozio) e pagina di conferma
  shop/shop.js         collegamento a Supabase: catalogo, file, checkout
  templates.js         modelli di partenza
  config/              formati e profili stampanti
  i18n.js              lingue e scelta automatica
  locales/             testi in it, en, es, fr, de (un file per lingua)
```

## Licenza

MIT — vedi [LICENSE](LICENSE).

---

### English

BadgeOK (badgeok.com) lets people design an ID badge, event pass or member card online and order it: as soon as the payment is confirmed, the order goes straight to our printer, prints automatically and ships right away. It can also print to **any** printer with a system driver (card, label and office printers). Available in Italian, English, Spanish, French and German, picked automatically from the browser language. Run `npm install && npm run dev` to start developing.
