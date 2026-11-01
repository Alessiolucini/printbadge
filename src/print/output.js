import { jsPDF } from 'jspdf';

// Modello di pagina comune a stampa da browser e PDF:
// { w, h, items: [{ img, x, y, w, h }], marks: [[x1, y1, x2, y2]] } in millimetri.

export function rotate180(canvas) {
  const c = document.createElement('canvas');
  c.width = canvas.width;
  c.height = canvas.height;
  const g = c.getContext('2d');
  g.translate(c.width, c.height);
  g.rotate(Math.PI);
  g.drawImage(canvas, 0, 0);
  return c;
}

/** Una card per pagina, pagina della misura esatta del supporto. */
export function cardPages(images, card, { bleed = 0, offsetX = 0, offsetY = 0, scale = 100 }) {
  const s = scale / 100;
  const iw = (card.w + 2 * bleed) * s;
  const ih = (card.h + 2 * bleed) * s;
  return images.map((img) => ({
    w: card.w,
    h: card.h,
    items: [{ img, x: (card.w - iw) / 2 + offsetX, y: (card.h - ih) / 2 + offsetY, w: iw, h: ih }],
    marks: [],
  }));
}

export function sheetGrid(sheet, card, { margin = 10, gap = 4 }) {
  const cols = Math.max(1, Math.floor((sheet.w - 2 * margin + gap) / (card.w + gap)));
  const rows = Math.max(1, Math.floor((sheet.h - 2 * margin + gap) / (card.h + gap)));
  const gridW = cols * card.w + (cols - 1) * gap;
  const gridH = rows * card.h + (rows - 1) * gap;
  return { cols, rows, x0: (sheet.w - gridW) / 2, y0: (sheet.h - gridH) / 2 };
}

/**
 * Impagina le card su fogli A4/Letter. Se ci sono i retri, ogni foglio di fronti è seguito
 * dal foglio dei retri con le colonne specchiate (girando il foglio sul lato lungo).
 */
export function sheetPages(fronts, backs, sheet, card, opts) {
  const { margin = 10, gap = 4, bleed = 0, cropMarks = true, offsetX = 0, offsetY = 0 } = opts;
  const g = sheetGrid(sheet, card, { margin, gap });
  const per = g.cols * g.rows;
  const pages = [];
  for (let start = 0; start < fronts.length; start += per) {
    const make = (list, mirror) => {
      const page = { w: sheet.w, h: sheet.h, items: [], marks: [] };
      list.slice(start, start + per).forEach((img, i) => {
        if (!img) return;
        const r = Math.floor(i / g.cols);
        const col = i % g.cols;
        const c = mirror ? g.cols - 1 - col : col;
        const x = g.x0 + c * (card.w + gap) + offsetX;
        const y = g.y0 + r * (card.h + gap) + offsetY;
        page.items.push({ img, x: x - bleed, y: y - bleed, w: card.w + 2 * bleed, h: card.h + 2 * bleed });
        if (cropMarks) page.marks.push(...cropMarksFor(x, y, card.w, card.h, Math.max(1, bleed + 0.5)));
      });
      return page;
    };
    pages.push(make(fronts, false));
    if (backs) pages.push(make(backs, true));
  }
  return pages;
}

function cropMarksFor(x, y, w, h, off) {
  const L = 3;
  const m = [];
  for (const [cx, sx] of [[x, -1], [x + w, 1]]) {
    for (const [cy, sy] of [[y, -1], [y + h, 1]]) {
      m.push([cx + sx * off, cy, cx + sx * (off + L), cy]);
      m.push([cx, cy + sy * off, cx, cy + sy * (off + L)]);
    }
  }
  return m;
}

const toURL = (img) => (typeof img === 'string' ? img : img.toDataURL('image/png'));

