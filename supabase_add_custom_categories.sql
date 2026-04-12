-- households 테이블에 custom_categories 컬럼 추가
ALTER TABLE public.households
ADD COLUMN IF NOT EXISTS custom_categories jsonb DEFAULT '[]';
