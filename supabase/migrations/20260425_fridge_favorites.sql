-- fridge_favorites: 냉장고 탭 즐겨찾기 (자주 구매하는 식재료)
-- 카드 탭하면 쿠팡 로켓프레시 검색으로 이동
CREATE TABLE IF NOT EXISTS public.fridge_favorites (
  id              bigserial PRIMARY KEY,
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name            text NOT NULL,
  emoji           text DEFAULT '🥬',
  search_keyword  text,
  sort_order      integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fridge_favorites_household
  ON public.fridge_favorites (household_id, sort_order, created_at);

ALTER TABLE public.fridge_favorites ENABLE ROW LEVEL SECURITY;

-- household 멤버만 자신의 가구 행 read/write 가능
DROP POLICY IF EXISTS "fridge_favorites_select" ON public.fridge_favorites;
CREATE POLICY "fridge_favorites_select" ON public.fridge_favorites
  FOR SELECT TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "fridge_favorites_insert" ON public.fridge_favorites;
CREATE POLICY "fridge_favorites_insert" ON public.fridge_favorites
  FOR INSERT TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "fridge_favorites_update" ON public.fridge_favorites;
CREATE POLICY "fridge_favorites_update" ON public.fridge_favorites
  FOR UPDATE TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "fridge_favorites_delete" ON public.fridge_favorites;
CREATE POLICY "fridge_favorites_delete" ON public.fridge_favorites
  FOR DELETE TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );
