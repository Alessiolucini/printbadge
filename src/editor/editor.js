import {
  Canvas,
  Textbox,
  Rect,
  Circle,
  Triangle,
  Path,
  FabricImage,
  BaseFabricObject,
  InteractiveFabricObject,
  ActiveSelection,
  util,
} from 'fabric';
import { PX_PER_MM, docSize, getFormat } from '../config/formats.js';
import { barcodeType, safeBarcodeDataURL } from './barcode.js';
import { hasFields, mergeText } from '../data/merge.js';

// Coordinate "classiche" (angolo in alto a sinistra) per tutti gli oggetti: la rotazione
// resta comunque centrata grazie a centeredRotation.
BaseFabricObject.ownDefaults.originX = 'left';
BaseFabricObject.ownDefaults.originY = 'top';
Object.assign(InteractiveFabricObject.ownDefaults, {
  transparentCorners: false,
  cornerColor: '#ffffff',
  cornerStrokeColor: '#0567cf',
  borderColor: '#0567cf',
  cornerStyle: 'circle',
  cornerSize: 10,
  borderScaleFactor: 1.5,
  padding: 0,
});

export const CUSTOM_PROPS = [
  'uid', 'kind', 'field', 'bcid', 'bcValue', 'bcColor', 'bcShowText', 'fitText', 'photoShape', 'locked',
];

export const PT_PX = (25.4 / 72) * PX_PER_MM; // pixel di progetto per punto tipografico
export const mm = (v) => v * PX_PER_MM;
export const toMm = (px) => px / PX_PER_MM;
const SCREEN_PAD = 28;
const SAFE_MM = 3;

export const PHOTO_PLACEHOLDER =
  'data:image/svg+xml;base64,' +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">' +
      '<rect width="300" height="400" fill="#e8f1ff"/>' +
      '<circle cx="150" cy="150" r="70" fill="#a9c2f5"/>' +
      '<path d="M30 400c0-90 54-150 120-150s120 60 120 150z" fill="#a9c2f5"/></svg>',
  );

export const LOGO_PLACEHOLDER =
  'data:image/svg+xml;base64,' +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="140" viewBox="0 0 400 140">' +
      '<rect x="3" y="3" width="394" height="134" rx="22" fill="#e8f1ff" stroke="#0567cf" stroke-width="5" stroke-dasharray="16 12"/>' +
      '<rect x="40" y="38" width="64" height="64" rx="14" fill="#0567cf"/>' +
      '<path d="M52 90l16-20 12 13 8-9 12 16z" fill="#fff"/><circle cx="88" cy="56" r="7" fill="#fff"/>' +
      '<text x="128" y="88" font-family="Montserrat,Arial,sans-serif" font-weight="800" font-size="46" fill="#0567cf">LOGO</text></svg>',
  );

export function uid() {
  return (crypto.randomUUID?.() || String(Math.random()).slice(2)).slice(0, 8);
}

export function applyLock(obj, locked) {
  obj.locked = !!locked;
  obj.set({
    lockMovementX: obj.locked,
    lockMovementY: obj.locked,
    lockScalingX: obj.locked,
    lockScalingY: obj.locked,
    lockRotation: obj.locked,
    hasControls: !obj.locked,
  });
  if (obj.kind === 'text') obj.editable = !obj.locked;
}

export function applyPhotoShape(img) {
  const shape = img.photoShape || 'rect';
  if (shape === 'rect') {
    img.clipPath = undefined;
  } else {
    const w = img.width;
    const h = img.height;
    const common = { originX: 'center', originY: 'center', left: 0, top: 0 };
    img.clipPath =
      shape === 'circle'
        ? new Circle({ ...common, radius: Math.min(w, h) / 2 })
        : new Rect({ ...common, width: w, height: h, rx: Math.min(w, h) * 0.14, ry: Math.min(w, h) * 0.14 });
  }
  img.dirty = true;
}

function naturalSize(img) {
  const el = img.getElement();
  return { w: el.naturalWidth || el.width, h: el.naturalHeight || el.height };
}

