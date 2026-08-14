import { Router } from "express";
import { pool } from "../config/database.mjs";
import { authMiddleware } from "../middleware/auth.mjs";

const router = Router();

const adminMiddleware = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ detail: "Not authenticated" });
  }
  if (!req.user.is_admin) {
    return res.status(403).json({ detail: "Admin access required" });
  }
  next();
};

router.use(authMiddleware, adminMiddleware);

router.get("/stats", async (req, res) => {
  try {
    const [usersCount, subsCount, activeSubsCount, revenueResult] =
      await Promise.all([
        pool.query("SELECT COUNT(*) FROM users"),
        pool.query("SELECT COUNT(*) FROM user_subscriptions"),
        pool.query(
          "SELECT COUNT(*) FROM user_subscriptions WHERE status = 'active'",
        ),
        pool.query(
          "SELECT COALESCE(SUM(amount), 0) as total FROM billing_invoices WHERE status = 'paid'",
        ),
    ]);

    const user = userResult.rows[0];

    const [subscriptions, invoices, devices] = await Promise.all([
      pool.query(
        `SELECT us.id, us.status, us.start_date, us.end_date, us.created_at,
                bp.id as plan_id, bp.title as plan_title, bp.price as plan_price, bp.currency as plan_currency
         FROM user_subscriptions us
         LEFT JOIN billing_plans bp ON us.plan_id = bp.id
         WHERE us.user_id = $1
         ORDER BY us.created_at DESC`,
        [id],
      ),
      pool.query(
        `SELECT id, amount, currency, status, payment_id, created_at
         FROM billing_invoices
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [id],
      ),
      pool.query(
        "SELECT id, hardware_id, device_name, last_active FROM user_devices WHERE user_id = $1",
        [id],
      ),
    ]);
    
    let vehicles = { rows: [] };
    try {
      vehicles = await pool.query(
        "SELECT id, make, model, year, vin, license_plate, created_at FROM user_vehicles WHERE user_id = $1 ORDER BY created_at DESC",
        [id],
      );
    } catch (e) {
    }

    res.json({
      ...user,
      subscriptions: subscriptions.rows.map((s) => ({
        id: s.id,
        status: s.status,
        start_date: s.start_date,
        end_date: s.end_date,
        created_at: s.created_at,
        plan: s.plan_id
          ? {
              id: s.plan_id,
              title: s.plan_title,
              price: parseFloat(s.plan_price),
              currency: s.plan_currency || 'USD',
            }
          : null,
      })),
      invoices: invoices.rows,
      devices: devices.rows,
      vehicles: vehicles.rows,
    });
  } catch (err) {
    console.error("Admin get user error:", err.message);
    res.status(500).json({ detail: "Internal server error" });
  }
});

router.patch("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { email, first_name, last_name, phone, is_verified } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email.toLowerCase());
    }
    if (first_name !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(last_name);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (is_verified !== undefined) {
      updates.push(`is_verified = $${paramIndex++}`);
      values.push(is_verified);
    }

    if (updates.length === 0) {
      return res.status(400).json({ detail: "No fields to update" });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING id, email, first_name, last_name, phone, is_verified`,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ detail: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Admin update user error:", err.message);
    res.status(500).json({ detail: "Internal server error" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ detail: "User not found" });
    }

    res.json({ detail: "User deleted" });
  } catch (err) {
    console.error("Admin delete user error:", err.message);
    res.status(500).json({ detail: "Internal server error" });
  }
});

router.get("/subscriptions", async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = "WHERE 1=1";
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND us.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM user_subscriptions us ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT us.id, us.user_id, us.status, us.start_date, us.end_date, us.created_at,
              u.email as user_email,
              bp.id as plan_id, bp.title as plan_title, bp.price as plan_price
       FROM user_subscriptions us
       JOIN users u ON us.user_id = u.id
       LEFT JOIN billing_plans bp ON us.plan_id = bp.id
       ${whereClause}
       ORDER BY us.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params,
    );

    res.json({
      subscriptions: result.rows.map((s) => ({
        id: s.id,
        user_id: s.user_id,
        user_email: s.user_email,
        status: s.status,
        start_date: s.start_date,
        end_date: s.end_date,
        created_at: s.created_at,
        plan: s.plan_id
          ? {
              id: s.plan_id,
              title: s.plan_title,
              price: parseFloat(s.plan_price),
            }
          : null,
      })),
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error("Admin get subscriptions error:", err.message);
    res.status(500).json({ detail: "Internal server error" });
  }
});

router.post("/subscriptions", async (req, res) => {
  try {
    const { user_id, plan_id, months = 1 } = req.body;

    if (!user_id || !plan_id) {
      return res.status(400).json({ detail: "user_id and plan_id required" });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + parseInt(months));

    const result = await pool.query(
      `INSERT INTO user_subscriptions (user_id, plan_id, status, start_date, end_date)
       VALUES ($1, $2, 'active', $3, $4)
       RETURNING id, user_id, plan_id, status, start_date, end_date`,
      [user_id, plan_id, startDate, endDate],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Admin create subscription error:", err.message);
    res.status(500).json({ detail: "Internal server error" });
  }
});

router.post("/subscriptions/:id/extend", async (req, res) => {
  try {
    const { id } = req.params;
    const { months = 1 } = req.body;

    const subResult = await pool.query(
      "SELECT id, end_date FROM user_subscriptions WHERE id = $1",
      [id],
    );

    if (subResult.rows.length === 0) {
      return res.status(404).json({ detail: "Subscription not found" });
    }

    const currentEnd = new Date(subResult.rows[0].end_date || new Date());
    const newEnd = new Date(currentEnd);
    newEnd.setMonth(newEnd.getMonth() + parseInt(months));

    const result = await pool.query(
      `UPDATE user_subscriptions SET end_date = $1, status = 'active', updated_at = NOW() 
       WHERE id = $2 RETURNING id, end_date, status`,
      [newEnd, id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Admin extend subscription error:", err.message);
    res.status(500).json({ detail: "Internal server error" });
  }
});

router.patch("/subscriptions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, plan_id, end_date } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (plan_id) {
      updates.push(`plan_id = $${paramIndex++}`);
      values.push(plan_id);
    }
    if (end_date) {
      updates.push(`end_date = $${paramIndex++}`);
      values.push(end_date);
    }

    if (updates.length === 0) {
      return res.status(400).json({ detail: "No fields to update" });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE user_subscriptions SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ detail: "Subscription not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Admin update subscription error:", err.message);
    res.status(500).json({ detail: "Internal server error" });
  }
});

router.get("/plans", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, description, price, currency, interval, metadata, is_active FROM billing_plans ORDER BY price ASC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Admin get plans error:", err.message);
    res.status(500).json({ detail: "Internal server error" });
  }
});

