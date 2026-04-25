-- menu_recipes: 메뉴추천용 레시피 카탈로그 (Part 1/3 — 스키마 + 아침)
-- meal_type: 끼니 (아침/점심/저녁/야식) — 한 메뉴가 여러 끼니에 걸칠 수 있음
-- ingredients: [{name, emoji, keyword}] — keyword는 쿠팡 검색에 사용
-- milkit_keyword: 쿠팡 밀키트 검색 키워드 (없으면 NULL)
-- tags: ["간단","10분","혼밥"] 등 자유 라벨
CREATE TABLE IF NOT EXISTS public.menu_recipes (
  id              bigserial PRIMARY KEY,
  name            text NOT NULL,
  meal_type       text[] NOT NULL,
  category        text,
  ingredients     jsonb NOT NULL DEFAULT '[]'::jsonb,
  milkit_keyword  text,
  tags            text[] DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_recipes_name ON public.menu_recipes (name);
CREATE INDEX IF NOT EXISTS idx_menu_recipes_meal_type ON public.menu_recipes USING GIN (meal_type);

-- RLS: 카탈로그성 데이터라 누구나 read 가능
ALTER TABLE public.menu_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "menu_recipes_select" ON public.menu_recipes;
CREATE POLICY "menu_recipes_select" ON public.menu_recipes
  FOR SELECT TO authenticated USING (true);

-- ── 아침 (47) ───────────────────────────────────────────────────────
INSERT INTO public.menu_recipes (name, meal_type, category, ingredients, milkit_keyword, tags) VALUES
('계란후라이', ARRAY['아침'], '한식', regexp_replace('[{"name":"계란","emoji":"🥚","keyword":"계란"},{"name":"식용유","emoji":"🫙","keyword":"식용유"},{"name":"소금","emoji":"🧂","keyword":"소금"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['간단','5분','혼밥']),
('스크램블에그', ARRAY['아침'], '양식', regexp_replace('[{"name":"계란","emoji":"🥚","keyword":"계란"},{"name":"우유","emoji":"🥛","keyword":"우유"},{"name":"버터","emoji":"🧈","keyword":"버터"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['간단','5분']),
('계란말이', ARRAY['아침'], '한식', regexp_replace('[{"name":"계란","emoji":"🥚","keyword":"계란"},{"name":"당근","emoji":"🥕","keyword":"당근"},{"name":"대파","emoji":"🌿","keyword":"대파"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['간단','10분']),
('토스트', ARRAY['아침'], '양식', regexp_replace('[{"name":"식빵","emoji":"🍞","keyword":"식빵"},{"name":"버터","emoji":"🧈","keyword":"버터"},{"name":"딸기잼","emoji":"🍓","keyword":"딸기잼"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['간단','5분']),
('프렌치토스트', ARRAY['아침'], '양식', regexp_replace('[{"name":"식빵","emoji":"🍞","keyword":"식빵"},{"name":"계란","emoji":"🥚","keyword":"계란"},{"name":"우유","emoji":"🥛","keyword":"우유"},{"name":"버터","emoji":"🧈","keyword":"버터"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['간단','10분']),
('아보카도토스트', ARRAY['아침'], '양식', regexp_replace('[{"name":"식빵","emoji":"🍞","keyword":"식빵"},{"name":"아보카도","emoji":"🥑","keyword":"아보카도"},{"name":"계란","emoji":"🥚","keyword":"계란"},{"name":"레몬","emoji":"🍋","keyword":"레몬"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['건강','10분']),
('오트밀', ARRAY['아침'], '양식', regexp_replace('[{"name":"오트밀","emoji":"🌾","keyword":"오트밀"},{"name":"우유","emoji":"🥛","keyword":"우유"},{"name":"바나나","emoji":"🍌","keyword":"바나나"},{"name":"꿀","emoji":"🍯","keyword":"꿀"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['건강','간단','5분']),
('그래놀라', ARRAY['아침'], '양식', regexp_replace('[{"name":"그래놀라","emoji":"🌾","keyword":"그래놀라"},{"name":"그릭요거트","emoji":"🥛","keyword":"그릭요거트"},{"name":"블루베리","emoji":"🫐","keyword":"블루베리"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['건강','간단']),
('팬케이크', ARRAY['아침'], '양식', regexp_replace('[{"name":"핫케이크가루","emoji":"🥞","keyword":"핫케이크가루"},{"name":"계란","emoji":"🥚","keyword":"계란"},{"name":"우유","emoji":"🥛","keyword":"우유"},{"name":"메이플시럽","emoji":"🍯","keyword":"메이플시럽"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['주말','20분']),
('와플', ARRAY['아침'], '양식', regexp_replace('[{"name":"와플믹스","emoji":"🧇","keyword":"와플믹스"},{"name":"계란","emoji":"🥚","keyword":"계란"},{"name":"우유","emoji":"🥛","keyword":"우유"},{"name":"버터","emoji":"🧈","keyword":"버터"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['주말','20분']),
('흰죽', ARRAY['아침'], '한식', regexp_replace('[{"name":"쌀","emoji":"🌾","keyword":"쌀"},{"name":"참기름","emoji":"🫙","keyword":"참기름"},{"name":"소금","emoji":"🧂","keyword":"소금"}]', E'[\r\n\t]', '', 'g')::jsonb, '죽 밀키트', ARRAY['건강','회복식']),
('야채죽', ARRAY['아침'], '한식', regexp_replace('[{"name":"쌀","emoji":"🌾","keyword":"쌀"},{"name":"당근","emoji":"🥕","keyword":"당근"},{"name":"애호박","emoji":"🥬","keyword":"애호박"},{"name":"참기름","emoji":"🫙","keyword":"참기름"}]', E'[\r\n\t]', '', 'g')::jsonb, '야채죽 밀키트', ARRAY['건강','회복식']),
('닭죽', ARRAY['아침'], '한식', regexp_replace('[{"name":"쌀","emoji":"🌾","keyword":"쌀"},{"name":"닭가슴살","emoji":"🍗","keyword":"닭가슴살"},{"name":"대파","emoji":"🌿","keyword":"대파"},{"name":"참기름","emoji":"🫙","keyword":"참기름"}]', E'[\r\n\t]', '', 'g')::jsonb, '닭죽 밀키트', ARRAY['건강','든든']),
('샌드위치', ARRAY['아침','점심'], '양식', regexp_replace('[{"name":"식빵","emoji":"🍞","keyword":"식빵"},{"name":"햄","emoji":"🥩","keyword":"햄"},{"name":"계란","emoji":"🥚","keyword":"계란"},{"name":"양상추","emoji":"🥬","keyword":"양상추"},{"name":"마요네즈","emoji":"🫙","keyword":"마요네즈"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['간단','10분']),
('클럽샌드위치', ARRAY['아침'], '양식', regexp_replace('[{"name":"식빵","emoji":"🍞","keyword":"식빵"},{"name":"닭가슴살","emoji":"🍗","keyword":"닭가슴살"},{"name":"베이컨","emoji":"🥓","keyword":"베이컨"},{"name":"양상추","emoji":"🥬","keyword":"양상추"},{"name":"토마토","emoji":"🍅","keyword":"토마토"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['든든','20분']),
('바나나쉐이크', ARRAY['아침'], '양식', regexp_replace('[{"name":"바나나","emoji":"🍌","keyword":"바나나"},{"name":"우유","emoji":"🥛","keyword":"우유"},{"name":"꿀","emoji":"🍯","keyword":"꿀"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['간단','5분','건강']),
('스무디볼', ARRAY['아침'], '양식', regexp_replace('[{"name":"냉동딸기","emoji":"🍓","keyword":"냉동딸기"},{"name":"바나나","emoji":"🍌","keyword":"바나나"},{"name":"그릭요거트","emoji":"🥛","keyword":"그릭요거트"},{"name":"그래놀라","emoji":"🌾","keyword":"그래놀라"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['건강','간단']),
('미역국', ARRAY['아침'], '한식', regexp_replace('[{"name":"미역","emoji":"🌿","keyword":"미역"},{"name":"소고기","emoji":"🥩","keyword":"소고기 국거리"},{"name":"참기름","emoji":"🫙","keyword":"참기름"},{"name":"국간장","emoji":"🫙","keyword":"국간장"}]', E'[\r\n\t]', '', 'g')::jsonb, '미역국 밀키트', ARRAY['건강','생일']),
('된장국', ARRAY['아침'], '한식', regexp_replace('[{"name":"된장","emoji":"🫙","keyword":"된장"},{"name":"두부","emoji":"⬜","keyword":"두부"},{"name":"애호박","emoji":"🥬","keyword":"애호박"},{"name":"멸치육수","emoji":"🐟","keyword":"멸치육수"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['간단','15분']),
('고구마구이', ARRAY['아침'], '한식', regexp_replace('[{"name":"고구마","emoji":"🍠","keyword":"고구마"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['건강','간단','다이어트']),
('감자구이', ARRAY['아침'], '한식', regexp_replace('[{"name":"감자","emoji":"🥔","keyword":"감자"},{"name":"버터","emoji":"🧈","keyword":"버터"},{"name":"소금","emoji":"🧂","keyword":"소금"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['간단','건강']),
('크로와상', ARRAY['아침'], '양식', regexp_replace('[{"name":"크로와상","emoji":"🥐","keyword":"크로와상"},{"name":"버터","emoji":"🧈","keyword":"버터"},{"name":"잼","emoji":"🍓","keyword":"딸기잼"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['간단','5분']),
('베이글', ARRAY['아침'], '양식', regexp_replace('[{"name":"베이글","emoji":"🥯","keyword":"베이글"},{"name":"크림치즈","emoji":"🧀","keyword":"크림치즈"},{"name":"연어","emoji":"🐟","keyword":"훈제연어"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['간단','든든']),
('시리얼', ARRAY['아침'], '양식', regexp_replace('[{"name":"시리얼","emoji":"🌾","keyword":"시리얼"},{"name":"우유","emoji":"🥛","keyword":"우유"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['간단','5분','혼밥']),
('그릭요거트', ARRAY['아침'], '양식', regexp_replace('[{"name":"그릭요거트","emoji":"🥛","keyword":"그릭요거트"},{"name":"꿀","emoji":"🍯","keyword":"꿀"},{"name":"견과류","emoji":"🥜","keyword":"견과류"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['건강','간단','다이어트']),
('주먹밥', ARRAY['아침'], '한식', regexp_replace('[{"name":"쌀","emoji":"🌾","keyword":"쌀"},{"name":"참치캔","emoji":"🐟","keyword":"참치캔"},{"name":"김","emoji":"🟫","keyword":"김"},{"name":"참기름","emoji":"🫙","keyword":"참기름"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['간단','도시락']),
('토마토수프', ARRAY['아침'], '양식', regexp_replace('[{"name":"토마토","emoji":"🍅","keyword":"토마토"},{"name":"양파","emoji":"🧅","keyword":"양파"},{"name":"생크림","emoji":"🥛","keyword":"생크림"},{"name":"버터","emoji":"🧈","keyword":"버터"}]', E'[\r\n\t]', '', 'g')::jsonb, '토마토수프 밀키트', ARRAY['건강','따뜻한']),
('콘수프', ARRAY['아침'], '양식', regexp_replace('[{"name":"옥수수","emoji":"🌽","keyword":"옥수수캔"},{"name":"우유","emoji":"🥛","keyword":"우유"},{"name":"버터","emoji":"🧈","keyword":"버터"}]', E'[\r\n\t]', '', 'g')::jsonb, '콘수프 밀키트', ARRAY['간단','따뜻한']),
('닭가슴살샐러드', ARRAY['아침'], '양식', regexp_replace('[{"name":"닭가슴살","emoji":"🍗","keyword":"닭가슴살"},{"name":"양상추","emoji":"🥬","keyword":"양상추"},{"name":"방울토마토","emoji":"🍅","keyword":"방울토마토"},{"name":"드레싱","emoji":"🫙","keyword":"샐러드드레싱"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['건강','다이어트']),
('계란죽', ARRAY['아침'], '한식', regexp_replace('[{"name":"쌀","emoji":"🌾","keyword":"쌀"},{"name":"계란","emoji":"🥚","keyword":"계란"},{"name":"참기름","emoji":"🫙","keyword":"참기름"},{"name":"소금","emoji":"🧂","keyword":"소금"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['건강','회복식','간단']),
('두유', ARRAY['아침'], '한식', regexp_replace('[{"name":"두유","emoji":"🥛","keyword":"두유"},{"name":"바나나","emoji":"🍌","keyword":"바나나"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['건강','간단','5분']),
('머핀', ARRAY['아침'], '양식', regexp_replace('[{"name":"머핀믹스","emoji":"🧁","keyword":"머핀믹스"},{"name":"계란","emoji":"🥚","keyword":"계란"},{"name":"우유","emoji":"🥛","keyword":"우유"},{"name":"버터","emoji":"🧈","keyword":"버터"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['주말','베이킹']),
('에그머핀', ARRAY['아침'], '양식', regexp_replace('[{"name":"영국식머핀","emoji":"🍞","keyword":"잉글리시머핀"},{"name":"계란","emoji":"🥚","keyword":"계란"},{"name":"햄","emoji":"🥩","keyword":"햄"},{"name":"치즈","emoji":"🧀","keyword":"슬라이스치즈"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['든든','15분']),
('김치볶음밥', ARRAY['아침','점심'], '한식', regexp_replace('[{"name":"김치","emoji":"🥬","keyword":"김치"},{"name":"쌀밥","emoji":"🍚","keyword":"쌀"},{"name":"계란","emoji":"🥚","keyword":"계란"},{"name":"참기름","emoji":"🫙","keyword":"참기름"}]', E'[\r\n\t]', '', 'g')::jsonb, '김치볶음밥 밀키트', ARRAY['간단','15분','혼밥']),
('누룽지', ARRAY['아침'], '한식', regexp_replace('[{"name":"누룽지","emoji":"🌾","keyword":"누룽지"},{"name":"물","emoji":"💧","keyword":""}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['간단','건강','어르신']),
('떡국', ARRAY['아침'], '한식', regexp_replace('[{"name":"떡국떡","emoji":"🍚","keyword":"떡국떡"},{"name":"계란","emoji":"🥚","keyword":"계란"},{"name":"대파","emoji":"🌿","keyword":"대파"},{"name":"국간장","emoji":"🫙","keyword":"국간장"}]', E'[\r\n\t]', '', 'g')::jsonb, '떡국 밀키트', ARRAY['명절','든든']),
('수란', ARRAY['아침'], '양식', regexp_replace('[{"name":"계란","emoji":"🥚","keyword":"계란"},{"name":"식초","emoji":"🫙","keyword":"식초"},{"name":"소금","emoji":"🧂","keyword":"소금"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['건강','10분']),
('베이컨에그', ARRAY['아침'], '양식', regexp_replace('[{"name":"베이컨","emoji":"🥓","keyword":"베이컨"},{"name":"계란","emoji":"🥚","keyword":"계란"},{"name":"버터","emoji":"🧈","keyword":"버터"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['든든','10분']),
('참치김밥', ARRAY['아침'], '한식', regexp_replace('[{"name":"참치캔","emoji":"🐟","keyword":"참치캔"},{"name":"김","emoji":"🟫","keyword":"김"},{"name":"쌀","emoji":"🌾","keyword":"쌀"},{"name":"단무지","emoji":"🟡","keyword":"단무지"},{"name":"당근","emoji":"🥕","keyword":"당근"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['도시락','든든']),
('고구마라떼', ARRAY['아침'], '한식', regexp_replace('[{"name":"고구마","emoji":"🍠","keyword":"고구마"},{"name":"우유","emoji":"🥛","keyword":"우유"},{"name":"꿀","emoji":"🍯","keyword":"꿀"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['간단','달콤']),
('단호박죽', ARRAY['아침'], '한식', regexp_replace('[{"name":"단호박","emoji":"🎃","keyword":"단호박"},{"name":"쌀가루","emoji":"🌾","keyword":"쌀가루"},{"name":"설탕","emoji":"🍬","keyword":"설탕"}]', E'[\r\n\t]', '', 'g')::jsonb, '단호박죽 밀키트', ARRAY['건강','달콤']),
('두부스크램블', ARRAY['아침'], '양식', regexp_replace('[{"name":"두부","emoji":"⬜","keyword":"두부"},{"name":"계란","emoji":"🥚","keyword":"계란"},{"name":"버터","emoji":"🧈","keyword":"버터"},{"name":"소금","emoji":"🧂","keyword":"소금"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['건강','다이어트','10분']),
('요거트파르페', ARRAY['아침'], '양식', regexp_replace('[{"name":"그릭요거트","emoji":"🥛","keyword":"그릭요거트"},{"name":"그래놀라","emoji":"🌾","keyword":"그래놀라"},{"name":"딸기","emoji":"🍓","keyword":"딸기"},{"name":"꿀","emoji":"🍯","keyword":"꿀"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['건강','간단','예쁜']),
('치아씨드푸딩', ARRAY['아침'], '양식', regexp_replace('[{"name":"치아씨드","emoji":"🌾","keyword":"치아씨드"},{"name":"우유","emoji":"🥛","keyword":"우유"},{"name":"꿀","emoji":"🍯","keyword":"꿀"},{"name":"바나나","emoji":"🍌","keyword":"바나나"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['건강','다이어트','전날준비']),
('소시지볶음', ARRAY['아침'], '한식', regexp_replace('[{"name":"소시지","emoji":"🌭","keyword":"소시지"},{"name":"양파","emoji":"🧅","keyword":"양파"},{"name":"피망","emoji":"🫑","keyword":"피망"},{"name":"케찹","emoji":"🍅","keyword":"케찹"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['간단','10분','아이반찬']),
('감자해시브라운', ARRAY['아침'], '양식', regexp_replace('[{"name":"감자","emoji":"🥔","keyword":"감자"},{"name":"버터","emoji":"🧈","keyword":"버터"},{"name":"소금","emoji":"🧂","keyword":"소금"},{"name":"후추","emoji":"🧂","keyword":"후추"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['10분','든든']),
('쌀국수', ARRAY['아침','점심'], '아시안', regexp_replace('[{"name":"쌀국수면","emoji":"🍜","keyword":"쌀국수"},{"name":"닭육수","emoji":"🍗","keyword":"닭육수"},{"name":"숙주","emoji":"🌿","keyword":"숙주"},{"name":"라임","emoji":"🍋","keyword":"라임"}]', E'[\r\n\t]', '', 'g')::jsonb, '쌀국수 밀키트', ARRAY['건강','국물']),
('브런치플레이트', ARRAY['아침'], '양식', regexp_replace('[{"name":"계란","emoji":"🥚","keyword":"계란"},{"name":"베이컨","emoji":"🥓","keyword":"베이컨"},{"name":"토마토","emoji":"🍅","keyword":"토마토"},{"name":"식빵","emoji":"🍞","keyword":"식빵"},{"name":"버터","emoji":"🧈","keyword":"버터"}]', E'[\r\n\t]', '', 'g')::jsonb, NULL, ARRAY['주말','든든','특별한날']);