/** Sostituisce l'immagine riempiendo il riquadro attuale (ritaglio centrato, come "cover"). */
export async function setImageCover(img, src) {
  const boxW = img.getScaledWidth();
  const boxH = img.getScaledHeight();
  await img.setSrc(src, { crossOrigin: 'anonymous' });
  const { w, h } = naturalSize(img);
  const s = Math.max(boxW / w, boxH / h);
  const cw = boxW / s;
  const ch = boxH / s;
  img.set({ cropX: (w - cw) / 2, cropY: (h - ch) / 2, width: cw, height: ch, scaleX: s, scaleY: s });
  applyPhotoShape(img);
  img.setCoords();
}

/** Sostituisce l'immagine adattandola al riquadro senza ritagliarla (per i loghi). */
export async function setImageContain(img, src) {
  const boxW = img.getScaledWidth();
  const boxH = img.getScaledHeight();
  const cx = img.left + boxW / 2;
  const cy = img.top + boxH / 2;
  await img.setSrc(src, { crossOrigin: 'anonymous' });
  const { w, h } = naturalSize(img);
  const s = Math.min(boxW / w, boxH / h);
  img.set({ cropX: 0, cropY: 0, width: w, height: h, scaleX: s, scaleY: s, left: cx - (w * s) / 2, top: cy - (h * s) / 2 });
  img.setCoords();
}

/** Valore del codice da mostrare: unisce i campi con il record o usa un esempio valido. */
export function barcodeValueFor(obj, record) {
  const raw = obj.bcValue ?? '';
  if (!hasFields(raw)) return raw || barcodeType(obj.bcid).sample;
  const merged = record ? mergeText(raw, record) : '';
  return merged || barcodeType(obj.bcid).sample;
}

export async function regenerateBarcode(obj, record) {
  const { url, error } = safeBarcodeDataURL({
    bcid: obj.bcid,
    value: barcodeValueFor(obj, record),
    color: obj.bcColor || '#000000',
    showText: obj.bcShowText !== false,
  });
  const boxW = obj.getScaledWidth();
  const boxH = obj.getScaledHeight();
  await obj.setSrc(url);
  const { w, h } = naturalSize(obj);
  obj.set({ width: w, height: h, cropX: 0, cropY: 0 });
  if (barcodeType(obj.bcid).twoD) {
    const s = Math.min(boxW / w, boxH / h);
    obj.set({ scaleX: s, scaleY: s });
  } else {
    obj.set({ scaleX: boxW / w, scaleY: boxH / h });
  }
  obj.setCoords();
  return error;
}

/** Riduce il corpo del testo finché non sta nel numero di righe previsto. */
export function fitTextbox(tb) {
  const lines = Math.max(1, tb.fitText | 0);
  let guard = 60;
  tb.initDimensions();
  while (guard-- > 0 && tb.fontSize > 4 && (tb.textLines.length > lines || tb.dynamicMinWidth > tb.width + 0.5)) {
    tb.set('fontSize', tb.fontSize * 0.94);
    tb.initDimensions();
  }
}

export class BadgeEditor {
  constructor({ canvases, panes, holder, overlay }) {
    this.doc = { formatId: 'CR80', w: 85.6, h: 53.98, radius: 3.18, orientation: 'landscape', backEnabled: true };
    this.side = 'front';
    this.zoom = 1;
    this.snap = true;
    this.showSafe = true;
    this.previewRecord = null;
    this.holder = holder;
    this.overlay = overlay;
    this.panes = panes;
    this.listeners = new Map();
    this.loading = 0;
    this.clipboard = null;
    this.guides = { v: false, h: false };
    this.history = { front: { stack: [], index: -1 }, back: { stack: [], index: -1 } };
    this.canvases = {
      front: this.#makeCanvas(canvases.front, 'front'),
      back: this.#makeCanvas(canvases.back, 'back'),
    };
    this.applyFormat();
  }

  // ---------- eventi ----------
  on(evt, fn) {
    if (!this.listeners.has(evt)) this.listeners.set(evt, new Set());
    this.listeners.get(evt).add(fn);
  }
  emit(evt, payload) {
    for (const fn of this.listeners.get(evt) || []) fn(payload);
  }

  get canvas() {
    return this.canvases[this.side];
  }

  get size() {
    const { w, h } = docSize(this.doc);
    return { wMm: w, hMm: h, w: mm(w), h: mm(h) };
  }

