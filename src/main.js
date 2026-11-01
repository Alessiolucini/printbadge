import './styles.css';
import { t, getLang, setLang, applyStatic } from './i18n.js';
import { paintIcons } from './ui/icons.js';
import { h } from './ui/dom.js';
import { BadgeEditor, mm, setImageCover, setImageContain, PHOTO_PLACEHOLDER, LOGO_PLACEHOLDER } from './editor/editor.js';
import { renderProps, renderLayers } from './ui/panels.js';
import { renderHome } from './ui/home.js';
import { renderPeople } from './ui/people.js';
import { mountPrintView } from './ui/printView.js';
import { mountOrderView, renderOrderResult } from './ui/orderView.js';
import { shopEnabled, orderStatus } from './shop/shop.js';
import { setupQuickbar } from './ui/quickbar.js';
import { TEMPLATES, applyTemplate } from './templates.js';
import { preloadFonts, renderSide } from './print/render.js';
import { getFormat, docSize, PX_PER_MM } from './config/formats.js';
import { data, onDataChange, emitDataChange, sampleRecord, serializeData, restoreData, importDataFile, loadSampleData } from './data/store.js';
import { download } from './print/output.js';

const $ = (id) => document.getElementById(id);
const AUTOSAVE_KEY = 'printbadge.autosave';

// ------------------------------------------------------------------ toast
let toastTimer = 0;
function toast(msg, kind = 'ok') {
  const el = $('toast');
  el.textContent = msg;
  el.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = 'toast'), 3400);
}

// ------------------------------------------------------------------ editor
const editor = new BadgeEditor({
  canvases: { front: $('canvasFront'), back: $('canvasBack') },
  panes: { front: $('paneFront'), back: $('paneBack') },
  holder: $('cardHolder'),
  overlay: $('cardOverlay'),
});
window.printbadge = editor; // utile per il debug dalla console

const stage = $('stageScroll');
let autoFit = true;
let dirty = false;
const fit = () => {
  autoFit = true;
  editor.zoomToFit(stage);
};

// ------------------------------------------------------------------ viste e passi
const VIEWS = ['home', 'design', 'people', 'print', 'order'];
let view = 'design';
let printApi = null;
let orderApi = null;
// Passo 3: "order" = ordina la stampa a BadgeOK, "self" = stampa con la propria stampante.
let printMode = shopEnabled ? 'order' : 'self';
let orderResult = null;

function setView(next) {
  view = next;
  document.body.dataset.view = next;
  for (const v of VIEWS) $(`view${v[0].toUpperCase()}${v.slice(1)}`).hidden = v !== next;
  if (next !== 'design') {
    editor.canvas.discardActiveObject();
    editor.canvas.requestRenderAll();
  }
  if (next === 'home') showHome();
  if (next === 'people') renderPeople(peopleCtx);
  if (next === 'print') mountStep3();
  if (next === 'order' && orderResult) {
    renderOrderResult({
      root: $('viewOrder'),
      ...orderResult,
      orderStatus,
      actions: { newBadge: () => setView('home'), backToOrder: () => setView('print') },
    });
  }
  if (next === 'design') requestAnimationFrame(() => autoFit && fit());
  updateSteps();
  for (const id of ['viewHome', 'viewPeople', 'viewPrint', 'viewOrder']) $(id).scrollTop = 0;
}

function mountStep3() {
  const root = $('viewPrint');
  printApi = null;
  orderApi = null;
  const body = h('div');
  const head = h('div', { class: 'page-head' },
    h('div', {},
      h('span', { class: 'eyebrow', text: t('stepOf', { n: 3 }) }),
      h('h1', { text: printMode === 'order' ? t('orderTitle') : t('printTitle') }),
      h('p', { text: printMode === 'order' ? t('orderIntro') : t('printIntro') }),
    ),
    shopEnabled
      ? h('div', { class: 'seg mode-switch' },
        h('button', { type: 'button', class: `seg-btn ${printMode === 'order' ? 'active' : ''}`, onclick: () => { printMode = 'order'; mountStep3(); updateSteps(); } }, t('modeOrder')),
        h('button', { type: 'button', class: `seg-btn ${printMode === 'self' ? 'active' : ''}`, onclick: () => { printMode = 'self'; mountStep3(); updateSteps(); } }, t('modeSelf')),
      )
      : null,
  );
  root.replaceChildren(h('div', { class: 'page' }, head, body));
  if (printMode === 'order') {
    orderApi = mountOrderView({ root: body, editor, toast, goPeople: () => setView('people'), goDesign: () => setView('design') });
  } else {
    printApi = mountPrintView({ root: body, editor, toast, goPeople: () => setView('people'), embedded: true });
  }
}

