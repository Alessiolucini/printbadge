// Crea l'ordine (in attesa di pagamento) e la pagina di pagamento Stripe Checkout.
// Il prezzo viene ricalcolato qui dal catalogo: quello mostrato dal sito è solo un'anteprima.
import { adminClient, corsHeaders, json } from '../_shared/http.ts';
import { stripeRequest } from '../_shared/stripe.ts';
import { quote } from '../_shared/pricing.js';

const FILE_RE = /^incoming\/[0-9a-f-]{36}\/[\w.-]{1,80}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const quantity = Number(body.quantity);
  const locale = body.locale === 'en' ? 'en' : 'it';
  const customer = body.customer ?? {};
  const email = text(customer.email, 200);
  const name = text(customer.name, 120);
  const files: string[] = Array.isArray(body.files) ? body.files : [];
  const extra = [body.previewPath, body.projectPath].filter(Boolean);
  const allPaths = [...files, ...extra];

  if (!Number.isInteger(quantity) || quantity < 1) return json({ error: 'quantity' }, 400);
  if (!EMAIL_RE.test(email) || !name) return json({ error: 'customer' }, 400);
  if (!files.length || files.length > 20 || !allPaths.every((p) => typeof p === 'string' && FILE_RE.test(p))) return json({ error: 'files' }, 400);
  const folder = files[0].split('/').slice(0, 2).join('/');
  if (!allPaths.every((p) => p.startsWith(`${folder}/`))) return json({ error: 'files' }, 400);

  const sb = adminClient();
  const [{ data: settings }, { data: catalog }] = await Promise.all([
    sb.from('shop_settings').select('*').eq('id', 1).single(),
    sb.from('products').select('*').eq('active', true),
  ]);
  if (!settings || !catalog) return json({ error: 'catalog' }, 500);
  if (!settings.orders_open) return json({ error: 'orders_closed' }, 409);

  const product = catalog.find((p) => p.id === body.productId && p.kind === 'badge');
  if (!product) return json({ error: 'product' }, 400);
  if (!product.format_ids.includes(body.formatId)) return json({ error: 'format' }, 400);
  if (quantity > settings.max_badges) return json({ error: 'too_many', max: settings.max_badges }, 400);

  // I file devono essere già stati caricati nella cartella dell'ordine.
  const { data: listed, error: listError } = await sb.storage.from('order-files').list(folder, { limit: 100 });
  if (listError) return json({ error: 'storage' }, 500);
  const present = new Set((listed ?? []).map((f) => `${folder}/${f.name}`));
  if (!allPaths.every((p) => present.has(p))) return json({ error: 'files_missing' }, 400);

  let q;
  try {
    q = quote({ product, quantity, addons: Array.isArray(body.addons) ? body.addons : [], catalog, settings });
  } catch {
    return json({ error: 'addon' }, 400);
  }

  const { data: order, error: insertError } = await sb
    .from('orders')
    .insert({
      customer_name: name,
      customer_email: email,
      customer_phone: text(customer.phone, 40) || null,
      company: text(customer.company, 120) || null,
      notes: text(customer.notes, 1000) || null,
      locale,
      product_id: product.id,
      quantity,
      addons: q.lines.filter((l) => l.kind === 'addon'),
      format_id: body.formatId,
      orientation: body.orientation === 'portrait' ? 'portrait' : 'landscape',
      duplex: product.duplex,
      unit_cents: q.unit_cents,
      subtotal_cents: q.subtotal_cents,
      shipping_cents: q.shipping_cents,
      total_cents: q.total_cents,
      currency: q.currency,
      files,
      preview_path: body.previewPath ?? null,
      project_path: body.projectPath ?? null,
    })
    .select('id, number, public_token')
    .single();
  if (insertError || !order) {
    console.error(insertError);
    return json({ error: 'order' }, 500);
  }

  const site = (Deno.env.get('SITE_URL') ?? new URL(req.headers.get('origin') ?? 'http://localhost:5174').origin).replace(/\/$/, '');
  const back = `${site}/?order=${order.id}&token=${order.public_token}`;
  const names = Object.fromEntries(catalog.map((p) => [p.id, locale === 'en' ? p.name_en : p.name_it]));
  const params: Record<string, string | number> = {
    mode: 'payment',
    locale,
    customer_email: email,
    client_reference_id: order.id,
    success_url: back,
    cancel_url: `${back}&cancelled=1`,
    'metadata[order_id]': order.id,
    'metadata[order_number]': order.number,
    'payment_intent_data[metadata][order_id]': order.id,
    'phone_number_collection[enabled]': 'true',
    'shipping_options[0][shipping_rate_data][type]': 'fixed_amount',
    'shipping_options[0][shipping_rate_data][fixed_amount][amount]': q.shipping_cents,
    'shipping_options[0][shipping_rate_data][fixed_amount][currency]': q.currency,
    'shipping_options[0][shipping_rate_data][display_name]': q.shipping_cents ? (locale === 'en' ? 'Shipping' : 'Spedizione') : (locale === 'en' ? 'Free shipping' : 'Spedizione gratuita'),
  };
  settings.allowed_countries.forEach((c: string, i: number) => (params[`shipping_address_collection[allowed_countries][${i}]`] = c));
  q.lines.forEach((line, i) => {
    params[`line_items[${i}][quantity]`] = line.quantity;
    params[`line_items[${i}][price_data][currency]`] = q.currency;
    params[`line_items[${i}][price_data][unit_amount]`] = line.unit_cents;
    params[`line_items[${i}][price_data][product_data][name]`] = names[line.id] ?? line.id;
  });

  try {
    const session = await stripeRequest('/v1/checkout/sessions', params);
    await sb.from('orders').update({ stripe_session_id: session.id }).eq('id', order.id);
    return json({ url: session.url, orderId: order.id, number: order.number });
  } catch (err) {
    console.error(err);
    await sb.from('orders').update({ status: 'cancelled', print_error: String(err) }).eq('id', order.id);
    return json({ error: 'payment_provider' }, 502);
  }
});
