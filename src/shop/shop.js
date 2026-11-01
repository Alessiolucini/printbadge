import { createClient } from '@supabase/supabase-js';
import { quote, unitPriceCents } from '../../supabase/functions/_shared/pricing.js';

// Il negozio si attiva solo se il sito è compilato con l'indirizzo e la chiave pubblica (anon)
// di Supabase: senza, l'app resta un editor con stampa in proprio.
const URL_ = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const shopEnabled = Boolean(URL_ && ANON);
export const legalLinks = {
  terms: import.meta.env.VITE_TERMS_URL || '',
  privacy: import.meta.env.VITE_PRIVACY_URL || '',
};

let client = null;
function sb() {
  if (!client) client = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export { quote, unitPriceCents };

let catalogCache = null;
export async function loadCatalog() {
  if (catalogCache) return catalogCache;
  const [{ data: products, error: e1 }, { data: settings, error: e2 }] = await Promise.all([
    sb().from('products').select('*').order('sort'),
    sb().from('shop_settings').select('*').eq('id', 1).single(),
  ]);
  if (e1 || e2) throw e1 || e2;
  catalogCache = { products, settings };
  return catalogCache;
}

export function formatMoney(cents, currency = 'eur', locale = 'it') {
  return new Intl.NumberFormat(locale === 'en' ? 'en-IE' : 'it-IT', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

/** Carica i file dell'ordine in una cartella nuova e restituisce i percorsi. */
export async function uploadOrderFiles({ pdfs, preview, project }, onProgress) {
  const folder = `incoming/${crypto.randomUUID()}`;
  const bucket = sb().storage.from('order-files');
  const jobs = [
    ...pdfs.map((blob, i) => ({ path: `${folder}/badges-${String(i + 1).padStart(2, '0')}.pdf`, blob, type: 'application/pdf', kind: 'pdf' })),
    preview && { path: `${folder}/preview.png`, blob: preview, type: 'image/png', kind: 'preview' },
    project && { path: `${folder}/project.json`, blob: project, type: 'application/json', kind: 'project' },
  ].filter(Boolean);
  let done = 0;
  for (const job of jobs) {
    const { error } = await bucket.upload(job.path, job.blob, { contentType: job.type, upsert: false });
    if (error) throw error;
    onProgress?.(++done, jobs.length);
  }
  return {
    files: jobs.filter((j) => j.kind === 'pdf').map((j) => j.path),
    previewPath: jobs.find((j) => j.kind === 'preview')?.path,
    projectPath: jobs.find((j) => j.kind === 'project')?.path,
  };
}

export async function createCheckout(payload) {
  const { data, error } = await sb().functions.invoke('create-checkout', { body: payload });
  if (error) {
    let detail = null;
    try {
      detail = await error.context?.json?.();
    } catch {
      /* risposta non JSON */
    }
    const err = new Error(detail?.error || error.message);
    err.code = detail?.error;
    throw err;
  }
  return data;
}

export async function orderStatus(orderId, token) {
  const { data, error } = await sb().rpc('get_order_status', { p_order: orderId, p_token: token });
  if (error) throw error;
  return data?.[0] || null;
}