function updateSteps() {
  const order = ['design', 'people', 'print'];
  const idx = order.indexOf(view);
  document.querySelectorAll('.step').forEach((s) => {
    const i = order.indexOf(s.dataset.step);
    s.classList.toggle('active', i === idx);
    s.classList.toggle('done', idx > -1 && i < idx);
    s.setAttribute('aria-current', i === idx ? 'step' : 'false');
  });
  const count = $('peopleCount');
  count.hidden = !data.rows.length;
  count.textContent = String(data.rows.length);
  const step3 = shopEnabled ? t('stepOrder') : t('stepPrint');
  document.querySelector('.step[data-step=print] .step-l').textContent = step3;
  const label = { home: t('startNow'), design: t('nextPeople'), people: shopEnabled ? t('nextOrder') : t('nextPrint'), print: printMode === 'order' ? t('payNow') : t('printNow'), order: t('createAnother') }[view];
  $('btnNextLabel').textContent = label;
}

document.querySelectorAll('.step').forEach((s) => s.addEventListener('click', () => setView(s.dataset.step)));
$('btnHome').addEventListener('click', () => setView('home'));
$('btnNext').addEventListener('click', () => {
  if (view === 'home') return setView('design');
  if (view === 'design') return setView('people');
  if (view === 'people') return setView('print');
  if (view === 'order') return setView('home');
  if (printMode === 'order') return orderApi?.submit();
  printApi?.print();
});

// ------------------------------------------------------------------ home
async function showHome() {
  let current = null;
  if (dirty) {
    const c = await renderSide(editor.serializeSide('front'), editor.doc, { record: sampleRecord(), dpi: 70 });
    current = { thumb: c.toDataURL('image/png') };
  }
  renderHome({
    root: $('viewHome'),
    lang: getLang(),
    current,
    actions: {
      openFile: () => $('fileOpen').click(),
      continueProject: () => setView('design'),
      startTemplate: chooseTemplate,
    },
  });
}

async function chooseTemplate(tpl) {
  if (dirty && !confirm(t('confirmReplace'))) return;
  if (!data.rows.length) loadSampleData();
  await applyTemplate(editor, tpl, t);
  dirty = true;
  autoFit = true;
  setView('design');
  refreshPanels();
  await editor.refreshBarcodes(sampleRecord());
}

// ------------------------------------------------------------------ pannelli
const actions = {
  toast,
  fit,
  refresh: () => refreshPanels(),
  pickImage: (obj) => pickImage({ mode: 'replace', target: obj }),
  pickBackground: () => pickImage({ mode: 'background' }),
  openCamera: (obj) => openCamera(obj),
  focusProp: (name) => {
    selectTab('props');
    requestAnimationFrame(() => document.querySelector(`#tab-props [data-prop="${name}"]`)?.focus());
  },
  addField: (c) => { setView('design'); editor.addField(c); },
  addBarcodeField: (c) => { setView('design'); editor.addBarcode('qrcode', `{{${c}}}`); },
  addPhotoField: (c) => { setView('design'); editor.addPhoto(c); },
  recordChanged: () => onRecordChanged(),
  next: () => setView('print'),
  goDesign: () => setView('design'),
};
const propsCtx = { editor, actions, root: $('tab-props') };
const layersCtx = { editor, actions, root: $('tab-layers') };
const peopleCtx = { editor, actions, root: $('viewPeople') };

let raf = 0;
function refreshPanels({ props = true } = {}) {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    if (props) renderProps(propsCtx);
    renderLayers(layersCtx);
    paintIcons($('tab-props'));
    paintIcons($('tab-layers'));
  });
}

function selectTab(name) {
  document.querySelectorAll('.tabs .tab').forEach((x) => x.classList.toggle('active', x.dataset.tab === name));
  for (const id of ['props', 'layers']) $(`tab-${id}`).hidden = name !== id;
}
document.querySelectorAll('.tabs .tab').forEach((tab) => tab.addEventListener('click', () => selectTab(tab.dataset.tab)));

const quickbar = setupQuickbar({ editor, el: $('quickbar'), actions });

