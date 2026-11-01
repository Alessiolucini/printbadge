import { t } from '../i18n.js';
import { h, section, row, field, numberInput, colorInput, select, segmented, iconButton } from './dom.js';
import { FORMATS } from '../config/formats.js';
import { FONTS } from '../print/render.js';
import { BARCODE_TYPES, barcodeType } from '../editor/barcode.js';
import { mm, toMm, PT_PX, applyPhotoShape, setImageCover, PHOTO_PLACEHOLDER, LOGO_PLACEHOLDER } from '../editor/editor.js';
import { Gradient } from 'fabric';
import { data } from '../data/store.js';

const DEFAULT_FIELDS = ['Nome', 'Cognome', 'Azienda', 'Ruolo', 'Matricola', 'Email'];
const columns = () => (data.columns.length ? data.columns : DEFAULT_FIELDS);

function fieldPicker(onPick, label = t('insertField')) {
  const el = h('select', { class: 'field-pick' }, h('option', { value: '', text: `＋ ${label}` }), columns().map((c) => h('option', { value: c, text: c })));
  el.addEventListener('change', () => {
    if (el.value) onPick(el.value);
    el.value = '';
  });
  return el;
}

function insertAtCursor(textarea, snippet) {
  const s = textarea.selectionStart ?? textarea.value.length;
  const e = textarea.selectionEnd ?? s;
  textarea.value = textarea.value.slice(0, s) + snippet + textarea.value.slice(e);
  textarea.selectionStart = textarea.selectionEnd = s + snippet.length;
  textarea.dispatchEvent(new Event('input'));
}

// ===================================================================== Proprietà
export function renderProps(ctx) {
  const { editor, root } = ctx;
  root.replaceChildren();
  const obj = editor.active();
  ctx.live = null;
  if (!obj) {
    root.append(documentPanel(ctx));
    return;
  }
  if (obj.type === 'activeselection') {
    root.append(
      section(t('multiSelection', { n: obj.size() }), alignRow(editor), actionsRow(ctx, obj)),
    );
    return;
  }
  const geom = geometrySection(ctx, obj);
  root.append(geom);
  if (obj.kind === 'text') root.append(textSection(ctx, obj));
  if (obj.kind === 'shape') root.append(shapeSection(ctx, obj));
  if (obj.kind === 'image' || obj.kind === 'photo') root.append(imageSection(ctx, obj));
  if (obj.kind === 'barcode') root.append(barcodeSection(ctx, obj));
  root.append(section(t('arrange'), alignRow(editor), actionsRow(ctx, obj)));
}

function alignRow(editor) {
  return row(
    ...[
      ['al-left', 'left', t('alignLeft')],
      ['al-hcenter', 'hcenter', t('alignHCenter')],
      ['al-right', 'right', t('alignRight')],
      ['al-top', 'top', t('alignTop')],
      ['al-vcenter', 'vcenter', t('alignVCenter')],
      ['al-bottom', 'bottom', t('alignBottom')],
    ].map(([ic, dir, title]) => iconButton(ic, title, () => editor.align(dir))),
  );
}

function actionsRow(ctx, obj) {
  const { editor } = ctx;
  const single = obj.type !== 'activeselection';
  return row(
    iconButton('copy', t('duplicate'), () => editor.duplicate()),
    single ? iconButton('bring-front', t('bringFront'), () => editor.order('front')) : null,
    single ? iconButton('send-back', t('sendBack'), () => editor.order('back')) : null,
    single ? iconButton(obj.locked ? 'lock' : 'lock-open', obj.locked ? t('unlock') : t('lock'), () => editor.toggleLock(obj)) : null,
    iconButton('trash', t('delete'), () => editor.deleteSelection(), { class: 'danger' }),
  );
}

