-- linked_categories: 한 소모품을 여러 카테고리에 노출하기 위한 보조 카테고리 배열
-- 주(primary) 카테고리는 기존 `category` 컬럼 유지
-- 나머지 복사 대상 카테고리들이 이 배열에 저장됨
ALTER TABLE consumables
  ADD COLUMN IF NOT EXISTS linked_categories jsonb NOT NULL DEFAULT '[]'::jsonb;