/** Apre il dialogo di stampa del sistema con pagine della misura esatta (@page). */
export function printPages(pages) {
  return new Promise((resolve) => {
    const { w, h } = pages[0];
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(frame);
    const body = pages
      .map((p) => {
        const imgs = p.items
          .map((it) => `<img src="${toURL(it.img)}" style="left:${it.x}mm;top:${it.y}mm;width:${it.w}mm;height:${it.h}mm">`)
          .join('');
        const marks = p.marks
          .map(([x1, y1, x2, y2]) =>
            x1 === x2
              ? `<i style="left:${x1 - 0.075}mm;top:${Math.min(y1, y2)}mm;width:0.15mm;height:${Math.abs(y2 - y1)}mm"></i>`
              : `<i style="left:${Math.min(x1, x2)}mm;top:${y1 - 0.075}mm;width:${Math.abs(x2 - x1)}mm;height:0.15mm"></i>`,
          )
          .join('');
        return `<section>${imgs}${marks}</section>`;
      })
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Print Badge</title><style>
      @page { size: ${w}mm ${h}mm; margin: 0; }
      html, body { margin: 0; padding: 0; background: #fff; }
      section { position: relative; width: ${w}mm; height: ${h}mm; overflow: hidden; break-after: page; page-break-after: always; }
      section:last-child { break-after: auto; page-break-after: auto; }
      img { position: absolute; display: block; image-rendering: auto; }
      i { position: absolute; background: #000; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    </style></head><body>${body}</body></html>`;
    const doc = frame.contentDocument;
    doc.open();
    doc.write(html);
    doc.close();
    const images = [...doc.images];
    Promise.all(images.map((im) => (im.complete ? 0 : new Promise((r) => (im.onload = im.onerror = r))))).then(() => {
      setTimeout(() => {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        setTimeout(() => {
          frame.remove();
          resolve();
        }, 1500);
      }, 50);
    });
  });
}

/** jpeg = true produce file molto più leggeri (utile per gli ordini caricati online). */
export function pagesToPDF(pages, { jpeg = false, quality = 0.92 } = {}) {
  const orient = (p) => (p.w > p.h ? 'l' : 'p');
  const encode = (img) => (jpeg && typeof img !== 'string' ? img.toDataURL('image/jpeg', quality) : toURL(img));
  const first = pages[0];
  const pdf = new jsPDF({ unit: 'mm', format: [first.w, first.h], orientation: orient(first), compress: true });
  pages.forEach((p, i) => {
    if (i > 0) pdf.addPage([p.w, p.h], orient(p));
    for (const it of p.items) pdf.addImage(encode(it.img), jpeg ? 'JPEG' : 'PNG', it.x, it.y, it.w, it.h, undefined, 'FAST');
    if (p.marks.length) {
      pdf.setLineWidth(0.15);
      pdf.setDrawColor(0);
      for (const [x1, y1, x2, y2] of p.marks) pdf.line(x1, y1, x2, y2);
    }
  });
  pdf.setProperties({ title: 'Print Badge', creator: 'Print Badge' });
  return pdf.output('blob');
}

/** Converte un canvas in un'etichetta ZPL (^GFA), con dithering Floyd–Steinberg opzionale. */
export function canvasToZPL(canvas, { dither = true, threshold = 128 } = {}) {
  const w = canvas.width;
  const h = canvas.height;
  const px = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = px[i * 4 + 3] / 255;
    const lum = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    gray[i] = lum * a + 255 * (1 - a);
  }
  const bytesPerRow = Math.ceil(w / 8);
  const out = new Uint8Array(bytesPerRow * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const old = gray[i];
      const black = old < threshold;
      if (black) out[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
      if (dither) {
        const err = old - (black ? 0 : 255);
        if (x + 1 < w) gray[i + 1] += (err * 7) / 16;
        if (y + 1 < h) {
          if (x > 0) gray[i + w - 1] += (err * 3) / 16;
          gray[i + w] += (err * 5) / 16;
          if (x + 1 < w) gray[i + w + 1] += err / 16;
        }
      }
    }
  }
  let hex = '';
  for (const b of out) hex += b.toString(16).padStart(2, '0');
  const total = out.length;
  return `^XA^PW${w}^LL${h}^LH0,0^FO0,0^GFA,${total},${total},${bytesPerRow},${hex.toUpperCase()}^FS^PQ1^XZ\n`;
}

export function download(blobOrUrl, filename) {
  const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (typeof blobOrUrl !== 'string') setTimeout(() => URL.revokeObjectURL(url), 4000);
}
