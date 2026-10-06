-- Existing receipts remain nullable; all new kiosk checkouts require a type.
alter table public.transactions
  add column order_type text check (order_type in ('dine_in','take_out'));

-- Replace the old RPC signature so PostgREST has one unambiguous checkout function.
drop function public.complete_checkout(uuid,jsonb,text,bigint,bigint);

create or replace function public.complete_checkout(
  p_key uuid, p_items jsonb, p_method text, p_expected_total_centavos bigint, p_paid_centavos bigint, p_order_type text
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
  if p_order_type not in ('dine_in','take_out') or p_order_type is null then raise exception 'KIOSK: Invalid order type'; end if;
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
  v_request := jsonb_build_object('items', v_items, 'method', p_method, 'order_type', p_order_type, 'paid', p_paid_centavos, 'expected_total', p_expected_total_centavos);

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
    insert into public.transactions(id, reference, idempotency_key, request_payload, payment_method, order_type, total_centavos, paid_centavos, change_centavos)
    values (v_id, 'VC-' || upper(replace(v_id::text, '-', '')), p_key, v_request, p_method, p_order_type, v_total, v_paid, v_paid - v_total)
    returning * into v_tx;

    for v_line in select x.product_id, x.quantity from jsonb_to_recordset(v_items) as x(product_id uuid, quantity integer) order by x.product_id loop
      select * into v_product from public.products where id = v_line.product_id;
      insert into public.transaction_items(transaction_id, product_id, product_name, quantity, unit_price_centavos, subtotal_centavos)
      values(v_id, v_product.id, v_product.name, v_line.quantity, v_product.price_centavos, v_product.price_centavos::bigint * v_line.quantity);
      update public.products set stock_quantity = stock_quantity - v_line.quantity where id = v_product.id;
    end loop;
  end if;

  select jsonb_build_object(
    'reference', t.reference, 'created_at', t.created_at, 'payment_method', t.payment_method, 'order_type', t.order_type,
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

revoke all on function public.complete_checkout(uuid,jsonb,text,bigint,bigint,text) from public, anon, authenticated;
grant execute on function public.complete_checkout(uuid,jsonb,text,bigint,bigint,text) to service_role;
