import { icon } from './icons.js';

/** Crea un elemento: h('button', { class: 'x', onclick: fn }, 'testo', figlio). */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'icon') el.appendChild(icon(v, attrs.iconSize || 16));
    else if (k === 'iconSize') continue;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
}

export function section(title, ...rows) {
  return h('section', { class: 'psec' }, title ? h('h3', { text: title }) : null, ...rows);
}

export function row(...children) {
  return h('div', { class: 'prow' }, ...children);
}

export function field(label, control, extraClass = '') {
  return h('label', { class: `pfield ${extraClass}` }, h('span', { class: 'plabel', text: label }), control);
}

const fmt = (v, d = 1) => (Number.isFinite(v) ? String(Math.round(v * 10 ** d) / 10 ** d) : '');

export function numberInput(value, onCommit, { step = 0.1, min, max, digits = 1, suffix } = {}) {
  const input = h('input', { type: 'number', step, min, max, value: fmt(value, digits), inputmode: 'decimal' });
  input.addEventListener('change', () => {
    const v = parseFloat(input.value.replace(',', '.'));
    if (Number.isFinite(v)) onCommit(v);
  });
  input.setValue = (v) => {
    if (document.activeElement !== input) input.value = fmt(v, digits);
  };
  if (!suffix) return input;
  const wrap = h('div', { class: 'num' }, input, h('span', { class: 'suffix', text: suffix }));
  wrap.setValue = input.setValue;
  return wrap;
}

// Palette PRINTBADGE.COM proposta in ogni selettore colore.
export const BRAND_SWATCHES = [
  '#0B1D51', '#2563FF', '#06B6D4', '#EC4899', '#FACC15', '#DC2626',
  '#1F2937', '#64748B', '#E8F1FF', '#E2E8F0', '#FFFFFF', '#000000',
];

export function colorInput(value, onInput) {
  const safe = /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#000000';
  const picker = h('input', { type: 'color', value: safe });
  const hex = h('input', { type: 'text', class: 'hex', value: safe.toUpperCase(), maxlength: 7, spellcheck: 'false' });
  const pick = (v) => {
    picker.value = v.toLowerCase();
    hex.value = v.toUpperCase();
    onInput(v);
  };
  const swatches = h('div', { class: 'swatches' }, BRAND_SWATCHES.map((c) =>
    h('button', { type: 'button', class: 'swatch', title: c, style: `background:${c}`, onclick: () => pick(c) })));
  picker.addEventListener('input', () => {
    hex.value = picker.value.toUpperCase();
    onInput(picker.value);
  });
  hex.addEventListener('change', () => {
    let v = hex.value.trim();
    if (!v.startsWith('#')) v = '#' + v;
    if (/^#[0-9a-f]{3}$/i.test(v)) v = '#' + [...v.slice(1)].map((c) => c + c).join('');
    if (/^#[0-9a-f]{6}$/i.test(v)) {
      picker.value = v;
      hex.value = v.toUpperCase();
      onInput(v);
    }
  });
  return h('div', { class: 'color' }, h('div', { class: 'color-row' }, picker, hex), swatches);
}

export function select(options, value, onChange) {
  const el = h(
    'select',
    {},
    options.map((o) =>
      o.group
        ? h('optgroup', { label: o.group }, o.options.map((x) => h('option', { value: x.value, text: x.label })))
        : h('option', { value: o.value, text: o.label }),
    ),
  );
  el.value = value;
  el.addEventListener('change', () => onChange(el.value));
  return el;
}

/** Gruppo di pulsanti a scelta singola o interruttori. */
export function segmented(items, onPick) {
  return h(
    'div',
    { class: 'pseg' },
    items.map((it) =>
      h('button', {
        type: 'button',
        class: it.active ? 'on' : '',
        title: it.title,
        'aria-pressed': it.active ? 'true' : 'false',
        icon: it.icon,
        onclick: () => onPick(it.value),
      }, it.label || null),
    ),
  );
}

export function iconButton(name, title, onclick, extra = {}) {
  return h('button', { type: 'button', class: `ibtn ${extra.class || ''}`, title, 'aria-label': title, icon: name, onclick });
}
