import { StaticCanvas, util, cache } from 'fabric';
import { PX_PER_MM, docSize } from '../config/formats.js';
import { mergeText, fieldValue } from '../data/merge.js';
import { resolvePhoto } from '../data/store.js';
import { regenerateBarcode, setImageCover, fitTextbox, applyPhotoShape, PHOTO_PLACEHOLDER, LOGO_PLACEHOLDER } from '../editor/editor.js';

export const FONTS = [
  'Inter', 'Roboto', 'Lato', 'Montserrat', 'Poppins', 'Oswald', 'Playfair Display', 'Roboto Mono',
  'Arial', 'Helvetica', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New',
];

/** Carica i web font prima di misurare il testo, altrimenti Fabric memorizza misure sbagliate. */
export async function preloadFonts(families = FONTS) {
  const jobs = [];
  for (const f of families) {
    for (const variant of ['', 'bold ', 'italic ', 'italic bold ']) {
      jobs.push(document.fonts.load(`${variant}24px "${f}"`).catch(() => null));
    }
  }
  await Promise.all(jobs);
  cache.clearFontCache();
}

/**
 * Disegna un lato della card su un canvas alla risoluzione richiesta.
 * @param sideJSON  lato serializzato dall'editor
 * @param doc       documento (formato/orientamento)
 * @param options   record per la stampa unione, dpi, abbondanza in mm
 */
export async function renderSide(sideJSON, doc, { record = null, dpi = 300, bleedMm = 0 } = {}) {
  const { w, h } = docSize(doc);
  const W = w * PX_PER_MM;
  const H = h * PX_PER_MM;
  const B = Math.max(0, bleedMm) * PX_PER_MM;
  const el = document.createElement('canvas');
  const sc = new StaticCanvas(el, {
    width: W + 2 * B,
    height: H + 2 * B,
    enableRetinaScaling: false,
    renderOnAddRemove: false,
    backgroundColor: sideJSON?.background || '#ffffff',
  });
  sc.setViewportTransform([1, 0, 0, 1, B, B]);

  const objs = await util.enlivenObjects(sideJSON?.objects || []);
  for (const o of objs) {
    if (o.visible === false) continue;
    if (o.kind === 'text') {
      if (record) o.set('text', mergeText(o.text, record));
      if (o.fitText) fitTextbox(o);
    } else if (o.kind === 'barcode') {
      await regenerateBarcode(o, record);
    } else if (o.kind === 'photo') {
      const src = record && o.field ? resolvePhoto(fieldValue(record, o.field)) : null;
      if (src) {
        try {
          await setImageCover(o, src);
        } catch {
          continue;
        }
      } else if (o.getSrc() === PHOTO_PLACEHOLDER) {
        // Segnaposto senza foto: non si stampa la sagoma grigia.
        continue;
      }
      applyPhotoShape(o);
    } else if (o.kind === 'image' && o.getSrc() === LOGO_PLACEHOLDER) {
      // Segnaposto del logo mai sostituito: non si stampa.
      continue;
    } else if (o.kind === 'background' && B) {
      const s = Math.max((W + 2 * B) / o.width, (H + 2 * B) / o.height);
      o.set({ scaleX: s, scaleY: s, left: (W - o.width * s) / 2, top: (H - o.height * s) / 2 });
    }
    sc.add(o);
  }
  sc.renderAll();
  const out = sc.toCanvasElement(dpi / 25.4 / PX_PER_MM);
  sc.dispose();
  return out;
}

/** Card di calibrazione: bordo, area sicura, croce centrale e righello in mm. */
export function calibrationCanvas(doc, dpi = 300) {
  const { w, h } = docSize(doc);
  const k = dpi / 25.4;
  const c = document.createElement('canvas');
  c.width = Math.round(w * k);
  c.height = Math.round(h * k);
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#000';
  g.lineWidth = 0.25 * k;
  g.strokeRect(1 * k, 1 * k, (w - 2) * k, (h - 2) * k);
  g.setLineDash([1 * k, 1 * k]);
  g.strokeRect(3 * k, 3 * k, (w - 6) * k, (h - 6) * k);
  g.setLineDash([]);
  g.beginPath();
  g.moveTo((w / 2) * k, (h / 2 - 5) * k);
  g.lineTo((w / 2) * k, (h / 2 + 5) * k);
  g.moveTo((w / 2 - 5) * k, (h / 2) * k);
  g.lineTo((w / 2 + 5) * k, (h / 2) * k);
  g.stroke();
  g.fillStyle = '#000';
  for (let i = 0; i <= 12; i++) {
    const len = i % 5 === 0 ? 3 : 1.6;
    g.fillRect((w / 2 - 6 + i) * k, 0, 0.2 * k, len * k);
    g.fillRect(0, (h / 2 - 6 + i) * k, len * k, 0.2 * k);
  }
  g.font = `${2.4 * k}px Inter, Arial, sans-serif`;
  g.textAlign = 'center';
  g.fillText('▲ TOP', (w / 2) * k, 8 * k);
  g.font = `${1.8 * k}px Inter, Arial, sans-serif`;
  g.fillText(`Print Badge · ${w.toFixed(1)} × ${h.toFixed(1)} mm · ${dpi} dpi`, (w / 2) * k, (h - 6) * k);
  g.fillText('Bordo continuo = 1 mm · tratteggio = 3 mm', (w / 2) * k, (h - 3.8) * k);
  return c;
}
