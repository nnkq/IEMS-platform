-- ============================================================
--  IEMS DATABASE - SEED DATA
--  Created: 2026-05-06
--  Description: Comprehensive sample data for development and testing
--  Database: iems_db (CORRECTED)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES    = 0;
USE iems_db;

-- ============================================================
--  0. CLEAR EXISTING DATA (to avoid duplicate key errors)
-- ============================================================
DELETE FROM promotion_campaign_recipients;
DELETE FROM promotion_campaigns;
DELETE FROM notifications;
DELETE FROM payments;
DELETE FROM reviews;
DELETE FROM orders;
DELETE FROM quotes;
DELETE FROM request_images;
DELETE FROM chat_messages;
DELETE FROM chat_conversations;
DELETE FROM repair_requests;
DELETE FROM store_subscriptions;
DELETE FROM subscriptions;
DELETE FROM products;
DELETE FROM ai_diagnosis_logs;
DELETE FROM employees;
DELETE FROM stores;
DELETE FROM devices;
DELETE FROM service_categories;
DELETE FROM users;

-- ============================================================
--  1. USERS - Sample data
--  Password: 123456 (all accounts)
--  Bcrypt hash: $2b$10$Ez79R.SRQKxOLOcIN/D9X.c.YhZ54UtebYmg85kH7thtbmAorTkgG
-- ============================================================
INSERT INTO users (name, email, password, google_id, phone, role, status) VALUES
('Admin User', 'admin@example.com', '$2b$10$Ez79R.SRQKxOLOcIN/D9X.c.YhZ54UtebYmg85kH7thtbmAorTkgG', NULL, '0901234567', 'ADMIN', 'ACTIVE'),
('Nguyễn Văn A', 'user1@example.com', '$2b$10$Ez79R.SRQKxOLOcIN/D9X.c.YhZ54UtebYmg85kH7thtbmAorTkgG', 'user1_google', '0902345678', 'USER', 'ACTIVE'),
('Trần Thị B', 'user2@example.com', '$2b$10$Ez79R.SRQKxOLOcIN/D9X.c.YhZ54UtebYmg85kH7thtbmAorTkgG', 'user2_google', '0903456789', 'USER', 'ACTIVE'),
('Phạm Văn C', 'user3@example.com', '$2b$10$Ez79R.SRQKxOLOcIN/D9X.c.YhZ54UtebYmg85kH7thtbmAorTkgG', 'user3_google', '0904567890', 'USER', 'ACTIVE'),
('Lê Thị D', 'store1@example.com', '$2b$10$Ez79R.SRQKxOLOcIN/D9X.c.YhZ54UtebYmg85kH7thtbmAorTkgG', NULL, '0905678901', 'STORE', 'ACTIVE'),
('Hoàng Văn E', 'store2@example.com', '$2b$10$Ez79R.SRQKxOLOcIN/D9X.c.YhZ54UtebYmg85kH7thtbmAorTkgG', NULL, '0906789012', 'STORE', 'ACTIVE'),
('Đặng Thị F', 'store3@example.com', '$2b$10$Ez79R.SRQKxOLOcIN/D9X.c.YhZ54UtebYmg85kH7thtbmAorTkgG', NULL, '0907890123', 'STORE', 'ACTIVE'),
('Bùi Văn G', 'user4@example.com', '$2b$10$Ez79R.SRQKxOLOcIN/D9X.c.YhZ54UtebYmg85kH7thtbmAorTkgG', NULL, '0908901234', 'USER', 'ACTIVE');

-- ============================================================
--  2. SERVICE CATEGORIES - Sample data
-- ============================================================
-- Already inserted in schema, but ensuring proper data:
INSERT IGNORE INTO service_categories (name) VALUES
  ('Phone'),
  ('Laptop'),
  ('Tablet'),
  ('Smart Device');

