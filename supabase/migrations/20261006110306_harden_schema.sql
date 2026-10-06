create index if not exists transaction_items_product_idx on public.transaction_items(product_id);

-- Some projects include this helper already. It is SECURITY DEFINER and should
-- not be callable through the public Data API. The kiosk does not use it.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;
