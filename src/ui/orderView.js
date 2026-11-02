import { t, getLang } from '../i18n.js';
import { h, field, numberInput, select } from './dom.js';
import { paintIcons } from './icons.js';
import { docSize, getFormat } from '../config/formats.js';
import { getPrinter, cardPage } from '../config/printers.js';
import { data, serializeData } from '../data/store.js';
import { renderSide } from '../print/render.js';
import { cardPages, pagesToPDF } from '../print/output.js';
import { projectUsesFields } from './printView.js';
import { LOGO_PLACEHOLDER } from '../editor/editor.js';
import { loadCatalog, quote, formatMoney, localized, uploadOrderFiles, createCheckout, legalLinks } from '../shop/shop.js';

const ORDER_DPI = 300;
// Stampante del laboratorio: i PDF degli ordini hanno la pagina del suo driver e la sua abbondanza.
const ORDER_PRINTER = getPrinter('evolis-badgy100');
const BADGES_PER_FILE = 100;
const LS_CUSTOMER = 'printbadge.customer';

function loadCustomer() {
  try {
    return JSON.parse(localStorage.getItem(LS_CUSTOMER)) || {};
  } catch {
    return {};
  }
}

const ERROR_KEYS = {
  customer: 'errCustomer', format: 'errFormat', too_many: 'errTooMany', orders_closed: 'errClosed',
  files: 'errUpload', files_missing: 'errUpload', payment_provider: 'errPayment',
};

