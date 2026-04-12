-- =========================================================
-- households INSERT RLS 오류 수정
-- "new row violates row-level security policy for table households"
-- =========================================================

-- 기존 정책 전부 삭제
drop policy if exists "households_select" on public.households;
drop policy if exists "households_insert" on public.households;
drop policy if exists "households_update" on public.households;
drop policy if exists "households_delete" on public.households;

drop policy if exists "hm_select" on public.household_members;
drop policy if exists "hm_insert" on public.household_members;
drop policy if exists "hm_delete" on public.household_members;

-- households
create policy "households_select" on public.households
    for select using (id in (select public.get_my_household_ids()));

create policy "households_insert" on public.households
    for insert with check (auth.uid() = owner_id);

create policy "households_update" on public.households
    for update using (auth.uid() = owner_id);

create policy "households_delete" on public.households
    for delete using (auth.uid() = owner_id);

-- household_members
create policy "hm_select" on public.household_members
    for select using (auth.uid() = user_id);

create policy "hm_insert" on public.household_members
    for insert with check (auth.uid() = user_id);

create policy "hm_delete" on public.household_members
    for delete using (auth.uid() = user_id);
