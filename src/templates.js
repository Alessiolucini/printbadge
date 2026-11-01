import { mm } from './editor/editor.js';

// Modelli di partenza nello stile PRINTBADGE.COM: colori pieni (navy, blu e accenti CMYK),
// niente sfumature. Coordinate in millimetri. Le forme che toccano il bordo escono di 2 mm,
// così la stampa con abbondanza resta piena.
const NAVY = '#0B1D51';
const BLUE = '#2563FF';
const CYAN = '#06B6D4';
const MAGENTA = '#EC4899';
const YELLOW = '#FACC15';
const SLATE = '#64748B';
const LIGHT = '#E8F1FF';
const PALE = '#BFD3FF';
const OUT = 2;

/** Due onde piatte sovrapposte nell'angolo in basso a destra. */
function swoosh(ed, W, H, { main = BLUE, light = LIGHT, k = 1 } = {}) {
  const w = mm(W + OUT);
  const h = mm(H + OUT);
  const H0 = mm(H);
  const W0 = mm(W);
  ed.addPath(`M ${W0 * 0.28} ${h} C ${W0 * 0.55} ${H0 - H0 * 0.07 * k} ${W0 * 0.8} ${H0 - H0 * 0.17 * k} ${w} ${H0 - H0 * 0.31 * k} L ${w} ${h} Z`, { fill: light });
  ed.addPath(`M ${W0 * 0.5} ${h} C ${W0 * 0.7} ${H0 - H0 * 0.05 * k} ${W0 * 0.88} ${H0 - H0 * 0.12 * k} ${w} ${H0 - H0 * 0.22 * k} L ${w} ${h} Z`, { fill: main });
}

/** Fascia a quattro righe nette ciano, magenta, giallo e navy: i colori della stampa. */
function cmykStripe(ed, x, y, width, height) {
  const part = width / 4;
  [CYAN, MAGENTA, YELLOW, NAVY].forEach((fill, i) => {
    ed.addShape('rect', { x: x + part * i, y, width: part + (i < 3 ? 1 : 0), height, fill });
  });
}

async function eventPortrait(ed, t, { category, bg = '#FFFFFF', ink = NAVY, sub = SLATE, accent = BLUE, light = LIGHT, categoryColor }) {
  const W = 53.98;
  const H = 85.6;
  ed.setSide('front');
  ed.setBackgroundColor(bg);
  swoosh(ed, W, H, { main: accent, light, k: 0.62 });
  await ed.addLogo({ x: mm(4), y: mm(5), width: mm(24), height: mm(8.4) });
  ed.addText({ text: category, x: mm(4), y: mm(16.5), width: mm(46), pt: 16, fontWeight: 'bold', fontFamily: 'Montserrat', fill: categoryColor || ink, fitText: 1 });
  ed.addShape('rect', { x: mm(4), y: mm(25.2), width: mm(12), height: mm(0.9), fill: accent });
  ed.addText({ text: '{{Nome}} {{Cognome}}', x: mm(4), y: mm(28), width: mm(46), pt: 11.5, fontWeight: 'bold', fontFamily: 'Montserrat', fill: ink, fitText: 2 });
  ed.addText({ text: '{{Ruolo}}', x: mm(4), y: mm(38.6), width: mm(46), pt: 7.5, fill: sub, fitText: 1 });
  ed.addText({ text: '{{Azienda}}', x: mm(4), y: mm(43), width: mm(46), pt: 7, fontWeight: 'bold', fill: accent, fitText: 1 });
  await ed.addPhoto('Foto', { x: mm(4), y: mm(48), width: mm(20), height: mm(24), photoShape: 'rounded' });
  await ed.addBarcode('qrcode', '{{Email}}', { x: mm(29), y: mm(49), width: mm(20.5), height: mm(20.5), color: ink });
  ed.setSide('back');
  ed.setBackgroundColor(bg === '#FFFFFF' ? '#F8FAFC' : bg);
  swoosh(ed, W, H, { main: accent, light, k: 0.8 });
  await ed.addLogo({ x: mm(15), y: mm(14), width: mm(24), height: mm(8.4) });
  ed.addText({ text: t('tplBackEvent'), x: mm(6), y: mm(30), width: mm(42), pt: 8, fill: ink, textAlign: 'center', lineHeight: 1.3, fontFamily: 'Montserrat', fontWeight: 'bold' });
  ed.addText({ text: t('tplBackEventSub'), x: mm(6), y: mm(42), width: mm(42), pt: 6.5, fill: sub, textAlign: 'center', lineHeight: 1.3 });
  ed.setSide('front');
}