  #makeCanvas(el, side) {
    const c = new Canvas(el, {
      preserveObjectStacking: true,
      backgroundColor: '#ffffff',
      controlsAboveOverlay: true,
      stopContextMenu: true,
      targetFindTolerance: 4,
    });
    c.badgeSide = side;
    const changed = () => this.#changed(side);
    c.on('object:added', changed);
    c.on('object:removed', changed);
    c.on('object:modified', (e) => {
      this.#normalizeScale(e.target);
      changed();
      this.emit('selection');
    });
    c.on('text:changed', changed);
    c.on('text:editing:exited', () => this.emit('selection'));
    c.on('selection:created', () => this.emit('selection'));
    c.on('selection:updated', () => this.emit('selection'));
    c.on('selection:cleared', () => this.emit('selection'));
    c.on('object:moving', (e) => {
      this.#snapMove(e.target);
      this.emit('transform');
    });
    c.on('object:scaling', () => this.emit('transform'));
    c.on('object:rotating', () => this.emit('transform'));
    c.on('mouse:up', () => this.#setGuides(false, false));
    c.on('mouse:dblclick', (e) => {
      if (e.target?.kind === 'photo' || e.target?.kind === 'image') this.emit('replaceImage', e.target);
    });
    return c;
  }

  // I testi ridimensionati dagli angoli vengono riportati a scala 1 cambiando il corpo,
  // così i valori nel pannello restano leggibili e coerenti.
  #normalizeScale(obj) {
    if (!obj || obj.type === 'activeselection') return;
    if (obj.kind === 'text' && (obj.scaleX !== 1 || obj.scaleY !== 1)) {
      obj.set({ fontSize: obj.fontSize * obj.scaleY, width: obj.width * obj.scaleX, scaleX: 1, scaleY: 1 });
      obj.setCoords();
    }
    if (obj.kind === 'shape' && obj.type === 'rect' && (obj.scaleX !== 1 || obj.scaleY !== 1)) {
      obj.set({ width: obj.width * obj.scaleX, height: obj.height * obj.scaleY, scaleX: 1, scaleY: 1 });
      obj.setCoords();
    }
  }

  #snapMove(obj) {
    if (!this.snap || !obj) {
      this.#setGuides(false, false);
      return;
    }
    const { w, h } = this.size;
    const thr = 6 / this.zoom;
    const c = obj.getCenterPoint();
    let v = false;
    let hz = false;
    if (Math.abs(c.x - w / 2) < thr) {
      obj.left += w / 2 - c.x;
      v = true;
    }
    if (Math.abs(c.y - h / 2) < thr) {
      obj.top += h / 2 - c.y;
      hz = true;
    }
    if (!obj.angle) {
      const bw = obj.getScaledWidth();
      const bh = obj.getScaledHeight();
      const safe = mm(SAFE_MM);
      for (const target of [0, safe]) {
        if (!v && Math.abs(obj.left - target) < thr) obj.left = target;
        if (!v && Math.abs(obj.left + bw - (w - target)) < thr) obj.left = w - target - bw;
        if (!hz && Math.abs(obj.top - target) < thr) obj.top = target;
        if (!hz && Math.abs(obj.top + bh - (h - target)) < thr) obj.top = h - target - bh;
      }
    }
    obj.setCoords();
    this.#setGuides(v, hz);
  }

  #setGuides(v, h) {
    if (this.guides.v === v && this.guides.h === h) return;
    this.guides = { v, h };
    this.drawOverlay();
  }

  // ---------- formato, zoom, lati ----------
  setFormat(patch) {
    const before = this.size;
    Object.assign(this.doc, patch);
    if (patch.formatId && patch.formatId !== 'CUSTOM' && (patch.w === undefined || patch.h === undefined)) {
      const f = getFormat(patch.formatId);
      Object.assign(this.doc, { w: f.w, h: f.h, radius: f.radius });
    }
    const after = this.size;
    // Se cambia l'orientamento o la misura, gli oggetti vengono riproporzionati.
    if (before.w !== after.w || before.h !== after.h) {
      const sx = after.w / before.w;
      const sy = after.h / before.h;
      const s = Math.min(sx, sy);
      for (const c of Object.values(this.canvases)) {
        for (const o of c.getObjects()) {
          const cp = o.getCenterPoint();
          if (o.kind === 'background') continue;
          o.set({ scaleX: o.scaleX * s, scaleY: o.scaleY * s });
          o.setPositionByOrigin({ x: cp.x * sx, y: cp.y * sy }, 'center', 'center');
          this.#normalizeScale(o);
          o.setCoords();
        }
        this.#fitBackground(c);
      }
    }
    this.applyFormat();
    this.#changed('front');
    this.#changed('back');
    this.emit('format');
  }

  applyFormat() {
    const { w, h } = this.size;
    const r = mm(this.doc.radius || 0);
    for (const c of Object.values(this.canvases)) {
      c.clipPath = new Rect({ left: 0, top: 0, width: w, height: h, rx: r, ry: r });
    }
    this.setZoom(this.zoom);
  }

  setZoom(z) {
    this.zoom = Math.min(8, Math.max(0.2, z));
    const { w, h } = this.size;
    const pad = SCREEN_PAD;
    const cw = Math.round(w * this.zoom + pad * 2);
    const ch = Math.round(h * this.zoom + pad * 2);
    for (const c of Object.values(this.canvases)) {
      c.setDimensions({ width: cw, height: ch });
      c.setViewportTransform([this.zoom, 0, 0, this.zoom, pad, pad]);
      c.calcOffset();
      c.requestRenderAll();
    }
    this.holder.style.setProperty('--card-w', `${w * this.zoom}px`);
    this.holder.style.setProperty('--card-h', `${h * this.zoom}px`);
    this.holder.style.setProperty('--card-r', `${(this.doc.radius || 0) * PX_PER_MM * this.zoom}px`);
    this.holder.style.setProperty('--pad', `${pad}px`);
    this.holder.style.width = `${cw}px`;
    this.holder.style.height = `${ch}px`;
    this.drawOverlay();
    this.emit('zoom', this.zoom);
  }

  zoomToFit(stageEl) {
    const { w, h } = this.size;
    const availW = stageEl.clientWidth - SCREEN_PAD * 2 - 40;
    const availH = stageEl.clientHeight - SCREEN_PAD * 2 - 40;
    this.setZoom(Math.max(0.2, Math.min(availW / w, availH / h, 4)));
  }

  setSide(side) {
    if (side === 'back' && !this.doc.backEnabled) return;
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
    this.side = side;
    this.panes.front.hidden = side !== 'front';
    this.panes.back.hidden = side !== 'back';
    this.canvas.calcOffset();
    this.emit('side', side);
    this.emit('selection');
  }

  drawOverlay() {
    const { w, h } = this.size;
    const z = this.zoom;
    const W = w * z;
    const H = h * z;
    const s = mm(SAFE_MM) * z;
    const parts = [];
    if (this.showSafe) {
      parts.push(`<rect x="${s}" y="${s}" width="${W - 2 * s}" height="${H - 2 * s}" rx="${Math.max(0, (this.doc.radius || 0) * PX_PER_MM * z - s)}" class="safe"/>`);
    }
    if (this.guides.v) parts.push(`<line x1="${W / 2}" y1="0" x2="${W / 2}" y2="${H}" class="guide"/>`);
    if (this.guides.h) parts.push(`<line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" class="guide"/>`);
    this.overlay.setAttribute('width', W);
    this.overlay.setAttribute('height', H);
    this.overlay.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.overlay.innerHTML = parts.join('');
  }

  // ---------- creazione oggetti ----------
  #place(obj, { x, y } = {}) {
    const { w, h } = this.size;
    const bw = obj.getScaledWidth();
    const bh = obj.getScaledHeight();
    obj.set({ left: x ?? (w - bw) / 2, top: y ?? (h - bh) / 2 });
    obj.uid = obj.uid || uid();
    obj.setCoords();
    this.canvas.add(obj);
    this.canvas.setActiveObject(obj);
    this.canvas.requestRenderAll();
    return obj;
  }

  addText(opts = {}) {
    const { w } = this.size;
    const tb = new Textbox(opts.text ?? 'Testo', {
      width: opts.width ?? w * 0.6,
      fontSize: (opts.pt ?? 12) * PT_PX,
      fontFamily: opts.fontFamily ?? 'Inter',
      fontWeight: opts.fontWeight ?? 'normal',
      fontStyle: opts.fontStyle ?? 'normal',
      fill: opts.fill ?? '#16181d',
      textAlign: opts.textAlign ?? 'left',
      lineHeight: opts.lineHeight ?? 1.1,
      charSpacing: opts.charSpacing ?? 0,
      splitByGrapheme: false,
    });
    tb.kind = 'text';
    tb.fitText = opts.fitText ?? 0;
    return this.#place(tb, opts);
  }

  addField(column, opts = {}) {
    return this.addText({ text: `{{${column}}}`, fitText: 1, fontWeight: 'bold', pt: 14, ...opts });
  }

  async addImage(src, opts = {}) {
    const img = await FabricImage.fromURL(src, { crossOrigin: 'anonymous' });
    img.kind = 'image';
    const { w, h } = this.size;
    const maxW = opts.width ?? w * 0.4;
    const maxH = opts.height ?? h * 0.6;
    const s = Math.min(maxW / img.width, maxH / img.height);
    img.set({ scaleX: s, scaleY: s });
    return this.#place(img, opts);
  }

  async addPhoto(field = '', opts = {}) {
    const img = await FabricImage.fromURL(opts.src || PHOTO_PLACEHOLDER);
    img.kind = 'photo';
    img.field = field;
    img.photoShape = opts.photoShape || 'rect';
    const boxH = opts.height ?? this.size.h * 0.62;
    const boxW = opts.width ?? boxH * 0.75;
    img.set({ scaleX: boxW / img.width, scaleY: boxH / img.height });
    if (opts.src) await setImageCover(img, opts.src);
    applyPhotoShape(img);
    return this.#place(img, opts);
  }

  addShape(shape, opts = {}) {
    const base = {
      fill: opts.fill ?? '#f2542d',
      stroke: opts.stroke ?? null,
      strokeWidth: opts.strokeWidth ?? 0,
      strokeUniform: true,
    };
    let obj;
    const { w, h } = this.size;
    if (shape === 'circle') {
      obj = new Circle({ ...base, radius: opts.radius ?? h * 0.18 });
    } else if (shape === 'triangle') {
      obj = new Triangle({ ...base, width: opts.width ?? h * 0.4, height: opts.height ?? h * 0.35 });
    } else if (shape === 'line') {
      obj = new Rect({ ...base, fill: opts.fill ?? '#16181d', width: opts.width ?? w * 0.5, height: opts.height ?? mm(0.5) });
    } else {
      obj = new Rect({ ...base, width: opts.width ?? w * 0.35, height: opts.height ?? h * 0.3, rx: opts.rx ?? 0, ry: opts.rx ?? 0 });
    }
    obj.kind = 'shape';
    return this.#place(obj, opts);
  }

  async addBarcode(bcid = 'qrcode', value = '', opts = {}) {
    const type = barcodeType(bcid);
    const img = await FabricImage.fromURL(PHOTO_PLACEHOLDER);
    Object.assign(img, {
      kind: 'barcode',
      bcid,
      bcValue: value || type.sample,
      bcColor: opts.color || '#000000',
      bcShowText: opts.showText ?? true,
    });
    const { h } = this.size;
    const boxW = opts.width ?? (type.twoD ? h * 0.42 : h * 0.9);
    const boxH = opts.height ?? (type.twoD ? h * 0.42 : h * 0.3);
    img.set({ scaleX: boxW / img.width, scaleY: boxH / img.height });
    await regenerateBarcode(img, this.previewRecord);
    return this.#place(img, opts);
  }

  /** Forma libera (tracciato SVG in pixel di progetto), usata per le onde dei modelli. */
  addPath(d, opts = {}) {
    const p = new Path(d, {
      fill: opts.fill ?? '#2563ff',
      stroke: null,
      strokeWidth: 0,
      opacity: opts.opacity ?? 1,
    });
    p.kind = 'shape';
    return this.#place(p, { x: p.left, y: p.top });
  }

  async addLogo(opts = {}) {
    return this.addImage(opts.src || LOGO_PLACEHOLDER, opts);
  }

  setBackgroundColor(color, side = this.side) {
    this.canvases[side].backgroundColor = color;
    this.canvases[side].requestRenderAll();
    this.#changed(side);
  }

  async setBackgroundImage(src, side = this.side) {
    const c = this.canvases[side];
    const old = c.getObjects().find((o) => o.kind === 'background');
    if (old) c.remove(old);
    if (!src) return;
    const img = await FabricImage.fromURL(src, { crossOrigin: 'anonymous' });
    img.kind = 'background';
    img.uid = uid();
    img.set({ selectable: false, evented: false });
    c.insertAt(0, img);
    this.#fitBackground(c);
    c.requestRenderAll();
    this.#changed(side);
  }

  #fitBackground(c) {
    const bg = c.getObjects().find((o) => o.kind === 'background');
    if (!bg) return;
    const { w, h } = this.size;
    const s = Math.max(w / bg.width, h / bg.height);
    bg.set({ scaleX: s, scaleY: s, left: (w - bg.width * s) / 2, top: (h - bg.height * s) / 2, angle: 0 });
    bg.setCoords();
  }

  // ---------- operazioni sulla selezione ----------
  active() {
    return this.canvas.getActiveObject() || null;
  }

  selectedObjects() {
    return this.canvas.getActiveObjects();
  }

  select(obj) {
    if (!obj.selectable || obj.kind === 'background') return;
    this.canvas.setActiveObject(obj);
    this.canvas.requestRenderAll();
  }

  deleteSelection() {
    const objs = this.selectedObjects();
    if (!objs.length) return;
    if (objs.some((o) => o.isEditing)) return;
    this.canvas.discardActiveObject();
    this.batch(() => objs.forEach((o) => this.canvas.remove(o)));
    this.canvas.requestRenderAll();
  }

  async #cloneObjects(objs) {
    return Promise.all(objs.map((o) => o.clone(CUSTOM_PROPS)));
  }

  async copy() {
    const objs = this.selectedObjects();
    if (!objs.length) return;
    this.clipboard = await this.#cloneObjects(objs);
  }

  async paste(offset = mm(2)) {
    if (!this.clipboard?.length) return;
    const clones = await this.#cloneObjects(this.clipboard);
    this.canvas.discardActiveObject();
    this.batch(() => {
      for (const c of clones) {
        c.uid = uid();
        c.set({ left: c.left + offset, top: c.top + offset });
        if (c.kind === 'photo') applyPhotoShape(c);
        applyLock(c, false);
        this.canvas.add(c);
      }
    });
    this.clipboard = await this.#cloneObjects(clones);
    this.#selectMany(clones);
  }

  async duplicate() {
    await this.copy();
    await this.paste();
  }

  #selectMany(objs) {
    if (objs.length === 1) this.canvas.setActiveObject(objs[0]);
    else if (objs.length > 1) this.canvas.setActiveObject(new ActiveSelection(objs, { canvas: this.canvas }));
    this.canvas.requestRenderAll();
  }

  nudge(dx, dy) {
    const obj = this.active();
    if (!obj || obj.locked) return;
    obj.set({ left: obj.left + dx, top: obj.top + dy });
    obj.setCoords();
    this.canvas.requestRenderAll();
    this.#changed(this.side);
    this.emit('transform');
  }

  align(dir) {
    const obj = this.active();
    if (!obj) return;
    const { w, h } = this.size;
    const r = obj.getBoundingRect();
    const dx = { left: -r.left, hcenter: w / 2 - (r.left + r.width / 2), right: w - (r.left + r.width) }[dir];
    const dy = { top: -r.top, vcenter: h / 2 - (r.top + r.height / 2), bottom: h - (r.top + r.height) }[dir];
    obj.set({ left: obj.left + (dx || 0), top: obj.top + (dy || 0) });
    obj.setCoords();
    this.canvas.requestRenderAll();
    this.#changed(this.side);
    this.emit('selection');
  }

  order(dir, obj = this.active()) {
    if (!obj) return;
    const c = this.canvas;
    if (dir === 'front') c.bringObjectToFront(obj);
    if (dir === 'back') {
      c.sendObjectToBack(obj);
      const bg = c.getObjects().find((o) => o.kind === 'background');
      if (bg && bg !== obj) c.sendObjectToBack(bg);
    }
    if (dir === 'up') c.bringObjectForward(obj);
    if (dir === 'down') {
      const idx = c.getObjects().indexOf(obj);
      const below = c.getObjects()[idx - 1];
      if (below && below.kind !== 'background') c.sendObjectBackwards(obj);
    }
    c.requestRenderAll();
    this.#changed(this.side);
    this.emit('layers');
  }

  toggleLock(obj) {
    applyLock(obj, !obj.locked);
    if (obj.locked && this.active() === obj) this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
    this.#changed(this.side);
    this.emit('selection');
  }

  toggleVisible(obj) {
    obj.visible = !obj.visible;
    if (!obj.visible && this.active() === obj) this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
    this.#changed(this.side);
    this.emit('layers');
  }

  /** Applica proprietà all'oggetto selezionato e registra la modifica nella cronologia. */
  update(obj, props) {
    obj.set(props);
    if (obj.kind === 'text' && obj.fitText) fitTextbox(obj);
    obj.setCoords();
    this.canvas.requestRenderAll();
    this.#changed(this.side);
  }

  async updateBarcode(obj, props) {
    Object.assign(obj, props);
    const err = await regenerateBarcode(obj, this.previewRecord);
    this.canvas.requestRenderAll();
    this.#changed(this.side);
    return err;
  }

  async refreshBarcodes(record) {
    this.previewRecord = record;
    for (const c of Object.values(this.canvases)) {
      const codes = c.getObjects().filter((o) => o.kind === 'barcode' && hasFields(o.bcValue));
      await Promise.all(codes.map((o) => regenerateBarcode(o, record)));
      c.requestRenderAll();
    }
  }

  // ---------- cronologia ----------
  batch(fn) {
    this.loading++;
    try {
      fn();
    } finally {
      this.loading--;
    }
    this.#changed(this.side);
  }

  #changed(side) {
    if (this.loading) return;
    clearTimeout(this.history[side].timer);
    this.history[side].timer = setTimeout(() => this.#commit(side), 200);
    this.emit('change', side);
  }

  #commit(side) {
    const h = this.history[side];
    clearTimeout(h.timer);
    h.timer = 0;
    const snap = JSON.stringify(this.serializeSide(side));
    if (h.stack[h.index] === snap) return;
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(snap);
    if (h.stack.length > 80) h.stack.shift();
    h.index = h.stack.length - 1;
    this.emit('history');
  }

  resetHistory() {
    for (const side of ['front', 'back']) {
      this.history[side] = { stack: [JSON.stringify(this.serializeSide(side))], index: 0 };
    }
    this.emit('history');
  }

  canUndo() {
    return this.history[this.side].index > 0;
  }
  canRedo() {
    const h = this.history[this.side];
    return h.index < h.stack.length - 1;
  }

  async undo() {
    const h = this.history[this.side];
    // Una modifica ancora in attesa di registrazione va salvata prima di tornare indietro.
    if (h.timer) this.#commit(this.side);
    if (h.index <= 0) return;
    h.index--;
    await this.loadSide(this.side, JSON.parse(h.stack[h.index]));
    this.emit('history');
  }

  async redo() {
    const h = this.history[this.side];
    if (h.index >= h.stack.length - 1) return;
    h.index++;
    await this.loadSide(this.side, JSON.parse(h.stack[h.index]));
    this.emit('history');
  }

  // ---------- serializzazione ----------
  serializeSide(side) {
    const c = this.canvases[side];
    return {
      background: c.backgroundColor || '#ffffff',
      objects: c.getObjects().map((o) => o.toObject(CUSTOM_PROPS)),
    };
  }

  serialize() {
    return {
      app: 'printbadge',
      version: 1,
      doc: { ...this.doc },
      sides: { front: this.serializeSide('front'), back: this.serializeSide('back') },
    };
  }

  async loadSide(side, json) {
    const c = this.canvases[side];
    this.loading++;
    try {
      c.discardActiveObject();
      c.remove(...c.getObjects());
      c.backgroundColor = json?.background || '#ffffff';
      const objs = await util.enlivenObjects(json?.objects || []);
      for (const o of objs) {
        if (o.kind === 'background') o.set({ selectable: false, evented: false });
        else applyLock(o, o.locked);
        if (o.kind === 'photo') applyPhotoShape(o);
        c.add(o);
      }
      c.requestRenderAll();
    } finally {
      this.loading--;
    }
    this.emit('layers');
    this.emit('selection');
  }

  async load(project) {
    this.doc = { ...this.doc, ...(project?.doc || {}) };
    await this.loadSide('front', project?.sides?.front);
    await this.loadSide('back', project?.sides?.back);
    this.applyFormat();
    if (!this.doc.backEnabled && this.side === 'back') this.setSide('front');
    this.resetHistory();
    this.emit('format');
    this.emit('change', 'front');
  }

  async clear() {
    await this.load({ doc: this.doc, sides: {} });
  }
}
