-- =========================================================
-- RLS 무한재귀 수정
-- household_members SELECT 정책이 자기 자신을 참조 → 무한루프
--
-- 수정 전략:
--   1. security definer 함수로 RLS 우회하여 household_id 조회
--   2. household_members 정책: auth.uid() = user_id (자기 행만)
--   3. 나머지 테이블: security definer 함수 사용
-- =========================================================

-- ── 1) security definer 함수 (RLS 우회) ─────────────────────
-- 이 함수는 RLS를 무시하고 현재 사용자의 household_id 목록을 반환
drop function if exists public.get_my_household_ids();

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

-- 기존 단일값 반환 함수도 업데이트
drop function if exists public.get_my_household_id();

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

-- ── 2) household_members: 재귀 없는 정책 ────────────────────
drop policy if exists "hm_select" on public.household_members;
drop policy if exists "hm_insert" on public.household_members;
drop policy if exists "hm_delete" on public.household_members;

create policy "hm_select" on public.household_members
    for select using (auth.uid() = user_id);

create policy "hm_insert" on public.household_members
    for insert with check (auth.uid() = user_id);

create policy "hm_delete" on public.household_members
    for delete using (auth.uid() = user_id);

-- ── 3) households: security definer 함수 사용 ───────────────
drop policy if exists "households_select" on public.households;
drop policy if exists "households_insert" on public.households;
drop policy if exists "households_update" on public.households;
drop policy if exists "households_delete" on public.households;

create policy "households_select" on public.households
    for select using (id in (select public.get_my_household_ids()));

create policy "households_insert" on public.households
    for insert with check (owner_id = auth.uid());

create policy "households_update" on public.households
    for update using (owner_id = auth.uid());

create policy "households_delete" on public.households
    for delete using (owner_id = auth.uid());

-- ── 4) family_settings ──────────────────────────────────────
drop policy if exists "fs_select" on public.family_settings;
drop policy if exists "fs_insert" on public.family_settings;
drop policy if exists "fs_update" on public.family_settings;

create policy "fs_select" on public.family_settings
    for select using (household_id in (select public.get_my_household_ids()));

create policy "fs_insert" on public.family_settings
    for insert with check (household_id in (select public.get_my_household_ids()));

create policy "fs_update" on public.family_settings
    for update using (household_id in (select public.get_my_household_ids()));

-- ── 5) brand_preferences ────────────────────────────────────
drop policy if exists "bp_select" on public.brand_preferences;
drop policy if exists "bp_insert" on public.brand_preferences;
drop policy if exists "bp_update" on public.brand_preferences;
drop policy if exists "bp_delete" on public.brand_preferences;

create policy "bp_select" on public.brand_preferences
    for select using (household_id in (select public.get_my_household_ids()));

create policy "bp_insert" on public.brand_preferences
    for insert with check (household_id in (select public.get_my_household_ids()));

create policy "bp_update" on public.brand_preferences
    for update using (household_id in (select public.get_my_household_ids()));

create policy "bp_delete" on public.brand_preferences
    for delete using (household_id in (select public.get_my_household_ids()));

-- ── 6) consumables ──────────────────────────────────────────
drop policy if exists "consumables_select" on public.consumables;
drop policy if exists "consumables_insert" on public.consumables;
drop policy if exists "consumables_update" on public.consumables;
drop policy if exists "consumables_delete" on public.consumables;

create policy "consumables_select" on public.consumables
    for select using (household_id in (select public.get_my_household_ids()));

create policy "consumables_insert" on public.consumables
    for insert with check (household_id in (select public.get_my_household_ids()));

create policy "consumables_update" on public.consumables
    for update using (household_id in (select public.get_my_household_ids()));

create policy "consumables_delete" on public.consumables
    for delete using (household_id in (select public.get_my_household_ids()));

-- ── 7) price_history ────────────────────────────────────────
drop policy if exists "ph_select" on public.price_history;
drop policy if exists "ph_insert" on public.price_history;

create policy "ph_select" on public.price_history
    for select using (household_id in (select public.get_my_household_ids()));

create policy "ph_insert" on public.price_history
    for insert with check (household_id in (select public.get_my_household_ids()));

-- ── 8) orders ───────────────────────────────────────────────
drop policy if exists "orders_select" on public.orders;
drop policy if exists "orders_insert" on public.orders;
drop policy if exists "orders_update" on public.orders;

create policy "orders_select" on public.orders
    for select using (household_id in (select public.get_my_household_ids()));

create policy "orders_insert" on public.orders
    for insert with check (household_id in (select public.get_my_household_ids()));

create policy "orders_update" on public.orders
    for update using (household_id in (select public.get_my_household_ids()));
