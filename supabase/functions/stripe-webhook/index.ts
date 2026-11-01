// Riceve gli eventi di Stripe: quando il pagamento è confermato l'ordine passa a "paid"
// ed entra nella coda dell'agente di stampa.
import { adminClient, json } from '../_shared/http.ts';
import { verifyStripeSignature } from '../_shared/stripe.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const payload = await req.text();
  const valid = await verifyStripeSignature(payload, req.headers.get('stripe-signature'), Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '');
  if (!valid) return json({ error: 'invalid_signature' }, 400);

  const event = JSON.parse(payload);
  const session = event.data?.object ?? {};
  const orderId = session.metadata?.order_id ?? session.client_reference_id;
  if (!orderId) return json({ received: true, ignored: 'no_order' });
  const sb = adminClient();

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      return json({ received: true, waiting: session.payment_status });
    }
    const shipping = session.collected_information?.shipping_details ?? session.shipping_details ?? null;
    const { data: order } = await sb.from('orders').select('total_cents').eq('id', orderId).single();
    if (order && session.amount_total != null && session.amount_total !== order.total_cents) {
      console.warn(`Ordine ${orderId}: importo Stripe ${session.amount_total} diverso da ${order.total_cents}`);
    }
    // Solo gli ordini non ancora pagati cambiano stato: gli eventi duplicati non rimettono in coda un ordine già stampato.
    const { error } = await sb
      .from('orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        stripe_session_id: session.id,
        stripe_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
        customer_phone: session.customer_details?.phone ?? undefined,
        shipping_address: shipping,
      })
      .eq('id', orderId)
      .in('status', ['pending', 'expired', 'payment_failed']);
    if (error) {
      console.error(error);
      return json({ error: 'db' }, 500);
    }
  } else if (event.type === 'checkout.session.async_payment_failed') {
    await sb.from('orders').update({ status: 'payment_failed' }).eq('id', orderId).eq('status', 'pending');
  } else if (event.type === 'checkout.session.expired') {
    await sb.from('orders').update({ status: 'expired' }).eq('id', orderId).eq('status', 'pending');
  }
  return json({ received: true });
});
