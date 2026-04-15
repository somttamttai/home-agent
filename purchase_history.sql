-- purchase_history 테이블 생성
-- Supabase SQL Editor에서 직접 실행하세요

CREATE TABLE public.purchase_history (
  id bigserial primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  consumable_id bigint not null references public.consumables(id) on delete cascade,
  purchased_at timestamptz not null default now(),
  days_before_depletion numeric,
  purchase_type text not null default 'normal'
    check (purchase_type in ('normal', 'event', 'gift', 'early')),
  quantity numeric not null default 1,
  created_at timestamptz not null default now()
);

create index on public.purchase_history (consumable_id);
create index on public.purchase_history (household_id);

alter table public.purchase_history enable row level security;

create policy "household members only" on public.purchase_history
  for all using (get_my_household_ids() @> ARRAY[household_id]);
