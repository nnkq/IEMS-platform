ALTER TABLE users
ADD COLUMN google_id VARCHAR(255) NULL,
ADD COLUMN reset_token VARCHAR(255) NULL,
ADD COLUMN reset_token_expire DATETIME NULL;

-- 🔥 ADD COLUMNS (repair_requests)
ALTER TABLE repair_requests
ADD phone VARCHAR(20),
ADD desired_date DATE,
ADD service_mode VARCHAR(100),
ADD device_type VARCHAR(100),
ADD brand VARCHAR(100),
ADD model VARCHAR(100),
ADD symptoms TEXT;

-- 🔥 ADD (stores - optional)
ALTER TABLE stores
ADD service_types TEXT;

-- 🔥 INDEX MAP (tăng tốc tìm khoảng cách)
CREATE INDEX idx_store_location ON stores(latitude, longitude);
CREATE INDEX idx_request_location ON repair_requests(latitude, longitude);

-- 🔥 1. TẠO BẢNG service_categories
CREATE TABLE IF NOT EXISTS service_categories (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100)
);

-- 🔥 2. THÊM CỘT category_id vào devices
ALTER TABLE devices
ADD COLUMN category_id INT;

-- 🔥 3. ADD FOREIGN KEY
ALTER TABLE devices
ADD CONSTRAINT fk_device_category
FOREIGN KEY (category_id) REFERENCES service_categories(id);

-- 🔥 4. INSERT DATA mẫu
INSERT INTO service_categories (name) VALUES
('Phone'),
('Laptop'),
('Tablet'),
('Smart Device');

SET SQL_SAFE_UPDATES = 0;
-- 🔥 5. UPDATE devices → map category_id
UPDATE devices SET category_id = 1 WHERE category = 'Phone';
UPDATE devices SET category_id = 2 WHERE category = 'Laptop';
UPDATE devices SET category_id = 3 WHERE category = 'Tablet';
UPDATE devices SET category_id = 4 WHERE category = 'Smart Device';