DROP DATABASE iems_db;
CREATE DATABASE iems_db;
USE iems_db;

CREATE TABLE users (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100),
 email VARCHAR(100) UNIQUE,
 password VARCHAR(255),
 phone VARCHAR(20),
 role ENUM('USER','STORE','ADMIN'),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stores (
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT,
 store_name VARCHAR(255),
 description TEXT,
 address VARCHAR(255),
 latitude DOUBLE,
 longitude DOUBLE,
 google_maps_link TEXT,
 google_rating FLOAT,
 status ENUM('pending','approved','rejected'),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE devices (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100),
 category VARCHAR(100)
);

CREATE TABLE repair_requests (
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT,
 device_id INT,

 title VARCHAR(255),
 description TEXT,
 budget DECIMAL(10,2),

 location VARCHAR(255),
 latitude DOUBLE,
 longitude DOUBLE,

 status ENUM('OPEN','QUOTED','IN_PROGRESS','COMPLETED','CANCELLED'),

 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (user_id) REFERENCES users(id),
 FOREIGN KEY (device_id) REFERENCES devices(id)
);

CREATE TABLE request_images (
 id INT AUTO_INCREMENT PRIMARY KEY,
 request_id INT,
 image_url TEXT,

 FOREIGN KEY (request_id) REFERENCES repair_requests(id)
);

CREATE TABLE quotes (
 id INT AUTO_INCREMENT PRIMARY KEY,

 request_id INT,
 store_id INT,

 price DECIMAL(10,2),
 message TEXT,
 estimated_time VARCHAR(100),

 status ENUM('PENDING','ACCEPTED','REJECTED'),

 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (request_id) REFERENCES repair_requests(id),
 FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE orders (
 id INT AUTO_INCREMENT PRIMARY KEY,

 request_id INT,
 store_id INT,
 quote_id INT,

 final_price DECIMAL(10,2),

 status ENUM('WAITING','IN_PROGRESS','COMPLETED','CANCELLED'),

 start_time DATETIME,
 end_time DATETIME,

 FOREIGN KEY (request_id) REFERENCES repair_requests(id),
 FOREIGN KEY (store_id) REFERENCES stores(id),
 FOREIGN KEY (quote_id) REFERENCES quotes(id)
);

CREATE TABLE reviews (
 id INT AUTO_INCREMENT PRIMARY KEY,

 order_id INT,
 user_id INT,
 store_id INT,

 rating INT,
 comment TEXT,

 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (order_id) REFERENCES orders(id),
 FOREIGN KEY (user_id) REFERENCES users(id),
 FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE subscriptions (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(50),
 price DECIMAL(10,2),
 job_delay_minutes INT
);

CREATE TABLE store_subscriptions (
 id INT AUTO_INCREMENT PRIMARY KEY,
 store_id INT,
 subscription_id INT,
 start_date DATE,
 end_date DATE,

 FOREIGN KEY (store_id) REFERENCES stores(id),
 FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

CREATE TABLE payments (
 id INT AUTO_INCREMENT PRIMARY KEY,

 order_id INT,
 user_id INT,
 store_id INT,

 amount DECIMAL(10,2),
 payment_method ENUM('CASH','MOMO','VNPAY','BANK_TRANSFER'),

 status ENUM('PENDING','PAID','FAILED','REFUNDED'),

 transaction_code VARCHAR(255),

 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (order_id) REFERENCES orders(id),
 FOREIGN KEY (user_id) REFERENCES users(id),
 FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE notifications (
 id INT AUTO_INCREMENT PRIMARY KEY,

 user_id INT,
 title VARCHAR(255),
 message TEXT,

 type ENUM('QUOTE','ORDER','SYSTEM','PAYMENT'),

 is_read BOOLEAN DEFAULT FALSE,

 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE ai_diagnosis_logs (
 id INT AUTO_INCREMENT PRIMARY KEY,

 user_id INT,
 device_id INT,

 user_description TEXT,
 ai_diagnosis TEXT,
 estimated_price DECIMAL(10,2),

 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (user_id) REFERENCES users(id),
 FOREIGN KEY (device_id) REFERENCES devices(id)
);