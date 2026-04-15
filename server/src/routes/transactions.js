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

// DELETE /api/cards/:id/transactions/:txId — undo a payment
router.delete('/:txId', (req, res) => {
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ? AND card_id = ?')
    .get(req.params.txId, req.params.id);
  if (!tx) return res.status(404).json({ error: 'Not found' });
  if (tx.type !== 'payment') return res.status(400).json({ error: 'Can only undo payment transactions' });

  const restoredBalance = tx.balance_after + tx.amount;

  db.transaction(() => {
    db.prepare('DELETE FROM transactions WHERE id = ?').run(tx.id);
    db.prepare("UPDATE cards SET balance = ?, updated_at = datetime('now') WHERE id = ?")
      .run(restoredBalance, tx.card_id);
  })();

  res.json({ ok: true, balance: restoredBalance });
});

module.exports = router;
