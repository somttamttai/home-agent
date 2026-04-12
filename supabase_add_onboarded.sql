-- households 테이블에 onboarded 컬럼 추가
alter table public.households
    add column if not exists onboarded boolean not null default false;