router.post("/plans", async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      currency = "USD",
      interval = "month",
      metadata = {},
    } = req.body;

    if (!title || price === undefined) {
      return res.status(400).json({ detail: "title and price required" });
    }

    const result = await pool.query(
      `INSERT INTO billing_plans (title, description, price, currency, interval, metadata, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [title, description, price, currency, interval, JSON.stringify(metadata)],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Admin create plan error:", err.message);
    res.status(500).json({ detail: "Internal server error" });
  }
});

router.patch("/plans/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, is_active, metadata } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (price !== undefined) {
      updates.push(`price = $${paramIndex++}`);
      values.push(price);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    if (metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(metadata));
    }

    if (updates.length === 0) {
      return res.status(400).json({ detail: "No fields to update" });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE billing_plans SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ detail: "Plan not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Admin update plan error:", err.message);
    res.status(500).json({ detail: "Internal server error" });
  }
});

router.get("/invoices", async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = "WHERE 1=1";
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND bi.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM billing_invoices bi ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT bi.id, bi.user_id, bi.amount, bi.currency, bi.status, bi.payment_id, bi.created_at,
              u.email as user_email
       FROM billing_invoices bi
       JOIN users u ON bi.user_id = u.id
       ${whereClause}
       ORDER BY bi.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params,
    );

    res.json({
      invoices: result.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error("Admin get invoices error:", err.message);
    res.status(500).json({ detail: "Internal server error" });
  }
});

router.patch("/invoices/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ detail: "status required" });
    }

    const result = await pool.query(
      "UPDATE billing_invoices SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ detail: "Invoice not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Admin update invoice error:", err.message);
    res.status(500).json({ detail: "Internal server error" });
  }
});

router.get("/support/tickets", async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "", priority = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = "WHERE 1=1";
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND st.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (priority) {
      whereClause += ` AND st.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM support_tickets st ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT st.id, st.subject, st.status, st.priority, st.messages_count, 
              st.is_answered, st.last_message_at, st.created_at, st.updated_at,
              u.id as user_id, u.email as user_email, u.first_name, u.last_name,
              (SELECT COUNT(*) FROM support_messages sm WHERE sm.ticket_id = st.id AND sm.is_read = false AND sm.sender_type = 'user') as unread_count
       FROM support_tickets st
       JOIN users u ON st.user_id = u.id
       ${whereClause}
       ORDER BY 
         CASE WHEN st.status = 'open' AND st.is_answered = false THEN 0 ELSE 1 END,
         st.last_message_at DESC NULLS LAST,
         st.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params,
    );

    res.json({
      tickets: result.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error("Admin get support tickets error:", err.message);
    res.status(500).json({ detail: "Internal server error" });
  }
});