-- ============================================================
--  3. DEVICES - Sample data
-- ============================================================
INSERT INTO devices (name, category_id) VALUES
('iPhone 13', 1),
('iPhone 14', 1),
('Samsung Galaxy S21', 1),
('Samsung Galaxy A12', 1),
('MacBook Pro M1', 2),
('Dell XPS 13', 2),
('Asus VivoBook', 2),
('HP Pavilion', 2),
('iPad Air 5', 3),
('Samsung Galaxy Tab S7', 3),
('Apple Watch Series 7', 4),
('Xiaomi Band 6', 4);

-- ============================================================
--  4. STORES - Sample data
-- ============================================================
INSERT INTO stores (user_id, store_name, phone, description, open_time, close_time, address, latitude, longitude, google_rating, rating_avg, total_reviews, status) VALUES
(5, 'Tech Fix Hà Nội', '0905678901', 'Cửa hàng sửa chữa điện thoại và laptop uy tín tại Hà Nội', '08:00:00', '20:00:00', '123 Đường Tây Sơn, Quận Đống Đa, Hà Nội', 21.0085, 105.8470, 4.5, 4.3, 45, 'APPROVED'),
(6, 'Phone Repair Center', '0906789012', 'Chuyên sửa chữa điện thoại di động', '07:30:00', '21:00:00', '456 Nguyễn Huệ, Quận 1, TP.HCM', 10.7769, 106.7009, 4.8, 4.7, 62, 'APPROVED'),
(7, 'Laptop Care', '0907890123', 'Sửa chữa máy tính xách tay chuyên nghiệp', '09:00:00', '18:00:00', '789 Trần Hưng Đạo, Quận 5, TP.HCM', 10.7538, 106.6789, 4.6, 4.5, 38, 'APPROVED');

-- ============================================================
--  5. EMPLOYEES - Sample data
-- ============================================================
INSERT INTO employees (store_id, name, specialty, phone, password) VALUES
(1, 'Nguyễn Thành Trung', 'iPhone Repair', '0921345678', 'emp123'),
(1, 'Trần Minh Huy', 'Laptop Repair', '0921345679', 'emp123'),
(2, 'Lê Đức Mạnh', 'All Device Repair', '0921345680', 'emp123'),
(2, 'Phạm Thanh Tùng', 'Phone Specialist', '0921345681', 'emp123'),
(3, 'Hoàng Quốc Anh', 'Laptop Specialist', '0921345682', 'emp123'),
(3, 'Bùi Sỹ Thành', 'General Repair', '0921345683', 'emp123');