editor.on('selection', () => refreshPanels());
editor.on('transform', () => propsCtx.live?.());
editor.on('layers', () => refreshPanels({ props: false }));
editor.on('change', () => {
  dirty = true;
  refreshPanels({ props: false });
  scheduleAutosave();
  schedulePreview();
});
editor.on('history', () => {
  $('btnUndo').disabled = !editor.canUndo();
  $('btnRedo').disabled = !editor.canRedo();
});
editor.on('format', () => {
  updateFormatChip();
  updateSideSwitch();
  if (autoFit) fit();
});
editor.on('side', () => {
  updateSideSwitch();
  refreshPanels();
  schedulePreview();
});
editor.on('zoom', (z) => {
  // 100% = dimensione reale sullo schermo (96 px CSS per pollice).
  $('btnZoomFit').textContent = `${Math.round(((z * PX_PER_MM * 25.4) / 96) * 100)}%`;
});
editor.on('replaceImage', (obj) => pickImage({ mode: 'replace', target: obj }));

function updateFormatChip() {
  const { w, h: hh } = docSize(editor.doc);
  const f = getFormat(editor.doc.formatId);
  $('formatChip').textContent = `${f.id === 'CUSTOM' ? t('customFormat') : f.id} · ${w.toFixed(1)} × ${hh.toFixed(1)} mm`;
}

function updateSideSwitch() {
  for (const b of document.querySelectorAll('#sideSwitch .seg-btn')) {
    b.classList.toggle('active', b.dataset.side === editor.side);
    if (b.dataset.side === 'back') b.disabled = !editor.doc.backEnabled;
  }
}

// ------------------------------------------------------------------ dati
function updateRecordNav() {
  $('recordNav').hidden = !data.rows.length;
  $('recordLabel').textContent = `${data.current + 1} / ${data.rows.length}`;
}

function onRecordChanged() {
  updateRecordNav();
  editor.refreshBarcodes(sampleRecord());
  schedulePreview();
  scheduleAutosave();
}

onDataChange(() => {
  if (data.current >= data.rows.length) data.current = Math.max(0, data.rows.length - 1);
  if (view === 'people') renderPeople(peopleCtx);
  updateSteps();
  onRecordChanged();
});

$('btnPrevRec').addEventListener('click', () => {
  if (!data.rows.length) return;
  data.current = (data.current - 1 + data.rows.length) % data.rows.length;
  emitDataChange();
});
$('btnNextRec').addEventListener('click', () => {
  if (!data.rows.length) return;
  data.current = (data.current + 1) % data.rows.length;
  emitDataChange();
});

// Anteprima dei dati uniti sopra la card (non modificabile: un clic la chiude).
let previewTimer = 0;
function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(updateMergePreview, 250);
}
async function updateMergePreview() {
  const img = $('mergePreview');
  const on = $('togglePreview').checked && data.rows.length > 0;
  $('cardHolder').classList.toggle('previewing', on);
  if (!on) {
    img.hidden = true;
    return;
  }
  const dpi = Math.min(600, editor.zoom * PX_PER_MM * 25.4 * (window.devicePixelRatio || 1));
  const canvas = await renderSide(editor.serializeSide(editor.side), editor.doc, { record: data.rows[data.current], dpi });
  img.src = canvas.toDataURL('image/png');
  img.hidden = false;
}
$('togglePreview').addEventListener('change', updateMergePreview);
$('mergePreview').addEventListener('click', () => {
  $('togglePreview').checked = false;
  updateMergePreview();
});

// ------------------------------------------------------------------ immagini
let pendingImage = null;
function pickImage(opts) {
  pendingImage = opts;
  $('fileImage').click();
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function placeImageFile(file, opts = {}) {
  const url = await readAsDataURL(file);
  const target = opts.mode === 'replace' ? opts.target : editor.active();
  if (opts.mode === 'background') {
    await editor.setBackgroundImage(url);
  } else if (target?.kind === 'photo' && (opts.mode === 'replace' || target.getSrc() === PHOTO_PLACEHOLDER)) {
    await setImageCover(target, url);
    editor.update(target, {});
  } else if (target?.kind === 'image' && (opts.mode === 'replace' || target.getSrc() === LOGO_PLACEHOLDER)) {
    await setImageContain(target, url);
    editor.update(target, {});
  } else {
    await editor.addImage(url);
  }
  refreshPanels();
  quickbar.build();
}

$('fileImage').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  const opts = pendingImage || {};
  pendingImage = null;
  if (!file) return;
  try {
    await placeImageFile(file, opts);
  } catch {
    toast(t('imageError'), 'error');
  }
});

