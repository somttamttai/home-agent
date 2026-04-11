-- =========================================================
-- home-agent: 소모품 재고/가격/주문 관리 스키마
-- =========================================================

-- 1) 소모품 목록
create table if not exists public.consumables (
    id               bigserial primary key,
    name             text        not null,
    brand            text,
    spec             text,
    max_stock        numeric,
    current_stock    numeric     not null default 0,
    daily_usage      numeric,
    reorder_point    numeric,
    last_ordered_at  timestamptz,
    created_at       timestamptz not null default now()
);

create index if not exists idx_consumables_name on public.consumables (name);

-- 2) 가격 이력
create table if not exists public.price_history (
    id                    bigserial primary key,
    consumable_id         bigint      not null references public.consumables(id) on delete cascade,
    mall_name             text        not null,
    price                 integer     not null,
    unit_price_per_meter  numeric,
    spec_parsed           jsonb,
    checked_at            timestamptz not null default now()
);

create index if not exists idx_price_history_consumable  on public.price_history (consumable_id);
create index if not exists idx_price_history_checked_at  on public.price_history (checked_at desc);

-- 3) 주문 이력
create table if not exists public.orders (
    id             bigserial primary key,
    consumable_id  bigint      not null references public.consumables(id) on delete cascade,
    mall_name      text        not null,
    price          integer     not null,
    quantity       integer     not null default 1,
    ordered_at     timestamptz not null default now(),
    status         text        not null default 'pending'
        check (status in ('pending', 'ordered', 'shipped', 'delivered', 'cancelled'))
);

create index if not exists idx_orders_consumable  on public.orders (consumable_id);
create index if not exists idx_orders_ordered_at  on public.orders (ordered_at desc);
create index if not exists idx_orders_status      on public.orders (status);

-- RLS 활성화 (anon 키로 읽기/쓰기 허용 — 개인용)
alter table public.consumables   enable row level security;
alter table public.price_history enable row level security;
alter table public.orders        enable row level security;

drop policy if exists "allow anon all on consumables"   on public.consumables;
drop policy if exists "allow anon all on price_history" on public.price_history;
drop policy if exists "allow anon all on orders"        on public.orders;

create policy "allow anon all on consumables"
    on public.consumables for all using (true) with check (true);

create policy "allow anon all on price_history"
    on public.price_history for all using (true) with check (true);

create policy "allow anon all on orders"
    on public.orders for all using (true) with check (true);
