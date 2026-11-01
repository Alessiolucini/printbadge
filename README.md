# PRINTBADGE.COM

**Badge, pass per eventi e tessere per qualsiasi stampante.** Editor gratuito che funziona nel browser: scegli un modello, aggiungi le persone da Excel e stampi su una stampante di card (Evolis, Zebra, HID FARGO, Entrust/Datacard, Magicard, IDP, Matica, DNP, HiTi…), su una stampante di etichette (Brother, DYMO, Zebra ZPL, Epson ColorWorks) o su una normale stampante da ufficio con fogli A4/Letter.

I dati e le foto restano sul computer di chi usa l'app: non c'è nessun server e nessun account.

![PRINTBADGE.COM](public/brand/og.jpg)

## Come funziona: 3 passi

1. **Progetta** – parti da un modello (partecipante, relatore, staff, dipendente, visitatore, evento 4×3″, tessera socio) e modifica tutto con un clic. Selezionando un elemento compare una barra rapida con dimensione del testo, grassetto, colori del brand, duplica ed elimina.
2. **Persone** – trascina un file `.xlsx` o `.csv`, oppure incolla le celle da Excel/Numbers/Google Fogli. Ogni riga diventa un badge; i campi `{{NomeColonna}}` nei testi e nei codici vengono riempiti da soli. Le foto si abbinano per nome file o URL. Anteprima dal vivo per ogni persona.
3. **Stampa** – scegli la marca e il modello della stampante (con ricerca), il supporto (card/etichetta o fogli A4/Letter) e premi **Stampa**.

Altre funzioni: fronte/retro, codici QR, Data Matrix, Aztec, PDF417, Code 128, Code 39, EAN, UPC, ITF e Codabar; testo che si riduce da solo per i nomi lunghi; foto da webcam; forme e onde sfumate; livelli, blocco, annulla/ripeti; salvataggio automatico e progetti `.printbadge`; interfaccia in italiano e inglese; installabile come app (PWA) e utilizzabile offline dopo la prima visita.

## Negozio online

Con Supabase (anche self-hosted) e Stripe il passo 3 diventa **Ordina**:
1. il cliente sceglie il prodotto e gli accessori;
2. paga con carta su Stripe Checkout;
3. l'ordine entra in una coda di stampa;
4. l'[agente di stampa](agent/printbadge-agent.mjs), sul computer collegato alla stampante, lo stampa da solo.

La stampa in proprio resta disponibile con il pulsante *Stampa da te*.

Installazione e configurazione passo per passo: [docs/NEGOZIO.md](docs/NEGOZIO.md).

## Perché funziona con tutte le stampanti

I programmi dei produttori (come Badge Studio di Evolis, basato su cardPresso) controllano il modello di stampante e si attivano solo con quelli del marchio. Print Badge non usa protocolli proprietari: prepara pagine della **misura esatta della card o dell'etichetta** alla risoluzione della stampante e le consegna al **driver di sistema** (CUPS su macOS e Linux, spooler di Windows). Ogni stampante che ha un driver funziona.

| Uscita | Quando usarla |
| --- | --- |
| **Stampa** (dialogo di sistema) | Stampanti di card e di etichette con driver installato. Una pagina = una card, fronte/retro automatico o manuale in due passaggi. |
| **Fogli A4 / Letter** | Stampanti da ufficio con fogli di badge da ritagliare; segni di taglio e retri specchiati per il fronte/retro. |
| **PDF** | Ripiego universale: si apre in Anteprima o Acrobat e si stampa a dimensione reale con qualsiasi driver (utile con Safari, che ignora `@page size`). |
| **PNG** | Immagini ad alta risoluzione da usare in altri programmi. |
| **ZPL** | Stampanti termiche Zebra o compatibili: file `.zpl` da inviare con l'utility della stampante o via rete (porta 9100). |

I profili in [`src/config/printers.js`](src/config/printers.js) precompilano risoluzione, fronte/retro e abbondanza; sono valori iniziali modificabili. Per ogni stampante si salvano **spostamento X/Y e scala**: si stampa la *card di calibrazione*, si misura e si corregge.

## Identità visiva

Colori pieni, niente sfumature e niente viola: navy `#0B1D51` e blu `#2563FF` come colori principali, con gli accenti dei colori di stampa CMYK (ciano `#06B6D4`, magenta `#EC4899`, giallo `#FACC15`). Le righe CMYK a colori netti sono l'elemento grafico ricorrente (sotto l'hero, accanto ai titoli, nella fascia del modello Visitatore). Caratteri: Montserrat per titoli e pulsanti, Inter per il testo.

Le illustrazioni, il logo, le icone dell'app, l'immagine di condivisione e le foto delle persone di esempio sono state generate con Higgsfield a partire dalle tavole del brand e ricolorate in stile piatto; si trovano in [`public/brand`](public/brand), [`public/icons`](public/icons) e [`public/samples`](public/samples).

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

## Pubblicazione su GitHub Pages con il dominio printbadge.com

1. Crea un repository su GitHub (per esempio `printbadge`) e carica il progetto sul ramo `main`.
2. In **Settings → Pages** scegli **Source: GitHub Actions**. Il workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) compila e pubblica a ogni push su `main`.
3. Nel DNS di `printbadge.com` (pannello del registrar) aggiungi:
   - quattro record `A` per `@` verso `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`;
   - un record `CNAME` per `www` verso `<tuo-utente>.github.io`.
4. Torna in **Settings → Pages**, scrivi `printbadge.com` in *Custom domain*, salva e attiva **Enforce HTTPS** quando il certificato è pronto.

In alternativa il progetto funziona senza modifiche su Vercel, Netlify o Cloudflare Pages (comando `npm run build`, cartella `dist`).

## Struttura

```
supabase/
  migrations/          tabelle, sicurezza, coda di stampa, catalogo di esempio
  functions/           create-checkout, stripe-webhook, prezzi condivisi
agent/                 agente di stampa per il computer in ufficio
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
  i18n.js              traduzioni
```

## Licenza

MIT — vedi [LICENSE](LICENSE).

---

### English

PRINTBADGE.COM is a free, browser-based badge and ID card designer that prints to **any** printer with a system driver: card printers, label printers and office printers (A4/Letter sheets). Three steps — design, add people from Excel/CSV, print — with photos, QR and barcodes, duplex, PDF/PNG export and ZPL for Zebra-compatible thermal printers. All data stays on the user's device. Run `npm install && npm run dev` to start developing.