function geometrySection(ctx, obj) {
  const { editor } = ctx;
  const keepRatio = obj.kind === 'image' || obj.kind === 'photo' || (obj.kind === 'barcode' && barcodeType(obj.bcid).twoD) || obj.type === 'circle';
  const setW = (v) => {
    const px = mm(Math.max(0.5, v));
    if (obj.kind === 'text') return editor.update(obj, { width: px });
    if (obj.type === 'rect' && obj.kind === 'shape') return editor.update(obj, { width: px });
    const sx = px / obj.width;
    editor.update(obj, keepRatio ? { scaleX: sx, scaleY: obj.scaleY * (sx / obj.scaleX) } : { scaleX: sx });
  };
  const setH = (v) => {
    const px = mm(Math.max(0.3, v));
    if (obj.kind === 'text') return;
    if (obj.type === 'rect' && obj.kind === 'shape') return editor.update(obj, { height: px });
    const sy = px / obj.height;
    editor.update(obj, keepRatio ? { scaleY: sy, scaleX: obj.scaleX * (sy / obj.scaleY) } : { scaleY: sy });
  };
  const x = numberInput(toMm(obj.left), (v) => editor.update(obj, { left: mm(v) }), { suffix: 'mm' });
  const y = numberInput(toMm(obj.top), (v) => editor.update(obj, { top: mm(v) }), { suffix: 'mm' });
  const w = numberInput(toMm(obj.getScaledWidth()), setW, { suffix: 'mm' });
  const hh = numberInput(toMm(obj.getScaledHeight()), setH, { suffix: 'mm' });
  const rot = numberInput(obj.angle || 0, (v) => {
    obj.rotate(((v % 360) + 360) % 360);
    editor.update(obj, {});
  }, { step: 1, digits: 0, suffix: '°' });
  const op = numberInput((obj.opacity ?? 1) * 100, (v) => editor.update(obj, { opacity: Math.min(100, Math.max(0, v)) / 100 }), { step: 5, digits: 0, suffix: '%' });
  if (obj.kind === 'text') hh.querySelector('input').disabled = true;
  ctx.live = () => {
    x.setValue(toMm(obj.left));
    y.setValue(toMm(obj.top));
    w.setValue(toMm(obj.getScaledWidth()));
    hh.setValue(toMm(obj.getScaledHeight()));
    rot.setValue(obj.angle || 0);
  };
  return section(
    t(`kind_${obj.kind}`),
    h('div', { class: 'grid2' }, field('X', x), field('Y', y), field(t('width'), w), field(t('height'), hh), field(t('rotation'), rot), field(t('opacity'), op)),
  );
}

function textSection(ctx, obj) {
  const { editor } = ctx;
  const area = h('textarea', { rows: 3, spellcheck: 'false' });
  area.value = obj.text;
  area.addEventListener('input', () => editor.update(obj, { text: area.value }));
  const size = numberInput(obj.fontSize / PT_PX, (v) => editor.update(obj, { fontSize: Math.max(2, v) * PT_PX }), { step: 0.5, suffix: 'pt' });
  const font = select(FONTS.map((f) => ({ value: f, label: f })), obj.fontFamily, (v) => editor.update(obj, { fontFamily: v }));
  font.style.fontFamily = obj.fontFamily;
  const rerender = () => renderProps(ctx);
  return section(
    t('text'),
    area,
    row(fieldPicker((c) => insertAtCursor(area, `{{${c}}}`))),
    h('div', { class: 'grid2' },
      field(t('font'), font, 'span2'),
      field(t('size'), size),
      field(t('color'), colorInput(obj.fill, (v) => editor.update(obj, { fill: v }))),
    ),
    row(
      segmented([
        { icon: 'bold', title: t('bold'), value: 'b', active: obj.fontWeight === 'bold' || obj.fontWeight >= 600 },
        { icon: 'italic', title: t('italic'), value: 'i', active: obj.fontStyle === 'italic' },
        { icon: 'underline', title: t('underline'), value: 'u', active: !!obj.underline },
      ], (v) => {
        if (v === 'b') editor.update(obj, { fontWeight: obj.fontWeight === 'bold' ? 'normal' : 'bold' });
        if (v === 'i') editor.update(obj, { fontStyle: obj.fontStyle === 'italic' ? 'normal' : 'italic' });
        if (v === 'u') editor.update(obj, { underline: !obj.underline });
        rerender();
      }),
      segmented([
        { icon: 'align-left', title: t('alignTextLeft'), value: 'left', active: obj.textAlign === 'left' },
        { icon: 'align-center', title: t('alignTextCenter'), value: 'center', active: obj.textAlign === 'center' },
        { icon: 'align-right', title: t('alignTextRight'), value: 'right', active: obj.textAlign === 'right' },
      ], (v) => {
        editor.update(obj, { textAlign: v });
        rerender();
      }),
    ),
    h('div', { class: 'grid2' },
      field(t('lineHeight'), numberInput(obj.lineHeight, (v) => editor.update(obj, { lineHeight: Math.max(0.5, v) }), { step: 0.05, digits: 2 })),
      field(t('letterSpacing'), numberInput(obj.charSpacing, (v) => editor.update(obj, { charSpacing: v }), { step: 10, digits: 0 })),
      field(t('autoFit'), select([
        { value: '0', label: t('off') },
        { value: '1', label: t('lines', { n: 1 }) },
        { value: '2', label: t('lines', { n: 2 }) },
        { value: '3', label: t('lines', { n: 3 }) },
      ], String(obj.fitText || 0), (v) => editor.update(obj, { fitText: Number(v) })), 'span2'),
    ),
    h('p', { class: 'hint', text: t('autoFitHint') }),
  );
}

