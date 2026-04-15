-- USB 콘센트 모듈 추가 (색상별 3종)
-- 콘센트(USB-A타입), 콘센트(USB-C타입), 콘센트(USB-C/A타입)

INSERT INTO modules (name, category, frame_color_id, price, is_active)
SELECT
  m.name,
  '콘센트류' AS category,
  fc.id AS frame_color_id,
  0 AS price,
  true AS is_active
FROM (
  VALUES
    ('콘센트(USB-A타입)'),
    ('콘센트(USB-C타입)'),
    ('콘센트(USB-C/A타입)')
) AS m(name)
CROSS JOIN (
  SELECT id FROM frame_colors WHERE is_active = true
) AS fc
ON CONFLICT DO NOTHING;