-- ============================================================
--  7. REPAIR REQUESTS - Sample data (Updated with more variety)
-- ============================================================
INSERT INTO repair_requests (user_id, store_id, device_id, title, description, budget, location, latitude, longitude, phone, desired_date, device_type, brand, model, symptoms, status, employee_id, created_at) VALUES
(2, 1, 1, 'iPhone 13 không bật được', 'Điện thoại của em không bật được, em muốn được kiểm tra và sửa chữa', 2000000, '123 Cầu Diễn, Quận Ba Đình, Hà Nội', 21.0295, 105.8183, '0902345678', '2026-05-10', 'PHONE', 'Apple', 'iPhone 13', 'Không bật được, có thể pin hết', 'OPEN', NULL, '2026-05-06 08:00:00'),
(3, 1, 5, 'Màn hình MacBook Pro bị hỏng', 'Màn hình bị sáng không đều, có vết sáng trong suốt, cần sửa chữa', 8000000, '456 Thái Thân, Quận Đống Đa, Hà Nội', 21.0145, 105.8295, '0903456789', '2026-05-12', 'LAPTOP', 'Apple', 'MacBook Pro', 'Màn hình bị hỏng', 'QUOTED', 1, '2026-05-05 10:00:00'),
(2, 1, 7, 'Asus VivoBook bị nóng', 'Laptop bị nóng quá, fan chạy rất to, khả năng có bụi hoặc tình trạng tệp hỏng', 3000000, '789 Phố Huế, Quận Hai Bà Trưng, Hà Nội', 21.0062, 105.8425, '0902345678', '2026-05-15', 'LAPTOP', 'Asus', 'VivoBook', 'Nóng, fan to tiếng', 'IN_PROGRESS', 2, '2026-05-04 14:30:00'),
(4, 2, 2, 'iPhone 14 bị vỡ kính', 'Kính phía sau bị vỡ hoàn toàn, cần thay mới', 5000000, '321 Cầu Giấy, Quận Cầu Giấy, Hà Nội', 21.0245, 105.8135, '0904567890', '2026-05-08', 'PHONE', 'Apple', 'iPhone 14', 'Vỡ kính', 'OPEN', NULL, '2026-05-06 09:15:00'),
(3, 2, 3, 'Samsung Galaxy S21 không nhận sạc', 'Điện thoại không nhận sạc, không biết là lỗi cổng hay pin', 1500000, '654 Láng Hạ, Quận Đống Đa, Hà Nội', 21.0175, 105.8345, '0903456789', '2026-05-11', 'PHONE', 'Samsung', 'Galaxy S21', 'Không nhận sạc', 'QUOTED', 3, '2026-05-05 11:20:00'),
(2, 3, 8, 'HP Pavilion chạy chậm', 'Máy chạy chậm hơn bình thường, load ứng dụng lâu', 2500000, '123 Lý Thường Kiệt, Quận Hoàn Kiếm, Hà Nội', 21.0289, 105.8549, '0902345678', '2026-05-13', 'LAPTOP', 'HP', 'Pavilion', 'Chạy chậm', 'QUOTED', 5, '2026-05-03 16:45:00'),
(4, 3, 6, 'Dell XPS 13 pin không tốt', 'Pin chỉ dùng được 3-4 tiếng, cũng không nghe tiếng khác', 2800000, '456 Tô Hiến Thành, Quận Cầu Giấy, Hà Nội', 21.0189, 105.8078, '0904567890', '2026-05-14', 'LAPTOP', 'Dell', 'XPS 13', 'Pin kém', 'WAITING_CUSTOMER_CONFIRM', 6, '2026-05-02 13:00:00'),
(2, 2, 4, 'Samsung Galaxy A12 mất liên kết WiFi', 'Không thể kết nối WiFi được, có tất cả các mạng khác hay sao?', 800000, '789 Nguyễn Thái Học, Quận Ba Đình, Hà Nội', 21.0355, 105.8407, '0902345678', '2026-05-09', 'PHONE', 'Samsung', 'Galaxy A12', 'Mất WiFi', 'COMPLETED', 4, '2026-04-28 10:30:00'),
(3, 1, 9, 'iPad Air 5 bị gẫy pin', 'Cầm được khoảng 1 tiếng rồi hết, cần thay pin', 3500000, '123 Trường Chinh, Quận Thanh Xuân, Hà Nội', 21.0072, 105.8247, '0903456789', '2026-05-16', 'TABLET', 'Apple', 'iPad Air 5', 'Pin gẫy', 'OPEN', NULL, '2026-05-06 07:00:00'),
(4, 2, 10, 'Samsung Galaxy Tab S7 màn hình sáng lúc tắt', 'Màn hình sáng không đều, như có dây nước trong màn hình', 2200000, '456 Hạ Hòa, Quận Đống Đa, Hà Nội', 21.0151, 105.8368, '0904567890', '2026-05-17', 'TABLET', 'Samsung', 'Galaxy Tab S7', 'Màn hình hỏng', 'QUOTED', 3, '2026-05-01 15:20:00'),
(2, 3, 2, 'iPhone 14 rơi nước', 'Rơi vào nước, không bật được, cần khô nước bên trong', 3000000, '789 Khúc Thừa Dụ, Quận Đống Đa, Hà Nội', 21.0215, 105.8256, '0902345678', '2026-05-07', 'PHONE', 'Apple', 'iPhone 14', 'Rơi nước', 'IN_PROGRESS', 1, '2026-04-30 12:15:00');