function gradientCopy(g, colors) {
  return new Gradient({
    type: g.type,
    gradientUnits: g.gradientUnits,
    coords: { ...g.coords },
    colorStops: g.colorStops.map((st, i) => ({ offset: st.offset, color: colors[i] ?? st.color })),
  });
}

function fillControls(ctx, obj) {
  const { editor } = ctx;
  const grad = obj.fill && typeof obj.fill === 'object' && Array.isArray(obj.fill.colorStops);
  const mode = segmented([
    { label: t('solid'), value: 'solid', active: !grad },
    { label: t('gradient'), value: 'gradient', active: grad },
  ], (v) => {
    if (v === 'solid' && grad) editor.update(obj, { fill: obj.fill.colorStops[0].color });
    if (v === 'gradient' && !grad) {
      editor.update(obj, {
        fill: new Gradient({
          type: 'linear',
          gradientUnits: 'percentage',
          coords: { x1: 0, y1: 0, x2: 1, y2: 1 },
          colorStops: [{ offset: 0, color: typeof obj.fill === 'string' ? obj.fill : '#2563FF' }, { offset: 1, color: '#0B1D51' }],
        }),
      });
    }
    renderProps(ctx);
  });
  if (!grad) return [field(t('fill'), mode), colorInput(obj.fill, (v) => editor.update(obj, { fill: v }))];
  const stops = obj.fill.colorStops.slice().sort((a, b) => a.offset - b.offset);
  return [
    field(t('fill'), mode),
    ...stops.map((st, i) => field(`${t('color')} ${i + 1}`, colorInput(st.color, (v) => {
      const colors = obj.fill.colorStops.map((x) => x.color);
      colors[obj.fill.colorStops.indexOf(st)] = v;
      editor.update(obj, { fill: gradientCopy(obj.fill, colors) });
    }))),
  ];
}

function shapeSection(ctx, obj) {
  const { editor } = ctx;
  const isRect = obj.type === 'rect';
  const isLine = isRect && obj.height <= mm(1.2);
  return section(
    t('style'),
    ...fillControls(ctx, obj),
    isLine ? null : h('div', { class: 'grid2' },
      field(t('strokeWidth'), numberInput(toMm(obj.strokeWidth || 0), (v) => editor.update(obj, { strokeWidth: mm(Math.max(0, v)), stroke: obj.stroke || '#0B1D51' }), { suffix: 'mm' })),
      isRect ? field(t('cornerRadius'), numberInput(toMm(obj.rx || 0), (v) => editor.update(obj, { rx: mm(Math.max(0, v)), ry: mm(Math.max(0, v)) }), { suffix: 'mm' })) : null,
    ),
    isLine || !obj.strokeWidth ? null : field(t('stroke'), colorInput(obj.stroke || '#0B1D51', (v) => editor.update(obj, { stroke: v }))),
  );
}

