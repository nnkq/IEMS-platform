    -- 1. Tạo bảng service_categories
    CREATE TABLE service_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
    );

    -- Ví dụ thêm dữ liệu mẫu
    INSERT INTO service_categories (name) VALUES
    ('Electrical'),
    ('Water'),
    ('Electronics'),
    ('Home Appliances');

    -- 2. Sửa bảng devices: bỏ cột category dạng VARCHAR, thêm category_id
    ALTER TABLE devices
    DROP COLUMN category,
    ADD COLUMN category_id INT,
    ADD CONSTRAINT fk_devices_category FOREIGN KEY (category_id) REFERENCES service_categories(id);