-- ============================================================
--  8. CHAT CONVERSATIONS - Sample data
-- ============================================================
INSERT INTO chat_conversations (repair_request_id, user_id, store_id, created_at, updated_at) VALUES
(1, 2, 1, '2026-05-06 08:05:00', '2026-05-06 10:30:00'),
(2, 3, 1, '2026-05-05 10:10:00', '2026-05-06 09:45:00'),
(3, 2, 1, '2026-05-04 14:35:00', '2026-05-06 14:20:00'),
(4, 4, 2, '2026-05-06 09:20:00', '2026-05-06 11:00:00'),
(5, 3, 2, '2026-05-05 11:25:00', '2026-05-06 13:15:00'),
(6, 2, 3, '2026-05-03 16:50:00', '2026-05-06 08:00:00'),
(7, 4, 3, '2026-05-02 13:05:00', '2026-05-06 16:30:00'),
(8, 2, 2, '2026-04-28 10:35:00', '2026-05-05 14:45:00'),
(9, 3, 1, '2026-05-06 07:05:00', '2026-05-06 09:20:00'),
(10, 4, 2, '2026-05-01 15:25:00', '2026-05-06 12:10:00');

-- ============================================================
--  9. CHAT MESSAGES - Sample data
-- ============================================================
INSERT INTO chat_messages (conversation_id, sender_role, sender_id, message, is_read, created_at) VALUES
-- Conversation 1 (Request 1)
(1, 'user', 2, 'Xin chào, tôi có iPhone 13 không bật được, bạn có sửa được không?', 1, '2026-05-06 08:05:00'),
(1, 'store', 1, 'Xin chào! Tôi là cửa hàng Tech Fix Hà Nội. Chúng tôi có thể sửa chữa iPhone 13. Bạn nói rõ hơn về vấn đề được không?', 1, '2026-05-06 08:15:00'),
(1, 'user', 2, 'Sáng nay em bật mà không sáng, cả ngày rồi không sáng, pin còn đầy à', 1, '2026-05-06 08:25:00'),
(1, 'store', 1, 'Thường là do pin hết hoặc bo mạch bị lỗi. Bạn có thể mang lên cửa hàng để kiểm tra miễn phí được không?', 1, '2026-05-06 08:30:00'),
(1, 'user', 2, 'Ok, tôi sẽ mang lên ngày mai khoảng 2h chiều được không?', 0, '2026-05-06 10:30:00'),

-- Conversation 2 (Request 2)
(2, 'user', 3, 'Màn hình MacBook Pro của tôi bị sáng không đều, liệu bạn có thể sửa được không?', 1, '2026-05-05 10:10:00'),
(2, 'store', 1, 'Xin chào! Điều này có thể là do LCD hỏng hoặc cáp kết nối bị lỏng. Chúng tôi cần kiểm tra trực tiếp.', 1, '2026-05-05 10:20:00'),
(2, 'user', 3, 'Giá thay màn hình bao nhiêu tiền vậy?', 1, '2026-05-05 10:30:00'),
(2, 'store', 1, 'Tùy vào loại màn hình, khoảng 7-8 triệu. Chúng tôi dùng màn hình zin và bảo hành 6 tháng.', 1, '2026-05-05 10:40:00'),
(2, 'user', 3, 'Ok được, tôi sẽ mang lên sửa chữa. Mấy khi nào có slot sửa?', 0, '2026-05-06 09:45:00'),

-- Conversation 3 (Request 3)
(3, 'user', 2, 'Cửa hàng, laptop của tôi nóng quá, fan chạy siêu to tiếng. Thường là sao vậy?', 1, '2026-05-04 14:35:00'),
(3, 'store', 1, 'Thường là do bụi tích tụ trong quạt hoặc keo tản nhiệt đã hết hiệu quả. Chúng tôi vệ sinh và thay keo mới cho bạn.', 1, '2026-05-04 14:45:00'),
(3, 'user', 2, 'Bao nhiêu tiền vậy? Bao lâu xong?', 1, '2026-05-04 15:00:00'),
(3, 'store', 1, 'Khoảng 2.8 triệu, mất 2-3 ngày thôi. Liệu có được không?', 1, '2026-05-04 15:10:00'),
(3, 'user', 2, 'Ok, tôi đồng ý. Khi nào đem lên được?', 0, '2026-05-06 14:20:00'),

