const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');

// GET /api/cards/:id/transactions
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT id, type, amount, balance_after, note, created_at
    FROM transactions
    WHERE card_id = ?
    ORDER BY created_at DESC
  `).all(req.params.id);

  res.json(rows.map(r => ({
    id: r.id,
    type: r.type,
    amount: r.amount,
    balanceAfter: r.balance_after,
    note: r.note,
    createdAt: r.created_at,
  })));
});

module.exports = router;
