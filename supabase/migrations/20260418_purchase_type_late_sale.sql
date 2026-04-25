-- purchase_type에 'late'와 'sale' 추가
-- (기존: normal, event, gift, early)
ALTER TABLE purchase_history
  DROP CONSTRAINT IF EXISTS purchase_history_purchase_type_check;

ALTER TABLE purchase_history
  ADD CONSTRAINT purchase_history_purchase_type_check
  CHECK (purchase_type IN ('normal','event','gift','early','late','sale'));
