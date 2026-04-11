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

-- 고객 프로필 테이블
CREATE TABLE customer_profiles (
  phone TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 프레임 색상 테이블
CREATE TABLE frame_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  material_type TEXT NOT NULL CHECK (material_type IN ('plastic', 'metal')),
  image_url TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  price_1 INTEGER NOT NULL DEFAULT 0,
  price_2 INTEGER NOT NULL DEFAULT 0,
  price_3 INTEGER NOT NULL DEFAULT 0,
  price_4 INTEGER NOT NULL DEFAULT 0,
  price_5 INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 모듈 테이블
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frame_color_id UUID NOT NULL REFERENCES frame_colors(id) ON DELETE CASCADE,
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
  recipient_name TEXT,
  shipping_address TEXT NOT NULL,
  shipping_detail TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'cancelled')),
  total_price INTEGER NOT NULL DEFAULT 0,
  tracking_company TEXT,
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
INSERT INTO frame_colors (name, material_type, price, price_1, price_2, price_3, price_4, price_5, sort_order) VALUES
  ('화이트', 'plastic', 0, 0, 0, 0, 0, 0, 1),
  ('블랙', 'plastic', 0, 0, 0, 0, 0, 0, 2),
  ('매트화이트', 'plastic', 0, 0, 0, 0, 0, 0, 3),
  ('매트블랙', 'plastic', 0, 0, 0, 0, 0, 0, 4),
  ('아이보리', 'plastic', 0, 0, 0, 0, 0, 0, 5),
  ('라이트 그레이', 'plastic', 0, 0, 0, 0, 0, 0, 6);

-- 프레임 색상 (메탈)
INSERT INTO frame_colors (name, material_type, price, price_1, price_2, price_3, price_4, price_5, sort_order) VALUES
  ('스테인레스스틸', 'metal', 0, 0, 0, 0, 0, 0, 7),
  ('알루미늄', 'metal', 0, 0, 0, 0, 0, 0, 8),
  ('안테라사이트', 'metal', 0, 0, 0, 0, 0, 0, 9),
  ('다크', 'metal', 0, 0, 0, 0, 0, 0, 10),
  ('클래식브래스', 'metal', 0, 0, 0, 0, 0, 0, 11),
  ('앤티크브래스', 'metal', 0, 0, 0, 0, 0, 0, 12);

-- 모듈은 프레임 색상별로 다르므로 관리자 페이지에서 색상별로 직접 추가하세요.
-- (각 색상마다 동일한 모듈 종류라도 이미지/색상이 다릅니다)

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
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
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
CREATE POLICY "customer_profiles_service_all" ON customer_profiles FOR ALL USING (true);

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

CREATE TRIGGER customer_profiles_updated_at
  BEFORE UPDATE ON customer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
