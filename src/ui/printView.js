import { t } from '../i18n.js';
import { h, field, select, numberInput, segmented } from './dom.js';
import { paintIcons } from './icons.js';
import { PRINTERS, getPrinter } from '../config/printers.js';
import { SHEETS, docSize, getFormat } from '../config/formats.js';
import { data } from '../data/store.js';
import { hasFields } from '../data/merge.js';
import { renderSide, calibrationCanvas } from '../print/render.js';
import { cardPages, sheetPages, sheetGrid, printPages, pagesToPDF, canvasToZPL, rotate180, download } from '../print/output.js';

const LS_PRINT = 'printbadge.print';
const calibKey = (id) => `printbadge.calib.${id}`;
const load = (k, d) => {
  try {
    return { ...d, ...(JSON.parse(localStorage.getItem(k)) || {}) };
  } catch {
    return d;
  }
};
const save = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* archiviazione non disponibile: le impostazioni valgono solo per questa sessione */
  }
};

export function projectUsesFields(project) {
  for (const side of Object.values(project.sides)) {
    for (const o of side.objects) {
      if (o.kind === 'text' && hasFields(o.text)) return true;
      if (o.kind === 'barcode' && hasFields(o.bcValue)) return true;
      if (o.kind === 'photo' && o.field) return true;
    }
  }
  return false;
}

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const TECH_ICON = { dts: 'id-card', retransfer: 'id-card', thermal: 'tag', inkjet: 'printer', sheet: 'printer' };
let brandFilter = 'all';