// ------------------------------------------------------------------ webcam
let stream = null;
let cameraTarget = null;
async function openCamera(target) {
  const active = editor.active();
  cameraTarget = target?.kind === 'photo' ? target : active?.kind === 'photo' ? active : null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: 'user' }, audio: false });
  } catch {
    toast(t('cameraError'), 'error');
    return;
  }
  $('cameraVideo').srcObject = stream;
  $('dlgCamera').showModal();
}
$('dlgCamera').addEventListener('close', () => {
  stream?.getTracks().forEach((tr) => tr.stop());
  stream = null;
});
$('btnShoot').addEventListener('click', async () => {
  const v = $('cameraVideo');
  if (!v.videoWidth) return;
  const ratio = cameraTarget ? cameraTarget.getScaledWidth() / cameraTarget.getScaledHeight() : 3 / 4;
  let sw = v.videoWidth;
  let sh = sw / ratio;
  if (sh > v.videoHeight) {
    sh = v.videoHeight;
    sw = sh * ratio;
  }
  const c = document.createElement('canvas');
  c.width = Math.round(sw);
  c.height = Math.round(sh);
  c.getContext('2d').drawImage(v, (v.videoWidth - sw) / 2, (v.videoHeight - sh) / 2, sw, sh, 0, 0, c.width, c.height);
  const url = c.toDataURL('image/jpeg', 0.92);
  $('dlgCamera').close();
  if (cameraTarget) {
    await setImageCover(cameraTarget, url);
    editor.update(cameraTarget, {});
    refreshPanels();
  } else {
    await editor.addPhoto('', { src: url });
  }
});

// ------------------------------------------------------------------ strumenti
function popMenu(anchor, title, items) {
  document.querySelector('.popmenu')?.remove();
  const r = anchor.getBoundingClientRect();
  const menu = h('div', { class: 'popmenu', role: 'menu' },
    h('div', { class: 'popmenu-title', text: title }),
    items.map((it) => h('button', { role: 'menuitem', type: 'button', class: it.mono ? 'mono' : '', onclick: () => { menu.remove(); it.onclick(); } },
      it.icon ? h('i', { 'data-lucide': it.icon, 'data-size': '16' }) : null, it.label)),
  );
  const narrow = window.innerWidth < 820;
  menu.style.left = `${narrow ? r.left : r.right + 10}px`;
  menu.style.top = `${narrow ? r.bottom + 6 : r.top}px`;
  document.body.append(menu);
  paintIcons(menu);
  const close = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('pointerdown', close, true);
    }
  };
  setTimeout(() => document.addEventListener('pointerdown', close, true));
}

const fieldColumns = () => (data.columns.length ? data.columns : ['Nome', 'Cognome', 'Azienda', 'Ruolo', 'Matricola', 'Email']);
const findColumn = (re) => data.columns.find((c) => re.test(c));

function addWave() {
  const { w, h: hh } = editor.size;
  editor.addPath(`M ${w * 0.45} ${hh + mm(2)} C ${w * 0.68} ${hh * 0.95} ${w * 0.88} ${hh * 0.86} ${w + mm(2)} ${hh * 0.74} L ${w + mm(2)} ${hh + mm(2)} Z`, { fill: '#2563FF' });
}

