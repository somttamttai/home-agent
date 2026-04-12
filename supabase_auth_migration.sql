-- =========================================================
-- home-agent: 계정 시스템 + 가족 공유 마이그레이션
-- Supabase SQL Editor 에서 실행하세요
-- =========================================================

-- ── 1) households (집) ──────────────────────────────────────
create table if not exists public.households (
    id          uuid primary key default gen_random_uuid(),
    name        text not null default '우리집',
    invite_code text unique not null,
    owner_id    uuid not null references auth.users(id) on delete cascade,
    created_at  timestamptz not null default now()
);

create index if not exists idx_households_owner on public.households (owner_id);
create index if not exists idx_households_invite on public.households (invite_code);

-- ── 2) household_members (가족 구성원) ──────────────────────
create table if not exists public.household_members (
    id           uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    user_id      uuid not null references auth.users(id) on delete cascade,
    role         text not null default 'member' check (role in ('owner', 'member')),
    joined_at    timestamptz not null default now(),
    unique (household_id, user_id)
);

create index if not exists idx_hm_household on public.household_members (household_id);
create index if not exists idx_hm_user on public.household_members (user_id);

-- ── 3) family_settings (가족 설정) ──────────────────────────
create table if not exists public.family_settings (
    id           uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade unique,
    adults       integer not null default 2,
    children     integer not null default 0,
    infants      integer not null default 0,
    updated_at   timestamptz not null default now()
);

create index if not exists idx_fs_household on public.family_settings (household_id);

-- ── 4) brand_preferences (선호 브랜드) ──────────────────────
create table if not exists public.brand_preferences (
    id           uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    item_name    text not null,
    brand        text not null,
    updated_at   timestamptz not null default now(),
    unique (household_id, item_name)
);

create index if not exists idx_bp_household on public.brand_preferences (household_id);

-- ── 5) 기존 테이블에 household_id 추가 ─────────────────────
alter table public.consumables
    add column if not exists household_id uuid references public.households(id) on delete cascade;

alter table public.consumables
    add column if not exists category text;

create index if not exists idx_consumables_household on public.consumables (household_id);

alter table public.price_history
    add column if not exists household_id uuid references public.households(id) on delete cascade;

create index if not exists idx_ph_household on public.price_history (household_id);

alter table public.orders
    add column if not exists household_id uuid references public.households(id) on delete cascade;

create index if not exists idx_orders_household on public.orders (household_id);

-- ── 6) 사용자 household 조회 함수 ──────────────────────────
create or replace function public.get_my_household_id()
returns uuid
language sql
stable
security definer
as $$
  select hm.household_id
  from public.household_members hm
  where hm.user_id = auth.uid()
  limit 1;
$$;

-- ── 7) RLS 정책 ─────────────────────────────────────────────

-- households
alter table public.households enable row level security;

drop policy if exists "allow anon all on households" on public.households;
drop policy if exists "households_select" on public.households;
drop policy if exists "households_insert" on public.households;
drop policy if exists "households_update" on public.households;
drop policy if exists "households_delete" on public.households;

create policy "households_select" on public.households
    for select using (
        id in (select household_id from public.household_members where user_id = auth.uid())
    );

create policy "households_insert" on public.households
    for insert with check (owner_id = auth.uid());

create policy "households_update" on public.households
    for update using (owner_id = auth.uid());

create policy "households_delete" on public.households
    for delete using (owner_id = auth.uid());

-- household_members
alter table public.household_members enable row level security;

drop policy if exists "hm_select" on public.household_members;
drop policy if exists "hm_insert" on public.household_members;
drop policy if exists "hm_delete" on public.household_members;

create policy "hm_select" on public.household_members
    for select using (
        household_id in (select household_id from public.household_members where user_id = auth.uid())
    );

create policy "hm_insert" on public.household_members
    for insert with check (user_id = auth.uid());

