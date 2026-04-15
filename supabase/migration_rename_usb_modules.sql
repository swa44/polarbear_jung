-- modules.name에서 "타입" 제거 (콘센트(USB-A타입) → 콘센트(USB-A) 등)
UPDATE modules
SET name = REPLACE(name, '타입', '')
WHERE name LIKE '%타입%';
