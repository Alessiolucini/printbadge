import { t } from '../i18n.js';
import { h, BRAND_SWATCHES } from './dom.js';
import { paintIcons } from './icons.js';
import { PT_PX } from '../editor/editor.js';

// Barra rapida sopra l'oggetto selezionato: le azioni più comuni a un clic, senza cercarle nel pannello.
export function setupQuickbar({ editor, el, actions }) {
  let suspended = false;

  const btn = (iconName, title, onclick, opts = {}) =>
    h('button', { type: 'button', title, 'aria-label': title, class: opts.class || '', onclick: (e) => { e.stopPropagation(); onclick(e); } },
      iconName ? h('i', { 'data-lucide': iconName, 'data-size': '16' }) : null, opts.label || null);
  const sep = () => h('span', { class: 'qb-sep' });

  function swatchPop(anchor, onPick) {
    document.querySelector('.popmenu')?.remove();
    const r = anchor.getBoundingClientRect();
    const custom = h('input', { type: 'color', style: 'width:100%;height:30px;border:0;background:none;cursor:pointer' });
    custom.addEventListener('input', () => onPick(custom.value));
    const menu = h('div', { class: 'popmenu', style: 'min-width:0;width:178px' },
      h('div', { class: 'popmenu-title', text: t('brandColors') }),
      h('div', { class: 'swatches', style: 'padding:2px 8px 8px;gap:8px' },
        BRAND_SWATCHES.map((c) => h('button', { type: 'button', class: 'swatch', style: `background:${c};width:24px;height:24px`, title: c, onclick: () => { onPick(c); menu.remove(); } }))),
      h('div', { class: 'popmenu-title', text: t('otherColor') }),
      h('div', { style: 'padding:0 8px 6px' }, custom),
    );
    menu.style.left = `${Math.min(r.left, window.innerWidth - 200)}px`;
    menu.style.top = `${r.bottom + 8}px`;
    document.body.append(menu);
    const close = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('pointerdown', close, true);
      }
    };
    setTimeout(() => document.addEventListener('pointerdown', close, true));
  }

  const colorOf = (obj) => {
    const f = obj.kind === 'barcode' ? obj.bcColor : obj.fill;
    if (typeof f === 'string') return f;
    return f?.colorStops?.[0]?.color || '#000000';
  };

  function common(obj) {
    return [
      sep(),
      btn('copy', t('duplicate'), () => editor.duplicate()),
      obj.type !== 'activeselection' ? btn(obj.locked ? 'lock' : 'lock-open', obj.locked ? t('unlock') : t('lock'), () => editor.toggleLock(obj)) : null,
      btn('trash', t('delete'), () => editor.deleteSelection(), { class: 'danger' }),
    ];
  }

  function itemsFor(obj) {
    if (obj.type === 'activeselection') {
      return [
        btn('al-hcenter', t('alignHCenter'), () => editor.align('hcenter')),
        btn('al-vcenter', t('alignVCenter'), () => editor.align('vcenter')),
        ...common(obj),
      ];
    }
    const colorBtn = btn(null, t('color'), (e) => swatchPop(e.currentTarget, (c) => {
      if (obj.kind === 'barcode') editor.updateBarcode(obj, { bcColor: c });
      else editor.update(obj, { fill: c });
      actions.refresh();
      build();
    }), { label: h('span', { class: 'qb-swatch', style: `background:${colorOf(obj)}` }) });

    if (obj.kind === 'text') {
      const pt = Math.round((obj.fontSize / PT_PX) * 2) / 2;
      const setPt = (v) => {
        editor.update(obj, { fontSize: Math.max(3, v) * PT_PX });
        actions.refresh();
        build();
      };
      const nextAlign = { left: 'center', center: 'right', right: 'left' }[obj.textAlign] || 'left';
      return [
        btn('font-down', t('smaller'), () => setPt(pt - 1)),
        h('span', { class: 'qb-num', text: `${pt}` }),
        btn('font-up', t('bigger'), () => setPt(pt + 1)),
        sep(),
        btn('bold', t('bold'), () => { editor.update(obj, { fontWeight: obj.fontWeight === 'bold' ? 'normal' : 'bold' }); actions.refresh(); build(); }, { class: obj.fontWeight === 'bold' ? 'on' : '' }),
        btn('italic', t('italic'), () => { editor.update(obj, { fontStyle: obj.fontStyle === 'italic' ? 'normal' : 'italic' }); actions.refresh(); build(); }, { class: obj.fontStyle === 'italic' ? 'on' : '' }),
        btn(`align-${obj.textAlign === 'justify' ? 'left' : obj.textAlign || 'left'}`, t('alignCycle'), () => { editor.update(obj, { textAlign: nextAlign }); actions.refresh(); build(); }),
        colorBtn,
        sep(),
        btn('pencil', t('editText'), () => {
          editor.canvas.setActiveObject(obj);
          obj.enterEditing();
          obj.selectAll();
          editor.canvas.requestRenderAll();
          el.hidden = true;
        }, { label: t('edit') }),
        ...common(obj),
      ];
    }
    if (obj.kind === 'photo') {
      return [
        btn('upload', t('uploadPhoto'), () => actions.pickImage(obj), { label: t('photo') }),
        btn('camera', t('webcam'), () => actions.openCamera(obj)),
        ...common(obj),
      ];
    }
    if (obj.kind === 'image') {
      return [btn('upload', t('uploadLogo'), () => actions.pickImage(obj), { label: t('uploadLogo') }), ...common(obj)];
    }
    if (obj.kind === 'barcode') {
      return [btn('pencil', t('content'), () => actions.focusProp('content'), { label: t('content') }), colorBtn, ...common(obj)];
    }
    return [colorBtn, btn('bring-front', t('bringFront'), () => editor.order('front')), btn('send-back', t('sendBack'), () => editor.order('back')), ...common(obj)];
  }

  function position() {
    const obj = editor.active();
    if (!obj || obj.isEditing || suspended || !el.childElementCount) {
      el.hidden = true;
      return;
    }
    const r = obj.getBoundingRect();
    const z = editor.zoom;
    const pad = parseFloat(getComputedStyle(el.parentElement).getPropertyValue('--pad')) || 28;
    const x = (r.left + r.width / 2) * z + pad;
    let y = r.top * z + pad - 50;
    if (y < 2) y = (r.top + r.height) * z + pad + 12;
    el.style.left = `${Math.max(120, x)}px`;
    el.style.top = `${y}px`;
    el.hidden = false;
  }

  function build() {
    const obj = editor.active();
    if (!obj) {
      el.hidden = true;
      el.replaceChildren();
      return;
    }
    el.replaceChildren(...itemsFor(obj).flat().filter(Boolean));
    paintIcons(el);
    position();
  }

  editor.on('selection', () => {
    suspended = false;
    build();
  });
  editor.on('transform', () => {
    suspended = true;
    el.hidden = true;
  });
  editor.on('zoom', position);
  for (const c of Object.values(editor.canvases)) {
    c.on('mouse:up', () => {
      if (suspended) {
        suspended = false;
        build();
      }
    });
    c.on('text:editing:entered', () => (el.hidden = true));
  }
  return { build, position };
}
