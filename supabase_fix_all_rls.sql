-- =========================================================
-- 전체 RLS 정책 완전 초기화 + 재설정
-- =========================================================

-- ── 0) authenticated 롤에 테이블 권한 부여 ──────────────────
grant usage on schema public to authenticated;
grant all on public.households to authenticated;
grant all on public.household_members to authenticated;
grant all on public.family_settings to authenticated;
grant all on public.brand_preferences to authenticated;
grant all on public.consumables to authenticated;
grant all on public.price_history to authenticated;
grant all on public.orders to authenticated;

grant usage on schema public to anon;
grant all on public.households to anon;
grant all on public.household_members to anon;
grant all on public.family_settings to anon;
grant all on public.brand_preferences to anon;
grant all on public.consumables to anon;
grant all on public.price_history to anon;
grant all on public.orders to anon;

-- ── 1) 함수 CASCADE 삭제 (의존 정책도 함께 삭제) ────────────
drop function if exists public.get_my_household_ids() cascade;
drop function if exists public.get_my_household_id() cascade;

-- ── 2) 혹시 남은 정책 전부 삭제 ────────────────────────────
do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename from pg_policies where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- ── 3) security definer 함수 재생성 ─────────────────────────
create or replace function public.get_my_household_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id
  from public.household_members
  where user_id = auth.uid();
$$;

create or replace function public.get_my_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id
  from public.household_members
  where user_id = auth.uid()
  limit 1;
$$;

-- ── 4) RLS 활성화 ───────────────────────────────────────────
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.family_settings enable row level security;
alter table public.brand_preferences enable row level security;
alter table public.consumables enable row level security;
alter table public.price_history enable row level security;
alter table public.orders enable row level security;

-- ── 5) households ───────────────────────────────────────────
create policy "households_select" on public.households
    for select to authenticated
    using (id in (select public.get_my_household_ids()));

create policy "households_insert" on public.households
    for insert to authenticated
    with check (auth.uid() = owner_id);

create policy "households_update" on public.households
    for update to authenticated
    using (auth.uid() = owner_id);

create policy "households_delete" on public.households
    for delete to authenticated
    using (auth.uid() = owner_id);

-- ── 6) household_members ────────────────────────────────────
create policy "hm_select" on public.household_members
    for select to authenticated
    using (auth.uid() = user_id);

create policy "hm_insert" on public.household_members
    for insert to authenticated
    with check (auth.uid() = user_id);

create policy "hm_delete" on public.household_members
    for delete to authenticated
    using (auth.uid() = user_id);

-- ── 7) family_settings ──────────────────────────────────────
create policy "fs_select" on public.family_settings
    for select to authenticated
    using (household_id in (select public.get_my_household_ids()));

create policy "fs_insert" on public.family_settings
    for insert to authenticated
    with check (household_id in (select public.get_my_household_ids()));

create policy "fs_update" on public.family_settings
    for update to authenticated
    using (household_id in (select public.get_my_household_ids()));

-- ── 8) brand_preferences ────────────────────────────────────
create policy "bp_select" on public.brand_preferences
    for select to authenticated
    using (household_id in (select public.get_my_household_ids()));

create policy "bp_insert" on public.brand_preferences
    for insert to authenticated
    with check (household_id in (select public.get_my_household_ids()));

create policy "bp_update" on public.brand_preferences
    for update to authenticated
    using (household_id in (select public.get_my_household_ids()));

create policy "bp_delete" on public.brand_preferences
    for delete to authenticated
    using (household_id in (select public.get_my_household_ids()));

-- ── 9) consumables ──────────────────────────────────────────
create policy "consumables_select" on public.consumables
    for select to authenticated
    using (household_id in (select public.get_my_household_ids()));

create policy "consumables_insert" on public.consumables
    for insert to authenticated
    with check (household_id in (select public.get_my_household_ids()));

create policy "consumables_update" on public.consumables
    for update to authenticated
    using (household_id in (select public.get_my_household_ids()));

create policy "consumables_delete" on public.consumables
    for delete to authenticated
    using (household_id in (select public.get_my_household_ids()));

-- ── 10) price_history ───────────────────────────────────────
create policy "ph_select" on public.price_history
    for select to authenticated
    using (household_id in (select public.get_my_household_ids()));

create policy "ph_insert" on public.price_history
    for insert to authenticated
    with check (household_id in (select public.get_my_household_ids()));

-- ── 11) orders ──────────────────────────────────────────────
create policy "orders_select" on public.orders
    for select to authenticated
    using (household_id in (select public.get_my_household_ids()));

create policy "orders_insert" on public.orders
    for insert to authenticated
    with check (household_id in (select public.get_my_household_ids()));

create policy "orders_update" on public.orders
    for update to authenticated
    using (household_id in (select public.get_my_household_ids()));

-- ── 12) 검증 ────────────────────────────────────────────────
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
