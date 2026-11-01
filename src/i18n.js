// Traduzioni dell'interfaccia. Per aggiungere una lingua basta copiare il blocco "en",
// tradurre i valori e aggiungere l'opzione nel selettore lingua di index.html.
const STRINGS = {
  it: {
    // barra superiore e passi
    stepDesign: 'Progetta', stepPeople: 'Persone', stepPrint: 'Stampa', stepOf: 'Passo {n} di 3',
    startNow: 'Inizia', nextPeople: 'Avanti: persone', nextPrint: 'Avanti: stampa', printNow: 'Stampa ora',
    file: 'File', newFromTemplate: 'Nuovo da modello', openProject: 'Apri un progetto', saveProject: 'Salva progetto',
    undo: 'Annulla (⌘Z)', redo: 'Ripeti (⇧⌘Z)', language: 'Lingua', close: 'Chiudi',
    front: 'Fronte', back: 'Retro', zoomIn: 'Ingrandisci', zoomOut: 'Riduci', zoomFit: 'Adatta alla finestra',

    // home
    homeTitle: 'Badge perfetti,<br><em>su qualsiasi stampante.</em>',
    homeLead: 'Scegli un modello, aggiungi le persone da Excel e ordina: stampiamo noi i tuoi badge in PVC e te li spediamo. Oppure stampali con la tua stampante.',
    homeCta: 'Crea il tuo badge', trustFree: 'Editor gratuito, senza account', trustPrinters: 'Pagamento sicuro con Stripe', trustPrivacy: 'I dati restano sul tuo computer',
    continueTitle: 'Continua il tuo progetto', continueSub: 'Riprendi da dove avevi lasciato.', continue: 'Continua',
    how1Title: 'Scegli e personalizza', how1Text: 'Parti da un modello, cambia colori, testi e logo con un clic.',
    how2Title: 'Aggiungi le persone', how2Text: 'Importa un file Excel o CSV: ogni riga diventa un badge con nome, foto e QR.',
    how3Title: 'Ordina o stampa', how3Text: 'Paghi online e li stampiamo noi, oppure li stampi con la tua stampante: card, etichette o A4.',
    chooseTemplate: 'Da dove vuoi partire?', chooseTemplateSub: 'Tutti i modelli sono modificabili: anteprima con persone di esempio.',
    tpl_attendee: 'Evento · Partecipante', tpl_speaker: 'Evento · Relatore', tpl_staff: 'Evento · Staff', tpl_employee: 'Badge dipendente',
    tpl_visitor: 'Visitatore', tpl_event: 'Badge evento 4×3″', tpl_member: 'Tessera socio', tpl_blank: 'Foglio bianco',
    confirmReplace: 'Sostituire il design attuale con questo modello?',

    // editor
    add: 'Aggiungi', toolText: 'Testo', toolField: 'Campo', toolPhoto: 'Foto', toolLogo: 'Logo', toolQr: 'QR code', toolBarcode: 'Barcode',
    toolShapes: 'Forme', toolCamera: 'Webcam', toolRect: 'Rettangolo', toolCircle: 'Cerchio', toolTriangle: 'Triangolo', toolLine: 'Linea',
    shapeWave: 'Onda', chooseField: 'Inserisci un dato', defaultText: 'Doppio clic per scrivere',
    safeArea: 'Area sicura', snap: 'Aggancio', previewData: 'Anteprima con i dati',
    tabProps: 'Modifica', tabLayers: 'Livelli',
    cameraTitle: 'Scatta una foto', cameraHint: 'La foto va nel segnaposto selezionato o diventa una nuova foto.', shoot: 'Scatta',
    brandColors: 'Colori del brand', otherColor: 'Altro colore', smaller: 'Più piccolo', bigger: 'Più grande', alignCycle: 'Allineamento',
    editText: 'Modifica il testo', edit: 'Scrivi', uploadPhoto: 'Carica una foto', uploadLogo: 'Carica il logo',
    editHintTitle: 'Come si modifica', editHint: 'Clicca un elemento sul badge: sopra comparirà una barra con le azioni rapide. Qui sotto trovi formato e sfondo.',

    kind_text: 'Testo', kind_image: 'Immagine', kind_photo: 'Foto', kind_shape: 'Forma', kind_barcode: 'Codice', kind_background: 'Sfondo',
    width: 'Larghezza', height: 'Altezza', rotation: 'Rotazione', opacity: 'Opacità', arrange: 'Disponi', multiSelection: '{n} oggetti selezionati',
    alignLeft: 'Allinea a sinistra', alignHCenter: 'Centra orizzontalmente', alignRight: 'Allinea a destra', alignTop: 'Allinea in alto',
    alignVCenter: 'Centra verticalmente', alignBottom: 'Allinea in basso', duplicate: 'Duplica (⌘D)', bringFront: 'Porta in primo piano',
    sendBack: 'Porta in fondo', lock: 'Blocca', unlock: 'Sblocca', delete: 'Elimina',
    text: 'Testo', insertField: 'Inserisci un dato', font: 'Carattere', size: 'Corpo', color: 'Colore', bold: 'Grassetto', italic: 'Corsivo',
    underline: 'Sottolineato', alignTextLeft: 'Testo a sinistra', alignTextCenter: 'Testo centrato', alignTextRight: 'Testo a destra',
    lineHeight: 'Interlinea', letterSpacing: 'Spaziatura', autoFit: 'Riduci per stare in', off: 'Disattivato', lines: '{n} righe',
    autoFitHint: 'Utile per nomi lunghi: in stampa il testo si rimpicciolisce da solo invece di andare a capo.',
    style: 'Stile', fill: 'Riempimento', solid: 'Pieno', gradient: 'Sfumato', stroke: 'Colore bordo', strokeWidth: 'Bordo', cornerRadius: 'Arrotondamento',
    replaceImage: 'Sostituisci', webcam: 'Webcam', photo: 'Foto', image: 'Immagine', photoField: 'Colonna con la foto', none: 'Nessuna',
    photoFieldHint: 'La colonna può contenere un URL o il nome del file di una foto caricata nel passo Persone.',
    shape: 'Forma', shapeRect: 'Rettangolo', shapeRounded: 'Arrotondata', shapeCircle: 'Cerchio', clearPhoto: 'Togli la foto (torna segnaposto)',
    barcode: 'Codice a barre / QR', symbology: 'Tipo di codice', content: 'Contenuto', useField: 'Usa un dato', showText: 'Mostra testo',
    barcodeInvalid: 'Valore non valido per questo codice: {msg}. In anteprima viene mostrato un esempio.',
    document: 'Formato del badge', format: 'Formato', fmtCards: 'Card e tessere', fmtLabels: 'Badge, etichette e carta', fmtCustom: 'Altro',
    customFormat: 'Personalizzato', orientation: 'Orientamento', landscape: 'Orizzontale', portrait: 'Verticale',
    roundedCorners: 'Angoli arrotondati (card ISO)', printBack: 'Usa anche il retro', background: 'Sfondo', bgImage: 'Immagine di sfondo',
    changeBgImage: 'Cambia immagine', remove: 'Rimuovi',
    tips: 'Suggerimenti',
    tip1: 'Usa {{NomeColonna}} nei testi e nei codici: verrà sostituito con i dati di ogni persona.',
    tip2: 'Doppio clic su un testo per scriverci dentro; doppio clic su una foto o un logo per sostituirli.',
    tip3: 'Tieni testi e loghi dentro l’area sicura tratteggiata: alcune stampanti non arrivano al bordo.',
    tip4: 'Frecce = sposta di 0,5 mm (Maiusc = 5 mm). ⌘D duplica, ⌘Z annulla, ⌘P stampa.',
    noLayers: 'Ancora nessun elemento su questo lato.', moveUp: 'Su', moveDown: 'Giù', visibility: 'Mostra/nascondi',

    // persone
    peopleTitle: 'Chi riceverà il badge?', peopleIntro: 'Ogni riga diventa un badge. I campi come {{Nome}} o {{Foto}} vengono riempiti automaticamente.',
    peopleEmptyTitle: 'Importa il tuo elenco', dataIntro: 'Usa un file Excel (.xlsx) o CSV con i nomi delle colonne nella prima riga: Nome, Cognome, Azienda, Email…',
    dropTitle: 'Trascina qui il file Excel o CSV', dropSub: 'oppure clicca per sceglierlo dal computer',
    pastePlaceholder: 'Oppure incolla qui le celle copiate da Excel, Numbers o Google Fogli (con l’intestazione)…',
    usePasted: 'Usa i dati incollati', useSample: 'Prova con persone di esempio', or: 'oppure',
    skipPeople: 'Ti servono badge tutti uguali?', skipPeopleLink: 'Salta questo passo',
    replaceList: 'Sostituisci elenco', loadPhotos: 'Carica foto', clear: 'Svuota', confirmClearData: 'Eliminare tutte le persone importate?',
    searchPeople: 'Cerca…', peopleCount: '{n} persone · {sel} da stampare', selectAll: 'Seleziona tutti', addRow: 'Aggiungi persona',
    tableLimited: 'Mostrate le prime {n} righe; in stampa vengono usate tutte.', livePreview: 'Anteprima', editDesign: 'Modifica il design',
    useColumns: 'Aggiungi un dato al badge', columnsHint: 'Clic sul nome per aggiungerlo come testo, oppure come QR code o foto.',
    addAsText: 'Aggiungi come testo', addAsQr: 'Aggiungi come QR code', addAsPhoto: 'Aggiungi come foto',
    photosLoaded: '{n} foto caricate', photosHint: 'Carica le foto: verranno abbinate al nome del file scritto nella colonna Foto.',
    dataImported: '{n} persone importate', importError: 'Impossibile leggere il file. Usa .xlsx o .csv.',
    xlsNotSupported: 'Il vecchio formato .xls non è supportato: salva il file come .xlsx o .csv.',

    // stampa
    printTitle: 'Stampa i tuoi badge', printIntro: 'Scegli la stampante e il supporto: Print Badge prepara le pagine alla misura esatta per il driver del tuo computer.',
    choosePrinter: 'Stampante', searchPrinter: 'Cerca il modello (es. Primacy, ZC300, DTC1250e)…', allBrands: 'Tutte',
    anyPrinterHint: 'Non trovi il tuo modello? Scegli “Qualsiasi stampante di card”: funziona con ogni stampante che ha un driver.',
    chooseMedia: 'Su cosa stampi?', whatToPrint: 'Cosa stampare', modeCard: 'Card o etichetta', modeA4: 'Fogli A4', modeLetter: 'Fogli Letter',
    genericBrand: 'Qualsiasi marca',
    'pm_generic-card': 'Qualsiasi stampante di card (driver di sistema)', 'pm_generic-label': 'Qualsiasi stampante di etichette / badge in rotolo',
    'pm_generic-zpl203': 'Stampante ZPL 203 dpi (file .zpl)', 'pm_generic-zpl300': 'Stampante ZPL 300 dpi (file .zpl)',
    'pm_generic-sheet': 'Stampante da ufficio (fogli A4 / Letter)',
    tech_dts: 'Card printer', tech_retransfer: 'Ritrasferimento', tech_thermal: 'Etichette', tech_inkjet: 'Inkjet a colori', tech_sheet: 'Fogli',
    duplexShort: 'fronte/retro',
    formatWarn: 'Il formato {fmt} non è tipico per questa stampante: controlla il supporto caricato.',
    whichRecords: 'Quali persone', scopeAll: 'Tutte ({n})', scopeSelected: 'Solo le selezionate ({n})', scopeCurrent: 'Solo la persona n. {n}',
    fieldsNoData: 'Il badge usa dati come {{Nome}} ma non hai ancora aggiunto persone.', addPeopleLink: 'Aggiungile ora',
    copies: 'Copie', copiesPerRecord: 'Copie per persona', printBackSide: 'Stampa anche il retro',
    duplex: 'Fronte/retro', duplexAuto: 'Automatico (driver)', duplexManual: 'Manuale in 2 passaggi',
    rotateBack: 'Ruota il retro di 180°', reverseBacks: 'Retri in ordine inverso',
    advanced: 'Calibrazione e opzioni avanzate', resolution: 'Risoluzione', bleed: 'Abbondanza', offsetX: 'Spostamento X', offsetY: 'Spostamento Y',
    scale: 'Scala', margin: 'Margine foglio', gap: 'Spazio tra card', cropMarks: 'Segni di taglio',
    calibHint: 'Stampa una card di calibrazione: se il bordo non è centrato, correggi lo spostamento X/Y. I valori restano salvati per ogni stampante.',
    calibCard: 'Stampa card di calibrazione', printFronts: '1 · Stampa i fronti', printBacks: '2 · Stampa i retri', printN: 'Stampa {n} badge',
    downloadPdf: 'Scarica PDF', howToPrint: 'Come stampare',
    tipCardMode: 'Nel dialogo di stampa scegli la stampante, formato carta {w} × {h} mm (CR80 / “Card”), scala 100% e margini nessuno.',
    tipSheetMode: 'Stampa al 100% (senza “Adatta alla pagina”). Per il fronte/retro automatico attiva “Due lati – lato lungo” nel driver.',
    tipPdfFallback: 'Se il browser ignora il formato (per esempio Safari), scarica il PDF e stampalo da Anteprima o Acrobat a dimensione reale.',
    nothingToPrint: 'Nessuna persona selezionata da stampare.', summary: '{cards} badge · {pages} pagine',
    rendering: 'Preparazione {i} di {n}…', buildingPdf: 'Creazione del PDF…', pdfSaved: 'PDF scaricato',
    zplSaved: 'File ZPL scaricato: invialo alla stampante con il suo programma o via rete (porta 9100).',
    nowBacks: 'Gira le card stampate, rimettile nel caricatore e premi “2 · Stampa i retri”.',
    printError: 'Qualcosa è andato storto durante la preparazione della stampa.',

    // modelli
    tplAttendee: 'PARTECIPANTE', tplSpeaker: 'RELATORE', tplStaff: 'STAFF', tplVisitor: 'VISITATORE',
    tplBackEvent: 'Mostra questo badge all’ingresso', tplBackEventSub: 'Badge personale e non cedibile. In caso di smarrimento rivolgiti alla reception.',
    tplBackNote: 'Questa tessera è personale e non cedibile. Se ritrovata, si prega di restituirla a {{Azienda}}.',
    tplSignature: 'Firma del titolare', tplReturn: 'Da restituire all’uscita', tplEventName: 'NOME EVENTO 2027',
    tplEventDate: '12–14 MARZO · MILANO', tplMemberCard: 'TESSERA SOCIO', tplValid: 'Valida fino al 31/12/2027',

    // negozio
    stepOrder: 'Ordina', nextOrder: 'Avanti: ordina', payNow: 'Paga e ordina', orderTitle: 'Ordina i tuoi badge',
    orderIntro: 'Li stampiamo noi su card in PVC e te li spediamo. Paghi in sicurezza con carta tramite Stripe.',
    modeOrder: 'Ordina la stampa', modeSelf: 'Stampa da te', loadingShop: 'Caricamento del catalogo…',
    chooseProduct: 'Scegli il prodotto', fromPrice: 'da {price}', frontOnlyNote: 'Questo prodotto stampa solo il fronte: il retro del tuo design non verrà stampato.',
    logoMissing: 'Non hai ancora caricato il tuo logo: il riquadro "LOGO" non verrà stampato.',
    howMany: 'Quanti badge', addonsTitle: 'Accessori (uno per badge)', eachPrice: '{price} cad.',
    yourDetails: 'I tuoi dati', fullName: 'Nome e cognome', email: 'Email', phone: 'Telefono', companyOpt: 'Azienda / ente (facoltativo)',
    orderNotes: 'Note per l’ordine (facoltative)', shippingHint: 'L’indirizzo di spedizione lo inserisci nella pagina di pagamento.',
    acceptPrefix: 'Accetto le', termsLink: 'condizioni di vendita', and: 'e l’', privacyLink: 'informativa privacy',
    customNoReturn: 'I badge sono personalizzati: non è previsto il diritto di recesso.',
    shipping: 'Spedizione', free: 'Gratis', total: 'Totale',
    tierHint: 'Da {n} badge il prezzo scende a {price} l’uno.', freeShippingHint: 'Spedizione gratuita sopra {amount}.',
    payButton: 'Paga {total}', securePayment: 'Pagamento sicuro con Stripe. Non vediamo né salviamo i dati della tua carta.',
    preparingBadges: 'Preparazione badge {i} di {n}…', uploadingFiles: 'Invio dei file…', openingPayment: 'Apertura della pagina di pagamento…',
    errCustomer: 'Inserisci nome e un indirizzo email valido.', errAccept: 'Per continuare accetta le condizioni di vendita e l’informativa privacy.',
    errTooMany: 'Puoi ordinare al massimo {max} badge per ordine.', errFormat: 'Questo formato non è disponibile per l’ordine.',
    errFormatLong: 'Il formato {fmt} non è disponibile per la stampa online. Passa al formato CR80 nel design.',
    errClosed: 'In questo momento gli ordini online sono chiusi.', errUpload: 'Invio dei file non riuscito. Riprova.',
    errPayment: 'Il servizio di pagamento non risponde. Riprova tra poco.', errGeneric: 'Qualcosa è andato storto. Riprova.',
    shopUnavailable: 'Il negozio online non è raggiungibile in questo momento.',
    howOrderWorks: 'Come funziona', howOrderWorksText: 'Dopo il pagamento il tuo ordine entra subito nella coda di stampa. Ricevi la conferma via email e i badge partono appena stampati.',
    payCancelledTitle: 'Pagamento annullato', payCancelledText: 'Non ti è stato addebitato nulla. Il tuo design è ancora qui.', tryAgain: 'Riprova',
    thanksTitle: 'Grazie per l’ordine!', thanksTitleN: 'Grazie! Ordine n. {n}', checkingPayment: 'Stiamo verificando il pagamento…',
    createAnother: 'Crea un altro badge', orderNotFound: 'Ordine non trovato.', orderSummaryLine: '{n} badge · {total}',
    orderStatus_pending: 'In attesa della conferma del pagamento…', orderStatus_paid: 'Pagamento ricevuto: il tuo ordine è in coda di stampa.',
    orderStatus_printing: 'I tuoi badge sono in stampa.', orderStatus_printed: 'Stampati! Li stiamo preparando per la spedizione.',
    orderStatus_shipped: 'Spedito.', orderStatus_print_error: 'Pagamento ricevuto: stiamo verificando la stampa.',
    orderStatus_cancelled: 'Ordine annullato.', orderStatus_expired: 'Il tempo per il pagamento è scaduto.', orderStatus_payment_failed: 'Il pagamento non è andato a buon fine.',

    // messaggi
    saved: 'Progetto salvato', opened: 'Progetto aperto', openError: 'Questo file non è un progetto Print Badge valido.',
    autosaveFull: 'Spazio del browser pieno: il salvataggio automatico non include tutte le immagini. Usa “Salva progetto”.',
    imageError: 'Impossibile caricare l’immagine.', cameraError: 'Webcam non disponibile o permesso negato.',
  },
  en: {
    stepDesign: 'Design', stepPeople: 'People', stepPrint: 'Print', stepOf: 'Step {n} of 3',
    startNow: 'Get started', nextPeople: 'Next: people', nextPrint: 'Next: print', printNow: 'Print now',
    file: 'File', newFromTemplate: 'New from template', openProject: 'Open a project', saveProject: 'Save project',
    undo: 'Undo (⌘Z)', redo: 'Redo (⇧⌘Z)', language: 'Language', close: 'Close',
    front: 'Front', back: 'Back', zoomIn: 'Zoom in', zoomOut: 'Zoom out', zoomFit: 'Fit to window',

    homeTitle: 'Perfect badges,<br><em>on any printer.</em>',
    homeLead: 'Pick a template, add people from Excel and order: we print your PVC badges and ship them to you. Or print them on your own printer.',
    homeCta: 'Create your badge', trustFree: 'Free editor, no account', trustPrinters: 'Secure payment with Stripe', trustPrivacy: 'Your data stays on your computer',
    continueTitle: 'Continue your project', continueSub: 'Pick up where you left off.', continue: 'Continue',
    how1Title: 'Pick and customize', how1Text: 'Start from a template and change colors, text and logo in one click.',
    how2Title: 'Add your people', how2Text: 'Import an Excel or CSV file: every row becomes a badge with name, photo and QR.',
    how3Title: 'Order or print', how3Text: 'Pay online and we print them, or print them yourself: cards, labels or A4.',
    chooseTemplate: 'Where do you want to start?', chooseTemplateSub: 'Every template is editable; previews use sample people.',
    tpl_attendee: 'Event · Attendee', tpl_speaker: 'Event · Speaker', tpl_staff: 'Event · Staff', tpl_employee: 'Employee badge',
    tpl_visitor: 'Visitor', tpl_event: 'Event badge 4×3″', tpl_member: 'Membership card', tpl_blank: 'Blank',
    confirmReplace: 'Replace the current design with this template?',

    add: 'Add', toolText: 'Text', toolField: 'Field', toolPhoto: 'Photo', toolLogo: 'Logo', toolQr: 'QR code', toolBarcode: 'Barcode',
    toolShapes: 'Shapes', toolCamera: 'Webcam', toolRect: 'Rectangle', toolCircle: 'Circle', toolTriangle: 'Triangle', toolLine: 'Line',
    shapeWave: 'Wave', chooseField: 'Insert a field', defaultText: 'Double-click to type',
    safeArea: 'Safe area', snap: 'Snap', previewData: 'Preview with data',
    tabProps: 'Edit', tabLayers: 'Layers',
    cameraTitle: 'Take a photo', cameraHint: 'The photo goes into the selected placeholder or becomes a new photo.', shoot: 'Capture',
    brandColors: 'Brand colors', otherColor: 'Other color', smaller: 'Smaller', bigger: 'Bigger', alignCycle: 'Alignment',
    editText: 'Edit text', edit: 'Type', uploadPhoto: 'Upload a photo', uploadLogo: 'Upload logo',
    editHintTitle: 'How to edit', editHint: 'Click any element on the badge: a toolbar with quick actions appears above it. Format and background are below.',

    kind_text: 'Text', kind_image: 'Image', kind_photo: 'Photo', kind_shape: 'Shape', kind_barcode: 'Code', kind_background: 'Background',
    width: 'Width', height: 'Height', rotation: 'Rotation', opacity: 'Opacity', arrange: 'Arrange', multiSelection: '{n} objects selected',
    alignLeft: 'Align left', alignHCenter: 'Center horizontally', alignRight: 'Align right', alignTop: 'Align top',
    alignVCenter: 'Center vertically', alignBottom: 'Align bottom', duplicate: 'Duplicate (⌘D)', bringFront: 'Bring to front',
    sendBack: 'Send to back', lock: 'Lock', unlock: 'Unlock', delete: 'Delete',
    text: 'Text', insertField: 'Insert a field', font: 'Font', size: 'Size', color: 'Color', bold: 'Bold', italic: 'Italic',
    underline: 'Underline', alignTextLeft: 'Align text left', alignTextCenter: 'Center text', alignTextRight: 'Align text right',
    lineHeight: 'Line height', letterSpacing: 'Letter spacing', autoFit: 'Shrink to fit in', off: 'Off', lines: '{n} lines',
    autoFitHint: 'Handy for long names: text shrinks automatically when printing instead of wrapping.',
    style: 'Style', fill: 'Fill', solid: 'Solid', gradient: 'Gradient', stroke: 'Stroke color', strokeWidth: 'Stroke', cornerRadius: 'Corner radius',
    replaceImage: 'Replace', webcam: 'Webcam', photo: 'Photo', image: 'Image', photoField: 'Photo column', none: 'None',
    photoFieldHint: 'The column can contain a URL or the file name of a photo uploaded in the People step.',
    shape: 'Shape', shapeRect: 'Rectangle', shapeRounded: 'Rounded', shapeCircle: 'Circle', clearPhoto: 'Remove photo (back to placeholder)',
    barcode: 'Barcode / QR', symbology: 'Code type', content: 'Content', useField: 'Use a field', showText: 'Show text',
    barcodeInvalid: 'Invalid value for this code: {msg}. A sample is shown in the preview.',
    document: 'Badge format', format: 'Format', fmtCards: 'Cards', fmtLabels: 'Badges, labels and paper', fmtCustom: 'Other',
    customFormat: 'Custom', orientation: 'Orientation', landscape: 'Landscape', portrait: 'Portrait',
    roundedCorners: 'Rounded corners (ISO card)', printBack: 'Use the back side too', background: 'Background', bgImage: 'Background image',
    changeBgImage: 'Change image', remove: 'Remove',
    tips: 'Tips',
    tip1: 'Use {{ColumnName}} in texts and codes: it is replaced with each person’s data.',
    tip2: 'Double-click a text to type in it; double-click a photo or logo to replace it.',
    tip3: 'Keep texts and logos inside the dashed safe area: some printers can’t reach the edge.',
    tip4: 'Arrows = move 0.5 mm (Shift = 5 mm). ⌘D duplicates, ⌘Z undoes, ⌘P prints.',
    noLayers: 'No elements on this side yet.', moveUp: 'Up', moveDown: 'Down', visibility: 'Show/hide',

    peopleTitle: 'Who gets a badge?', peopleIntro: 'Every row becomes a badge. Fields like {{Nome}} or {{Foto}} are filled in automatically.',
    peopleEmptyTitle: 'Import your list', dataIntro: 'Use an Excel (.xlsx) or CSV file with the column names in the first row: Name, Surname, Company, Email…',
    dropTitle: 'Drop your Excel or CSV file here', dropSub: 'or click to choose it from your computer',
    pastePlaceholder: 'Or paste cells copied from Excel, Numbers or Google Sheets here (with the header)…',
    usePasted: 'Use pasted data', useSample: 'Try with sample people', or: 'or',
    skipPeople: 'Need identical badges?', skipPeopleLink: 'Skip this step',
    replaceList: 'Replace list', loadPhotos: 'Upload photos', clear: 'Clear', confirmClearData: 'Delete all imported people?',
    searchPeople: 'Search…', peopleCount: '{n} people · {sel} to print', selectAll: 'Select all', addRow: 'Add person',
    tableLimited: 'Showing the first {n} rows; all of them are printed.', livePreview: 'Preview', editDesign: 'Edit the design',
    useColumns: 'Add a field to the badge', columnsHint: 'Click a name to add it as text, or as a QR code or photo.',
    addAsText: 'Add as text', addAsQr: 'Add as QR code', addAsPhoto: 'Add as photo',
    photosLoaded: '{n} photos loaded', photosHint: 'Upload photos: they are matched to the file name written in the Photo column.',
    dataImported: '{n} people imported', importError: 'Could not read the file. Use .xlsx or .csv.',
    xlsNotSupported: 'The old .xls format is not supported: save the file as .xlsx or .csv.',

    printTitle: 'Print your badges', printIntro: 'Pick your printer and media: Print Badge lays out pages at the exact size for your computer’s printer driver.',
    choosePrinter: 'Printer', searchPrinter: 'Search model (e.g. Primacy, ZC300, DTC1250e)…', allBrands: 'All',
    anyPrinterHint: 'Can’t find your model? Choose “Any card printer”: it works with every printer that has a driver.',
    chooseMedia: 'What are you printing on?', whatToPrint: 'What to print', modeCard: 'Card or label', modeA4: 'A4 sheets', modeLetter: 'Letter sheets',
    genericBrand: 'Any brand',
    'pm_generic-card': 'Any card printer (system driver)', 'pm_generic-label': 'Any label / roll badge printer',
    'pm_generic-zpl203': 'ZPL printer 203 dpi (.zpl file)', 'pm_generic-zpl300': 'ZPL printer 300 dpi (.zpl file)',
    'pm_generic-sheet': 'Office printer (A4 / Letter sheets)',
    tech_dts: 'Card printer', tech_retransfer: 'Retransfer', tech_thermal: 'Labels', tech_inkjet: 'Color inkjet', tech_sheet: 'Sheets',
    duplexShort: 'duplex',
    formatWarn: 'The {fmt} format is unusual for this printer: check the loaded media.',
    whichRecords: 'Which people', scopeAll: 'Everyone ({n})', scopeSelected: 'Selected only ({n})', scopeCurrent: 'Only person #{n}',
    fieldsNoData: 'The badge uses fields like {{Nome}} but you haven’t added any people yet.', addPeopleLink: 'Add them now',
    copies: 'Copies', copiesPerRecord: 'Copies per person', printBackSide: 'Print the back side too',
    duplex: 'Duplex', duplexAuto: 'Automatic (driver)', duplexManual: 'Manual, 2 passes',
    rotateBack: 'Rotate back side 180°', reverseBacks: 'Backs in reverse order',
    advanced: 'Calibration and advanced options', resolution: 'Resolution', bleed: 'Bleed', offsetX: 'Offset X', offsetY: 'Offset Y',
    scale: 'Scale', margin: 'Sheet margin', gap: 'Gap between cards', cropMarks: 'Crop marks',
    calibHint: 'Print a calibration card: if the border is off-center, adjust offset X/Y. Values are remembered per printer.',
    calibCard: 'Print calibration card', printFronts: '1 · Print fronts', printBacks: '2 · Print backs', printN: 'Print {n} badges',
    downloadPdf: 'Download PDF', howToPrint: 'How to print',
    tipCardMode: 'In the print dialog pick your printer, paper size {w} × {h} mm (CR80 / “Card”), scale 100% and no margins.',
    tipSheetMode: 'Print at 100% (no “Fit to page”). For automatic duplex enable “Two-sided – long edge” in the driver.',
    tipPdfFallback: 'If the browser ignores the paper size (e.g. Safari), download the PDF and print it from Preview or Acrobat at actual size.',
    nothingToPrint: 'No people selected to print.', summary: '{cards} badges · {pages} pages',
    rendering: 'Preparing {i} of {n}…', buildingPdf: 'Building the PDF…', pdfSaved: 'PDF downloaded',
    zplSaved: 'ZPL file downloaded: send it to the printer with its utility or over the network (port 9100).',
    nowBacks: 'Flip the printed cards, put them back in the feeder and press “2 · Print backs”.',
    printError: 'Something went wrong while preparing the print job.',

    tplAttendee: 'ATTENDEE', tplSpeaker: 'SPEAKER', tplStaff: 'STAFF', tplVisitor: 'VISITOR',
    tplBackEvent: 'Show this badge at the entrance', tplBackEventSub: 'Personal and non-transferable badge. If lost, please contact the front desk.',
    tplBackNote: 'This card is personal and non-transferable. If found, please return it to {{Azienda}}.',
    tplSignature: 'Holder’s signature', tplReturn: 'Please return when leaving', tplEventName: 'EVENT NAME 2027',
    tplEventDate: 'MARCH 12–14 · MILAN', tplMemberCard: 'MEMBER CARD', tplValid: 'Valid until 12/31/2027',

    stepOrder: 'Order', nextOrder: 'Next: order', payNow: 'Pay and order', orderTitle: 'Order your badges',
    orderIntro: 'We print them on PVC cards and ship them to you. Pay securely by card through Stripe.',
    modeOrder: 'Order printing', modeSelf: 'Print yourself', loadingShop: 'Loading the catalogue…',
    chooseProduct: 'Choose the product', fromPrice: 'from {price}', frontOnlyNote: 'This product prints the front only: the back of your design won’t be printed.',
    logoMissing: 'You haven’t uploaded your logo yet: the "LOGO" box won’t be printed.',
    howMany: 'How many badges', addonsTitle: 'Accessories (one per badge)', eachPrice: '{price} each',
    yourDetails: 'Your details', fullName: 'Full name', email: 'Email', phone: 'Phone', companyOpt: 'Company / organisation (optional)',
    orderNotes: 'Order notes (optional)', shippingHint: 'You’ll enter the shipping address on the payment page.',
    acceptPrefix: 'I accept the', termsLink: 'terms of sale', and: 'and the', privacyLink: 'privacy policy',
    customNoReturn: 'Badges are personalised, so they can’t be returned.',
    shipping: 'Shipping', free: 'Free', total: 'Total',
    tierHint: 'From {n} badges the price drops to {price} each.', freeShippingHint: 'Free shipping over {amount}.',
    payButton: 'Pay {total}', securePayment: 'Secure payment with Stripe. We never see or store your card details.',
    preparingBadges: 'Preparing badge {i} of {n}…', uploadingFiles: 'Sending files…', openingPayment: 'Opening the payment page…',
    errCustomer: 'Enter your name and a valid email address.', errAccept: 'Please accept the terms of sale and the privacy policy to continue.',
    errTooMany: 'You can order up to {max} badges per order.', errFormat: 'This format isn’t available for ordering.',
    errFormatLong: 'The {fmt} format isn’t available for online printing. Switch the design to CR80.',
    errClosed: 'Online orders are closed right now.', errUpload: 'Sending the files failed. Please try again.',
    errPayment: 'The payment service isn’t responding. Please try again shortly.', errGeneric: 'Something went wrong. Please try again.',
    shopUnavailable: 'The online shop can’t be reached right now.',
    howOrderWorks: 'How it works', howOrderWorksText: 'After payment your order goes straight into the print queue. You get a confirmation email and the badges ship as soon as they are printed.',
    payCancelledTitle: 'Payment cancelled', payCancelledText: 'You haven’t been charged. Your design is still here.', tryAgain: 'Try again',
    thanksTitle: 'Thank you for your order!', thanksTitleN: 'Thank you! Order #{n}', checkingPayment: 'Checking your payment…',
    createAnother: 'Create another badge', orderNotFound: 'Order not found.', orderSummaryLine: '{n} badges · {total}',
    orderStatus_pending: 'Waiting for payment confirmation…', orderStatus_paid: 'Payment received: your order is in the print queue.',
    orderStatus_printing: 'Your badges are being printed.', orderStatus_printed: 'Printed! We’re getting them ready to ship.',
    orderStatus_shipped: 'Shipped.', orderStatus_print_error: 'Payment received: we’re checking the print job.',
    orderStatus_cancelled: 'Order cancelled.', orderStatus_expired: 'The payment window has expired.', orderStatus_payment_failed: 'The payment didn’t go through.',

    saved: 'Project saved', opened: 'Project opened', openError: 'This file is not a valid Print Badge project.',
    autosaveFull: 'Browser storage is full: autosave doesn’t include every image. Use “Save project”.',
    imageError: 'Could not load the image.', cameraError: 'Webcam unavailable or permission denied.',
  },
};

const LANG_KEY = 'printbadge.lang';
let lang = (() => {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && STRINGS[saved]) return saved;
  } catch {
    /* nessuna preferenza salvata */
  }
  return (navigator.language || 'en').toLowerCase().startsWith('it') ? 'it' : 'en';
})();

export function getLang() {
  return lang;
}

export function setLang(next) {
  if (!STRINGS[next]) return;
  lang = next;
  document.documentElement.lang = next;
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {
    /* preferenza valida solo per questa sessione */
  }
}

export function t(key, vars) {
  let s = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
}

export function applyStatic(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
    el.setAttribute('aria-label', el.title);
  });
}