document.querySelector('.toolrail').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-tool]');
  if (!btn) return;
  const tool = btn.dataset.tool;
  if (tool === 'text') editor.addText({ text: t('defaultText'), fontFamily: 'Montserrat', fill: '#0B1D51' });
  if (tool === 'field') popMenu(btn, t('chooseField'), fieldColumns().map((c) => ({ label: `{{${c}}}`, mono: true, onclick: () => editor.addField(c, { fontFamily: 'Montserrat', fill: '#0B1D51' }) })));
  if (tool === 'photo') await editor.addPhoto(findColumn(/foto|photo|immagine|picture|img/i) || '', { photoShape: 'rounded' });
  if (tool === 'logo') pickImage({ mode: 'add' });
  if (tool === 'camera') openCamera(null);
  if (tool === 'shapes') {
    popMenu(btn, t('toolShapes'), [
      { icon: 'square', label: t('toolRect'), onclick: () => editor.addShape('rect', { fill: '#2563FF' }) },
      { icon: 'square', label: t('shapeRounded'), onclick: () => editor.addShape('rect', { fill: '#0B1D51', rx: mm(2) }) },
      { icon: 'circle', label: t('toolCircle'), onclick: () => editor.addShape('circle', { fill: '#06B6D4' }) },
      { icon: 'triangle', label: t('toolTriangle'), onclick: () => editor.addShape('triangle', { fill: '#EC4899' }) },
      { icon: 'minus', label: t('toolLine'), onclick: () => editor.addShape('line', { fill: '#0B1D51' }) },
      { icon: 'sparkles', label: t('shapeWave'), onclick: addWave },
    ]);
  }
  if (tool === 'barcode') {
    const col = findColumn(/matricola|id|codice|code|badge|number|numero/i);
    await editor.addBarcode('code128', col ? `{{${col}}}` : '', { color: '#0B1D51' });
  }
  if (tool === 'qrcode') {
    const col = findColumn(/email|mail|url|link|id/i);
    await editor.addBarcode('qrcode', col ? `{{${col}}}` : '', { color: '#0B1D51' });
  }
});

// ------------------------------------------------------------------ barra superiore e stage
$('btnUndo').addEventListener('click', () => editor.undo());
$('btnRedo').addEventListener('click', () => editor.redo());
$('btnZoomIn').addEventListener('click', () => {
  autoFit = false;
  editor.setZoom(editor.zoom * 1.2);
});
$('btnZoomOut').addEventListener('click', () => {
  autoFit = false;
  editor.setZoom(editor.zoom / 1.2);
});
$('btnZoomFit').addEventListener('click', fit);
document.querySelectorAll('#sideSwitch .seg-btn').forEach((b) => b.addEventListener('click', () => editor.setSide(b.dataset.side)));
$('toggleSafe').addEventListener('change', (e) => {
  editor.showSafe = e.target.checked;
  editor.drawOverlay();
});
$('toggleSnap').addEventListener('change', (e) => (editor.snap = e.target.checked));
document.querySelectorAll('dialog [data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));

// Menu File
const fileMenu = $('fileMenu');
$('btnFile').addEventListener('click', (e) => {
  e.stopPropagation();
  fileMenu.hidden = !fileMenu.hidden;
});
document.addEventListener('click', (e) => {
  if (!fileMenu.hidden && !fileMenu.contains(e.target)) fileMenu.hidden = true;
});
fileMenu.addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  fileMenu.hidden = true;
  if (action === 'new') setView('home');
  if (action === 'open') $('fileOpen').click();
  if (action === 'save') saveProject();
});

// ------------------------------------------------------------------ salva / apri
function saveProject() {
  const blob = new Blob([JSON.stringify({ ...editor.serialize(), data: serializeData(true) })], { type: 'application/json' });
  download(blob, `badge-${new Date().toISOString().slice(0, 10)}.badgeok`);
  toast(t('saved'));
}

$('fileOpen').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (file) await openProjectFile(file);
});

async function openProjectFile(file) {
  try {
    const json = JSON.parse(await file.text());
    if (json.app !== 'printbadge') throw new Error('format');
    await editor.load(json);
    restoreData(json.data);
    dirty = true;
    setView('design');
    toast(t('opened'));
  } catch {
    toast(t('openError'), 'error');
  }
}

// ------------------------------------------------------------------ salvataggio automatico
let autosaveTimer = 0;
let autosaveWarned = false;
function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    const project = editor.serialize();
    for (const withPhotos of [true, false]) {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ ...project, data: serializeData(withPhotos) }));
        return;
      } catch {
        /* quota superata: si riprova senza la libreria foto */
      }
    }
    if (!autosaveWarned) {
      autosaveWarned = true;
      toast(t('autosaveFull'), 'error');
    }
  }, 800);
}

