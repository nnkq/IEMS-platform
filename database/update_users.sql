ALTER TABLE users
ADD COLUMN google_id VARCHAR(255) NULL,
ADD COLUMN reset_token VARCHAR(255) NULL,
ADD COLUMN reset_token_expire DATETIME NULL;

USE iems_db;

-- =========================
-- 1. Thêm service categories
-- =========================
INSERT INTO service_categories (name) VALUES
('Phone'),
('Laptop'),
('Tablet'),
('Smart Device');


-- =========================
-- 2. Thêm devices
-- =========================
INSERT INTO devices (name, category_id) VALUES
('iPhone 12', 1),
('Samsung S22', 1),
('Dell Inspiron 14', 2),
('MacBook Pro', 2);


-- =========================
-- 3. Thêm repair request test
-- =========================
INSERT INTO repair_requests
(user_id, device_id, title, description, budget, location, status)
VALUES
(1, 1, 'Màn hình bị sọc xanh', 'Cảm ứng chập chờn', 1000000, 'Da Nang', 'OPEN');


-- =========================
-- 4. Kiểm tra dữ liệu
-- =========================
SELECT * FROM service_categories;

SELECT * FROM devices;

SELECT * FROM repair_requests;