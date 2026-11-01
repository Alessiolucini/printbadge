-- PRINTBADGE.COM · negozio online
-- Prodotti, impostazioni, ordini, file degli ordini e coda di stampa.
-- Su Supabase self-hosted: incollare ed eseguire tutto nello SQL Editor di Studio (una volta sola).

-- ---------------------------------------------------------------- prodotti
create table if not exists public.products (
  id text primary key,
  kind text not null default 'badge' check (kind in ('badge', 'addon')),
  name_it text not null,
  name_en text not null,
  description_it text,
  description_en text,
  format_ids text[] not null default '{CR80}',     -- formati di badge accettati
  duplex boolean not null default false,            -- stampa anche il retro
  tiers jsonb not null default '[]',                -- badge: [{"min": 1, "unit_cents": 490}, ...]
  unit_cents integer,                               -- accessori: prezzo per pezzo
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- impostazioni (una sola riga)
create table if not exists public.shop_settings (
  id integer primary key default 1 check (id = 1),
  currency text not null default 'eur',
  shipping_cents integer not null default 690,
  free_shipping_from_cents integer,                 -- null = spedizione sempre a pagamento
  max_badges integer not null default 500,
  allowed_countries text[] not null default '{IT,SM,VA,AT,BE,DE,ES,FR,IE,LU,NL,PT,CH}',
  orders_open boolean not null default true
);
insert into public.shop_settings (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------- ordini
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  public_token uuid not null default gen_random_uuid(),
  status text not null default 'pending' check (status in (
    'pending',         -- in attesa di pagamento
    'paid',            -- pagato: in coda di stampa
    'printing',        -- preso dall'agente di stampa
    'printed',         -- stampato, da spedire
    'shipped',         -- spedito
    'print_error',     -- errore di stampa: rimettere a 'paid' per riprovare
    'cancelled', 'expired', 'payment_failed'
  )),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  printed_at timestamptz,
  shipped_at timestamptz,

  customer_name text,
  customer_email text,
  customer_phone text,
  company text,
  notes text,
  locale text not null default 'it',

  product_id text references public.products (id),
  quantity integer not null check (quantity > 0),
  addons jsonb not null default '[]',               -- [{"id": "lanyard", "quantity": 25, "unit_cents": 90}]
  format_id text,
  orientation text,
  duplex boolean not null default false,

  unit_cents integer not null,
  subtotal_cents integer not null,
  shipping_cents integer not null,
  total_cents integer not null,
  currency text not null,

  files jsonb not null default '[]',                -- percorsi dei PDF da stampare, in ordine
  preview_path text,
  project_path text,

  stripe_session_id text unique,
  stripe_payment_intent text,
  shipping_address jsonb,

  print_attempts integer not null default 0,
  print_error text,
  printer text,
  locked_by text,
  locked_at timestamptz
);
create index if not exists orders_status_idx on public.orders (status, paid_at);

-- ---------------------------------------------------------------- sicurezza
-- Il sito (chiave anon) legge solo prodotti attivi e impostazioni.
-- Gli ordini si creano e si leggono solo dalle Edge Functions e dall'agente (chiave service_role).
alter table public.products enable row level security;
alter table public.shop_settings enable row level security;
alter table public.orders enable row level security;

drop policy if exists "prodotti attivi visibili" on public.products;
create policy "prodotti attivi visibili" on public.products for select to anon, authenticated using (active);
drop policy if exists "impostazioni visibili" on public.shop_settings;
create policy "impostazioni visibili" on public.shop_settings for select to anon, authenticated using (true);

-- Stato dell'ordine per la pagina di conferma: serve id + token segreto ricevuto dopo il pagamento.
create or replace function public.get_order_status(p_order uuid, p_token uuid)
returns table (number bigint, status text, quantity integer, total_cents integer, currency text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select o.number, o.status, o.quantity, o.total_cents, o.currency, o.created_at
  from public.orders o
  where o.id = p_order and o.public_token = p_token;
$$;
revoke all on function public.get_order_status(uuid, uuid) from public;
grant execute on function public.get_order_status(uuid, uuid) to anon, authenticated;

-- Coda di stampa: assegna all'agente il primo ordine pagato, senza che due agenti prendano lo stesso.
create or replace function public.claim_next_order(p_agent text)
returns setof public.orders
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.orders o
     set status = 'printing', locked_by = p_agent, locked_at = now(), print_attempts = o.print_attempts + 1, print_error = null
   where o.id = (
     select id from public.orders
      where status = 'paid'
      order by paid_at nulls last, number
      limit 1
      for update skip locked
   )
  returning o.*;
end;
$$;
revoke all on function public.claim_next_order(text) from public, anon, authenticated;
grant execute on function public.claim_next_order(text) to service_role;

-- ---------------------------------------------------------------- file degli ordini (privati)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-files', 'order-files', false, 52428800, '{application/pdf,image/png,image/jpeg,application/json}')
on conflict (id) do nothing;

-- Il sito può solo caricare nuovi file in "incoming/…": non può leggerli, elencarli o sovrascriverli.
drop policy if exists "caricamento file ordine" on storage.objects;
create policy "caricamento file ordine" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'order-files' and (storage.foldername(name))[1] = 'incoming');

-- ---------------------------------------------------------------- catalogo di partenza
-- PREZZI DI ESEMPIO (IVA inclusa, in centesimi): modificali da Studio → Table editor → products.
insert into public.products (id, kind, name_it, name_en, description_it, description_en, format_ids, duplex, tiers, unit_cents, active, sort) values
  ('pvc-cr80', 'badge', 'Badge in PVC · solo fronte', 'PVC badge · front only',
   'Card in PVC 0,76 mm formato carta di credito, stampa a colori sul fronte.',
   'PVC card 0.76 mm credit-card size, full colour on the front.',
   '{CR80}', false, '[{"min":1,"unit_cents":490},{"min":10,"unit_cents":290},{"min":50,"unit_cents":190},{"min":200,"unit_cents":140}]', null, true, 10),
  ('pvc-cr80-duplex', 'badge', 'Badge in PVC · fronte e retro', 'PVC badge · double-sided',
   'Card in PVC 0,76 mm, stampa a colori su entrambi i lati.',
   'PVC card 0.76 mm, full colour on both sides.',
   '{CR80}', true, '[{"min":1,"unit_cents":690},{"min":10,"unit_cents":390},{"min":50,"unit_cents":260},{"min":200,"unit_cents":200}]', null, false, 20),
  ('lanyard', 'addon', 'Laccio da collo', 'Lanyard', 'Laccio in poliestere con moschettone.', 'Polyester lanyard with clip.', '{CR80}', false, '[]', 90, true, 100),
  ('holder', 'addon', 'Porta badge rigido', 'Rigid badge holder', 'Custodia trasparente per card CR80.', 'Clear holder for CR80 cards.', '{CR80}', false, '[]', 70, true, 110)
on conflict (id) do nothing;