router.get("/support/tickets/stats", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'open') as open_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
        COUNT(*) FILTER (WHERE is_answered = false AND status = 'open') as unanswered_count
      FROM support_tickets
    `);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Admin get support stats error:", err.message);
    res.status(500).json({ detail: "Internal server error" });
  }
});

router.get("/support/tickets/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const ticketResult = await pool.query(
      `SELECT st.id, st.subject, st.status, st.priority, st.messages_count, 
              st.is_answered, st.last_message_at, st.created_at, st.updated_at,
              u.id as user_id, u.email as user_email, u.first_name, u.last_name
       FROM support_tickets st
       JOIN users u ON st.user_id = u.id
       WHERE st.id = $1`,
      [id],
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ detail: "Ticket not found" });
    }

    const messagesResult = await pool.query(
      `SELECT sm.id, sm.sender_type, sm.sender_id, sm.message, sm.is_read, sm.created_at,
              CASE 
                WHEN sm.sender_type = 'user' THEN u.first_name || ' ' || u.last_name
                WHEN sm.sender_type = 'admin' THEN 'Admin'
              END as sender_name
       FROM support_messages sm
       LEFT JOIN users u ON sm.sender_type = 'user' AND sm.sender_id = u.id
       WHERE sm.ticket_id = $1
       ORDER BY sm.created_at ASC`,
       [id],
    );

    await pool.query(
      `UPDATE support_messages SET is_read = true 
       WHERE ticket_id = $1 AND sender_type = 'user' AND is_read = false`,
      [id],
    );

    res.json({
      ...ticketResult.rows[0],
      messages: messagesResult.rows,
    });
  } catch (err) {
    console.error("Admin get support ticket error:", err.message);
    res.status(500).json({ detail: "Internal server error" });
  }
});

router.post("/support/tickets/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const adminId = req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({ detail: "Message is required" });
    }

    const ticketResult = await pool.query(
      "SELECT id, status FROM support_tickets WHERE id = $1",
      [id],
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ detail: "Ticket not found" });
    }

    const messageResult = await pool.query(
      `INSERT INTO support_messages (ticket_id, sender_type, sender_id, message)
       VALUES ($1, 'admin', $2, $3)
       RETURNING id, sender_type, sender_id, message, is_read, created_at`,
      [id, adminId, message.trim()],
    );

    await pool.query(
      `UPDATE support_tickets 
       SET messages_count = messages_count + 1, 
           is_answered = true,
           last_message_at = NOW(),
           status = CASE WHEN status = 'open' THEN 'pending' ELSE status END,
           updated_at = NOW()
       WHERE id = $1`,
      [id],
    );

    res.status(201).json({
      ...messageResult.rows[0],
      sender_name: "Admin",
    });
  } catch (err) {
    console.error("Admin send support message error:", err.message);
    res.status(500).json({ detail: "Internal server error" });
  }
});

router.patch("/support/tickets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (priority) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(priority);
    }

    if (updates.length === 0) {
      return res.status(400).json({ detail: "No fields to update" });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE support_tickets SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ detail: "Ticket not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Admin update support ticket error:", err.message);
    res.status(500).json({ detail: "Internal server error" });
  }
});

router.delete("/support/tickets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM support_tickets WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ detail: "Ticket not found" });
    }

    res.json({ detail: "Ticket deleted" });
  } catch (err) {
    console.error("Admin delete support ticket error:", err.message);
    res.status(500).json({ detail: "Internal server error" });
  }
});

export default router;
