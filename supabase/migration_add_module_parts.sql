-- module_parts 테이블: BOM CSV 기반 개별 부품 데이터
CREATE TABLE IF NOT EXISTS module_parts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_name TEXT NOT NULL,   -- 상품명 (예: 1회로(3로겸용))
  color_name  TEXT NOT NULL,   -- 색상명 (예: 화이트)
  part_code   TEXT NOT NULL,   -- 품목코드 (예: 506U)
  part_name   TEXT NOT NULL,   -- 제품명
  price       INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (module_name, color_name, part_code)
);

CREATE INDEX IF NOT EXISTS idx_module_parts_color  ON module_parts (color_name);
CREATE INDEX IF NOT EXISTS idx_module_parts_module ON module_parts (module_name, color_name);
