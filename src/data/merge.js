// Campi variabili nel formato {{NomeColonna}}: funzionano in testi, codici a barre e foto.
export const FIELD_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function hasFields(text) {
  return typeof text === 'string' && /\{\{\s*[^{}]+?\s*\}\}/.test(text);
}

export function fieldsIn(text) {
  if (typeof text !== 'string') return [];
  return [...text.matchAll(FIELD_RE)].map((m) => m[1]);
}

function lookup(record, name) {
  if (!record) return undefined;
  if (name in record) return record[name];
  const lower = name.toLowerCase();
  for (const key of Object.keys(record)) {
    if (key.toLowerCase() === lower) return record[key];
  }
  return undefined;
}

export function fieldValue(record, name) {
  const v = lookup(record, name);
  if (v === undefined || v === null) return '';
  if (v instanceof Date) return v.toLocaleDateString();
  return String(v);
}

export function mergeText(text, record) {
  if (!record || typeof text !== 'string') return text;
  return text.replace(FIELD_RE, (_, name) => fieldValue(record, name));
}
