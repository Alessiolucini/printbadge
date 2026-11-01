import Papa from 'papaparse';
import { readSheet } from 'read-excel-file/browser';

// Archivio dei dati per la stampa unione: righe importate da CSV/Excel/incolla
// più una libreria di foto abbinate per nome file.
export const data = {
  columns: [],
  rows: [],
  selected: new Set(),
  current: 0,
  photos: new Map(),
};

const listeners = new Set();
export function onDataChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function emitDataChange() {
  for (const fn of listeners) fn(data);
}

function normalizeTable(table) {
  const nonEmpty = table.filter((r) => r.some((c) => c !== null && c !== undefined && String(c).trim() !== ''));
  if (!nonEmpty.length) return { columns: [], rows: [] };
  const header = nonEmpty[0].map((h, i) => (h === null || String(h).trim() === '' ? `Col${i + 1}` : String(h).trim()));
  const seen = new Map();
  const columns = header.map((h) => {
    const n = seen.get(h) || 0;
    seen.set(h, n + 1);
    return n ? `${h}_${n + 1}` : h;
  });
  const rows = nonEmpty.slice(1).map((r) => {
    const rec = {};
    columns.forEach((c, i) => {
      const v = r[i];
      rec[c] = v instanceof Date ? v.toLocaleDateString() : v === null || v === undefined ? '' : String(v);
    });
    return rec;
  });
  return { columns, rows };
}

export function setTable({ columns, rows }) {
  data.columns = columns;
  data.rows = rows;
  data.selected = new Set(rows.map((_, i) => i));
  data.current = 0;
  emitDataChange();
}

export async function importDataFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx')) {
    const table = await readSheet(file);
    setTable(normalizeTable(table));
    return;
  }
  if (name.endsWith('.xls')) {
    throw new Error('XLS');
  }
  const text = await file.text();
  importText(text);
}

export function importText(text) {
  const parsed = Papa.parse(text.trim(), { skipEmptyLines: 'greedy', delimiter: '' });
  setTable(normalizeTable(parsed.data));
}

export function addPhotos(files) {
  const jobs = [...files].map(
    (file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const full = file.name.toLowerCase();
          data.photos.set(full, reader.result);
          data.photos.set(full.replace(/\.[^.]+$/, ''), reader.result);
          resolve();
        };
        reader.onerror = () => resolve();
        reader.readAsDataURL(file);
      }),
  );
  return Promise.all(jobs).then(emitDataChange);
}

export function photoCount() {
  return [...data.photos.keys()].filter((k) => /\.[a-z0-9]+$/.test(k)).length;
}

/** Restituisce una sorgente immagine per il valore di una cella (URL, data URL o nome file). */
export function resolvePhoto(value) {
  if (!value) return null;
  const v = String(value).trim();
  if (/^(data:image\/|https?:\/\/|blob:)/i.test(v)) return v;
  if (/^\.?\/.+\.(png|jpe?g|webp|gif|svg)$/i.test(v)) return v;
  const base = v.split(/[\\/]/).pop().toLowerCase();
  return data.photos.get(base) || data.photos.get(base.replace(/\.[^.]+$/, '')) || null;
}

export function currentRecord() {
  return data.rows[data.current] || null;
}

export function sampleRecord() {
  return data.rows[data.current] || data.rows[0] || null;
}

export const SAMPLE_PEOPLE = {
  columns: ['Nome', 'Cognome', 'Ruolo', 'Azienda', 'Matricola', 'Email', 'Foto'],
  rows: [
    { Nome: 'Giulia', Cognome: 'Bianchi', Ruolo: 'Responsabile acquisti', Azienda: 'Ferri & Co.', Matricola: '000128', Email: 'giulia.bianchi@example.com', Foto: './samples/giulia.jpg' },
    { Nome: 'Marco', Cognome: 'Esposito', Ruolo: 'Tecnico di laboratorio', Azienda: 'Ferri & Co.', Matricola: '000129', Email: 'marco.esposito@example.com', Foto: './samples/marco.jpg' },
    { Nome: 'Aisha', Cognome: 'Conti', Ruolo: 'Direttrice commerciale', Azienda: 'Nordline', Matricola: '000130', Email: 'aisha.conti@example.com', Foto: './samples/aisha.jpg' },
    { Nome: 'Luca', Cognome: 'Romano De Santis', Ruolo: 'Sviluppatore software', Azienda: 'Nordline', Matricola: '000131', Email: 'luca.romano@example.com', Foto: './samples/luca.jpg' },
    { Nome: 'Chen', Cognome: 'Wei', Ruolo: 'Product designer', Azienda: 'Studio Delta', Matricola: '000132', Email: 'chen.wei@example.com', Foto: './samples/chen.jpg' },
  ],
};

export function loadSampleData() {
  setTable({ columns: [...SAMPLE_PEOPLE.columns], rows: SAMPLE_PEOPLE.rows.map((r) => ({ ...r })) });
}

export function serializeData(includePhotos = true) {
  const photos = includePhotos
    ? Object.fromEntries([...data.photos.entries()].filter(([k]) => /\.[a-z0-9]+$/.test(k)))
    : {};
  return { columns: data.columns, rows: data.rows, photos };
}

export function restoreData(saved) {
  data.photos = new Map();
  for (const [k, v] of Object.entries(saved?.photos || {})) {
    data.photos.set(k, v);
    data.photos.set(k.replace(/\.[^.]+$/, ''), v);
  }
  setTable({ columns: saved?.columns || [], rows: saved?.rows || [] });
}
