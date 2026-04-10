-- =============================================
-- 융스위치 DB 스키마
-- Supabase SQL Editor에 그대로 붙여넣어 실행
-- =============================================

-- OTP 인증 테이블
CREATE TABLE otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 프레임 색상 테이블
CREATE TABLE frame_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  material_type TEXT NOT NULL CHECK (material_type IN ('plastic', 'metal')),
  image_url TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 모듈 테이블
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('스위치류', '콘센트류', '기타류')),
  price INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  max_gang INTEGER, -- NULL = 제한 없음, 1 = 1구 전용
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 매립박스 테이블
CREATE TABLE embedded_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 주문 테이블
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_detail TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'cancelled')),
  total_price INTEGER NOT NULL DEFAULT 0,
  tracking_number TEXT,
  admin_memo TEXT,
  cancelled_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 주문 상품 테이블
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  gang_count INTEGER NOT NULL CHECK (gang_count BETWEEN 1 AND 5),
  frame_color_id UUID REFERENCES frame_colors(id),
  frame_color_name TEXT NOT NULL,
  frame_color_price INTEGER NOT NULL DEFAULT 0,
  modules JSONB NOT NULL DEFAULT '[]',
  embedded_box_id UUID REFERENCES embedded_boxes(id),
  embedded_box_name TEXT,
  embedded_box_price INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  item_price INTEGER NOT NULL DEFAULT 0,
  total_price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 관리자 설정 테이블
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 기본 데이터 삽입
-- =============================================

-- 설정 기본값
INSERT INTO settings (key, value) VALUES
  ('show_price', 'true'),
  ('telegram_enabled', 'false');

-- 프레임 색상 (듀로플라스틱)
INSERT INTO frame_colors (name, material_type, price, sort_order) VALUES
  ('화이트', 'plastic', 0, 1),
  ('블랙', 'plastic', 0, 2),
  ('매트화이트', 'plastic', 0, 3),
  ('매트블랙', 'plastic', 0, 4),
  ('아이보리', 'plastic', 0, 5),
  ('라이트 그레이', 'plastic', 0, 6);

-- 프레임 색상 (메탈)
INSERT INTO frame_colors (name, material_type, price, sort_order) VALUES
  ('스테인레스스틸', 'metal', 0, 7),
  ('알루미늄', 'metal', 0, 8),
  ('안테라사이트', 'metal', 0, 9),
  ('다크', 'metal', 0, 10),
  ('클래식브래스', 'metal', 0, 11),
  ('앤티크브래스', 'metal', 0, 12);

-- 모듈 (스위치류)
INSERT INTO modules (name, category, price, max_gang, sort_order) VALUES
  ('1회로(3로겸용)', '스위치류', 0, NULL, 1),
  ('1회로(일괄소등)', '스위치류', 0, NULL, 2),
  ('2회로(단로전용)', '스위치류', 0, NULL, 3),
  ('2회로(3로겸용)', '스위치류', 0, NULL, 4),
  ('3회로(3로겸용)', '스위치류', 0, 1, 5),  -- 1구 전용
  ('디밍스위치', '스위치류', 0, NULL, 6);

-- 모듈 (콘센트류)
INSERT INTO modules (name, category, price, max_gang, sort_order) VALUES
  ('콘센트', '콘센트류', 0, NULL, 7),
  ('방우형콘센트', '콘센트류', 0, NULL, 8);

-- 모듈 (기타류)
INSERT INTO modules (name, category, price, max_gang, sort_order) VALUES
  ('LAN1구', '기타류', 0, NULL, 9),
  ('LAN2구', '기타류', 0, NULL, 10);

-- 매립박스
INSERT INTO embedded_boxes (name, price, sort_order) VALUES
  ('메탈사각박스', 0, 1),
  ('플라스틱원형(D47mm)', 0, 2),
  ('플라스틱원형(D61mm)', 0, 3),
  ('2구용플라스틱원형(D48mm)', 0, 4),
  ('3구용플라스틱원형(D48mm)', 0, 5),
  ('4구용플라스틱원형(D48mm)', 0, 6);

-- =============================================
-- RLS (Row Level Security) 설정
-- =============================================

ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE frame_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE embedded_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 (상품 정보)
CREATE POLICY "frame_colors_public_read" ON frame_colors FOR SELECT USING (true);
CREATE POLICY "modules_public_read" ON modules FOR SELECT USING (true);
CREATE POLICY "embedded_boxes_public_read" ON embedded_boxes FOR SELECT USING (true);
CREATE POLICY "settings_public_read" ON settings FOR SELECT USING (true);

-- 주문은 서비스 롤로만 처리 (API Route에서 service role key 사용)
CREATE POLICY "orders_service_all" ON orders FOR ALL USING (true);
CREATE POLICY "order_items_service_all" ON order_items FOR ALL USING (true);
CREATE POLICY "otp_service_all" ON otp_verifications FOR ALL USING (true);

-- =============================================
-- 트리거: updated_at 자동 갱신
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