export function mountOrderView({ root, editor, toast, goPeople, goDesign }) {
  const lang = getLang();
  const project = editor.serialize();
  const doc = project.doc;
  const card = docSize(doc);
  const usesFields = projectUsesFields(project);
  const hasLogoPlaceholder = Object.values(project.sides).some((side) => side.objects.some((o) => o.kind === 'image' && o.src === LOGO_PLACEHOLDER));
  const backUsed = doc.backEnabled && (project.sides.back.objects.length > 0 || (project.sides.back.background || '#ffffff').toLowerCase() !== '#ffffff');
  const st = {
    productId: null,
    addons: new Set(),
    copies: 1,
    scope: data.rows.length && usesFields ? 'all' : 'copies',
    customer: { name: '', email: '', phone: '', company: '', notes: '', ...loadCustomer() },
    accept: false,
  };
  let catalog = null;
  let busy = false;

  const settingsCol = h('div', { class: 'print-settings' });
  const preview = h('div', { class: 'print-preview' });
  const priceBox = h('div', { class: 'card-box print-cta' });
  root.replaceChildren(h('div', { class: 'order-loading empty', text: t('loadingShop') }));

  const name = (p) => localized(p, 'name', lang);
  const desc = (p) => localized(p, 'description', lang);
  const money = (c) => formatMoney(c, catalog?.settings.currency, lang);
  const badgeProducts = () => catalog.products.filter((p) => p.kind === 'badge' && p.active);
  const addonProducts = () => catalog.products.filter((p) => p.kind === 'addon' && p.active);
  const product = () => badgeProducts().find((p) => p.id === st.productId);

  function records() {
    const copies = Math.max(1, st.copies | 0);
    if (st.scope === 'copies') return Array(copies).fill(null);
    const idx = st.scope === 'selected' ? [...data.selected].sort((a, b) => a - b) : st.scope === 'current' ? [data.current] : data.rows.map((_, i) => i);
    return idx.flatMap((i) => Array(copies).fill(data.rows[i]));
  }

  function currentQuote() {
    const p = product();
    const n = records().length;
    if (!p || !n) return null;
    return quote({ product: p, quantity: n, addons: [...st.addons], catalog: catalog.products, settings: catalog.settings });
  }

  // ---------------------------------------------------------------- colonna impostazioni
  function stepTitle(n, text) {
    return h('h3', {}, h('span', { class: 'n', text: String(n) }), text);
  }

  function productCard() {
    const list = badgeProducts();
    return h('div', { class: 'card-box pcard' },
      stepTitle(1, t('chooseProduct')),
      h('div', { class: 'printer-list', style: 'max-height:none' },
        list.map((p) => {
          const okFormat = p.format_ids.includes(doc.formatId);
          return h('button', { type: 'button', class: `printer-opt ${p.id === st.productId ? 'on' : ''}`, disabled: !okFormat, onclick: () => { st.productId = p.id; rebuild(); } },
            h('span', { class: 'pi' }, h('i', { 'data-lucide': 'id-card', 'data-size': '16' })),
            h('span', { style: 'flex:1' }, h('b', { text: name(p) }), h('small', { text: desc(p) || '' })),
            h('span', { class: 'from-price', text: t('fromPrice', { price: money(Math.min(...p.tiers.map((x) => x.unit_cents))) }) }),
          );
        }),
      ),
      product() && backUsed && !product().duplex ? h('p', { class: 'warn', text: t('frontOnlyNote') }) : null,
      hasLogoPlaceholder ? h('p', { class: 'warn' }, t('logoMissing'), ' ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); goDesign(); } }, t('editDesign'))) : null,
    );
  }

  function quantityCard() {
    const scopeOptions = data.rows.length && usesFields
      ? [
        { value: 'all', label: t('scopeAll', { n: data.rows.length }) },
        { value: 'selected', label: t('scopeSelected', { n: data.selected.size }) },
        { value: 'current', label: t('scopeCurrent', { n: data.current + 1 }) },
      ]
      : null;
    const addons = addonProducts();
    return h('div', { class: 'card-box pcard' },
      stepTitle(2, t('howMany')),
      scopeOptions
        ? field(t('whichRecords'), select(scopeOptions, st.scope, (v) => { st.scope = v; rebuild(); }))
        : usesFields
          ? h('p', { class: 'warn' }, t('fieldsNoData'), ' ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); goPeople(); } }, t('addPeopleLink')))
          : null,
      field(st.scope === 'copies' ? t('copies') : t('copiesPerRecord'), numberInput(st.copies, (v) => { st.copies = Math.max(1, Math.round(v)); rebuild(); }, { step: 1, min: 1, digits: 0 })),
      addons.length
        ? h('div', { class: 'addons' },
          h('span', { class: 'plabel', text: t('addonsTitle') }),
          addons.map((a) => h('label', { class: 'check addon' },
            h('input', { type: 'checkbox', checked: st.addons.has(a.id), onchange: (e) => { if (e.target.checked) st.addons.add(a.id); else st.addons.delete(a.id); rebuild(); } }),
            h('span', { style: 'flex:1' }, name(a)),
            h('span', { class: 'muted', text: t('eachPrice', { price: money(a.unit_cents) }) }),
          )))
        : null,
    );
  }

  function customerCard() {
    const input = (key, type, label, opts = {}) => {
      const el = h(type === 'textarea' ? 'textarea' : 'input', { type: type === 'textarea' ? undefined : type, value: st.customer[key] || '', autocomplete: opts.autocomplete, rows: type === 'textarea' ? 2 : undefined, required: opts.required });
      el.addEventListener('input', () => {
        st.customer[key] = el.value;
        try {
          localStorage.setItem(LS_CUSTOMER, JSON.stringify({ name: st.customer.name, email: st.customer.email, phone: st.customer.phone, company: st.customer.company }));
        } catch {
          /* solo per comodità: se non si può salvare, si riscrive */
        }
      });
      return field(label + (opts.required ? ' *' : ''), el, opts.span ? 'span2' : '');
    };
    const terms = legalLinks.terms ? h('a', { href: legalLinks.terms, target: '_blank', rel: 'noopener', text: t('termsLink') }) : t('termsLink');
    const privacy = legalLinks.privacy ? h('a', { href: legalLinks.privacy, target: '_blank', rel: 'noopener', text: t('privacyLink') }) : t('privacyLink');
    return h('div', { class: 'card-box pcard' },
      stepTitle(3, t('yourDetails')),
      h('div', { class: 'grid2 form-grid' },
        input('name', 'text', t('fullName'), { required: true, autocomplete: 'name', span: true }),
        input('email', 'email', t('email'), { required: true, autocomplete: 'email' }),
        input('phone', 'tel', t('phone'), { autocomplete: 'tel' }),
        input('company', 'text', t('companyOpt'), { autocomplete: 'organization', span: true }),
        input('notes', 'textarea', t('orderNotes'), { span: true }),
      ),
      h('p', { class: 'hint', text: t('shippingHint') }),
      h('label', { class: 'check accept' },
        h('input', { type: 'checkbox', checked: st.accept, onchange: (e) => { st.accept = e.target.checked; } }),
        h('span', {}, t('acceptPrefix'), ' ', terms, ' ', t('and'), ' ', privacy, '. ', t('customNoReturn')),
      ),
    );
  }

  // ---------------------------------------------------------------- riepilogo e prezzo
  function priceContent() {
    const q = currentQuote();
    const p = product();
    if (!q || !p) return [h('p', { class: 'empty', text: t('nothingToPrint') })];
    const tiers = [...p.tiers].sort((a, b) => a.min - b.min);
    const next = tiers.find((x) => x.min > q.lines[0].quantity);
    const line = (label, value, cls = '') => h('div', { class: `price-line ${cls}` }, h('span', { text: label }), h('b', { text: value }));
    return [
      h('div', { class: 'price-table' },
        q.lines.map((l) => line(`${l.quantity} × ${name(catalog.products.find((x) => x.id === l.id))} (${money(l.unit_cents)})`, money(l.total_cents))),
        line(t('shipping'), q.shipping_cents ? money(q.shipping_cents) : t('free')),
        line(t('total'), money(q.total_cents), 'total'),
      ),
      next ? h('p', { class: 'hint tier-hint', text: t('tierHint', { n: next.min, price: money(next.unit_cents) }) }) : null,
      catalog.settings.free_shipping_from_cents != null && q.shipping_cents
        ? h('p', { class: 'hint tier-hint', text: t('freeShippingHint', { amount: money(catalog.settings.free_shipping_from_cents) }) })
        : null,
      progress,
      h('button', { class: 'btn-main go lg', type: 'button', onclick: submit }, h('i', { 'data-lucide': 'shield' }), t('payButton', { total: money(q.total_cents) })),
      h('p', { class: 'hint secure', text: t('securePayment') }),
    ];
  }

  const progress = h('div', { class: 'progress', hidden: true }, h('div', { class: 'bar' }), h('span', {}));

  let previewToken = 0;
  async function drawPreview() {
    const my = ++previewToken;
    const rec = records()[0] ?? null;
    const withBack = backUsed && product()?.duplex;
    const imgs = [await renderSide(project.sides.front, doc, { record: rec, dpi: 140 })];
    if (withBack) imgs.push(await renderSide(project.sides.back, doc, { record: rec, dpi: 140 }));
    if (my !== previewToken) return;
    const k = Math.min(3.4, 250 / Math.max(card.w, card.h));
    preview.replaceChildren(...imgs.map((c, i) => {
      c.className = 'page-thumb';
      c.style.width = `${card.w * k}px`;
      c.style.height = `${card.h * k}px`;
      return h('figure', {}, c, h('figcaption', { text: i === 0 ? t('front') : t('back') }));
    }));
  }

  function rebuild() {
    if (!catalog) return;
    if (!badgeProducts().some((p) => p.id === st.productId && p.format_ids.includes(doc.formatId))) {
      st.productId = badgeProducts().find((p) => p.format_ids.includes(doc.formatId))?.id ?? null;
    }
    const formatOk = Boolean(st.productId);
    settingsCol.replaceChildren(...[
      formatOk ? null : h('div', { class: 'card-box pcard' },
        h('p', { class: 'warn', text: t('errFormatLong', { fmt: getFormat(doc.formatId).label }) }),
        h('button', { class: 'btn outline', type: 'button', onclick: goDesign }, h('i', { 'data-lucide': 'pencil' }), t('editDesign')),
      ),
      productCard(),
      quantityCard(),
      customerCard(),
    ].filter(Boolean));
    priceBox.replaceChildren(...priceContent().filter(Boolean));
    paintIcons(root);
    drawPreview();
  }

  // ---------------------------------------------------------------- invio ordine
  async function submit() {
    if (busy) return;
    const p = product();
    const q = currentQuote();
    if (!p || !q) return toast(t('nothingToPrint'), 'error');
    const c = st.customer;
    if (!c.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) return toast(t('errCustomer'), 'error');
    if (!st.accept) return toast(t('errAccept'), 'error');
    if (q.lines[0].quantity > catalog.settings.max_badges) return toast(t('errTooMany', { max: catalog.settings.max_badges }), 'error');

    busy = true;
    root.classList.add('busy');
    progress.hidden = false;
    const bar = progress.querySelector('.bar');
    const label = progress.querySelector('span');
    const step = (text, frac) => {
      label.textContent = text;
      bar.style.width = `${Math.round(frac * 100)}%`;
    };
    try {
      const recs = records();
      const withBack = backUsed && p.duplex;
      const pdfs = [];
      const cache = new Map();
      let chunk = [];
      for (let i = 0; i < recs.length; i++) {
        const key = usesFields ? recs[i] : 'static';
        if (!cache.has(key)) {
          const f = await renderSide(project.sides.front, doc, { record: recs[i], dpi: ORDER_DPI, bleedMm: ORDER_PRINTER.bleed });
          const b = withBack ? await renderSide(project.sides.back, doc, { record: recs[i], dpi: ORDER_DPI, bleedMm: ORDER_PRINTER.bleed }) : null;
          cache.set(key, b ? [f, b] : [f]);
        }
        chunk.push(...cache.get(key));
        // Con i dati ogni persona è diversa: si tiene in memoria solo la ripetizione delle copie.
        if (usesFields && recs[i + 1] !== recs[i]) cache.delete(key);
        if ((i + 1) % BADGES_PER_FILE === 0 || i === recs.length - 1) {
          pdfs.push(pagesToPDF(cardPages(chunk, card, { bleed: ORDER_PRINTER.bleed, page: cardPage(ORDER_PRINTER, card) }), { jpeg: true, quality: 0.93 }));
          chunk = [];
        }
        step(t('preparingBadges', { i: i + 1, n: recs.length }), ((i + 1) / recs.length) * 0.6);
      }
      const previewCanvas = await renderSide(project.sides.front, doc, { record: recs[0], dpi: 150 });
      const previewBlob = await new Promise((r) => previewCanvas.toBlob(r, 'image/png'));
      const printed = recs.filter(Boolean);
      const names = new Set(printed.flatMap((r) => Object.values(r).map((v) => String(v).split(/[\\/]/).pop().toLowerCase())));
      const usedPhotos = Object.fromEntries(Object.entries(serializeData(true).photos).filter(([k]) => names.has(k)));
      const projectBlob = new Blob([JSON.stringify({ ...project, data: { columns: data.columns, rows: printed, photos: usedPhotos } })], { type: 'application/json' });

      step(t('uploadingFiles'), 0.65);
      const uploaded = await uploadOrderFiles({ pdfs, preview: previewBlob, project: projectBlob }, (i, n) => step(t('uploadingFiles'), 0.65 + (i / n) * 0.25));
      step(t('openingPayment'), 0.95);
      const res = await createCheckout({
        productId: p.id,
        quantity: recs.length,
        addons: [...st.addons],
        customer: { name: c.name, email: c.email, phone: c.phone, company: c.company, notes: c.notes },
        formatId: doc.formatId,
        orientation: card.w >= card.h ? 'landscape' : 'portrait',
        locale: lang,
        ...uploaded,
      });
      window.location.assign(res.url);
    } catch (err) {
      console.error(err);
      const key = ERROR_KEYS[err.code] || 'errGeneric';
      toast(t(key, { max: catalog.settings.max_badges }), 'error');
      busy = false;
      root.classList.remove('busy');
      progress.hidden = true;
    }
  }

  loadCatalog()
    .then((c) => {
      catalog = c;
      root.replaceChildren(
        h('div', { class: 'print-layout' }, settingsCol, h('div', { class: 'print-side' }, preview, priceBox,
          h('div', { class: 'tipbox' }, h('i', { 'data-lucide': 'info' }), h('div', {}, h('strong', { text: t('howOrderWorks') }), h('p', { text: t('howOrderWorksText') }))))),
      );
      if (!catalog.settings.orders_open) settingsCol.before(h('p', { class: 'warn', text: t('errClosed') }));
      rebuild();
    })
    .catch((err) => {
      console.error(err);
      root.replaceChildren(h('p', { class: 'warn', text: t('shopUnavailable') }));
    });

  return { submit: () => submit() };
}

/** Pagina di conferma dopo il ritorno da Stripe. */
export function renderOrderResult({ root, orderId, token, cancelled, orderStatus, actions }) {
  const lang = getLang();
  const box = h('div', { class: 'card-box result-box' });
  root.replaceChildren(h('div', { class: 'page' }, box));
  if (cancelled) {
    box.append(
      h('span', { class: 'result-ic warn-ic' }, h('i', { 'data-lucide': 'x', 'data-size': '28' })),
      h('h1', { text: t('payCancelledTitle') }),
      h('p', { text: t('payCancelledText') }),
      h('div', { class: 'prow' }, h('button', { class: 'btn-main', type: 'button', onclick: actions.backToOrder }, t('tryAgain'))),
    );
    paintIcons(root);
    return;
  }
  const title = h('h1', { text: t('thanksTitle') });
  const statusLine = h('p', { class: 'status-line', text: t('checkingPayment') });
  const details = h('p', { class: 'hint' });
  box.append(
    h('span', { class: 'result-ic' }, h('i', { 'data-lucide': 'check-circle', 'data-size': '30' })),
    title,
    statusLine,
    details,
    h('div', { class: 'prow' }, h('button', { class: 'btn-main', type: 'button', onclick: actions.newBadge }, t('createAnother'))),
  );
  paintIcons(root);
  let tries = 0;
  const poll = async () => {
    try {
      const o = await orderStatus(orderId, token);
      if (!o) {
        statusLine.textContent = t('orderNotFound');
        return;
      }
      title.textContent = t('thanksTitleN', { n: o.number });
      statusLine.textContent = t(`orderStatus_${o.status}`);
      details.textContent = t('orderSummaryLine', { n: o.quantity, total: formatMoney(o.total_cents, o.currency, lang) });
      if (o.status === 'pending' && ++tries < 30) setTimeout(poll, 3000);
    } catch {
      statusLine.textContent = t('shopUnavailable');
    }
  };
  poll();
}
