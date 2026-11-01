import { t } from '../i18n.js';
import { h } from './dom.js';
import { paintIcons } from './icons.js';
import { getFormat } from '../config/formats.js';
import { BadgeEditor } from '../editor/editor.js';
import { TEMPLATES, applyTemplate } from '../templates.js';
import { renderSide } from '../print/render.js';
import { SAMPLE_PEOPLE } from '../data/store.js';

// Le anteprime dei modelli vengono disegnate davvero (stesso motore della stampa) con un
// editor nascosto, una volta sola per lingua.
const thumbCache = new Map();
let thumbEditor = null;
let queue = Promise.resolve();

function hiddenEditor() {
  if (thumbEditor) return thumbEditor;
  const div = () => document.createElement('div');
  thumbEditor = new BadgeEditor({
    canvases: { front: document.createElement('canvas'), back: document.createElement('canvas') },
    panes: { front: div(), back: div() },
    holder: div(),
    overlay: document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
  });
  return thumbEditor;
}

async function templateThumb(tpl, lang) {
  const key = `${tpl.id}:${lang}`;
  if (thumbCache.has(key)) return thumbCache.get(key);
  // Un solo editor nascosto: i modelli vanno costruiti uno alla volta.
  const job = queue.then(async () => {
    const ed = hiddenEditor();
    await applyTemplate(ed, tpl, t);
    const project = ed.serialize();
    const record = SAMPLE_PEOPLE.rows[TEMPLATES.indexOf(tpl) % SAMPLE_PEOPLE.rows.length];
    const canvas = await renderSide(project.sides.front, project.doc, { record, dpi: 140 });
    return { url: canvas.toDataURL('image/png'), project };
  });
  queue = job.catch(() => {});
  thumbCache.set(key, job);
  return job;
}

/** Restituisce il progetto già costruito del modello (se l'anteprima è pronta). */
export async function templateProject(tpl, lang) {
  return (await templateThumb(tpl, lang)).project;
}

export function renderHome({ root, lang, current, actions }) {
  root.replaceChildren();
  const templatesRef = h('section', { id: 'templates' });
  const hero = h('section', { class: 'hero' },
    h('div', {},
      h('span', { class: 'eyebrow', text: 'BADGEOK.COM' }),
      h('h1', { html: t('homeTitle') }),
      h('p', { class: 'lead', text: t('homeLead') }),
      h('div', { class: 'hero-actions' },
        h('button', { class: 'btn-main lg', type: 'button', onclick: () => templatesRef.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
          t('homeCta'), h('i', { 'data-lucide': 'arrow-right' })),
        h('button', { class: 'btn lg', type: 'button', onclick: actions.openFile }, h('i', { 'data-lucide': 'folder-open' }), t('openProject')),
      ),
      h('div', { class: 'trust' },
        h('span', {}, h('i', { 'data-lucide': 'zap', 'data-size': '16' }), t('trust1')),
        h('span', {}, h('i', { 'data-lucide': 'truck', 'data-size': '16' }), t('trust2')),
        h('span', {}, h('i', { 'data-lucide': 'shield', 'data-size': '16' }), t('trust3')),
      ),
    ),
    h('div', { class: 'hero-art' }, h('img', { src: './brand/hero.webp', alt: '', width: 1600, height: 513, fetchpriority: 'high' })),
  );

  const cont = current
    ? h('div', { class: 'continue-card' },
      current.thumb ? h('img', { src: current.thumb, alt: '' }) : null,
      h('div', {}, h('strong', { text: t('continueTitle') }), h('span', { text: t('continueSub') })),
      h('button', { class: 'btn-main', type: 'button', onclick: actions.continueProject }, t('continue'), h('i', { 'data-lucide': 'arrow-right' })),
    )
    : null;

  // Cosa succede dopo l'ordine: stampa immediata e spedizione.
  const flow = h('section', { class: 'flow' },
    h('div', { class: 'section-head' }, h('div', {}, h('h2', { text: t('flowTitle') }), h('p', { text: t('flowSub') }))),
    h('div', { class: 'flow-steps' },
      ['order', 'print', 'ship'].map((name, i) => h('div', { class: 'flow-step' },
        h('img', { src: `./brand/flow-${name}.webp`, alt: '', width: 190, height: 130, loading: 'lazy' }),
        h('h3', { text: t(`flow${i + 1}Title`) }),
        h('p', { text: t(`flow${i + 1}Text`) }),
      )),
    ),
  );

  const grid = h('div', { class: 'tpl-grid' });
  for (const tpl of TEMPLATES) {
    const f = getFormat(tpl.formatId);
    const thumb = h('div', { class: 'tpl-thumb' }, tpl.id === 'blank'
      ? h('div', { class: 'tpl-blank' }, h('i', { 'data-lucide': 'plus' }))
      : h('div', { class: 'skeleton' }));
    grid.append(h('button', { class: 'tpl', type: 'button', onclick: () => actions.startTemplate(tpl) },
      thumb,
      h('strong', { text: t(`tpl_${tpl.id}`) }),
      h('span', { class: 'tpl-meta' }, h('span', { text: `${f.id} · ${tpl.orientation === 'portrait' ? t('portrait') : t('landscape')}` }), h('i', { 'data-lucide': 'arrow-right', 'data-size': '14' })),
    ));
    if (tpl.id !== 'blank') {
      templateThumb(tpl, lang).then(({ url }) => {
        thumb.replaceChildren(h('img', { src: url, alt: '' }));
      }).catch(() => {});
    }
  }
  templatesRef.append(
    h('div', { class: 'section-head' }, h('div', {}, h('h2', { text: t('chooseTemplate') }), h('p', { text: t('chooseTemplateSub') }))),
    grid,
  );

  root.append(h('div', { class: 'home' }, hero, flow, cont, templatesRef));
  paintIcons(root);
}
