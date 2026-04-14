const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/email-logs
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT el.id, el.card_id, c.name AS card_name, el.sent_at, el.status, el.error
    FROM email_logs el
    LEFT JOIN cards c ON c.id = el.card_id
    ORDER BY el.sent_at DESC
    LIMIT 50
  `).all();

  res.json(rows.map(r => ({
    id: r.id,
    cardId: r.card_id,
    cardName: r.card_name,
    sentAt: r.sent_at,
    status: r.status,
    error: r.error,
  })));
});

module.exports = router;
