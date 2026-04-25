-- ─────────────────────────────────────────────────────────────
-- AI 소비패턴 학습 + 가격 추적 알림 (2026-04-18)
-- ─────────────────────────────────────────────────────────────

-- 1. notifications 테이블 (신규)
CREATE TABLE IF NOT EXISTS notifications (
  id            bigserial PRIMARY KEY,
  household_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consumable_id bigint REFERENCES consumables(id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN ('price_alert','lowest_price','low_stock','early_purchase')),
  message       text NOT NULL,
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_household_unread_idx
  ON notifications (household_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_consumable_idx
  ON notifications (consumable_id);

-- 2. price_history 테이블 — 이미 있으면 skip, 없으면 생성
CREATE TABLE IF NOT EXISTS price_history (
  id                    bigserial PRIMARY KEY,
  household_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  consumable_id         bigint NOT NULL REFERENCES consumables(id) ON DELETE CASCADE,
  mall_name             text,
  price                 integer NOT NULL,
  unit_price_per_meter  numeric,
  spec_parsed           jsonb,
  checked_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS price_history_consumable_idx
  ON price_history (consumable_id, checked_at DESC);

-- 3. purchase_history 테이블 — 이미 있으면 skip, 없으면 생성
CREATE TABLE IF NOT EXISTS purchase_history (
  id                      bigserial PRIMARY KEY,
  household_id            uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  consumable_id           bigint NOT NULL REFERENCES consumables(id) ON DELETE CASCADE,
  purchased_at            timestamptz NOT NULL DEFAULT now(),
  quantity                numeric NOT NULL DEFAULT 1,
  days_before_depletion   numeric,
  purchase_type           text NOT NULL DEFAULT 'normal'
                            CHECK (purchase_type IN ('normal','event','gift','early'))
);

CREATE INDEX IF NOT EXISTS purchase_history_consumable_idx
  ON purchase_history (consumable_id, purchased_at DESC);