-- Conversation 4 (Request 4)
(4, 'user', 4, 'Xin chào, iPhone 14 của tôi bị vỡ kính phía sau. Cửa hàng có thay được không?', 1, '2026-05-06 09:20:00'),
(4, 'store', 2, 'Xin chào! Chúng tôi Phone Repair Center có thể thay kính zin cho bạn. Giá 4.5 triệu, mất 1 ngày.', 1, '2026-05-06 09:30:00'),
(4, 'user', 4, 'Được, tôi sẽ đem lên ngày mai. Lúc mấy giờ các bạn mở cửa?', 0, '2026-05-06 11:00:00'),

-- Conversation 5 (Request 5)
(5, 'user', 3, 'Samsung Galaxy S21 của tôi không nhận sạc được. Các bạn sửa được không?', 1, '2026-05-05 11:25:00'),
(5, 'store', 2, 'Xin chào! Có thể là lỗi cổng sạc hoặc pin. Chúng tôi kiểm tra miễn phí rồi báo giá cho bạn.', 1, '2026-05-05 11:35:00'),
(5, 'user', 3, 'Ok, tôi sẽ đem lên tuần này. Sửa được thì bao lâu xong?', 1, '2026-05-05 11:45:00'),
(5, 'store', 2, 'Nếu là cổng sạc, khoảng 2 ngày. Nếu là pin, 1 ngày thôi.', 0, '2026-05-06 13:15:00'),

-- Conversation 6 (Request 6)
(6, 'user', 2, 'Cửa hàng, laptop bị chạy chậm, tôi không biết sao. Bạn giúp tôi được không?', 1, '2026-05-03 16:50:00'),
(6, 'store', 3, 'Xin chào từ Laptop Care! Chúng tôi có thể kiểm tra và vệ sinh máy tính cho bạn. Thường là do bụi bên trong.', 1, '2026-05-03 17:00:00'),
(6, 'user', 2, 'Ok, tôi sẽ mang lên cuối tuần này.', 0, '2026-05-06 08:00:00'),

-- Conversation 7 (Request 7)
(7, 'user', 4, 'Pin laptop cũ rồi, chỉ dùng được 3-4 tiếng thôi. Thay được pin mới không?', 1, '2026-05-02 13:05:00'),
(7, 'store', 3, 'Được chứ! Dell XPS 13 chúng tôi có pin. Giá 2.8 triệu, mất 1 ngày.', 1, '2026-05-02 13:15:00'),
(7, 'user', 4, 'Được, tôi sẽ đem lên ngày mai. Bảo hành pin bao lâu?', 0, '2026-05-06 16:30:00'),

-- Conversation 8 (Request 8)
(8, 'user', 2, 'Sao điện thoại Samsung của tôi không nhận WiFi được?', 1, '2026-04-28 10:35:00'),
(8, 'store', 2, 'Có thể là do phần mềm hoặc hardware WiFi bị lỗi. Chúng tôi kiểm tra và fix cho bạn.', 1, '2026-04-28 10:45:00'),
(8, 'user', 2, 'Ok, tôi sẽ mang lên đến cửa hàng', 1, '2026-04-28 11:00:00'),
(8, 'store', 2, 'Được, chúng tôi sẽ hoàn thành trong hôm nay cho bạn.', 0, '2026-05-05 14:45:00'),

-- Conversation 9 (Request 9)
(9, 'user', 3, 'iPad của tôi pin chỉ dùng được 1 tiếng, cần thay pin mới', 1, '2026-05-06 07:05:00'),
(9, 'store', 1, 'Xin chào! Chúng tôi có pin iPad chính hãng. Cần xem trực tiếp để định giá chính xác.', 1, '2026-05-06 07:15:00'),
(9, 'user', 3, 'Ok, tôi sẽ đem lên hôm nay khoảng 3h chiều', 0, '2026-05-06 09:20:00'),

