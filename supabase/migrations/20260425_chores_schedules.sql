-- chores: 반복 가능한 집안일 (분리수거, 설거지 등)
-- repeat_type: none(상시) / daily / weekly(repeat_day=요일 0~6) / monthly(repeat_day=일 1~31)
-- assignee_id: 현재 담당자 (null이면 로테이션 또는 미배정)
-- rotation_members: ["uuid1","uuid2",...] 순서대로 돌아가는 멤버
-- rotation_index: 현재 차례 (0부터). 한 바퀴 돌면 % length

CREATE TABLE IF NOT EXISTS public.chores (
  id                bigserial PRIMARY KEY,
  household_id      uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title             text NOT NULL,
  emoji             text DEFAULT '📋',
  assignee_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  repeat_type       text DEFAULT 'none'
    CHECK (repeat_type IN ('none','daily','weekly','monthly')),
  repeat_day        integer,
  rotation_members  jsonb NOT NULL DEFAULT '[]'::jsonb,
  rotation_index    integer NOT NULL DEFAULT 0,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chores_household ON public.chores (household_id);

ALTER TABLE public.chores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chores_select" ON public.chores;
CREATE POLICY "chores_select" ON public.chores
  FOR SELECT TO authenticated
  USING (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "chores_insert" ON public.chores;
CREATE POLICY "chores_insert" ON public.chores
  FOR INSERT TO authenticated
  WITH CHECK (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "chores_update" ON public.chores;
CREATE POLICY "chores_update" ON public.chores
  FOR UPDATE TO authenticated
  USING (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "chores_delete" ON public.chores;
CREATE POLICY "chores_delete" ON public.chores
  FOR DELETE TO authenticated
  USING (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));


-- schedules: 가족 일정 (병원, 약속, 기념일 등)
CREATE TABLE IF NOT EXISTS public.schedules (
  id              bigserial PRIMARY KEY,
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title           text NOT NULL,
  emoji           text DEFAULT '📅',
  schedule_date   date NOT NULL,
  memo            text,
  is_shared       boolean DEFAULT true,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedules_household_date
  ON public.schedules (household_id, schedule_date);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedules_select" ON public.schedules;
CREATE POLICY "schedules_select" ON public.schedules
  FOR SELECT TO authenticated
  USING (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "schedules_insert" ON public.schedules;
CREATE POLICY "schedules_insert" ON public.schedules
  FOR INSERT TO authenticated
  WITH CHECK (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "schedules_update" ON public.schedules;
CREATE POLICY "schedules_update" ON public.schedules
  FOR UPDATE TO authenticated
  USING (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "schedules_delete" ON public.schedules;
CREATE POLICY "schedules_delete" ON public.schedules
  FOR DELETE TO authenticated
  USING (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));


-- 같은 household 멤버 이름 조회용 함수 (담당자 표시 / 선택 UI)
-- auth.users 직접 노출은 금지라 이 함수로 우회
-- name: full_name → name 메타 → 이메일 prefix 순으로 폴백
CREATE OR REPLACE FUNCTION public.household_members_with_names()
RETURNS TABLE (user_id uuid, name text, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    hm.user_id,
    COALESCE(
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'name',
      split_part(au.email, '@', 1)
    ) AS name,
    au.email
  FROM public.household_members hm
  JOIN auth.users au ON au.id = hm.user_id
  WHERE hm.household_id IN (
    SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.household_members_with_names() TO authenticated;
