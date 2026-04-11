-- 주문 테이블에 택배사 컬럼 추가
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_company TEXT;
