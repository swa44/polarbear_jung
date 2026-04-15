-- 견적 중심 플로우 전환을 위한 orders 테이블 확장

ALTER TABLE orders
  ALTER COLUMN shipping_address SET DEFAULT '';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
  ADD COLUMN IF NOT EXISTS quote_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS quote_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quoted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipping_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

UPDATE orders
SET shipping_address = ''
WHERE shipping_address IS NULL;

ALTER TABLE orders
  ALTER COLUMN shipping_address SET NOT NULL;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (
    status IN (
      'pending',
      'confirmed',
      'quoted',
      'shipping_info_submitted',
      'waiting_deposit',
      'paid',
      'shipped',
      'cancelled',
      'expired'
    )
  );

CREATE INDEX IF NOT EXISTS idx_orders_quote_token ON orders (quote_token);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
