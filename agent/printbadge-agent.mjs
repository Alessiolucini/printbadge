#!/usr/bin/env node
// Agente di stampa PRINTBADGE.COM.
// Gira sul computer collegato alla stampante di badge: ogni pochi secondi chiede a Supabase
// il prossimo ordine pagato, scarica i PDF e li manda alla stampante con il driver di sistema.
// È il computer a contattare Supabase: non serve aprire porte sul router.
import { createClient } from '@supabase/supabase-js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const run = promisify(execFile);
const args = new Set(process.argv.slice(2));

function splitOptions(value) {
  return (value || '').match(/(?:[^\s"]+|"[^"]*")+/g)?.map((s) => s.replace(/^"|"$/g, '')) ?? [];
}

const cfg = {
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  printer: process.env.PRINTER_NAME,
  options: splitOptions(process.env.PRINT_OPTIONS),
  portrait: splitOptions(process.env.PRINT_OPTIONS_PORTRAIT),
  landscape: splitOptions(process.env.PRINT_OPTIONS_LANDSCAPE),
  agent: process.env.AGENT_NAME || os.hostname(),
  pollSeconds: Math.max(3, Number(process.env.POLL_SECONDS) || 10),
  dryRun: process.env.DRY_RUN === 'true',
  sumatra: process.env.SUMATRA_PATH || 'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe',
};

const log = (msg) => console.log(`${new Date().toLocaleString('it-IT')}  ${msg}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function listPrinters() {
  if (process.platform === 'win32') {
    const { stdout } = await run('powershell', ['-NoProfile', '-Command', 'Get-Printer | Select-Object -ExpandProperty Name']);
    return stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  }
  const { stdout } = await run('lpstat', ['-e']);
  return stdout.split('\n').map((s) => s.trim()).filter(Boolean);
}

/** Invia un PDF alla stampante: lp (macOS/Linux, CUPS) oppure SumatraPDF su Windows. */
async function printPdf(file, order) {
  const extra = order.orientation === 'portrait' ? cfg.portrait : cfg.landscape;
  const [cmd, cmdArgs] = process.platform === 'win32'
    ? [cfg.sumatra, ['-print-to', cfg.printer, '-silent', '-print-settings', 'noscale', file]]
    : ['lp', ['-d', cfg.printer, '-t', `PRINTBADGE ordine ${order.number}`, ...cfg.options, ...extra, file]];
  if (cfg.dryRun) {
    log(`  [prova, non stampo] ${cmd} ${cmdArgs.join(' ')}`);
    return 'prova';
  }
  const { stdout } = await run(cmd, cmdArgs);
  return stdout.trim() || 'inviato';
}

async function processOrder(sb, order) {
  log(`Ordine n. ${order.number}: ${order.quantity} badge · ${order.product_id} · ${order.customer_name || ''}`);
  const dir = await mkdtemp(path.join(os.tmpdir(), 'printbadge-'));
  try {
    for (const [i, filePath] of order.files.entries()) {
      const { data, error } = await sb.storage.from('order-files').download(filePath);
      if (error) throw new Error(`download ${filePath}: ${error.message}`);
      const file = path.join(dir, `ordine-${order.number}-${i + 1}.pdf`);
      await writeFile(file, Buffer.from(await data.arrayBuffer()));
      const job = await printPdf(file, order);
      log(`  file ${i + 1}/${order.files.length} → ${cfg.printer}: ${job}`);
    }
    const { error } = await sb
      .from('orders')
      .update({ status: 'printed', printed_at: new Date().toISOString(), printer: cfg.printer, locked_by: null })
      .eq('id', order.id);
    if (error) throw error;
    log(`Ordine n. ${order.number} stampato.`);
  } catch (err) {
    const message = String(err?.stderr || err?.message || err).slice(0, 500);
    log(`ERRORE ordine n. ${order.number}: ${message}`);
    await sb.from('orders').update({ status: 'print_error', print_error: message, locked_by: null }).eq('id', order.id);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function main() {
  if (args.has('--printers')) {
    console.log((await listPrinters()).join('\n') || 'Nessuna stampante trovata.');
    return;
  }
  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'PRINTER_NAME'].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Mancano nel file .env: ${missing.join(', ')}`);
    process.exit(1);
  }
  const printers = await listPrinters().catch(() => []);
  if (!printers.includes(cfg.printer)) {
    log(`Attenzione: la stampante "${cfg.printer}" non risulta installata. Stampanti trovate: ${printers.join(', ') || 'nessuna'}`);
  }
  const sb = createClient(cfg.url, cfg.key, { auth: { persistSession: false, autoRefreshToken: false } });

  // Ordini rimasti a metà (agente spento durante la stampa): non si ristampano da soli
  // per non sprecare card; vanno controllati e rimessi a "paid" a mano.
  const { data: stuck } = await sb.from('orders').update({ status: 'print_error', print_error: 'Stampa interrotta: controlla e rimetti lo stato a paid', locked_by: null })
    .eq('status', 'printing').eq('locked_by', cfg.agent).select('number');
  for (const o of stuck ?? []) log(`Ordine n. ${o.number} interrotto in precedenza: segnato come print_error.`);

  log(`Agente "${cfg.agent}" avviato · stampante ${cfg.printer}${cfg.dryRun ? ' · MODALITÀ PROVA (non stampa)' : ''}`);
  for (;;) {
    let worked = false;
    try {
      const { data, error } = await sb.rpc('claim_next_order', { p_agent: cfg.agent });
      if (error) throw error;
      if (data?.length) {
        await processOrder(sb, data[0]);
        worked = true;
      }
    } catch (err) {
      log(`Errore di collegamento: ${err?.message || err}`);
    }
    if (args.has('--once') && !worked) {
      log('Nessun ordine in coda.');
      return;
    }
    if (args.has('--once')) return;
    if (!worked) await sleep(cfg.pollSeconds * 1000);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