-- Conversation 10 (Request 10)
(10, 'user', 4, 'Màn hình tablet bị sáng lúc tắt, như có nước bên trong vậy', 1, '2026-05-01 15:25:00'),
(10, 'store', 2, 'Đó là hiện tượng dead pixel hoặc độ ẩm cao bên trong. Chúng tôi có thể thay màn hình cho bạn.', 1, '2026-05-01 15:35:00'),
(10, 'user', 4, 'Bao nhiêu tiền? Bao lâu xong?', 1, '2026-05-01 15:45:00'),
(10, 'store', 2, 'Khoảng 2.2 triệu, mất 3-5 ngày. Bạn đồng ý không?', 0, '2026-05-06 12:10:00');

-- ============================================================
--  10. REQUEST IMAGES - Sample data
-- ============================================================
INSERT INTO request_images (request_id, image_url) VALUES
(1, 'https://example.com/images/iphone13-issue1.jpg'),
(1, 'https://example.com/images/iphone13-issue2.jpg'),
(2, 'https://example.com/images/macbook-screen.jpg'),
(3, 'https://example.com/images/asus-ventilation.jpg'),
(4, 'https://example.com/images/iphone14-broken.jpg'),
(5, 'https://example.com/images/samsung-port.jpg'),
(6, 'https://example.com/images/hp-slow.jpg'),
(7, 'https://example.com/images/dell-battery.jpg'),
(8, 'https://example.com/images/samsung-wifi.jpg'),
(9, 'https://example.com/images/ipad-battery.jpg'),
(10, 'https://example.com/images/tablet-screen.jpg'),
(11, 'https://example.com/images/iphone14-water.jpg');

-- ============================================================
--  11. QUOTES - Sample data (Updated)
-- ============================================================
INSERT INTO quotes (request_id, store_id, price, message, estimated_time, status, created_at) VALUES
(1, 1, 1500000, 'Có thể thay pin hoặc sửa bo mạch, cần kiểm tra trực tiếp', '1-2 ngày', 'PENDING', '2026-05-06 08:15:00'),
(1, 2, 1800000, 'Kiểm tra miễn phí, nếu là pin 500k, nếu bo mạch 1.5M', '1-2 ngày', 'PENDING', '2026-05-06 09:00:00'),
(2, 1, 7500000, 'Thay màn hình zin, bảo hành 6 tháng', '3-5 ngày', 'ACCEPTED', '2026-05-05 10:40:00'),
(3, 1, 2800000, 'Vệ sinh bụi, thay keo tản nhiệt và pad tản', '2-3 ngày', 'PENDING', '2026-05-04 14:50:00'),
(4, 2, 4500000, 'Thay kính sau, công nhân lành nghề', '1 ngày', 'PENDING', '2026-05-06 09:35:00'),
(5, 2, 1200000, 'Sửa cổng sạc, bảo hành 3 tháng', '2 ngày', 'PENDING', '2026-05-05 11:40:00'),
(6, 3, 2200000, 'Vệ sinh SSD, cập nhật driver, sạch phần mềm rác', '1-2 ngày', 'PENDING', '2026-05-03 17:00:00'),
(7, 3, 2800000, 'Thay pin OEM chính hãng, bảo hành 24 tháng', '1 ngày', 'ACCEPTED', '2026-05-02 13:20:00'),
(8, 2, 800000, 'Reset phần mềm, cập nhật driver WiFi', '1 ngày', 'ACCEPTED', '2026-04-28 11:05:00'),
(9, 1, 3500000, 'Thay pin iPad chính hãng Apple', '2-3 ngày', 'PENDING', '2026-05-06 07:20:00'),
(10, 2, 2200000, 'Thay màn hình LCD, bảo hành 6 tháng', '3-5 ngày', 'PENDING', '2026-05-01 15:40:00'),
(11, 1, 3000000, 'Khô nước bo mạch, kiểm tra linh kiện', '2-3 ngày', 'PENDING', '2026-04-30 12:30:00');

-- ============================================================
--  12. SUBSCRIPTIONS - Sample data
-- ============================================================
INSERT INTO subscriptions (name, price, job_delay_minutes) VALUES
('Basic', 50000, 60),
('Premium', 150000, 15),
('Pro', 300000, 5);

