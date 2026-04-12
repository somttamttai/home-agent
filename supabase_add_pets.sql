-- family_settings 테이블에 pets 컬럼 추가
ALTER TABLE public.family_settings
ADD COLUMN IF NOT EXISTS pets integer NOT NULL DEFAULT 0;
