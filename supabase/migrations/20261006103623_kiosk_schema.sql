-- Apply in Supabase SQL Editor (or Supabase CLI) before starting the kiosk.
create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 100),
  description text check (description is null or length(description) <= 500),
  category text check (category is null or length(category) <= 50),
  price_centavos integer not null check (price_centavos > 0 and price_centavos <= 100000000),
  stock_quantity integer not null default 0 check (stock_quantity >= 0 and stock_quantity <= 1000000),
  active boolean not null default true,
  image_path text check (image_path is null or image_path ~ '^products/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role = 'admin'),
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  idempotency_key uuid not null unique,
  request_payload jsonb not null,
  payment_method text not null check (payment_method in ('cash','qr','card')),
  total_centavos bigint not null check (total_centavos > 0),
  paid_centavos bigint not null check (paid_centavos >= total_centavos),
  change_centavos bigint not null check (change_centavos = paid_centavos - total_centavos),
  created_at timestamptz not null default now()
);

create table if not exists public.transaction_items (
  id bigint generated always as identity primary key,
  transaction_id uuid not null references public.transactions(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_centavos integer not null check (unit_price_centavos > 0),
  subtotal_centavos bigint not null check (subtotal_centavos = unit_price_centavos::bigint * quantity),
  unique (transaction_id, product_id)
);

create index if not exists transaction_items_transaction_idx on public.transaction_items(transaction_id);

create or replace function public.touch_product_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger products_updated_at before update on public.products
for each row execute function public.touch_product_updated_at();

alter table public.products enable row level security;
alter table public.user_roles enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;

revoke all on public.products, public.user_roles, public.transactions, public.transaction_items from public, anon, authenticated;
grant all on public.products, public.user_roles, public.transactions, public.transaction_items to service_role;
grant usage, select on sequence public.transaction_items_id_seq to service_role;

-- Only the server secret/service role may invoke this transaction. The function is
-- SECURITY INVOKER and the caller's single RPC is one database transaction.
create or replace function public.complete_checkout(
  p_key uuid, p_items jsonb, p_method text, p_expected_total_centavos bigint, p_paid_centavos bigint default null
) returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_items jsonb;
  v_request jsonb;
  v_existing public.transactions%rowtype;
  v_product public.products%rowtype;
  v_line record;
  v_id uuid;
  v_total bigint := 0;
  v_paid bigint;
  v_tx public.transactions%rowtype;
  v_receipt jsonb;
begin
  if p_key is null then raise exception 'KIOSK: Missing retry key'; end if;
  if p_method not in ('cash','qr','card') or p_method is null then raise exception 'KIOSK: Invalid payment method'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'KIOSK: Add at least one product before checkout';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) e
    where jsonb_typeof(e) is distinct from 'object'
      or jsonb_typeof(e->'product_id') is distinct from 'string'
      or jsonb_typeof(e->'quantity') is distinct from 'number'
      or not coalesce((e->>'quantity') ~ '^[1-9][0-9]?$', false)
      or not coalesce((e->>'product_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', false)
  ) then raise exception 'KIOSK: Invalid order item'; end if;
  if (select count(distinct e->>'product_id') from jsonb_array_elements(p_items) e) <> jsonb_array_length(p_items) then
    raise exception 'KIOSK: Duplicate order item';
  end if;
  if p_method <> 'cash' and p_paid_centavos is not null then raise exception 'KIOSK: Invalid simulated payment amount'; end if;
  if p_method = 'cash' and (p_paid_centavos is null or p_paid_centavos < 0) then raise exception 'KIOSK: Enter a valid Cash amount'; end if;

  select jsonb_agg(jsonb_build_object('product_id', x.product_id, 'quantity', x.quantity) order by x.product_id)
  into v_items from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer);
  v_request := jsonb_build_object('items', v_items, 'method', p_method, 'paid', p_paid_centavos, 'expected_total', p_expected_total_centavos);

  perform pg_advisory_xact_lock(hashtextextended(p_key::text, 0));
  select * into v_existing from public.transactions where idempotency_key = p_key;
  if found then
    if v_existing.request_payload <> v_request then raise exception 'KIOSK: Retry key was already used for another order'; end if;
    v_id := v_existing.id;
  else
    -- Lock rows in stable ID order. A concurrent checkout waits, then sees the
    -- committed stock level. A failed validation rolls the entire call back.
    for v_line in select x.product_id, x.quantity from jsonb_to_recordset(v_items) as x(product_id uuid, quantity integer) order by x.product_id loop
      select * into v_product from public.products where id = v_line.product_id for update;
      if not found or not v_product.active or v_product.stock_quantity < v_line.quantity then
        raise exception 'KIOSK: A product is unavailable or stock has changed. Please refresh your order';
      end if;
      v_total := v_total + v_product.price_centavos::bigint * v_line.quantity;
    end loop;
    if v_total <= 0 then raise exception 'KIOSK: Empty order'; end if;
    if p_expected_total_centavos is null or v_total <> p_expected_total_centavos then
      raise exception 'KIOSK: Menu prices changed. Refresh your order before paying';
    end if;
    v_paid := case when p_method = 'cash' then p_paid_centavos else v_total end;
    if v_paid < v_total then raise exception 'KIOSK: Insufficient Cash payment'; end if;

    v_id := gen_random_uuid();
    insert into public.transactions(id, reference, idempotency_key, request_payload, payment_method, total_centavos, paid_centavos, change_centavos)
    values (v_id, 'VC-' || upper(replace(v_id::text, '-', '')), p_key, v_request, p_method, v_total, v_paid, v_paid - v_total)
    returning * into v_tx;

    for v_line in select x.product_id, x.quantity from jsonb_to_recordset(v_items) as x(product_id uuid, quantity integer) order by x.product_id loop
      select * into v_product from public.products where id = v_line.product_id;
      insert into public.transaction_items(transaction_id, product_id, product_name, quantity, unit_price_centavos, subtotal_centavos)
      values(v_id, v_product.id, v_product.name, v_line.quantity, v_product.price_centavos, v_product.price_centavos::bigint * v_line.quantity);
      update public.products set stock_quantity = stock_quantity - v_line.quantity where id = v_product.id;
    end loop;
  end if;

  select jsonb_build_object(
    'reference', t.reference, 'created_at', t.created_at, 'payment_method', t.payment_method,
    'total_centavos', t.total_centavos, 'paid_centavos', t.paid_centavos,
    'change_centavos', t.change_centavos,
    'items', coalesce(jsonb_agg(jsonb_build_object(
      'product_id', i.product_id, 'product_name', i.product_name, 'quantity', i.quantity,
      'unit_price_centavos', i.unit_price_centavos, 'subtotal_centavos', i.subtotal_centavos
    ) order by i.id) filter (where i.id is not null), '[]'::jsonb)
  ) into v_receipt
  from public.transactions t left join public.transaction_items i on i.transaction_id = t.id
  where t.id = v_id group by t.id;
  return v_receipt;
end;
$$;

revoke all on function public.complete_checkout(uuid,jsonb,text,bigint,bigint) from public, anon, authenticated;
grant execute on function public.complete_checkout(uuid,jsonb,text,bigint,bigint) to service_role;
revoke all on function public.touch_product_updated_at() from public, anon, authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 1048576, array['image/webp'])
on conflict(id) do update set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/webp'];

-- The public bucket serves images by URL. No browser write policy is created;
-- only the server secret/service role can upload or remove objects.
create policy "Public product image reads" on storage.objects
for select to anon, authenticated using (bucket_id = 'product-images');
