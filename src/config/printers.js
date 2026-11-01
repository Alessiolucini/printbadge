// Profili di stampa. BadgeOK non parla un protocollo proprietario: genera pagine
// della misura esatta della card e le passa al driver di sistema (CUPS su macOS/Linux,
// spooler su Windows), quindi funziona con qualunque stampante abbia un driver.
// I profili servono solo a precompilare risoluzione, fronte/retro, abbondanza e formati.
//
// tech: 'dts'        = sublimazione diretta su card (stampa "edge-to-edge" quasi al bordo)
//       'retransfer' = ritrasferimento (vera stampa oltre il bordo, consigliata abbondanza)
//       'thermal'    = termica diretta/trasferimento termico per etichette (ZPL/driver)
//       'inkjet'     = getto d'inchiostro (etichette a colori o fogli)
//       'sheet'      = stampante da ufficio con fogli A4/Letter da ritagliare
// duplex: true = fronte/retro di serie o opzionale sul modello, false = solo fronte
//         (per il retro usa la stampa fronte/retro manuale).

const card = (brand, model, extra = {}) => ({
  brand, model, tech: 'dts', dpi: 300, duplex: true, formats: ['CR80', 'CR79'], bleed: 0, ...extra,
});

export const PRINTERS = [
  { id: 'generic-card', brand: 'Generico', model: 'Qualsiasi stampante di card (driver di sistema)', tech: 'dts', dpi: 300, duplex: true, formats: ['CR80', 'CR79', 'CR90', 'CR100'], bleed: 0 },
  { id: 'generic-label', brand: 'Generico', model: 'Qualsiasi stampante di etichette / badge in rotolo', tech: 'thermal', dpi: 300, duplex: false, formats: ['BADGE4x3', 'BADGE4x6', 'LBL100x62', 'LBL89x36'], bleed: 0 },
  { id: 'generic-zpl203', brand: 'Generico', model: 'Stampante ZPL 203 dpi (file .zpl)', tech: 'thermal', dpi: 203, duplex: false, formats: ['BADGE4x3', 'BADGE4x6', 'LBL100x62'], bleed: 0, zpl: true },
  { id: 'generic-zpl300', brand: 'Generico', model: 'Stampante ZPL 300 dpi (file .zpl)', tech: 'thermal', dpi: 300, duplex: false, formats: ['BADGE4x3', 'BADGE4x6', 'LBL100x62'], bleed: 0, zpl: true },
  { id: 'generic-sheet', brand: 'Generico', model: 'Stampante da ufficio (fogli A4 / Letter)', tech: 'sheet', dpi: 300, duplex: true, formats: ['CR80', 'BADGE4x3', 'A7', 'A6', 'BIZ85x55'], bleed: 0, sheet: true },

  { id: 'evolis-primacy2', ...card('Evolis', 'Primacy 2') },
  { id: 'evolis-zenius', ...card('Evolis', 'Zenius', { duplex: false }) },
  { id: 'evolis-badgy100', ...card('Evolis', 'Badgy 100', { dpi: 260, duplex: false, formats: ['CR80'] }) },
  { id: 'evolis-badgy200', ...card('Evolis', 'Badgy 200', { dpi: 260, duplex: false, formats: ['CR80'] }) },
  { id: 'evolis-avansia', ...card('Evolis', 'Avansia', { tech: 'retransfer', dpi: 600, bleed: 1 }) },

  { id: 'zebra-zc100', ...card('Zebra', 'ZC100', { duplex: false }) },
  { id: 'zebra-zc300', ...card('Zebra', 'ZC300') },
  { id: 'zebra-zc350', ...card('Zebra', 'ZC350') },
  { id: 'zebra-zxp7', ...card('Zebra', 'ZXP Series 7') },
  { id: 'zebra-zxp9', ...card('Zebra', 'ZXP Series 9', { tech: 'retransfer', dpi: 304, bleed: 1 }) },
  { id: 'zebra-zd421', brand: 'Zebra', model: 'ZD421 · 203 dpi', tech: 'thermal', dpi: 203, duplex: false, formats: ['BADGE4x3', 'BADGE4x6', 'LBL100x62'], bleed: 0, zpl: true },

  { id: 'fargo-dtc1250e', ...card('HID FARGO', 'DTC1250e') },
  { id: 'fargo-dtc1500', ...card('HID FARGO', 'DTC1500') },
  { id: 'fargo-dtc4500e', ...card('HID FARGO', 'DTC4500e') },
  { id: 'fargo-hdp5000', ...card('HID FARGO', 'HDP5000', { tech: 'retransfer', bleed: 1 }) },
  { id: 'fargo-hdp6600', ...card('HID FARGO', 'HDP6600', { tech: 'retransfer', dpi: 600, bleed: 1 }) },

  { id: 'entrust-ds1', ...card('Entrust (Datacard)', 'Sigma DS1', { duplex: false }) },
  { id: 'entrust-ds2', ...card('Entrust (Datacard)', 'Sigma DS2') },
  { id: 'entrust-ds3', ...card('Entrust (Datacard)', 'Sigma DS3') },
  { id: 'entrust-cd800', ...card('Entrust (Datacard)', 'CD800') },
  { id: 'entrust-cr805', ...card('Entrust (Datacard)', 'CR805', { tech: 'retransfer', bleed: 1 }) },

  { id: 'magicard-300', ...card('Magicard', '300') },
  { id: 'magicard-enduro3e', ...card('Magicard', 'Enduro 3E') },
  { id: 'magicard-riopro360', ...card('Magicard', 'Rio Pro 360') },
  { id: 'magicard-pronto100', ...card('Magicard', 'Pronto 100', { duplex: false }) },

  { id: 'idp-smart31', ...card('IDP', 'SMART-31') },
  { id: 'idp-smart51', ...card('IDP', 'SMART-51') },
  { id: 'idp-smart70', ...card('IDP', 'SMART-70', { tech: 'retransfer', bleed: 1 }) },

  { id: 'matica-mc110', ...card('Matica', 'MC110', { duplex: false }) },
  { id: 'matica-mc310', ...card('Matica', 'MC310') },

  { id: 'dnp-cxd80', ...card('DNP', 'CX-D80', { tech: 'retransfer', bleed: 1 }) },
  { id: 'hiti-cs200e', ...card('HiTi', 'CS-200e') },
  { id: 'hiti-cs220e', ...card('HiTi', 'CS-220e') },

  { id: 'brother-ql820', brand: 'Brother', model: 'QL-820NWB · 62 mm', tech: 'thermal', dpi: 300, duplex: false, formats: ['LBL100x62', 'LBL89x36'], bleed: 0 },
  { id: 'brother-ql1110', brand: 'Brother', model: 'QL-1110NWB · 102 mm', tech: 'thermal', dpi: 300, duplex: false, formats: ['BADGE4x3', 'BADGE4x6', 'LBL100x62'], bleed: 0 },
  { id: 'dymo-lw550', brand: 'DYMO', model: 'LabelWriter 550', tech: 'thermal', dpi: 300, duplex: false, formats: ['LBL89x36', 'LBL100x62'], bleed: 0 },
  { id: 'epson-c4000', brand: 'Epson', model: 'ColorWorks C4000', tech: 'inkjet', dpi: 600, duplex: false, formats: ['BADGE4x3', 'BADGE4x6', 'LBL100x62'], bleed: 1 },
  { id: 'epson-c6000', brand: 'Epson', model: 'ColorWorks C6000', tech: 'inkjet', dpi: 600, duplex: false, formats: ['BADGE4x3', 'BADGE4x6', 'LBL100x62'], bleed: 1 },
];

export function getPrinter(id) {
  return PRINTERS.find((p) => p.id === id) || PRINTERS[0];
}

export function printersByBrand() {
  const map = new Map();
  for (const p of PRINTERS) {
    if (!map.has(p.brand)) map.set(p.brand, []);
    map.get(p.brand).push(p);
  }
  return map;
}