function imageSection(ctx, obj) {
  const { editor } = ctx;
  const parts = [
    row(
      h('button', { class: 'btn outline', icon: 'upload', onclick: () => ctx.actions.pickImage(obj) }, obj.kind === 'image' ? t('uploadLogo') : t('replaceImage')),
      obj.kind === 'photo' ? h('button', { class: 'btn', icon: 'camera', onclick: () => ctx.actions.openCamera(obj) }, t('webcam')) : null,
    ),
  ];
  if (obj.kind === 'photo') {
    parts.push(
      field(t('photoField'), select([{ value: '', label: t('none') }, ...columns().map((c) => ({ value: c, label: c }))], obj.field || '', (v) => {
        editor.update(obj, { field: v });
      })),
      h('p', { class: 'hint', text: t('photoFieldHint') }),
      field(t('shape'), segmented([
        { label: t('shapeRect'), value: 'rect', active: (obj.photoShape || 'rect') === 'rect' },
        { label: t('shapeRounded'), value: 'rounded', active: obj.photoShape === 'rounded' },
        { label: t('shapeCircle'), value: 'circle', active: obj.photoShape === 'circle' },
      ], (v) => {
        obj.photoShape = v;
        applyPhotoShape(obj);
        editor.update(obj, {});
        renderProps(ctx);
      })),
    );
    if (obj.getSrc() !== PHOTO_PLACEHOLDER) {
      parts.push(row(h('button', { class: 'btn ghost', onclick: async () => {
        await setImageCover(obj, PHOTO_PLACEHOLDER);
        editor.update(obj, {});
      } }, t('clearPhoto'))));
    }
  }
  return section(obj.kind === 'photo' ? t('photo') : t('image'), ...parts);
}

function barcodeSection(ctx, obj) {
  const { editor } = ctx;
  const type = barcodeType(obj.bcid);
  const err = h('p', { class: 'error', hidden: true });
  const apply = async (props) => {
    const e = await editor.updateBarcode(obj, props);
    err.hidden = !e;
    err.textContent = e ? t('barcodeInvalid', { msg: e }) : '';
  };
  const value = h('input', { type: 'text', value: obj.bcValue, spellcheck: 'false', 'data-prop': 'content' });
  value.addEventListener('change', () => apply({ bcValue: value.value }));
  return section(
    t('barcode'),
    field(t('symbology'), select(BARCODE_TYPES.map((b) => ({ value: b.id, label: b.label })), obj.bcid, async (v) => {
      await apply({ bcid: v });
      renderProps(ctx);
    })),
    field(t('content'), value),
    row(fieldPicker((c) => {
      value.value = `{{${c}}}`;
      apply({ bcValue: value.value });
    }, t('useField'))),
    err,
    h('div', { class: 'grid2' },
      field(t('color'), colorInput(obj.bcColor || '#000000', (v) => {
        clearTimeout(obj._colorTimer);
        obj._colorTimer = setTimeout(() => apply({ bcColor: v }), 150);
      })),
      type.twoD ? null : h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: obj.bcShowText !== false, onchange: (e) => apply({ bcShowText: e.target.checked }) }), ' ', t('showText')),
    ),
  );
}

function documentPanel(ctx) {
  const { editor } = ctx;
  const doc = editor.doc;
  const c = editor.canvas;
  const custom = doc.formatId === 'CUSTOM';
  const groups = [
    { group: t('fmtCards'), options: FORMATS.filter((f) => f.group === 'card') },
    { group: t('fmtLabels'), options: FORMATS.filter((f) => f.group === 'label' || f.group === 'paper') },
    { group: t('fmtCustom'), options: FORMATS.filter((f) => f.group === 'custom') },
  ].map((g) => ({ group: g.group, options: g.options.map((f) => ({ value: f.id, label: f.id === 'CUSTOM' ? t('customFormat') : f.label })) }));
  const bg = c.getObjects().find((o) => o.kind === 'background');
  return h('div', {},
    h('div', { class: 'tipbox', style: 'margin-top:14px' }, h('i', { 'data-lucide': 'pencil' }),
      h('div', {}, h('strong', { text: t('editHintTitle') }), h('p', { text: t('editHint') }))),
    section(
      t('document'),
      field(t('format'), select(groups, doc.formatId, (v) => {
        editor.setFormat({ formatId: v });
        renderProps(ctx);
        ctx.actions.fit();
      })),
      custom ? h('div', { class: 'grid2' },
        field(t('width'), numberInput(Math.max(doc.w, doc.h), (v) => { editor.setFormat({ w: Math.max(10, v), h: Math.min(doc.w, doc.h) }); ctx.actions.fit(); }, { suffix: 'mm' })),
        field(t('height'), numberInput(Math.min(doc.w, doc.h), (v) => { editor.setFormat({ w: Math.max(doc.w, doc.h), h: Math.max(10, v) }); ctx.actions.fit(); }, { suffix: 'mm' })),
      ) : null,
      field(t('orientation'), segmented([
        { icon: 'landscape', label: t('landscape'), value: 'landscape', active: doc.orientation !== 'portrait' },
        { icon: 'portrait', label: t('portrait'), value: 'portrait', active: doc.orientation === 'portrait' },
      ], (v) => {
        editor.setFormat({ orientation: v });
        renderProps(ctx);
        ctx.actions.fit();
      })),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: (doc.radius || 0) > 0, onchange: (e) => editor.setFormat({ radius: e.target.checked ? 3.18 : 0 }) }), ' ', t('roundedCorners')),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: doc.backEnabled, onchange: (e) => {
        editor.setFormat({ backEnabled: e.target.checked });
        if (!e.target.checked) editor.setSide('front');
      } }), ' ', t('printBack')),
    ),
    section(
      `${t('background')} · ${editor.side === 'front' ? t('front') : t('back')}`,
      field(t('color'), colorInput(c.backgroundColor || '#ffffff', (v) => editor.setBackgroundColor(v))),
      row(
        h('button', { class: 'btn', icon: 'image', onclick: () => ctx.actions.pickBackground() }, bg ? t('changeBgImage') : t('bgImage')),
        bg ? h('button', { class: 'btn ghost', onclick: async () => { await editor.setBackgroundImage(null); renderProps(ctx); } }, t('remove')) : null,
      ),
    ),
    section(
      t('tips'),
      h('ul', { class: 'tips' },
        h('li', { text: t('tip1') }),
        h('li', { text: t('tip2') }),
        h('li', { text: t('tip3') }),
        h('li', { text: t('tip4') }),
      ),
    ),
  );
}

