const db = require("../config/db");

exports.createRepairRequest = (req, res) => {

  const user_id = req.user.id;

  const { device_id, title, description, budget, location } = req.body;

  const sql = `
    INSERT INTO repair_requests
    (user_id, device_id, title, description, budget, location, status)
    VALUES (?, ?, ?, ?, ?, ?, 'OPEN')
  `;

  db.query(
    sql,
    [user_id, device_id, title, description, budget, location],
    (err, result) => {

      if (err) {
        console.error("Create request error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      res.status(201).json({
        message: "Repair request created",
        request_id: result.insertId
      });

    }
  );
};