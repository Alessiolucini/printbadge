// Formati fisici supportati. Misure in millimetri, sempre in orientamento orizzontale
// (w >= h); l'orientamento verticale scambia i valori.
export const PX_PER_MM = 10;

export const FORMATS = [
  { id: 'CR80', group: 'card', w: 85.6, h: 53.98, radius: 3.18, label: 'CR80 · ISO/IEC 7810 ID-1 · 85.6 × 54 mm' },
  { id: 'CR79', group: 'card', w: 83.9, h: 52.1, radius: 3.18, label: 'CR79 · 83.9 × 52.1 mm' },
  { id: 'CR90', group: 'card', w: 92.0, h: 60.0, radius: 3.18, label: 'CR90 · 92 × 60 mm' },
  { id: 'CR100', group: 'card', w: 98.5, h: 67.0, radius: 3.18, label: 'CR100 · 98.5 × 67 mm' },
  { id: 'BIZ85x55', group: 'card', w: 85.0, h: 55.0, radius: 0, label: '85 × 55 mm' },
  { id: 'BADGE4x3', group: 'label', w: 101.6, h: 76.2, radius: 0, label: '4 × 3″ · 101.6 × 76.2 mm' },
  { id: 'BADGE4x6', group: 'label', w: 152.4, h: 101.6, radius: 0, label: '4 × 6″ · 152.4 × 101.6 mm' },
  { id: 'LBL100x62', group: 'label', w: 100.0, h: 62.0, radius: 0, label: '62 × 100 mm' },
  { id: 'LBL89x36', group: 'label', w: 89.0, h: 36.0, radius: 0, label: '89 × 36 mm' },
  { id: 'A7', group: 'paper', w: 105.0, h: 74.0, radius: 0, label: 'A7 · 105 × 74 mm' },
  { id: 'A6', group: 'paper', w: 148.0, h: 105.0, radius: 0, label: 'A6 · 148 × 105 mm' },
  { id: 'CUSTOM', group: 'custom', w: 85.6, h: 53.98, radius: 0, label: '…' },
];

export const SHEETS = {
  A4: { w: 210, h: 297, label: 'A4' },
  LETTER: { w: 215.9, h: 279.4, label: 'Letter' },
};

export function getFormat(id) {
  return FORMATS.find((f) => f.id === id) || FORMATS[0];
}

/** Dimensioni effettive del documento, tenendo conto dell'orientamento. */
export function docSize(doc) {
  const landscape = doc.orientation !== 'portrait';
  const a = Math.max(doc.w, doc.h);
  const b = Math.min(doc.w, doc.h);
  return landscape ? { w: a, h: b } : { w: b, h: a };
}
