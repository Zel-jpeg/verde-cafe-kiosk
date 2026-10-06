-- Optional live integration check. Run in Supabase SQL Editor after the migration.
-- The outer transaction rolls every test row back. This does not test two sessions
-- racing for the last unit; perform that separately with two concurrent clients.
begin;
do $$
declare
  v_product uuid := gen_random_uuid();
  v_key uuid := gen_random_uuid();
  v_result jsonb;
  v_retry jsonb;
  v_failed boolean;
begin
  insert into public.products(id, name, price_centavos, stock_quantity, active)
  values(v_product, 'Checkout smoke fixture', 4500, 2, true);

  v_result := public.complete_checkout(v_key,
    jsonb_build_array(jsonb_build_object('product_id',v_product,'quantity',1)),
    'cash',4500,5000,'dine_in');
  if (v_result->>'reference') is null or (v_result->>'change_centavos')::bigint <> 500 or v_result->>'order_type' <> 'dine_in' then
    raise exception 'Cash receipt failed';
  end if;
  if (select stock_quantity from public.products where id = v_product) <> 1 then
    raise exception 'Stock was not reduced once';
  end if;

  v_retry := public.complete_checkout(v_key,
    jsonb_build_array(jsonb_build_object('product_id',v_product,'quantity',1)),
    'cash',4500,5000,'dine_in');
  if v_retry <> v_result or (select stock_quantity from public.products where id = v_product) <> 1 then
    raise exception 'Idempotent retry changed receipt or stock';
  end if;

  v_failed := false;
  begin
    perform public.complete_checkout(v_key,
      jsonb_build_array(jsonb_build_object('product_id',v_product,'quantity',1)),
      'cash',4500,5000,'take_out');
  exception when others then
    if sqlerrm like 'KIOSK: Retry key was already used%' then v_failed := true; else raise; end if;
  end;
  if not v_failed then raise exception 'Retry key accepted a changed order type'; end if;

  v_failed := false;
  begin
    perform public.complete_checkout(gen_random_uuid(),
      jsonb_build_array(jsonb_build_object('product_id',v_product,'quantity',1)),
      'cash',4500,4000,'dine_in');
  exception when others then
    if sqlerrm like 'KIOSK: Insufficient Cash%' then v_failed := true; else raise; end if;
  end;
  if not v_failed then raise exception 'Insufficient cash was accepted'; end if;

  v_failed := false;
  begin
    perform public.complete_checkout(gen_random_uuid(),
      jsonb_build_array(jsonb_build_object('product_id',v_product,'quantity',2)),
      'qr',9000,null,'dine_in');
  exception when others then
    if sqlerrm like 'KIOSK: A product is unavailable%' then v_failed := true; else raise; end if;
  end;
  if not v_failed then raise exception 'Unavailable stock was sold'; end if;

  if (select stock_quantity from public.products where id = v_product) <> 1 then
    raise exception 'Rejected checkout changed stock';
  end if;
  if (select count(*) from public.transactions where idempotency_key = v_key) <> 1 then
    raise exception 'Idempotent retry created another transaction';
  end if;
  raise notice 'Checkout smoke test passed; rolling fixture back';
end;
$$;
rollback;
