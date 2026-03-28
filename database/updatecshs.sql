USE iems_db;

SET FOREIGN_KEY_CHECKS = 0;
SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

DELIMITER $$

DROP PROCEDURE IF EXISTS patch_iems_db $$
CREATE PROCEDURE patch_iems_db()
BEGIN
  /* =========================
     USERS
     ========================= */
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'google_id'
  ) THEN
    ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL AFTER password;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'reset_token'
  ) THEN
    ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) NULL AFTER google_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'reset_token_expire'
  ) THEN
    ALTER TABLE users ADD COLUMN reset_token_expire DATETIME NULL AFTER reset_token;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'status'
  ) THEN
    ALTER TABLE users
      ADD COLUMN status ENUM('ACTIVE', 'BLOCKED', 'PENDING') DEFAULT 'ACTIVE' AFTER role;
  END IF;

  UPDATE users
  SET role = CASE
    WHEN UPPER(COALESCE(role, '')) = 'STORE' THEN 'STORE'
    WHEN UPPER(COALESCE(role, '')) = 'ADMIN' THEN 'ADMIN'
    ELSE 'USER'
  END
  WHERE id > 0;

  UPDATE users
  SET status = CASE
    WHEN UPPER(COALESCE(status, '')) = 'BLOCKED' THEN 'BLOCKED'
    WHEN UPPER(COALESCE(status, '')) = 'PENDING' THEN 'PENDING'
    ELSE 'ACTIVE'
  END
  WHERE id > 0;

  ALTER TABLE users
    MODIFY COLUMN role ENUM('USER', 'STORE', 'ADMIN') NOT NULL DEFAULT 'USER',
    MODIFY COLUMN status ENUM('ACTIVE', 'BLOCKED', 'PENDING') NOT NULL DEFAULT 'ACTIVE';

  /* =========================
     STORES
     ========================= */
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'stores' AND column_name = 'phone'
  ) THEN
    ALTER TABLE stores ADD COLUMN phone VARCHAR(20) NULL AFTER store_name;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'stores' AND column_name = 'open_time'
  ) THEN
    ALTER TABLE stores ADD COLUMN open_time TIME NULL AFTER description;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'stores' AND column_name = 'close_time'
  ) THEN
    ALTER TABLE stores ADD COLUMN close_time TIME NULL AFTER open_time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'stores' AND column_name = 'service_types'
  ) THEN
    ALTER TABLE stores ADD COLUMN service_types TEXT NULL AFTER google_rating;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'stores' AND column_name = 'rating_avg'
  ) THEN
    ALTER TABLE stores ADD COLUMN rating_avg FLOAT DEFAULT 0 AFTER service_types;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'stores' AND column_name = 'total_reviews'
  ) THEN
    ALTER TABLE stores ADD COLUMN total_reviews INT DEFAULT 0 AFTER rating_avg;
  END IF;

  UPDATE stores
  SET status = CASE
    WHEN LOWER(COALESCE(status, '')) = 'approved' THEN 'approved'
    WHEN LOWER(COALESCE(status, '')) = 'rejected' THEN 'rejected'
    ELSE 'pending'
  END
  WHERE id > 0;

  ALTER TABLE stores
    MODIFY COLUMN google_rating FLOAT NULL DEFAULT 0,
    MODIFY COLUMN status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending';

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'stores' AND index_name = 'idx_store_location'
  ) THEN
    CREATE INDEX idx_store_location ON stores(latitude, longitude);
  END IF;

  /* =========================
     REPAIR REQUESTS
     ========================= */
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'repair_requests' AND column_name = 'phone'
  ) THEN
    ALTER TABLE repair_requests ADD COLUMN phone VARCHAR(20) NULL AFTER longitude;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'repair_requests' AND column_name = 'desired_date'
  ) THEN
    ALTER TABLE repair_requests ADD COLUMN desired_date DATE NULL AFTER phone;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'repair_requests' AND column_name = 'service_mode'
  ) THEN
    ALTER TABLE repair_requests ADD COLUMN service_mode VARCHAR(100) NULL AFTER desired_date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'repair_requests' AND column_name = 'device_type'
  ) THEN
    ALTER TABLE repair_requests ADD COLUMN device_type VARCHAR(100) NULL AFTER service_mode;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'repair_requests' AND column_name = 'brand'
  ) THEN
    ALTER TABLE repair_requests ADD COLUMN brand VARCHAR(100) NULL AFTER device_type;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'repair_requests' AND column_name = 'model'
  ) THEN
    ALTER TABLE repair_requests ADD COLUMN model VARCHAR(100) NULL AFTER brand;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'repair_requests' AND column_name = 'symptoms'
  ) THEN
    ALTER TABLE repair_requests ADD COLUMN symptoms TEXT NULL AFTER model;
  END IF;

  UPDATE repair_requests
  SET status = CASE
    WHEN UPPER(COALESCE(status, '')) = 'QUOTED' THEN 'QUOTED'
    WHEN UPPER(COALESCE(status, '')) = 'IN_PROGRESS' THEN 'IN_PROGRESS'
    WHEN UPPER(COALESCE(status, '')) = 'COMPLETED' THEN 'COMPLETED'
    WHEN UPPER(COALESCE(status, '')) = 'CANCELLED' THEN 'CANCELLED'
    ELSE 'OPEN'
  END
  WHERE id > 0;

  ALTER TABLE repair_requests
    MODIFY COLUMN status ENUM('OPEN','QUOTED','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'OPEN';

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'repair_requests' AND index_name = 'idx_request_location'
  ) THEN
    CREATE INDEX idx_request_location ON repair_requests(latitude, longitude);
  END IF;

  /* =========================
     SERVICE CATEGORIES + DEVICES
     ========================= */
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'service_categories'
  ) THEN
    CREATE TABLE service_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'service_categories' AND column_name = 'name'
  ) THEN
    DELETE sc1 FROM service_categories sc1
    INNER JOIN service_categories sc2
      ON sc1.name = sc2.name
     AND sc1.id > sc2.id;

    ALTER TABLE service_categories MODIFY COLUMN name VARCHAR(100) NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'service_categories'
      AND column_name = 'name'
      AND non_unique = 0
  ) THEN
    CREATE UNIQUE INDEX uq_service_categories_name ON service_categories(name);
  END IF;

  INSERT INTO service_categories (name)
  SELECT 'Phone'
  WHERE NOT EXISTS (SELECT 1 FROM service_categories WHERE name = 'Phone');

  INSERT INTO service_categories (name)
  SELECT 'Laptop'
  WHERE NOT EXISTS (SELECT 1 FROM service_categories WHERE name = 'Laptop');

  INSERT INTO service_categories (name)
  SELECT 'Tablet'
  WHERE NOT EXISTS (SELECT 1 FROM service_categories WHERE name = 'Tablet');

  INSERT INTO service_categories (name)
  SELECT 'Smart Device'
  WHERE NOT EXISTS (SELECT 1 FROM service_categories WHERE name = 'Smart Device');

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'devices' AND column_name = 'category'
  ) THEN
    ALTER TABLE devices ADD COLUMN category VARCHAR(100) NULL AFTER name;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'devices' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE devices ADD COLUMN category_id INT NULL AFTER category;
  END IF;

  INSERT INTO service_categories (name)
  SELECT DISTINCT TRIM(d.category)
  FROM devices d
  LEFT JOIN service_categories sc ON sc.name = TRIM(d.category)
  WHERE d.category IS NOT NULL
    AND TRIM(d.category) <> ''
    AND sc.id IS NULL;

  UPDATE devices
  SET category = 'Phone'
  WHERE id > 0 AND category IN ('Điện thoại', 'phone', 'PHONE');

  UPDATE devices
  SET category = 'Laptop'
  WHERE id > 0 AND category IN ('Máy tính', 'Laptop', 'LAPTOP', 'laptop');

  UPDATE devices
  SET category = 'Tablet'
  WHERE id > 0 AND category IN ('Máy tính bảng', 'tablet', 'TABLET');

  UPDATE devices
  SET category = 'Smart Device'
  WHERE id > 0 AND category IN ('Smart device', 'Thiết bị thông minh');

  UPDATE devices d
  LEFT JOIN service_categories sc ON sc.name = TRIM(d.category)
  SET d.category_id = sc.id
  WHERE d.id > 0
    AND d.category_id IS NULL
    AND d.category IS NOT NULL
    AND TRIM(d.category) <> '';

  UPDATE devices d
  LEFT JOIN service_categories sc ON sc.id = d.category_id
  SET d.category = sc.name
  WHERE d.id > 0
    AND (d.category IS NULL OR TRIM(d.category) = '')
    AND d.category_id IS NOT NULL;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE()
      AND table_name = 'devices'
      AND column_name = 'category_id'
      AND referenced_table_name = 'service_categories'
      AND referenced_column_name = 'id'
  ) THEN
    ALTER TABLE devices
      ADD CONSTRAINT fk_devices_category
      FOREIGN KEY (category_id) REFERENCES service_categories(id);
  END IF;

  /* =========================
     ORDERS / PAYMENTS / NOTIFICATIONS
     ========================= */
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN user_id INT NULL AFTER quote_id;
  END IF;

  UPDATE orders
  SET status = CASE
    WHEN UPPER(COALESCE(status, '')) = 'IN_PROGRESS' THEN 'IN_PROGRESS'
    WHEN UPPER(COALESCE(status, '')) = 'COMPLETED' THEN 'COMPLETED'
    WHEN UPPER(COALESCE(status, '')) = 'CANCELLED' THEN 'CANCELLED'
    ELSE 'WAITING'
  END
  WHERE id > 0;

  ALTER TABLE orders
    MODIFY COLUMN status ENUM('WAITING','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'WAITING';

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE()
      AND table_name = 'orders'
      AND column_name = 'user_id'
      AND referenced_table_name = 'users'
      AND referenced_column_name = 'id'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'payments' AND column_name = 'payment_type'
  ) THEN
    ALTER TABLE payments
      ADD COLUMN payment_type ENUM('DEPOSIT','FULL') DEFAULT 'FULL' AFTER payment_method;
  END IF;

  UPDATE payments
  SET status = CASE
    WHEN UPPER(COALESCE(status, '')) = 'PAID' THEN 'PAID'
    WHEN UPPER(COALESCE(status, '')) = 'FAILED' THEN 'FAILED'
    WHEN UPPER(COALESCE(status, '')) = 'REFUNDED' THEN 'REFUNDED'
    ELSE 'PENDING'
  END
  WHERE id > 0;

  ALTER TABLE payments
    MODIFY COLUMN status ENUM('PENDING','PAID','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING';

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'notifications' AND column_name = 'sender_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN sender_id INT NULL AFTER user_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE()
      AND table_name = 'notifications'
      AND column_name = 'sender_id'
      AND referenced_table_name = 'users'
      AND referenced_column_name = 'id'
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT fk_notifications_sender FOREIGN KEY (sender_id) REFERENCES users(id);
  END IF;

  /* =========================
     PRODUCTS
     ========================= */
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'products'
  ) THEN
    CREATE TABLE products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(100) NULL,
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      image LONGTEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_products_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE products ADD COLUMN user_id INT NOT NULL AFTER id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'name'
  ) THEN
    ALTER TABLE products ADD COLUMN name VARCHAR(255) NOT NULL AFTER user_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'type'
  ) THEN
    ALTER TABLE products ADD COLUMN type VARCHAR(100) NULL AFTER name;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'price'
  ) THEN
    ALTER TABLE products ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER type;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'image'
  ) THEN
    ALTER TABLE products ADD COLUMN image LONGTEXT NULL AFTER price;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE products ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER image;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE()
      AND table_name = 'products'
      AND column_name = 'user_id'
      AND referenced_table_name = 'users'
      AND referenced_column_name = 'id'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT fk_products_user FOREIGN KEY (user_id) REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'products' AND index_name = 'idx_products_user'
  ) THEN
    CREATE INDEX idx_products_user ON products(user_id);
  END IF;
END $$

CALL patch_iems_db() $$
DROP PROCEDURE patch_iems_db $$

DELIMITER ;

SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;
SET FOREIGN_KEY_CHECKS = 1;