-- ============================================================
--  13. STORE SUBSCRIPTIONS - Sample data
-- ============================================================
INSERT INTO store_subscriptions (store_id, subscription_id, start_date, end_date) VALUES
(1, 2, '2026-01-01', '2026-12-31'),
(2, 3, '2026-02-01', '2026-12-31'),
(3, 1, '2026-03-01', '2026-12-31');

-- ============================================================
--  14. ORDERS - Sample data (Updated)
-- ============================================================
INSERT INTO orders (request_id, store_id, quote_id, user_id, final_price, status, start_time, end_time) VALUES
(2, 1, 3, 3, 7500000, 'COMPLETED', '2026-04-15 09:00:00', '2026-04-18 16:30:00'),
(3, 1, 3, 2, 2800000, 'IN_PROGRESS', '2026-05-04 14:40:00', NULL),
(7, 3, 7, 4, 2800000, 'WAITING', '2026-05-02 13:25:00', NULL),
(8, 2, 8, 2, 800000, 'COMPLETED', '2026-04-28 10:40:00', '2026-04-28 16:00:00');

-- ============================================================
--  15. REVIEWS - Sample data (Updated)
-- ============================================================
INSERT INTO reviews (order_id, user_id, store_id, rating, comment) VALUES
(1, 3, 1, 5, 'Cửa hàng sửa rất tốt, không bị khô cổng, tốc độ nhanh, giá cả hợp lý. Rất hài lòng!'),
(4, 2, 2, 5, 'Kỹ thuật viên rất tận tình, vệ sinh kỹ càng, máy chạy mượt hơn hôm qua rất nhiều!');

-- ============================================================
--  16. PAYMENTS - Sample data (Updated)
-- ============================================================
INSERT INTO payments (order_id, user_id, store_id, amount, payment_method, payment_type, status, transaction_code) VALUES
(1, 3, 1, 7500000, 'VNPAY', 'FULL', 'PAID', 'TXN001-20260415'),
(2, 2, 1, 2800000, 'MOMO', 'DEPOSIT', 'PENDING', 'TXN002-20260504'),
(3, 4, 3, 2800000, 'BANK_TRANSFER', 'FULL', 'PENDING', 'TXN003-20260502'),
(4, 2, 2, 800000, 'CASH', 'FULL', 'PAID', 'TXN004-20260428');

-- ============================================================
--  17. NOTIFICATIONS - Sample data (Updated)
-- ============================================================
INSERT INTO notifications (user_id, sender_id, title, message, type, is_read, related_request_id) VALUES
(2, 1, 'Báo giá mới', 'Cửa hàng Tech Fix Hà Nội đã gửi báo giá cho yêu cầu của bạn', 'QUOTE', 0, 1),
(3, 1, 'Đơn hàng hoàn thành', 'Đơn hàng #1 của bạn đã hoàn thành, vui lòng đánh giá', 'ORDER', 1, 2),
(2, 1, 'Thanh toán thành công', 'Thanh toán 7.5 triệu cho đơn hàng #1 đã thành công', 'PAYMENT', 1, 2),
(5, NULL, 'Thông báo hệ thống', 'Gói Premium của cửa hàng bạn sắp hết hạn, vui lòng gia hạn', 'SYSTEM', 0, NULL),
(4, 2, 'Báo giá mới', 'Cửa hàng Phone Repair Center đã gửi báo giá cho yêu cầu của bạn', 'QUOTE', 0, 4),
(2, 3, 'Báo giá mới', 'Cửa hàng Laptop Care đã gửi báo giá cho yêu cầu của bạn', 'QUOTE', 0, 6),
(3, 2, 'Báo giá mới', 'Cửa hàng Phone Repair Center đã gửi báo giá cho yêu cầu của bạn', 'QUOTE', 0, 5);

