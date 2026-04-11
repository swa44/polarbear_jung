-- =============================================
-- 마이그레이션: modules 테이블에 frame_color_id 추가
-- 이미 schema.sql을 실행한 경우 이 파일을 실행하세요.
-- =============================================

-- 기존 모듈 데이터 삭제 (frame_color_id 없는 시드 데이터)
DELETE FROM modules;

-- frame_color_id 컬럼 추가
ALTER TABLE modules
  ADD COLUMN IF NOT EXISTS frame_color_id UUID REFERENCES frame_colors(id) ON DELETE CASCADE;

-- NOT NULL 제약 추가
ALTER TABLE modules
  ALTER COLUMN frame_color_id SET NOT NULL;
