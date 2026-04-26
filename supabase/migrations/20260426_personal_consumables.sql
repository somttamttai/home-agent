-- 개인(나만보기) 소모품 지원
-- consumables.owner_id 가 NULL 이면 가족 공용, 값이 있으면 해당 user 만 볼 수 있음

ALTER TABLE consumables
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_consumables_owner ON consumables (owner_id);

-- RLS 정책 재정의: household 멤버이고, owner_id 가 비어있거나 본인인 행만 노출
DROP POLICY IF EXISTS "consumables_household_only" ON consumables;
DROP POLICY IF EXISTS "consumables_select" ON consumables;
DROP POLICY IF EXISTS "consumables_insert" ON consumables;
DROP POLICY IF EXISTS "consumables_update" ON consumables;
DROP POLICY IF EXISTS "consumables_delete" ON consumables;

CREATE POLICY "consumables_select" ON consumables
FOR SELECT USING (
  household_id IN (
    SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
  )
  AND (owner_id IS NULL OR owner_id = auth.uid())
);

CREATE POLICY "consumables_insert" ON consumables
FOR INSERT WITH CHECK (
  household_id IN (
    SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
  )
  AND (owner_id IS NULL OR owner_id = auth.uid())
);

CREATE POLICY "consumables_update" ON consumables
FOR UPDATE USING (
  household_id IN (
    SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
  )
  AND (owner_id IS NULL OR owner_id = auth.uid())
);

CREATE POLICY "consumables_delete" ON consumables
FOR DELETE USING (
  household_id IN (
    SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
  )
  AND (owner_id IS NULL OR owner_id = auth.uid())
);

-- 인트로 안내 표시 여부는 클라이언트의 localStorage('personal_intro_seen') 로 처리.
-- (auth.users 는 직접 수정 불가하므로 별도 user_metadata 테이블이 필요해질 때까지 보류)
