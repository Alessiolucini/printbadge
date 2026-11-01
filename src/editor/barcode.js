import { toSVG } from 'bwip-js';

export const BARCODE_TYPES = [
  { id: 'qrcode', label: 'QR Code', twoD: true, sample: 'https://example.com' },
  { id: 'datamatrix', label: 'Data Matrix', twoD: true, sample: 'BADGE-0001' },
  { id: 'azteccode', label: 'Aztec', twoD: true, sample: 'BADGE-0001' },
  { id: 'pdf417', label: 'PDF417', twoD: true, sample: 'BADGE-0001' },
  { id: 'code128', label: 'Code 128', twoD: false, sample: '000123' },
  { id: 'code39', label: 'Code 39', twoD: false, sample: 'ABC123' },
  { id: 'ean13', label: 'EAN-13', twoD: false, sample: '590123412345' },
  { id: 'ean8', label: 'EAN-8', twoD: false, sample: '9638507' },
  { id: 'upca', label: 'UPC-A', twoD: false, sample: '01234567890' },
  { id: 'interleaved2of5', label: 'Interleaved 2 of 5', twoD: false, sample: '12345670' },
  { id: 'rationalizedCodabar', label: 'Codabar', twoD: false, sample: 'A123456B' },
];

// Le dimensioni intrinseche dell'SVG vengono moltiplicate per evitare che i browser
// che rasterizzano le immagini SVG alla misura naturale producano codici sfocati.
const INTRINSIC_SCALE = 8;

export function barcodeType(id) {
  return BARCODE_TYPES.find((b) => b.id === id) || BARCODE_TYPES[0];
}

export function barcodeSVG({ bcid, value, color = '#000000', showText = true }) {
  const type = barcodeType(bcid);
  const hex = color.replace('#', '');
  const opts = {
    bcid,
    text: String(value ?? ''),
    barcolor: hex,
    textcolor: hex,
    paddingwidth: 0,
    paddingheight: 0,
  };
  if (!type.twoD) {
    opts.height = 12;
    opts.includetext = showText;
    opts.textxalign = 'center';
  }
  const svg = toSVG(opts);
  const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!m) return svg;
  const w = parseFloat(m[1]) * INTRINSIC_SCALE;
  const h = parseFloat(m[2]) * INTRINSIC_SCALE;
  return svg.replace('<svg ', `<svg width="${w}" height="${h}" preserveAspectRatio="none" `);
}

export function svgToDataURL(svg) {
  const bytes = new TextEncoder().encode(svg);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return 'data:image/svg+xml;base64,' + btoa(bin);
}

/** Genera il codice; se il valore non è valido per la simbologia usa il valore di esempio. */
export function safeBarcodeDataURL(opts) {
  try {
    return { url: svgToDataURL(barcodeSVG(opts)), error: null };
  } catch (err) {
    const msg = String(err?.message || err).replace(/^bwipp\.\w+#\d+:\s*/, '');
    return {
      url: svgToDataURL(barcodeSVG({ ...opts, value: barcodeType(opts.bcid).sample })),
      error: msg,
    };
  }
}
