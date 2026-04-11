-- 프레임 색상 구별 가격(1~5구) 컬럼 추가
ALTER TABLE frame_colors
  ADD COLUMN IF NOT EXISTS price_1 INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_2 INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_3 INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_4 INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_5 INTEGER NOT NULL DEFAULT 0;

-- 기존 단일 가격을 구별 가격으로 초기 이관
UPDATE frame_colors
SET
  price_1 = COALESCE(price, 0),
  price_2 = COALESCE(price, 0),
  price_3 = COALESCE(price, 0),
  price_4 = COALESCE(price, 0),
  price_5 = COALESCE(price, 0)
WHERE TRUE;
