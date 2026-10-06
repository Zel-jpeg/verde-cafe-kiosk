-- transactions are completed orders, saved atomically by complete_checkout.
create table public.order_feedback (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.transactions(id) on delete restrict,
  rating integer not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now()
);

create index order_feedback_created_at_idx on public.order_feedback(created_at desc, id desc);
alter table public.order_feedback enable row level security;
-- No browser policies. Both customer and admin access go through server APIs.
revoke all on public.order_feedback from public, anon, authenticated;
grant select, insert on public.order_feedback to service_role;
