// Traduzioni dell'interfaccia: un file per lingua in src/locales. Per aggiungere una lingua
// basta copiare locales/en.js, tradurre i valori e registrarla in LANGUAGES.
import it from './locales/it.js';
import en from './locales/en.js';
import es from './locales/es.js';
import fr from './locales/fr.js';
import de from './locales/de.js';

const STRINGS = { it, en, es, fr, de };

/** Lingue offerte nel selettore, nell'ordine in cui compaiono. */
export const LANGUAGES = [
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
];

const LANG_KEY = 'printbadge.lang';

/** Prima lingua del browser tra quelle disponibili; altrimenti inglese. */
function browserLang() {
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language || 'en'];
  for (const p of prefs) {
    const code = String(p).toLowerCase().split('-')[0];
    if (STRINGS[code]) return code;
  }
  return 'en';
}

let lang = (() => {
  // ?lang=es nell'indirizzo forza la lingua (utile per i link condivisi).
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (fromUrl && STRINGS[fromUrl]) return fromUrl;
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && STRINGS[saved]) return saved;
  } catch {
    /* nessuna preferenza salvata */
  }
  return browserLang();
})();

export function getLang() {
  return lang;
}

export function setLang(next) {
  if (!STRINGS[next]) return;
  lang = next;
  document.documentElement.lang = next;
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {
    /* preferenza valida solo per questa sessione */
  }
}

export function t(key, vars) {
  let s = STRINGS[lang][key] ?? STRINGS.en[key] ?? STRINGS.it[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
}

export function applyStatic(root = document) {
  document.documentElement.lang = lang;
  document.title = t('pageTitle');
  root.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
    el.setAttribute('aria-label', el.title);
  });
}
