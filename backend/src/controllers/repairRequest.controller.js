const db = require("../config/db");

exports.createRepairRequest = (req, res) => {

  const { device_id, title, description, budget, location } = req.body;

  if (!device_id || !title || !description) {
    return res.status(400).json({
      message: "Missing required fields"
    });
  }

  const user_id = 1; // test user

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
        console.error("Create repair request error:", err);
        return res.status(500).json({
          message: "Database error"
        });
      }

      res.status(201).json({
        message: "Repair request created",
        request_id: result.insertId
      });

    }
  );
};