// ===================================================================== Livelli
function layerLabel(o) {
  if (o.kind === 'text') return (o.text || '').replace(/\s+/g, ' ').slice(0, 40) || t('kind_text');
  if (o.kind === 'barcode') return `${barcodeType(o.bcid).label} · ${o.bcValue}`;
  if (o.kind === 'photo') return o.field ? `${t('kind_photo')} · {{${o.field}}}` : t('kind_photo');
  if (o.kind === 'shape') return t({ circle: 'toolCircle', triangle: 'toolTriangle', path: 'shapeWave' }[o.type] || 'toolRect');
  if (o.kind === 'image' && String(o.getSrc?.() || '').startsWith(LOGO_PLACEHOLDER.slice(0, 80))) return t('toolLogo');
  return t(`kind_${o.kind}`) || o.type;
}

const KIND_ICON = { text: 'type', image: 'image', photo: 'user-round', barcode: 'barcode', shape: 'square', background: 'image' };

export function renderLayers(ctx) {
  const { editor, root } = ctx;
  root.replaceChildren();
  const objs = editor.canvas.getObjects().slice().reverse();
  const active = new Set(editor.selectedObjects());
  if (!objs.length) {
    root.append(h('p', { class: 'empty', text: t('noLayers') }));
    return;
  }
  const list = h('ul', { class: 'layers' });
  for (const o of objs) {
    const isBg = o.kind === 'background';
    const li = h('li', { class: `${active.has(o) ? 'sel' : ''} ${o.visible === false ? 'hidden-obj' : ''}`, onclick: () => !isBg && editor.select(o) },
      h('span', { class: 'lk', icon: KIND_ICON[o.kind] || 'square' }),
      h('span', { class: 'lname', text: isBg ? t('bgImage') : layerLabel(o) }),
      isBg
        ? iconButton('trash', t('remove'), async (e) => { e.stopPropagation(); await editor.setBackgroundImage(null); })
        : h('span', { class: 'lact' },
          iconButton('arrow-up', t('moveUp'), (e) => { e.stopPropagation(); editor.order('up', o); }),
          iconButton('arrow-down', t('moveDown'), (e) => { e.stopPropagation(); editor.order('down', o); }),
          iconButton(o.visible === false ? 'eye-off' : 'eye', t('visibility'), (e) => { e.stopPropagation(); editor.toggleVisible(o); }),
          iconButton(o.locked ? 'lock' : 'lock-open', o.locked ? t('unlock') : t('lock'), (e) => { e.stopPropagation(); editor.toggleLock(o); }),
        ),
    );
    list.append(li);
  }
  root.append(list);
}
