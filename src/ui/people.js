import { t } from '../i18n.js';
import { h } from './dom.js';
import { paintIcons } from './icons.js';
import { data, emitDataChange, importDataFile, importText, addPhotos, photoCount, loadSampleData, setTable, resolvePhoto } from '../data/store.js';
import { fieldValue } from '../data/merge.js';
import { renderSide } from '../print/render.js';

const photoColumn = () => data.columns.find((c) => /foto|photo|immagine|picture|img|avatar/i.test(c));
const initials = (rec) => data.columns.slice(0, 2).map((c) => String(rec[c] || '').trim()[0] || '').join('').toUpperCase();

export function renderPeople(ctx) {
  const { root, actions } = ctx;
  root.replaceChildren();

  const fileInput = h('input', { type: 'file', accept: '.xlsx,.csv,.tsv,.txt,text/csv', hidden: true, onchange: async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (f) await importFile(f);
  } });
  const photoInput = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: async (e) => {
    await addPhotos(e.target.files);
    e.target.value = '';
    actions.toast(t('photosLoaded', { n: photoCount() }));
  } });

  async function importFile(f) {
    try {
      await importDataFile(f);
      actions.toast(t('dataImported', { n: data.rows.length }));
    } catch (err) {
      actions.toast(String(err?.message) === 'XLS' ? t('xlsNotSupported') : t('importError'), 'error');
    }
  }

  const head = h('div', { class: 'page-head' },
    h('div', {},
      h('span', { class: 'eyebrow', text: t('stepOf', { n: 2 }) }),
      h('h1', { text: t('peopleTitle') }),
      h('p', { text: t('peopleIntro') }),
    ),
    data.rows.length
      ? h('div', { class: 'page-actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => fileInput.click() }, h('i', { 'data-lucide': 'file-spreadsheet' }), t('replaceList')),
        h('button', { class: 'btn', type: 'button', onclick: () => photoInput.click() }, h('i', { 'data-lucide': 'images' }), t('loadPhotos')),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => {
          if (confirm(t('confirmClearData'))) setTable({ columns: [], rows: [] });
        } }, t('clear')),
        h('button', { class: 'btn-main', type: 'button', onclick: actions.next }, t('nextPrint'), h('i', { 'data-lucide': 'arrow-right' })),
      )
      : null,
  );
  const page = h('div', { class: 'page' }, head, fileInput, photoInput);
  root.append(page);

  if (!data.rows.length) {
    const paste = h('textarea', { rows: 4, placeholder: t('pastePlaceholder'), spellcheck: 'false' });
    const drop = h('div', { class: 'dropzone', role: 'button', tabindex: '0', onclick: () => fileInput.click() },
      h('i', { 'data-lucide': 'file-spreadsheet', 'data-size': '30' }),
      h('strong', { text: t('dropTitle') }),
      h('span', { text: t('dropSub') }),
    );
    drop.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && fileInput.click());
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      drop.classList.remove('over');
      const f = e.dataTransfer.files[0];
      if (f) await importFile(f);
    });
    page.append(h('div', { class: 'empty-people' },
      h('img', { src: './brand/people.webp', alt: '', width: 720, height: 720 }),
      h('div', {},
        h('h2', { text: t('peopleEmptyTitle') }),
        h('p', { text: t('dataIntro') }),
        drop,
        h('div', { class: 'or', text: t('or') }),
        paste,
        h('div', { class: 'prow', style: 'margin-top:10px' },
          h('button', { class: 'btn outline', type: 'button', onclick: () => {
            if (!paste.value.trim()) return;
            importText(paste.value);
            actions.toast(t('dataImported', { n: data.rows.length }));
          } }, h('i', { 'data-lucide': 'clipboard-paste' }), t('usePasted')),
          h('button', { class: 'btn ghost', type: 'button', onclick: () => loadSampleData() }, h('i', { 'data-lucide': 'sparkles' }), t('useSample')),
        ),
        h('p', { class: 'hint', style: 'margin-top:16px' }, t('skipPeople'), ' ',
          h('a', { href: '#', onclick: (e) => { e.preventDefault(); actions.next(); } }, t('skipPeopleLink'))),
      ),
    ));
    paintIcons(root);
    return;
  }

  // ---------------------------------------------------------------- tabella
  const pcol = photoColumn();
  const search = h('input', { type: 'search', class: 'field-input', placeholder: t('searchPeople'), style: 'max-width:240px' });
  const tbody = h('tbody');
  const allBox = h('input', { type: 'checkbox', checked: data.selected.size === data.rows.length, title: t('selectAll'), onchange: (e) => {
    data.selected = e.target.checked ? new Set(data.rows.map((_, i) => i)) : new Set();
    fillRows();
    updateCount();
  } });
  const table = h('table', { class: 'dtable' },
    h('thead', {}, h('tr', {}, h('th', {}, allBox), h('th', { text: '#' }), pcol ? h('th', { text: '' }) : null, data.columns.map((c) => h('th', { text: c })))),
    tbody,
  );

  function fillRows() {
    const q = search.value.trim().toLowerCase();
    tbody.replaceChildren();
    let shown = 0;
    for (let i = 0; i < data.rows.length && shown < 500; i++) {
      const rec = data.rows[i];
      if (q && !data.columns.some((c) => String(rec[c] ?? '').toLowerCase().includes(q))) continue;
      shown++;
      const src = pcol ? resolvePhoto(fieldValue(rec, pcol)) : null;
      const tr = h('tr', { class: i === data.current ? 'cur' : '', onclick: (e) => {
        if (e.target.closest('input,[contenteditable]')) return;
        selectRow(i, tr);
      } },
        h('td', {}, h('input', { type: 'checkbox', checked: data.selected.has(i), onchange: (e) => {
          if (e.target.checked) data.selected.add(i);
          else data.selected.delete(i);
          updateCount();
        } })),
        h('td', { class: 'num', text: String(i + 1) }),
        pcol ? h('td', { class: 'avatar' }, src ? h('img', { src, alt: '', loading: 'lazy' }) : h('span', { text: initials(rec) })) : null,
        data.columns.map((c) => {
          const td = h('td', { contenteditable: 'plaintext-only', spellcheck: 'false', text: rec[c] ?? '' });
          td.addEventListener('focus', () => data.current !== i && selectRow(i, tr));
          td.addEventListener('blur', () => {
            if (rec[c] === td.textContent) return;
            rec[c] = td.textContent;
            actions.recordChanged();
            updatePreview();
          });
          return td;
        }),
      );
      tbody.append(tr);
    }
  }
  // Cambiare persona o spuntarla aggiorna solo ciò che serve: la tabella resta dov'era.
  function selectRow(i, tr) {
    data.current = i;
    tbody.querySelectorAll('tr.cur').forEach((r) => r.classList.remove('cur'));
    tr.classList.add('cur');
    actions.recordChanged();
    updatePreview();
  }
  function updateCount() {
    countEl.textContent = t('peopleCount', { n: data.rows.length, sel: data.selected.size });
    allBox.checked = data.selected.size === data.rows.length;
  }
  const countEl = h('h3', { text: t('peopleCount', { n: data.rows.length, sel: data.selected.size }) });
  search.addEventListener('input', fillRows);

  const tableBox = h('div', { class: 'card-box' },
    h('div', { class: 'card-box-head' },
      countEl,
      h('div', { class: 'prow' },
        search,
        h('button', { class: 'btn ghost', type: 'button', onclick: () => {
          data.rows.push(Object.fromEntries(data.columns.map((c) => [c, ''])));
          data.selected.add(data.rows.length - 1);
          data.current = data.rows.length - 1;
          emitDataChange();
        } }, h('i', { 'data-lucide': 'plus' }), t('addRow')),
      ),
    ),
    h('div', { class: 'table-wrap' }, table),
    data.rows.length > 500 ? h('p', { class: 'hint', style: 'padding:10px 16px', text: t('tableLimited', { n: 500 }) }) : null,
  );

  // ---------------------------------------------------------------- anteprima persona
  const pvImgs = h('div', { class: 'pv' });
  const pvName = h('span', { class: 'pname' });
  const preview = h('div', { class: 'card-box preview-box' },
    h('span', { class: 'eyebrow', text: t('livePreview') }),
    pvImgs,
    pvName,
    h('button', { class: 'btn ghost', type: 'button', onclick: actions.goDesign }, h('i', { 'data-lucide': 'pencil' }), t('editDesign')),
  );
  let token = 0;
  async function updatePreview() {
    const my = ++token;
    const rec = data.rows[data.current];
    if (!rec) return;
    const project = ctx.editor.serialize();
    const sides = ['front', ...(project.doc.backEnabled && project.sides.back.objects.length ? ['back'] : [])];
    const urls = [];
    for (const s of sides) urls.push((await renderSide(project.sides[s], project.doc, { record: rec, dpi: 150 })).toDataURL('image/png'));
    if (my !== token) return;
    pvImgs.replaceChildren(...urls.map((u) => h('img', { src: u, alt: '', style: urls.length > 1 ? 'max-width:46%' : '' })));
    pvName.textContent = data.columns.slice(0, 2).map((c) => rec[c]).filter(Boolean).join(' ');
  }
  fillRows();
  updatePreview();

  const chips = h('div', { class: 'card-box', style: 'padding:16px;display:grid;gap:10px' },
    h('h3', { style: 'margin:0;font-size:14px', text: t('useColumns') }),
    h('p', { class: 'hint', text: t('columnsHint') }),
    h('div', { class: 'chips' },
      data.columns.map((c) => h('span', { class: 'chip-col' },
        h('button', { type: 'button', class: 'chip-main', title: t('addAsText'), onclick: () => actions.addField(c) }, `{{${c}}}`),
        h('button', { type: 'button', class: 'chip-x', title: t('addAsQr'), onclick: () => actions.addBarcodeField(c) }, h('i', { 'data-lucide': 'qr-code', 'data-size': '14' })),
        h('button', { type: 'button', class: 'chip-x', title: t('addAsPhoto'), onclick: () => actions.addPhotoField(c) }, h('i', { 'data-lucide': 'user-round', 'data-size': '14' })),
      )),
    ),
    h('p', { class: 'hint', text: photoCount() ? t('photosLoaded', { n: photoCount() }) : t('photosHint') }),
  );

  page.append(h('div', { class: 'people-layout' }, tableBox, h('div', { class: 'side-preview' }, preview, chips)));
  paintIcons(root);
}
