-- ============================================================
--  IEMS DATABASE - COMPLETE SCRIPT (ĐÃ CẬP NHẬT THỢ & BÁO CÁO)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES    = 0;

-- ============================================================
--  1. DATABASE
-- ============================================================
DROP DATABASE IF EXISTS iems_db;
CREATE DATABASE iems_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE iems_db;

-- ============================================================
--  2. USERS
-- ============================================================
CREATE TABLE users (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(100),
  email               VARCHAR(100) UNIQUE,
  password            VARCHAR(255),
  google_id           VARCHAR(255)  NULL,
  reset_token         VARCHAR(255)  NULL,
  reset_token_expire  DATETIME      NULL,
  phone               VARCHAR(20),
  role                ENUM('USER','STORE','ADMIN') NULL DEFAULT NULL,
  status              ENUM('ACTIVE','BLOCKED','PENDING') NOT NULL DEFAULT 'ACTIVE',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  3. SERVICE CATEGORIES
-- ============================================================
CREATE TABLE service_categories (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_service_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO service_categories (name) VALUES
  ('Phone'),
  ('Laptop'),
  ('Tablet'),
  ('Smart Device');

-- ============================================================
--  4. DEVICES
-- ============================================================
CREATE TABLE devices (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100),
  category     VARCHAR(100),
  category_id  INT NULL,
  CONSTRAINT fk_devices_category FOREIGN KEY (category_id) REFERENCES service_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  5. STORES
-- ============================================================
CREATE TABLE stores (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT,
  store_name       VARCHAR(255),
  phone            VARCHAR(20)   NULL,
  description      TEXT,
  open_time        TIME          NULL,
  close_time       TIME          NULL,
  address          VARCHAR(255),
  latitude         DOUBLE,
  longitude        DOUBLE,
  google_maps_link TEXT,
  google_rating    FLOAT         NULL DEFAULT 0,
  service_types    TEXT          NULL,
  rating_avg       FLOAT         DEFAULT 0,
  total_reviews    INT           DEFAULT 0,
  status           ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_stores_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_store_location ON stores(latitude, longitude);

-- ============================================================
--  5.5 EMPLOYEES (🚀 ĐÃ THÊM MỚI: BẢNG NHÂN VIÊN/THỢ SỬA CHỮA)
-- ============================================================
CREATE TABLE employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    password VARCHAR(255) DEFAULT 'abc123',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_employees_store FOREIGN KEY (store_id) REFERENCES stores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  6. REPAIR REQUESTS (🚀 ĐÃ CẬP NHẬT THÊM EMPLOYEE_ID & NOTE)
-- ============================================================
CREATE TABLE repair_requests (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT,
  device_id    INT,
  title        VARCHAR(255),
  description  TEXT,
  budget       DECIMAL(10,2),
  location     VARCHAR(255),
  latitude     DOUBLE,
  longitude    DOUBLE,
  phone        VARCHAR(20)   NULL,
  desired_date DATE          NULL,
  service_mode VARCHAR(100)  NULL,
  device_type  VARCHAR(100)  NULL,
  brand        VARCHAR(100)  NULL,
  model        VARCHAR(100)  NULL,
  symptoms     TEXT          NULL,
  status       ENUM('OPEN','QUOTED','IN_PROGRESS','COMPLETED','CANCELLED', 'REJECTED') NOT NULL DEFAULT 'OPEN',
  
  -- 2 Cột mới để chia đơn cho thợ
  employee_id INT NULL,
  technician_note TEXT NULL,
  
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_repair_requests_user   FOREIGN KEY (user_id)   REFERENCES users(id),
  CONSTRAINT fk_repair_requests_device FOREIGN KEY (device_id) REFERENCES devices(id),
  CONSTRAINT fk_repair_requests_emp    FOREIGN KEY (employee_id) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_request_location ON repair_requests(latitude, longitude);

-- ============================================================
--  7. REQUEST IMAGES
-- ============================================================
CREATE TABLE request_images (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  request_id  INT,
  image_url   TEXT,

  CONSTRAINT fk_request_images_request FOREIGN KEY (request_id) REFERENCES repair_requests(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  8. QUOTES
-- ============================================================
CREATE TABLE quotes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  request_id      INT,
  store_id        INT,
  price           DECIMAL(10,2),
  message         TEXT,
  estimated_time  VARCHAR(100),
  status          ENUM('PENDING','ACCEPTED','REJECTED') NOT NULL DEFAULT 'PENDING',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_quotes_request FOREIGN KEY (request_id) REFERENCES repair_requests(id),
  CONSTRAINT fk_quotes_store   FOREIGN KEY (store_id)   REFERENCES stores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  9. ORDERS
-- ============================================================
CREATE TABLE orders (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  request_id   INT,
  store_id     INT,
  quote_id     INT,
  user_id      INT  NULL,
  final_price  DECIMAL(10,2),
  status       ENUM('WAITING','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'WAITING',
  start_time   DATETIME,
  end_time     DATETIME,

  CONSTRAINT fk_orders_request FOREIGN KEY (request_id) REFERENCES repair_requests(id),
  CONSTRAINT fk_orders_store   FOREIGN KEY (store_id)   REFERENCES stores(id),
  CONSTRAINT fk_orders_quote   FOREIGN KEY (quote_id)   REFERENCES quotes(id),
  CONSTRAINT fk_orders_user    FOREIGN KEY (user_id)    REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  10. REVIEWS
-- ============================================================
CREATE TABLE reviews (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   INT,
  user_id    INT,
  store_id   INT,
  rating     INT,
  comment    TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_reviews_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_reviews_user  FOREIGN KEY (user_id)  REFERENCES users(id),
  CONSTRAINT fk_reviews_store FOREIGN KEY (store_id) REFERENCES stores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  11. SUBSCRIPTIONS
-- ============================================================
CREATE TABLE subscriptions (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  name               VARCHAR(50),
  price              DECIMAL(10,2),
  job_delay_minutes  INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  12. STORE SUBSCRIPTIONS
-- ============================================================
CREATE TABLE store_subscriptions (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  store_id         INT,
  subscription_id  INT,
  start_date       DATE,
  end_date         DATE,

  CONSTRAINT fk_store_subs_store FOREIGN KEY (store_id)        REFERENCES stores(id),
  CONSTRAINT fk_store_subs_sub   FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  13. PAYMENTS
-- ============================================================
CREATE TABLE payments (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  order_id         INT,
  user_id          INT,
  store_id         INT,
  amount           DECIMAL(10,2),
  payment_method   ENUM('CASH','MOMO','VNPAY','BANK_TRANSFER'),
  payment_type     ENUM('DEPOSIT','FULL') DEFAULT 'FULL',
  status           ENUM('PENDING','PAID','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  transaction_code VARCHAR(255),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_payments_user  FOREIGN KEY (user_id)  REFERENCES users(id),
  CONSTRAINT fk_payments_store FOREIGN KEY (store_id) REFERENCES stores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  14. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT,
  sender_id  INT  NULL,
  title      VARCHAR(255),
  message    TEXT,
  type       ENUM('QUOTE','ORDER','SYSTEM','PAYMENT'),
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notifications_user   FOREIGN KEY (user_id)   REFERENCES users(id),
  CONSTRAINT fk_notifications_sender FOREIGN KEY (sender_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  15. AI DIAGNOSIS LOGS
-- ============================================================
CREATE TABLE ai_diagnosis_logs (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT,
  device_id        INT,
  user_description TEXT,
  ai_diagnosis     TEXT,
  estimated_price  DECIMAL(10,2),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_ai_logs_user   FOREIGN KEY (user_id)   REFERENCES users(id),
  CONSTRAINT fk_ai_logs_device FOREIGN KEY (device_id) REFERENCES devices(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  16. PRODUCTS
-- ============================================================
CREATE TABLE products (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  name       VARCHAR(255) NOT NULL,
  type       VARCHAR(100) NULL,
  price      DECIMAL(10,2) NOT NULL DEFAULT 0,
  image      LONGTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_products_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_products_user ON products(user_id);

-- ============================================================
--  DONE
-- ============================================================
SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES    = 1;

SELECT 'iems_db created successfully!' AS result;