create policy "hm_delete" on public.household_members
    for delete using (
        household_id in (
            select id from public.households where owner_id = auth.uid()
        )
    );

-- family_settings
alter table public.family_settings enable row level security;

drop policy if exists "fs_select" on public.family_settings;
drop policy if exists "fs_insert" on public.family_settings;
drop policy if exists "fs_update" on public.family_settings;

create policy "fs_select" on public.family_settings
    for select using (
        household_id in (select household_id from public.household_members where user_id = auth.uid())
    );

create policy "fs_insert" on public.family_settings
    for insert with check (
        household_id in (select household_id from public.household_members where user_id = auth.uid())
    );

create policy "fs_update" on public.family_settings
    for update using (
        household_id in (select household_id from public.household_members where user_id = auth.uid())
    );

-- brand_preferences
alter table public.brand_preferences enable row level security;

drop policy if exists "bp_select" on public.brand_preferences;
drop policy if exists "bp_insert" on public.brand_preferences;
drop policy if exists "bp_update" on public.brand_preferences;
drop policy if exists "bp_delete" on public.brand_preferences;

create policy "bp_select" on public.brand_preferences
    for select using (
        household_id in (select household_id from public.household_members where user_id = auth.uid())
    );

create policy "bp_insert" on public.brand_preferences
    for insert with check (
        household_id in (select household_id from public.household_members where user_id = auth.uid())
    );

create policy "bp_update" on public.brand_preferences
    for update using (
        household_id in (select household_id from public.household_members where user_id = auth.uid())
    );

create policy "bp_delete" on public.brand_preferences
    for delete using (
        household_id in (select household_id from public.household_members where user_id = auth.uid())
    );

-- consumables: 기존 정책 제거 → household 기반
drop policy if exists "allow anon all on consumables" on public.consumables;
drop policy if exists "consumables_select" on public.consumables;
drop policy if exists "consumables_insert" on public.consumables;
drop policy if exists "consumables_update" on public.consumables;
drop policy if exists "consumables_delete" on public.consumables;

create policy "consumables_select" on public.consumables
    for select using (
        household_id in (select household_id from public.household_members where user_id = auth.uid())
    );

create policy "consumables_insert" on public.consumables
    for insert with check (
        household_id in (select household_id from public.household_members where user_id = auth.uid())
    );

create policy "consumables_update" on public.consumables
    for update using (
        household_id in (select household_id from public.household_members where user_id = auth.uid())
    );

create policy "consumables_delete" on public.consumables
    for delete using (
        household_id in (select household_id from public.household_members where user_id = auth.uid())
    );

-- price_history
drop policy if exists "allow anon all on price_history" on public.price_history;
drop policy if exists "ph_select" on public.price_history;
drop policy if exists "ph_insert" on public.price_history;

create policy "ph_select" on public.price_history
    for select using (
        household_id in (select household_id from public.household_members where user_id = auth.uid())
    );

create policy "ph_insert" on public.price_history
    for insert with check (
        household_id in (select household_id from public.household_members where user_id = auth.uid())
    );

-- orders
drop policy if exists "allow anon all on orders" on public.orders;
drop policy if exists "orders_select" on public.orders;
drop policy if exists "orders_insert" on public.orders;
drop policy if exists "orders_update" on public.orders;

create policy "orders_select" on public.orders
    for select using (
        household_id in (select household_id from public.household_members where user_id = auth.uid())
    );

create policy "orders_insert" on public.orders
    for insert with check (
        household_id in (select household_id from public.household_members where user_id = auth.uid())
    );

create policy "orders_update" on public.orders
    for update using (
        household_id in (select household_id from public.household_members where user_id = auth.uid())
    );

-- ── 8) Realtime 활성화 ──────────────────────────────────────
alter publication supabase_realtime add table public.consumables;
alter publication supabase_realtime add table public.family_settings;
alter publication supabase_realtime add table public.brand_preferences;
