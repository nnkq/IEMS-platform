const express = require("express");
const router = express.Router();
const db = require("../config/db");

// 1. Tạo hoặc lấy conversation theo repair_request_id
router.post("/conversation/by-request", (req, res) => {
  const { repair_request_id, user_id, store_id } = req.body;

  if (!repair_request_id || !user_id || !store_id) {
    return res.status(400).json({
      message: "Thiếu repair_request_id, user_id hoặc store_id",
    });
  }

  const findSql = `
    SELECT *
    FROM chat_conversations
    WHERE repair_request_id = ?
    LIMIT 1
  `;

  db.query(findSql, [repair_request_id], (findErr, findRows) => {
    if (findErr) {
      console.error("Lỗi tìm conversation:", findErr);
      return res.status(500).json({ message: "Lỗi tìm conversation" });
    }

    if (findRows.length > 0) {
      return res.status(200).json(findRows[0]);
    }

    const insertSql = `
      INSERT INTO chat_conversations (repair_request_id, user_id, store_id)
      VALUES (?, ?, ?)
    `;

    db.query(
      insertSql,
      [repair_request_id, user_id, store_id],
      (insertErr, insertResult) => {
        if (insertErr) {
          console.error("Lỗi tạo conversation:", insertErr);
          return res.status(500).json({ message: "Lỗi tạo conversation" });
        }

        db.query(
          "SELECT * FROM chat_conversations WHERE id = ?",
          [insertResult.insertId],
          (selectErr, selectRows) => {
            if (selectErr) {
              console.error("Lỗi lấy conversation vừa tạo:", selectErr);
              return res.status(500).json({ message: "Lỗi lấy conversation mới" });
            }

            return res.status(201).json(selectRows[0]);
          }
        );
      }
    );
  });
});

// 2. Lấy danh sách hội thoại của USER
router.get("/user/:userId", (req, res) => {
  const { userId } = req.params;

  const sql = `
    SELECT
      c.id AS conversation_id,
      c.repair_request_id,
      c.user_id,
      c.store_id,
      c.updated_at,
      s.store_name,
      r.title,
      r.device_type,
      r.brand,
      r.model,
      (
        SELECT cm.message
        FROM chat_messages cm
        WHERE cm.conversation_id = c.id
        ORDER BY cm.created_at DESC, cm.id DESC
        LIMIT 1
      ) AS last_message,
      (
        SELECT cm.created_at
        FROM chat_messages cm
        WHERE cm.conversation_id = c.id
        ORDER BY cm.created_at DESC, cm.id DESC
        LIMIT 1
      ) AS last_message_time,
      (
        SELECT COUNT(*)
        FROM chat_messages cm
        WHERE cm.conversation_id = c.id
          AND cm.sender_role = 'store'
          AND cm.is_read = 0
      ) AS unread_count
    FROM chat_conversations c
    JOIN stores s ON s.id = c.store_id
    LEFT JOIN repair_requests r ON r.id = c.repair_request_id
    WHERE c.user_id = ?
    ORDER BY COALESCE(last_message_time, c.updated_at) DESC
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.error("Lỗi lấy hội thoại user:", err);
      return res.status(500).json({ message: "Không lấy được hội thoại user" });
    }

    res.status(200).json(rows);
  });
});

// 3. Lấy danh sách hội thoại của STORE
router.get("/store/:storeId", (req, res) => {
  const { storeId } = req.params;

  const sql = `
    SELECT
      c.id AS conversation_id,
      c.repair_request_id,
      c.user_id,
      c.store_id,
      c.updated_at,
      u.name AS customer_name,
      r.title,
      r.device_type,
      r.brand,
      r.model,
      (
        SELECT cm.message
        FROM chat_messages cm
        WHERE cm.conversation_id = c.id
        ORDER BY cm.created_at DESC, cm.id DESC
        LIMIT 1
      ) AS last_message,
      (
        SELECT cm.created_at
        FROM chat_messages cm
        WHERE cm.conversation_id = c.id
        ORDER BY cm.created_at DESC, cm.id DESC
        LIMIT 1
      ) AS last_message_time,
      (
        SELECT COUNT(*)
        FROM chat_messages cm
        WHERE cm.conversation_id = c.id
          AND cm.sender_role = 'user'
          AND cm.is_read = 0
      ) AS unread_count
    FROM chat_conversations c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN repair_requests r ON r.id = c.repair_request_id
    WHERE c.store_id = ?
    ORDER BY COALESCE(last_message_time, c.updated_at) DESC
  `;

  db.query(sql, [storeId], (err, rows) => {
    if (err) {
      console.error("Lỗi lấy hội thoại store:", err);
      return res.status(500).json({ message: "Không lấy được hội thoại store" });
    }

    res.status(200).json(rows);
  });
});

// 4. Lấy toàn bộ tin nhắn của một conversation
router.get("/conversation/:conversationId/messages", (req, res) => {
  const { conversationId } = req.params;

  const sql = `
    SELECT id, conversation_id, sender_role, sender_id, message, is_read, created_at
    FROM chat_messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC, id ASC
  `;

  db.query(sql, [conversationId], (err, rows) => {
    if (err) {
      console.error("Lỗi lấy messages:", err);
      return res.status(500).json({ message: "Không lấy được tin nhắn" });
    }

    res.status(200).json(rows);
  });
});

// 5. Gửi tin nhắn
router.post("/messages", (req, res) => {
  const { conversation_id, sender_role, sender_id, message } = req.body;

  if (!conversation_id || !sender_role || !sender_id || !message?.trim()) {
    return res.status(400).json({ message: "Thiếu dữ liệu gửi tin nhắn" });
  }

  const insertSql = `
    INSERT INTO chat_messages (conversation_id, sender_role, sender_id, message)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    insertSql,
    [conversation_id, sender_role, sender_id, message.trim()],
    (insertErr, insertResult) => {
      if (insertErr) {
        console.error("Lỗi insert message:", insertErr);
        return res.status(500).json({ message: "Không gửi được tin nhắn" });
      }

      db.query(
        `UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [conversation_id],
        (updateErr) => {
          if (updateErr) {
            console.error("Lỗi update conversation time:", updateErr);
          }

          db.query(
            `SELECT * FROM chat_messages WHERE id = ?`,
            [insertResult.insertId],
            (selectErr, rows) => {
              if (selectErr) {
                console.error("Lỗi lấy message vừa tạo:", selectErr);
                return res.status(500).json({ message: "Không lấy được tin nhắn vừa gửi" });
              }

              res.status(201).json(rows[0]);
            }
          );
        }
      );
    }
  );
});

// 6. Đánh dấu đã đọc
router.put("/conversation/:conversationId/read", (req, res) => {
  const { conversationId } = req.params;
  const { reader_role } = req.body;

  if (!reader_role || !["user", "store"].includes(reader_role)) {
    return res.status(400).json({ message: "reader_role không hợp lệ" });
  }

  const targetSender = reader_role === "user" ? "store" : "user";

  const sql = `
    UPDATE chat_messages
    SET is_read = 1
    WHERE conversation_id = ?
      AND sender_role = ?
      AND is_read = 0
  `;

  db.query(sql, [conversationId, targetSender], (err) => {
    if (err) {
      console.error("Lỗi mark read:", err);
      return res.status(500).json({ message: "Không cập nhật được đã đọc" });
    }

    res.status(200).json({ success: true });
  });
});

module.exports = router;