export const TEMPLATES = [
  {
    id: 'attendee',
    formatId: 'CR80',
    orientation: 'portrait',
    build: (ed, t) => eventPortrait(ed, t, { category: t('tplAttendee') }),
  },
  {
    id: 'speaker',
    formatId: 'CR80',
    orientation: 'portrait',
    build: (ed, t) => eventPortrait(ed, t, { category: t('tplSpeaker'), bg: NAVY, ink: '#FFFFFF', sub: PALE, accent: CYAN, light: BLUE }),
  },
  {
    id: 'staff',
    formatId: 'CR80',
    orientation: 'portrait',
    build: (ed, t) => eventPortrait(ed, t, { category: t('tplStaff'), accent: MAGENTA, light: '#FCE7F3', categoryColor: MAGENTA }),
  },
  {
    id: 'employee',
    formatId: 'CR80',
    orientation: 'landscape',
    async build(ed, t) {
      const W = 85.6;
      const H = 53.98;
      ed.setSide('front');
      ed.addShape('rect', { x: mm(-OUT), y: mm(-OUT), width: mm(28 + OUT), height: mm(H + 2 * OUT), fill: BLUE });
      await ed.addPhoto('Foto', { x: mm(4), y: mm(7), width: mm(20), height: mm(25), photoShape: 'rounded' });
      ed.addText({ text: 'ID {{Matricola}}', x: mm(2), y: mm(36), width: mm(24), pt: 7, fontWeight: 'bold', fill: '#FFFFFF', textAlign: 'center', fontFamily: 'Montserrat', fitText: 1 });
      ed.addText({ text: t('tplStaff'), x: mm(2), y: mm(43), width: mm(24), pt: 7, fill: LIGHT, textAlign: 'center', charSpacing: 300, fontFamily: 'Montserrat' });
      await ed.addLogo({ x: mm(32), y: mm(5), width: mm(22), height: mm(7.7) });
      ed.addText({ text: '{{Nome}} {{Cognome}}', x: mm(32), y: mm(16), width: mm(50), pt: 13, fontWeight: 'bold', fontFamily: 'Montserrat', fill: NAVY, fitText: 2 });
      ed.addText({ text: '{{Ruolo}}', x: mm(32), y: mm(28), width: mm(50), pt: 8, fill: SLATE, fitText: 1 });
      await ed.addBarcode('code128', '{{Matricola}}', { x: mm(32), y: mm(36), width: mm(36), height: mm(13), color: NAVY });
      ed.addPath(`M ${mm(W * 0.78)} ${mm(H + OUT)} C ${mm(W * 0.86)} ${mm(H * 0.94)} ${mm(W * 0.94)} ${mm(H * 0.84)} ${mm(W + OUT)} ${mm(H * 0.7)} L ${mm(W + OUT)} ${mm(H + OUT)} Z`, { fill: BLUE });
      ed.setSide('back');
      ed.setBackgroundColor('#F8FAFC');
      ed.addShape('rect', { x: mm(-OUT), y: mm(-OUT), width: mm(W + 2 * OUT), height: mm(6 + OUT), fill: BLUE });
      ed.addText({ text: t('tplBackNote'), x: mm(5), y: mm(12), width: mm(50), pt: 7, fill: '#1F2937', lineHeight: 1.3 });
      ed.addShape('line', { x: mm(5), y: mm(43), width: mm(45), height: mm(0.3), fill: SLATE });
      ed.addText({ text: t('tplSignature'), x: mm(5), y: mm(44.5), width: mm(45), pt: 6, fill: SLATE });
      await ed.addBarcode('qrcode', '{{Email}}', { x: mm(60), y: mm(17), width: mm(21), height: mm(21), color: NAVY });
      ed.setSide('front');
    },
  },
  {
    id: 'visitor',
    formatId: 'CR80',
    orientation: 'portrait',
    async build(ed, t) {
      const W = 53.98;
      const H = 85.6;
      ed.setSide('front');
      ed.addShape('rect', { x: mm(-OUT), y: mm(-OUT), width: mm(W + 2 * OUT), height: mm(22 + OUT), fill: BLUE });
      ed.addText({ text: t('tplVisitor'), x: mm(3), y: mm(8), width: mm(48), pt: 15, fontWeight: 'bold', fill: '#FFFFFF', textAlign: 'center', charSpacing: 200, fontFamily: 'Montserrat', fitText: 1 });
      ed.addText({ text: '{{Nome}} {{Cognome}}', x: mm(4), y: mm(29), width: mm(46), pt: 14, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Montserrat', fill: NAVY, fitText: 2 });
      ed.addText({ text: '{{Azienda}}', x: mm(4), y: mm(43), width: mm(46), pt: 9, fill: SLATE, textAlign: 'center', fitText: 1 });
      await ed.addBarcode('qrcode', '{{Email}}', { x: mm(16), y: mm(52), width: mm(22), height: mm(22), color: NAVY });
      ed.addText({ text: t('tplReturn'), x: mm(4), y: mm(77.5), width: mm(46), pt: 6, fill: SLATE, textAlign: 'center' });
      cmykStripe(ed, mm(-OUT), mm(H - 2.2), mm(W + 2 * OUT), mm(2.2 + OUT));
      ed.setSide('front');
    },
  },
  {
    id: 'event',
    formatId: 'BADGE4x3',
    orientation: 'landscape',
    async build(ed, t) {
      const W = 101.6;
      const H = 76.2;
      ed.setSide('front');
      ed.addShape('rect', { x: mm(-OUT), y: mm(-OUT), width: mm(W + 2 * OUT), height: mm(19 + OUT), fill: NAVY });
      ed.addText({ text: t('tplEventName'), x: mm(6), y: mm(4), width: mm(66), pt: 14, fontWeight: 'bold', fill: '#FFFFFF', fontFamily: 'Montserrat', fitText: 1 });
      ed.addText({ text: t('tplEventDate'), x: mm(6), y: mm(11.5), width: mm(66), pt: 7.5, fill: PALE, charSpacing: 150, fontFamily: 'Montserrat' });
      await ed.addLogo({ x: mm(74), y: mm(5), width: mm(22), height: mm(7.7) });
      ed.addText({ text: '{{Nome}}', x: mm(6), y: mm(25), width: mm(62), pt: 28, fontWeight: 'bold', fontFamily: 'Montserrat', fill: NAVY, fitText: 1 });
      ed.addText({ text: '{{Cognome}}', x: mm(6), y: mm(39), width: mm(62), pt: 16, fontFamily: 'Montserrat', fill: NAVY, fitText: 1 });
      ed.addText({ text: '{{Azienda}}', x: mm(6), y: mm(51), width: mm(62), pt: 10, fill: SLATE, fitText: 1 });
      await ed.addBarcode('qrcode', '{{Email}}', { x: mm(72), y: mm(26), width: mm(24), height: mm(24), color: NAVY });
      ed.addShape('rect', { x: mm(-OUT), y: mm(H - 9), width: mm(W + 2 * OUT), height: mm(9 + OUT), fill: BLUE });
      ed.addText({ text: t('tplAttendee'), x: 0, y: mm(H - 6.6), width: mm(W), pt: 9, fontWeight: 'bold', fill: '#FFFFFF', textAlign: 'center', charSpacing: 300, fontFamily: 'Montserrat' });
      ed.setSide('front');
    },
  },
  {
    id: 'member',
    formatId: 'CR80',
    orientation: 'landscape',
    async build(ed, t) {
      const W = 85.6;
      const H = 53.98;
      ed.setSide('front');
      ed.addShape('rect', { x: mm(-OUT), y: mm(-OUT), width: mm(W + 2 * OUT), height: mm(H + 2 * OUT), fill: NAVY });
      ed.addPath(`M ${mm(W * 0.42)} ${mm(H + OUT)} C ${mm(W * 0.62)} ${mm(H * 0.9)} ${mm(W * 0.84)} ${mm(H * 0.7)} ${mm(W + OUT)} ${mm(H * 0.42)} L ${mm(W + OUT)} ${mm(H + OUT)} Z`, { fill: BLUE });
      await ed.addPhoto('Foto', { x: mm(5), y: mm(12), width: mm(25), height: mm(25), photoShape: 'circle' });
      ed.addText({ text: t('tplMemberCard'), x: mm(35), y: mm(7), width: mm(46), pt: 7.5, fontWeight: 'bold', fill: '#93C5FD', charSpacing: 250, fontFamily: 'Montserrat' });
      ed.addText({ text: '{{Nome}} {{Cognome}}', x: mm(35), y: mm(16), width: mm(46), pt: 13, fontWeight: 'bold', fill: '#FFFFFF', fontFamily: 'Montserrat', fitText: 2 });
      ed.addText({ text: 'N. {{Matricola}}', x: mm(35), y: mm(29), width: mm(30), pt: 9, fill: LIGHT, fontFamily: 'Roboto Mono' });
      await ed.addBarcode('datamatrix', '{{Matricola}}', { x: mm(70), y: mm(38), width: mm(11), height: mm(11), color: '#FFFFFF' });
      ed.addText({ text: t('tplValid'), x: mm(35), y: mm(44), width: mm(32), pt: 6.5, fill: PALE });
      ed.setSide('front');
    },
  },
  {
    id: 'blank',
    formatId: 'CR80',
    orientation: 'portrait',
    async build(ed) {
      ed.setSide('front');
    },
  },
];

export async function applyTemplate(editor, tpl, t) {
  editor.setSide('front');
  await editor.load({ doc: { ...editor.doc, formatId: tpl.formatId, orientation: tpl.orientation, backEnabled: true }, sides: {} });
  editor.setFormat({ formatId: tpl.formatId });
  await tpl.build(editor, t);
  editor.canvas.discardActiveObject();
  editor.canvas.requestRenderAll();
  editor.resetHistory();
}