function readAutosave() {
  try {
    return JSON.parse(localStorage.getItem(AUTOSAVE_KEY));
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ tastiera e appunti
function typingTarget(el) {
  return el && (el.closest('input, textarea, select, [contenteditable]') || el.isContentEditable);
}

document.addEventListener('keydown', async (e) => {
  if (document.querySelector('dialog[open]')) return;
  const mod = e.metaKey || e.ctrlKey;
  const key = e.key.toLowerCase();
  if (mod && key === 'p') {
    e.preventDefault();
    setView('print');
    return;
  }
  if (mod && key === 's') {
    e.preventDefault();
    saveProject();
    return;
  }
  if (view !== 'design' || typingTarget(e.target) || editor.active()?.isEditing) return;
  if (mod && key === 'z') {
    e.preventDefault();
    if (e.shiftKey) await editor.redo();
    else await editor.undo();
  } else if (mod && key === 'y') {
    e.preventDefault();
    await editor.redo();
  } else if (mod && key === 'd') {
    e.preventDefault();
    await editor.duplicate();
  } else if (mod && key === 'c') {
    await editor.copy();
  } else if (mod && (key === '=' || key === '+')) {
    e.preventDefault();
    autoFit = false;
    editor.setZoom(editor.zoom * 1.2);
  } else if (mod && key === '-') {
    e.preventDefault();
    autoFit = false;
    editor.setZoom(editor.zoom / 1.2);
  } else if (mod && key === '0') {
    e.preventDefault();
    fit();
  } else if (key === 'delete' || key === 'backspace') {
    e.preventDefault();
    editor.deleteSelection();
  } else if (key.startsWith('arrow') && editor.active()) {
    e.preventDefault();
    const step = mm(e.shiftKey ? 5 : 0.5);
    const d = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] }[key];
    editor.nudge(...d);
  } else if (key === 'escape') {
    editor.canvas.discardActiveObject();
    editor.canvas.requestRenderAll();
  }
});

document.addEventListener('paste', async (e) => {
  if (view !== 'design' || typingTarget(e.target) || editor.active()?.isEditing || document.querySelector('dialog[open]')) return;
  const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'));
  e.preventDefault();
  if (file) await placeImageFile(file);
  else await editor.paste();
});

// ------------------------------------------------------------------ trascina e rilascia (ovunque)
document.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (view === 'design') $('stage').classList.add('dropping');
});
document.addEventListener('dragleave', (e) => {
  if (!e.relatedTarget) $('stage').classList.remove('dropping');
});
document.addEventListener('drop', async (e) => {
  e.preventDefault();
  $('stage').classList.remove('dropping');
  for (const file of e.dataTransfer?.files || []) {
    const name = file.name.toLowerCase();
    if (file.type.startsWith('image/') && view === 'design') await placeImageFile(file);
    else if (/\.(xlsx|csv|tsv|txt)$/.test(name)) {
      try {
        await importDataFile(file);
        toast(t('dataImported', { n: data.rows.length }));
        if (view !== 'people') setView('people');
      } catch {
        toast(t('importError'), 'error');
      }
    } else if (/\.(badgeok|printbadge|json)$/.test(name)) await openProjectFile(file);
  }
});

// Clic sulla card in anteprima: si torna alla modifica.
for (const c of Object.values(editor.canvases)) {
  c.on('mouse:down', () => {
    if ($('togglePreview').checked) {
      $('togglePreview').checked = false;
      updateMergePreview();
    }
  });
}

new ResizeObserver(() => view === 'design' && autoFit && fit()).observe(stage);

// ------------------------------------------------------------------ lingua
const langSelect = $('langSelect');
langSelect.value = getLang();
langSelect.addEventListener('change', () => {
  setLang(langSelect.value);
  applyStatic();
  updateFormatChip();
  updateSteps();
  refreshPanels();
  quickbar.build();
  setView(view);
});

// ------------------------------------------------------------------ avvio
async function start() {
  applyStatic();
  paintIcons();
  updateSideSwitch();
  await preloadFonts();
  // Ritorno dalla pagina di pagamento Stripe: ?order=…&token=…(&cancelled=1)
  const params = new URLSearchParams(location.search);
  if (params.get('order') && params.get('token')) {
    orderResult = { orderId: params.get('order'), token: params.get('token'), cancelled: params.has('cancelled') };
    history.replaceState(null, '', location.pathname);
  }
  const saved = readAutosave();
  if (saved?.app === 'printbadge') {
    await editor.load(saved);
    restoreData(saved.data);
    dirty = true;
    setView(orderResult ? 'order' : 'design');
  } else {
    loadSampleData();
    await applyTemplate(editor, TEMPLATES[0], t);
    dirty = false;
    setView(orderResult ? 'order' : 'home');
  }
  updateFormatChip();
  refreshPanels();
  updateRecordNav();
  await editor.refreshBarcodes(sampleRecord());
  document.body.classList.add('ready');
}

start();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
