// Calcolo del prezzo di un ordine. Stesso file usato dal sito (anteprima del totale)
// e dalle Edge Functions (prezzo vero, ricalcolato sul server).

/** Prezzo unitario in centesimi secondo gli scaglioni del prodotto. */
export function unitPriceCents(product, quantity) {
  const tiers = [...(product.tiers || [])].sort((a, b) => a.min - b.min);
  let unit = tiers[0]?.unit_cents ?? 0;
  for (const tier of tiers) if (quantity >= tier.min) unit = tier.unit_cents;
  return unit;
}

/**
 * @param {object} p
 * @param {object} p.product   prodotto badge
 * @param {number} p.quantity  numero di badge
 * @param {string[]} p.addons  id degli accessori, uno per ogni badge
 * @param {object[]} p.catalog prodotti attivi
 * @param {object} p.settings  riga di shop_settings
 */
export function quote({ product, quantity, addons = [], catalog, settings }) {
  const unit = unitPriceCents(product, quantity);
  const lines = [{ id: product.id, kind: 'badge', quantity, unit_cents: unit, total_cents: unit * quantity }];
  for (const id of [...new Set(addons)]) {
    const addon = catalog.find((p) => p.id === id && p.kind === 'addon');
    if (!addon) throw new Error(`addon:${id}`);
    lines.push({ id, kind: 'addon', quantity, unit_cents: addon.unit_cents, total_cents: addon.unit_cents * quantity });
  }
  const subtotal = lines.reduce((s, l) => s + l.total_cents, 0);
  const free = settings.free_shipping_from_cents != null && subtotal >= settings.free_shipping_from_cents;
  const shipping = free ? 0 : settings.shipping_cents;
  return {
    lines,
    unit_cents: unit,
    subtotal_cents: subtotal,
    shipping_cents: shipping,
    total_cents: subtotal + shipping,
    currency: settings.currency,
  };
}
