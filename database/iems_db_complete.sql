-- ============================================================
--  IEMS DATABASE - COMPLETE SCRIPT + CHAT
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES   = 0;

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
--  5.5 EMPLOYEES
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
--  6. REPAIR REQUESTS
-- ============================================================
CREATE TABLE repair_requests (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT,
  store_id        INT NULL,
  device_id       INT,
  title           VARCHAR(255),
  description     TEXT,
  image           LONGTEXT NULL,
  budget          DECIMAL(10,2),
  location        VARCHAR(255),
  latitude        DOUBLE,
  longitude       DOUBLE,
  phone           VARCHAR(20)   NULL,
  desired_date    DATE          NULL,
  service_mode    VARCHAR(100)  NULL,
  device_type     VARCHAR(100)  NULL,
  brand           VARCHAR(100)  NULL,
  model           VARCHAR(100)  NULL,
  symptoms        TEXT          NULL,
  status          ENUM('OPEN','QUOTED','IN_PROGRESS','WAITING_STORE_CONFIRM','WAITING_CUSTOMER_CONFIRM','COMPLETED','CANCELLED','REJECTED') NOT NULL DEFAULT 'OPEN',
  employee_id     INT NULL,
  technician_note TEXT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_repair_requests_user   FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_repair_requests_store  FOREIGN KEY (store_id) REFERENCES stores(id),
  CONSTRAINT fk_repair_requests_device FOREIGN KEY (device_id) REFERENCES devices(id),
  CONSTRAINT fk_repair_requests_emp    FOREIGN KEY (employee_id) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_request_location ON repair_requests(latitude, longitude);

-- ============================================================
--  6.5 CHAT CONVERSATIONS
-- ============================================================
CREATE TABLE chat_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  repair_request_id INT NOT NULL UNIQUE,
  user_id INT NOT NULL,
  store_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_chat_conversations_request FOREIGN KEY (repair_request_id) REFERENCES repair_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_conversations_user    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_conversations_store   FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_chat_conversations_user  ON chat_conversations(user_id);
CREATE INDEX idx_chat_conversations_store ON chat_conversations(store_id);

-- ============================================================
--  6.6 CHAT MESSAGES
-- ============================================================
CREATE TABLE chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_role ENUM('user', 'store') NOT NULL,
  sender_id INT NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_chat_messages_conversation FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_chat_messages_conversation_created ON chat_messages(conversation_id, created_at);
CREATE INDEX idx_chat_messages_is_read ON chat_messages(is_read);

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
  CONSTRAINT fk_quotes_store   FOREIGN KEY (store_id) REFERENCES stores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  9. ORDERS
-- ============================================================
CREATE TABLE orders (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  request_id   INT,
  store_id     INT,
  quote_id     INT,
  user_id      INT NULL,
  final_price  DECIMAL(10,2),
  status       ENUM('WAITING','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'WAITING',
  start_time   DATETIME,
  end_time     DATETIME,

  CONSTRAINT fk_orders_request FOREIGN KEY (request_id) REFERENCES repair_requests(id),
  CONSTRAINT fk_orders_store   FOREIGN KEY (store_id) REFERENCES stores(id),
  CONSTRAINT fk_orders_quote   FOREIGN KEY (quote_id) REFERENCES quotes(id),
  CONSTRAINT fk_orders_user    FOREIGN KEY (user_id) REFERENCES users(id)
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
  CONSTRAINT fk_reviews_user  FOREIGN KEY (user_id) REFERENCES users(id),
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

  CONSTRAINT fk_store_subs_store FOREIGN KEY (store_id) REFERENCES stores(id),
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
  CONSTRAINT fk_payments_user  FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_payments_store FOREIGN KEY (store_id) REFERENCES stores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  14. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT,
  sender_id  INT NULL,
  title      VARCHAR(255),
  message    TEXT,
  type       ENUM('QUOTE','ORDER','SYSTEM','PAYMENT'),
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notifications_user   FOREIGN KEY (user_id) REFERENCES users(id),
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

  CONSTRAINT fk_ai_logs_user   FOREIGN KEY (user_id) REFERENCES users(id),
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
--  17. ALTER FOR OLD DATABASES ONLY
--  Chỉ chạy đoạn này nếu bạn KHÔNG drop DB mà chỉ sửa DB cũ
-- ============================================================
ALTER TABLE repair_requests
MODIFY COLUMN status ENUM(
  'OPEN',
  'QUOTED',
  'IN_PROGRESS',
  'WAITING_STORE_CONFIRM',
  'WAITING_CUSTOMER_CONFIRM',
  'COMPLETED',
  'CANCELLED',
  'REJECTED'
) NOT NULL DEFAULT 'OPEN';

SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES   = 1;

SELECT 'iems_db created successfully with chat tables!' AS result;
-- ============================================================
--  18. PROMOTION CAMPAIGNS / ANALYTICS / ADMIN APPROVAL
-- ============================================================
CREATE TABLE IF NOT EXISTS promotion_campaigns (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  store_id               INT NOT NULL,
  requested_by           INT NULL,
  title                  VARCHAR(255) NOT NULL,
  message                TEXT NOT NULL,
  status                 ENUM('PENDING_APPROVAL','APPROVED','SCHEDULED','SENDING','SENT','REJECTED','FAILED') NOT NULL DEFAULT 'PENDING_APPROVAL',
  scheduled_at           DATETIME NULL,
  monthly_limit_snapshot INT NOT NULL DEFAULT 0,
  requested_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by            INT NULL,
  approved_at            DATETIME NULL,
  rejected_reason        TEXT NULL,
  sent_at                DATETIME NULL,
  recipients_count       INT NOT NULL DEFAULT 0,
  last_error             TEXT NULL,

  CONSTRAINT fk_promotion_campaign_store     FOREIGN KEY (store_id) REFERENCES stores(id),
  CONSTRAINT fk_promotion_campaign_requester FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_promotion_campaign_approver  FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS promotion_campaign_recipients (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  campaign_id     INT NOT NULL,
  user_id         INT NOT NULL,
  notification_id INT NULL,
  delivered_at    DATETIME NULL,
  opened_at       DATETIME NULL,
  clicked_at      DATETIME NULL,

  CONSTRAINT fk_promotion_recipients_campaign     FOREIGN KEY (campaign_id) REFERENCES promotion_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_promotion_recipients_user         FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY uk_promotion_recipients_campaign_user (campaign_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- MySQL Workbench / MySQL versions may not support: ADD COLUMN IF NOT EXISTS
-- So use INFORMATION_SCHEMA + dynamic SQL to avoid Error 1064 and duplicate-column errors.

SET @sql = (
  SELECT IF(COUNT(*) > 0,
    'SELECT ''campaign_id already exists'' AS info',
    'ALTER TABLE notifications ADD COLUMN campaign_id INT NULL AFTER sender_id'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'notifications'
    AND COLUMN_NAME = 'campaign_id'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) > 0,
    'SELECT ''target_page already exists'' AS info',
    'ALTER TABLE notifications ADD COLUMN target_page VARCHAR(50) NULL AFTER campaign_id'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'notifications'
    AND COLUMN_NAME = 'target_page'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) > 0,
    'SELECT ''related_request_id already exists'' AS info',
    'ALTER TABLE notifications ADD COLUMN related_request_id INT NULL AFTER target_page'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'notifications'
    AND COLUMN_NAME = 'related_request_id'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