export function mountPrintView({ root, editor, toast, goPeople, embedded = false }) {
  const project = editor.serialize();
  const doc = project.doc;
  const card = docSize(doc);
  const usesFields = projectUsesFields(project);
  const backUsed = doc.backEnabled && (project.sides.back.objects.length > 0 || (project.sides.back.background || '#ffffff').toLowerCase() !== '#ffffff');

  const saved = load(LS_PRINT, { printerId: 'generic-card', mode: 'card', duplex: 'auto', scope: 'all', margin: 10, gap: 4, cropMarks: true });
  const st = { ...saved, copies: 1, back: backUsed, rotateBack: false, reverseBacks: false };
  const calib = () => load(calibKey(st.printerId), { offsetX: 0, offsetY: 0, scale: 100, dpi: getPrinter(st.printerId).dpi, bleed: getPrinter(st.printerId).bleed });
  Object.assign(st, calib());
  if (!data.rows.length || !usesFields) st.scope = 'copies';
  else if (st.scope === 'copies') st.scope = 'all';

  const persist = () => {
    save(LS_PRINT, { printerId: st.printerId, mode: st.mode, duplex: st.duplex, scope: st.scope === 'copies' ? 'all' : st.scope, margin: st.margin, gap: st.gap, cropMarks: st.cropMarks });
    save(calibKey(st.printerId), { offsetX: st.offsetX, offsetY: st.offsetY, scale: st.scale, dpi: st.dpi, bleed: st.bleed });
  };

  function recordIndexes() {
    if (st.scope === 'copies') return [];
    if (st.scope === 'selected') return [...data.selected].sort((a, b) => a - b);
    if (st.scope === 'current') return [data.current];
    return data.rows.map((_, i) => i);
  }

  function recordList() {
    const copies = Math.max(1, st.copies | 0);
    if (st.scope === 'copies') return Array(copies).fill(null);
    return recordIndexes().flatMap((i) => Array(copies).fill(data.rows[i]));
  }

  async function renderAll(records, { dpi, bleed, withBack, onProgress }) {
    const fronts = [];
    const backs = [];
    const cache = new Map();
    let n = 0;
    for (const rec of records) {
      const key = usesFields ? rec : 'static';
      if (!cache.has(key)) {
        const f = await renderSide(project.sides.front, doc, { record: rec, dpi, bleedMm: bleed });
        let b = null;
        if (withBack) {
          b = await renderSide(project.sides.back, doc, { record: rec, dpi, bleedMm: bleed });
          if (st.rotateBack) b = rotate180(b);
        }
        cache.set(key, { f, b });
      }
      const { f, b } = cache.get(key);
      fronts.push(f);
      if (withBack) backs.push(b);
      onProgress?.(++n, records.length);
    }
    return { fronts, backs: withBack ? backs : null };
  }

  function layout(fronts, backs) {
    const opt = { bleed: st.bleed, offsetX: st.offsetX, offsetY: st.offsetY, scale: st.scale, margin: st.margin, gap: st.gap, cropMarks: st.cropMarks };
    if (st.mode === 'card') {
      if (!backs) return { all: cardPages(fronts, card, opt) };
      const inter = fronts.flatMap((f, i) => [f, backs[i]]);
      const bk = st.reverseBacks ? backs.slice().reverse() : backs;
      return { all: cardPages(inter, card, opt), fronts: cardPages(fronts, card, opt), backs: cardPages(bk, card, opt) };
    }
    const all = sheetPages(fronts, backs, SHEETS[st.mode], card, opt);
    if (!backs) return { all };
    return { all, fronts: all.filter((_, i) => i % 2 === 0), backs: all.filter((_, i) => i % 2 === 1) };
  }

  // ---------------------------------------------------------------- UI
  const printer = () => getPrinter(st.printerId);
  const settings = h('div', { class: 'print-settings' });
  const preview = h('div', { class: 'print-preview' });
  const summary = h('p', { class: 'print-summary' });
  const progress = h('div', { class: 'progress', hidden: true }, h('div', { class: 'bar' }), h('span', {}));
  const cta = h('div', { class: 'card-box print-cta' });
  const tips = h('div', { class: 'tipbox' });

  function rebuild() {
    settings.replaceChildren(printerCard(), mediaCard(), whatCard(), advancedBox());
    cta.replaceChildren(summary, progress, ...ctaButtons());
    tips.replaceChildren(
      h('img', { class: 'printers-art', src: './brand/printers.webp', alt: '', width: 120, height: 120 }),
      h('div', {},
        h('strong', { text: t('howToPrint') }),
        h('p', { text: st.mode === 'card' ? t('tipCardMode', { w: card.w.toFixed(1), h: card.h.toFixed(1) }) : t('tipSheetMode') }),
        h('p', { text: t('tipPdfFallback') }),
      ),
    );
    paintIcons(root);
    schedulePreview();
  }

  const stepTitle = (n, text) => h('h3', {}, h('span', { class: 'n', text: String(n) }), text);

  function printerCard() {
    const p = printer();
    const brands = ['all', ...new Set(PRINTERS.filter((x) => x.brand !== 'Generico').map((x) => x.brand))];
    const search = h('input', { type: 'search', placeholder: t('searchPrinter'), value: st.search || '' });
    const list = h('div', { class: 'printer-list' });
    const label = (x) => (x.brand === 'Generico' ? t(`pm_${x.id}`) : x.model);
    const fill = () => {
      const q = search.value.trim().toLowerCase();
      st.search = search.value;
      const items = PRINTERS.filter((x) => {
        if (x.brand === 'Generico') return brandFilter === 'all' && !q;
        if (brandFilter !== 'all' && x.brand !== brandFilter) return false;
        return !q || `${x.brand} ${x.model}`.toLowerCase().includes(q);
      });
      if (!items.some((x) => x.id === st.printerId)) items.unshift(p);
      list.replaceChildren(...items.map((x) => h('button', { type: 'button', class: `printer-opt ${x.id === st.printerId ? 'on' : ''}`, onclick: () => choosePrinter(x.id) },
        h('span', { class: 'pi' }, h('i', { 'data-lucide': TECH_ICON[x.tech] || 'printer', 'data-size': '16' })),
        h('span', {}, h('b', { text: x.brand === 'Generico' ? label(x) : `${x.brand} ${x.model}` }), h('small', { text: `${t(`tech_${x.tech}`)} · ${x.dpi} dpi${x.duplex ? ` · ${t('duplexShort')}` : ''}` })),
      )));
      paintIcons(list);
    };
    search.addEventListener('input', fill);
    fill();
    const fmtOk = p.formats.includes(doc.formatId) || doc.formatId === 'CUSTOM';
    return h('div', { class: 'card-box pcard' },
      stepTitle(1, t('choosePrinter')),
      h('div', { class: 'brand-chips' }, brands.map((b) => h('button', { type: 'button', class: `brand-chip ${brandFilter === b ? 'on' : ''}`, onclick: () => { brandFilter = b; rebuild(); } }, b === 'all' ? t('allBrands') : b))),
      search,
      list,
      fmtOk ? null : h('p', { class: 'warn', text: t('formatWarn', { fmt: getFormat(doc.formatId).label }) }),
      h('p', { class: 'hint', text: t('anyPrinterHint') }),
    );
  }

  function choosePrinter(id) {
    st.printerId = id;
    Object.assign(st, calib());
    const np = getPrinter(id);
    if (np.sheet) st.mode = 'A4';
    else st.mode = 'card';
    if (!np.duplex && st.back) st.duplex = 'manual';
    persist();
    rebuild();
  }

  function mediaCard() {
    const choice = (value, iconName, text) => h('button', { type: 'button', class: `choice ${st.mode === value ? 'on' : ''}`, onclick: () => { st.mode = value; persist(); rebuild(); } },
      h('i', { 'data-lucide': iconName }), text);
    return h('div', { class: 'card-box pcard' },
      stepTitle(2, t('chooseMedia')),
      h('div', { class: 'choice-grid' },
        choice('card', 'id-card', t('modeCard')),
        choice('A4', 'layout-template', t('modeA4')),
        choice('LETTER', 'layout-template', t('modeLetter')),
      ),
    );
  }

  function whatCard() {
    const scopeOptions = data.rows.length && usesFields
      ? [
        { value: 'all', label: t('scopeAll', { n: data.rows.length }) },
        { value: 'selected', label: t('scopeSelected', { n: data.selected.size }) },
        { value: 'current', label: t('scopeCurrent', { n: data.current + 1 }) },
      ]
      : null;
    return h('div', { class: 'card-box pcard' },
      stepTitle(3, t('whatToPrint')),
      scopeOptions
        ? field(t('whichRecords'), select(scopeOptions, st.scope, (v) => { st.scope = v; persist(); rebuild(); }))
        : usesFields
          ? h('p', { class: 'warn' }, t('fieldsNoData'), ' ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); goPeople(); } }, t('addPeopleLink')))
          : null,
      field(st.scope === 'copies' ? t('copies') : t('copiesPerRecord'), numberInput(st.copies, (v) => { st.copies = Math.max(1, Math.round(v)); rebuild(); }, { step: 1, min: 1, digits: 0 })),
      doc.backEnabled
        ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.back, onchange: (e) => { st.back = e.target.checked; rebuild(); } }), ' ', t('printBackSide'))
        : null,
      st.back ? field(t('duplex'), segmented([
        { label: t('duplexAuto'), value: 'auto', active: st.duplex === 'auto' },
        { label: t('duplexManual'), value: 'manual', active: st.duplex === 'manual' },
      ], (v) => { st.duplex = v; persist(); rebuild(); })) : null,
      st.back ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.rotateBack, onchange: (e) => { st.rotateBack = e.target.checked; rebuild(); } }), ' ', t('rotateBack')) : null,
      st.back && st.duplex === 'manual' && st.mode === 'card'
        ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.reverseBacks, onchange: (e) => { st.reverseBacks = e.target.checked; } }), ' ', t('reverseBacks'))
        : null,
    );
  }

  function advancedBox() {
    const num = (key, opts) => numberInput(st[key], (v) => { st[key] = v; persist(); rebuild(); }, opts);
    return h('details', { class: 'adv', open: st.offsetX || st.offsetY || st.scale !== 100 ? true : undefined },
      h('summary', { text: t('advanced') }),
      h('div', { class: 'grid2' },
        field(t('resolution'), num('dpi', { step: 1, min: 72, max: 1200, digits: 0, suffix: 'dpi' })),
        field(t('bleed'), num('bleed', { step: 0.5, min: 0, max: 5, suffix: 'mm' })),
        field(t('offsetX'), num('offsetX', { step: 0.1, suffix: 'mm' })),
        field(t('offsetY'), num('offsetY', { step: 0.1, suffix: 'mm' })),
        field(t('scale'), num('scale', { step: 0.5, min: 50, max: 150, suffix: '%' })),
        st.mode !== 'card' ? field(t('margin'), num('margin', { step: 1, min: 0, suffix: 'mm' })) : null,
        st.mode !== 'card' ? field(t('gap'), num('gap', { step: 1, min: 0, suffix: 'mm' })) : null,
      ),
      st.mode !== 'card' ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.cropMarks, onchange: (e) => { st.cropMarks = e.target.checked; persist(); schedulePreview(); } }), ' ', t('cropMarks')) : null,
      h('p', { class: 'hint', text: t('calibHint') }),
      h('button', { class: 'btn', type: 'button', style: 'margin-top:10px', onclick: () => run('calib') }, h('i', { 'data-lucide': 'crosshair' }), t('calibCard')),
    );
  }

  function ctaButtons() {
    const p = printer();
    const manual = st.back && st.duplex === 'manual';
    const n = recordList().length;
    return [
      h('div', { class: 'print-main-actions' },
        manual
          ? [
            h('button', { class: 'btn-main lg', type: 'button', onclick: () => run('print-fronts') }, h('i', { 'data-lucide': 'printer' }), t('printFronts')),
            h('button', { class: 'btn lg outline', type: 'button', onclick: () => run('print-backs') }, h('i', { 'data-lucide': 'repeat' }), t('printBacks')),
          ]
          : h('button', { class: 'btn-main lg', type: 'button', onclick: () => run('print') }, h('i', { 'data-lucide': 'printer' }), t('printN', { n })),
      ),
      h('div', { class: 'print-secondary' },
        h('button', { class: 'btn', type: 'button', onclick: () => run('pdf') }, h('i', { 'data-lucide': 'download' }), t('downloadPdf')),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => run('png') }, h('i', { 'data-lucide': 'image' }), 'PNG'),
        st.mode === 'card' && (p.tech === 'thermal' || p.zpl) ? h('button', { class: 'btn ghost', type: 'button', onclick: () => run('zpl') }, h('i', { 'data-lucide': 'file-down' }), 'ZPL') : null,
      ),
    ];
  }

  // ---------------------------------------------------------------- anteprima
  let previewTimer = 0;
  let previewToken = 0;
  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(drawPreview, 150);
  }

  function countPages(n) {
    if (st.mode === 'card') return n * (st.back ? 2 : 1);
    const g = sheetGrid(SHEETS[st.mode], card, { margin: st.margin, gap: st.gap });
    return Math.ceil(n / (g.cols * g.rows)) * (st.back ? 2 : 1);
  }

  async function drawPreview() {
    const token = ++previewToken;
    const records = recordList();
    if (!records.length) {
      preview.replaceChildren(h('p', { class: 'empty', text: t('nothingToPrint') }));
      summary.textContent = '';
      return;
    }
    let sample = records.slice(0, 1);
    if (st.mode !== 'card') {
      const g = sheetGrid(SHEETS[st.mode], card, { margin: st.margin, gap: st.gap });
      sample = records.slice(0, g.cols * g.rows);
    }
    const { fronts, backs } = await renderAll(sample, { dpi: 110, bleed: st.bleed, withBack: st.back });
    if (token !== previewToken) return;
    const pages = layout(fronts, backs).all.slice(0, 2);
    const k = st.mode === 'card' ? Math.min(3.4, 250 / Math.max(card.w, card.h)) : 0.85;
    preview.replaceChildren(...pages.map((pg, i) => h('figure', {}, pageThumb(pg, k), h('figcaption', { text: st.back ? (i === 0 ? t('front') : t('back')) : `${pg.w.toFixed(1)} × ${pg.h.toFixed(1)} mm` }))));
    const n = records.length;
    summary.textContent = t('summary', { cards: n, pages: countPages(n) });
  }

  function pageThumb(page, k) {
    const c = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(page.w * k * dpr);
    c.height = Math.round(page.h * k * dpr);
    c.style.width = `${page.w * k}px`;
    c.style.height = `${page.h * k}px`;
    const g = c.getContext('2d');
    g.scale(k * dpr, k * dpr);
    g.fillStyle = '#fff';
    g.fillRect(0, 0, page.w, page.h);
    for (const it of page.items) g.drawImage(it.img, it.x, it.y, it.w, it.h);
    g.strokeStyle = '#000';
    g.lineWidth = 0.2;
    for (const [x1, y1, x2, y2] of page.marks) {
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
    }
    c.className = 'page-thumb';
    return c;
  }

  // ---------------------------------------------------------------- azioni
  let busy = false;
  async function run(action) {
    if (busy) return;
    busy = true;
    root.classList.add('busy');
    const bar = progress.querySelector('.bar');
    const label = progress.querySelector('span');
    const onProgress = (i, n) => {
      bar.style.width = `${(i / n) * 100}%`;
      label.textContent = t('rendering', { i, n });
    };
    progress.hidden = false;
    onProgress(0, 1);
    try {
      persist();
      if (action === 'calib') {
        const cal = calibrationCanvas(doc, st.dpi);
        const pages = st.mode === 'card'
          ? cardPages([cal], card, { ...st, bleed: 0 })
          : sheetPages([cal], null, SHEETS[st.mode], card, { ...st, bleed: 0 });
        await printPages(pages);
        return;
      }
      if (action === 'png') {
        const rec = st.scope === 'copies' ? null : data.rows[recordIndexes()[0] ?? data.current] || null;
        const { fronts, backs } = await renderAll([rec], { dpi: st.dpi, bleed: st.bleed, withBack: st.back, onProgress });
        fronts[0].toBlob((b) => download(b, `printbadge-front-${stamp()}.png`));
        if (backs) backs[0].toBlob((b) => download(b, `printbadge-back-${stamp()}.png`));
        return;
      }
      const records = recordList();
      if (!records.length) {
        toast(t('nothingToPrint'), 'error');
        return;
      }
      if (action === 'zpl') {
        const { fronts } = await renderAll(records, { dpi: printer().dpi, bleed: 0, withBack: false, onProgress });
        const zpl = fronts.map((c) => canvasToZPL(c)).join('');
        download(new Blob([zpl], { type: 'text/plain' }), `printbadge-${stamp()}.zpl`);
        toast(t('zplSaved'));
        return;
      }
      const { fronts, backs } = await renderAll(records, { dpi: st.dpi, bleed: st.bleed, withBack: st.back, onProgress });
      const pages = layout(fronts, backs);
      if (action === 'pdf') {
        label.textContent = t('buildingPdf');
        await new Promise((r) => setTimeout(r, 30));
        download(pagesToPDF(pages.all), `printbadge-${stamp()}.pdf`);
        toast(t('pdfSaved'));
      } else if (action === 'print') {
        await printPages(pages.all);
      } else if (action === 'print-fronts') {
        await printPages(pages.fronts);
        toast(t('nowBacks'));
      } else if (action === 'print-backs') {
        await printPages(pages.backs);
      }
    } catch (err) {
      console.error(err);
      toast(t('printError'), 'error');
    } finally {
      busy = false;
      root.classList.remove('busy');
      progress.hidden = true;
    }
  }

  const layout_ = h('div', { class: 'print-layout' }, settings, h('div', { class: 'print-side' }, preview, cta, tips));
  root.replaceChildren(
    embedded
      ? layout_
      : h('div', { class: 'page' },
        h('div', { class: 'page-head' },
          h('div', {},
            h('span', { class: 'eyebrow', text: t('stepOf', { n: 3 }) }),
            h('h1', { text: t('printTitle') }),
            h('p', { text: t('printIntro') }),
          ),
        ),
        layout_,
      ),
  );
  rebuild();
  return { print: () => run(st.back && st.duplex === 'manual' ? 'print-fronts' : 'print') };
}