-- ============================================================
--  18. AI DIAGNOSIS LOGS - Sample data (Updated)
-- ============================================================
INSERT INTO ai_diagnosis_logs (user_id, device_id, user_description, ai_diagnosis, estimated_price) VALUES
(2, 1, 'iPhone 13 không bật được, cấu hình vẫn bình thường hôm trước', 'Có thể là lỗi pin hết hoặc bo mạch chủ bị lỗi. Hãy thử chế độ DFU recovery trên máy tính. Nếu không được, cần thay pin hoặc sửa bo mạch.', 1200000),
(3, 5, 'MacBook Pro bị nóng lên đột ngột, fan chạy hết công suất', 'Thường do bụi tích tụ trong quạt tản nhiệt hoặc vấn đề về thermal paste. Cần vệ sinh quạt và thay keo tản nhiệt để giải quyết.', 2500000),
(4, 3, 'Samsung Galaxy S21 pin chỉ dùng được 2-3 tiếng, trước đó dùng được 8 tiếng', 'Pin đã suy giảm hoặc có ứng dụng chạy ngầm tiêu tốn pin. Cần kiểm tra các ứng dụng hoặc thay pin mới.', 1000000),
(2, 7, 'Asus VivoBook bị giật lag khi chơi game nhẹ, trước đó mượt mà', 'Có thể do ổ SSD gần đầy, RAM bị chiếm bởi chương trình nền, hoặc GPU bị quá nóng. Nên kiểm tra thư mục tạm, uninstall ứng dụng không cần thiết.', 1500000);

-- ============================================================
--  19. PRODUCTS - Sample data (Updated for user_id)
-- ============================================================
INSERT INTO products (user_id, name, type, price) VALUES
(5, 'Pin iPhone 13', 'Battery', 450000),
(5, 'Kính cảm ứng iPhone 13', 'Screen', 1200000),
(5, 'Bo mạch chủ iPhone 13', 'Motherboard', 3500000),
(6, 'Pin Samsung Galaxy S21', 'Battery', 350000),
(6, 'Cổng sạc Samsung', 'Connector', 250000),
(7, 'Thermal Paste', 'Thermal', 150000),
(7, 'Fan Laptop', 'Fan', 800000),
(7, 'Bàn phím Laptop', 'Keyboard', 600000),
(5, 'Màn hình iPhone 14', 'Screen', 1500000),
(6, 'Pin iPad Air 5', 'Battery', 1200000);

-- ============================================================
--  20. PROMOTION CAMPAIGNS - Sample data
-- ============================================================
INSERT INTO promotion_campaigns (store_id, requested_by, title, message, status, scheduled_at, monthly_limit_snapshot, requested_at, approved_by, approved_at, recipients_count) VALUES
(1, 5, 'Khuyến mãi Tháng 5', 'Sửa chữa iPhone giảm 20%, sửa laptop giảm 15% trong tháng 5 này', 'APPROVED', '2026-05-07 08:00:00', 100, '2026-05-01 10:00:00', 1, '2026-05-02 09:30:00', 0),
(2, 6, 'Chương trình khuyến mãi mới năm', 'Mở khóa ưu đãi đặc biệt cho những khách hàng trung thành', 'APPROVED', '2026-05-08 08:00:00', 100, '2026-05-02 11:00:00', 1, '2026-05-03 10:00:00', 0),
(3, 7, 'Giảm giá dịch vụ vệ sinh laptop', 'Vệ sinh laptop chuyên nghiệp chỉ 500k (giảm 50%) trong tháng 5', 'PENDING_APPROVAL', NULL, 100, '2026-05-04 14:00:00', NULL, NULL, 0);

-- ============================================================
--  21. PROMOTION CAMPAIGN RECIPIENTS - Sample data
-- ============================================================
INSERT INTO promotion_campaign_recipients (campaign_id, user_id, delivered_at, opened_at) VALUES
(1, 2, '2026-05-07 08:30:00', '2026-05-07 10:15:00'),
(1, 3, '2026-05-07 08:30:00', '2026-05-07 14:45:00'),
(1, 4, '2026-05-07 08:30:00', NULL),
(2, 2, '2026-05-08 08:30:00', '2026-05-08 11:00:00'),
(2, 3, '2026-05-08 08:30:00', '2026-05-08 15:20:00'),
(2, 4, '2026-05-08 08:30:00', NULL);
