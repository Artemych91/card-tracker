const express = require('express');
const router = express.Router();
const db = require('../db');
const { DEFAULT_USER_ID } = db;
const { randomUUID } = require('crypto');

// GET all cards
router.get('/', (req, res) => {
  const cards = db.prepare('SELECT * FROM cards ORDER BY due_date ASC').all();
  res.json(cards.map(toClient));
});

// GET single card
router.get('/:id', (req, res) => {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
  if (!card) return res.status(404).json({ error: 'Not found' });
  res.json(toClient(card));
});

// POST create card
router.post('/', (req, res) => {
  const id = randomUUID();
  const c = fromClient(req.body);
  db.prepare(`
    INSERT INTO cards (id, name, last4, limit_amt, balance, current_bal, rate, statement_date, due_date, minimum_payment, user_id)
    VALUES (@id, @name, @last4, @limit_amt, @balance, @current_bal, @rate, @statement_date, @due_date, @minimum_payment, @user_id)
  `).run({ id, user_id: DEFAULT_USER_ID, ...c });
  const created = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  res.status(201).json(toClient(created));
});

// PUT update card (edit: name, last4, limit, APR, current balance, minimum payment, statement date)
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const c = fromClient(req.body);
  db.prepare(`
    UPDATE cards SET
      name = @name, last4 = @last4, limit_amt = @limit_amt,
      balance = @balance, current_bal = @current_bal, rate = @rate,
      statement_date = @statement_date, due_date = @due_date,
      minimum_payment = @minimum_payment,
      updated_at = datetime('now')
    WHERE id = @id
  `).run({ id: req.params.id, ...c });
  const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
  res.json(toClient(updated));
});

// DELETE card
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM cards WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// PATCH new statement: set balance + due date, log transaction, auto-detect interest
router.patch('/:id/statement', (req, res) => {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
  if (!card) return res.status(404).json({ error: 'Not found' });

  if (req.body.balance === undefined || req.body.balance === null) {
    return res.status(400).json({ error: 'balance is required' });
  }
  const newBalance = Number(req.body.balance);
  const dueDate = req.body.dueDate || null;

  db.transaction(() => {
    // Interest auto-detection: compare new balance vs expected balance after payments
    const lastStatement = db.prepare(`
      SELECT balance_after, created_at FROM transactions
      WHERE card_id = ? AND type = 'statement'
      ORDER BY created_at DESC LIMIT 1
    `).get(req.params.id);

    if (lastStatement) {
      const { total: paymentsSince } = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
        WHERE card_id = ? AND type = 'payment' AND created_at > ?
      `).get(req.params.id, lastStatement.created_at);

      const expected = lastStatement.balance_after - paymentsSince;
      if (newBalance > expected && expected >= 0) {
        db.prepare(`
          INSERT INTO transactions (id, card_id, user_id, type, amount, balance_after, note)
          VALUES (?, ?, ?, 'interest', ?, ?, 'Auto-detected')
        `).run(randomUUID(), req.params.id, DEFAULT_USER_ID, newBalance - expected, newBalance, 'Auto-detected');
      }
    }

    db.prepare(`
      INSERT INTO transactions (id, card_id, user_id, type, amount, balance_after)
      VALUES (?, ?, ?, 'statement', ?, ?)
    `).run(randomUUID(), req.params.id, DEFAULT_USER_ID, newBalance, newBalance);

    db.prepare(`
      UPDATE cards SET balance = ?, due_date = ?, updated_at = datetime('now') WHERE id = ?
    `).run(newBalance, dueDate, req.params.id);
  })();

  const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
  res.json(toClient(updated));
});

// POST pay: decrement balance, log payment transaction
router.post('/:id/pay', (req, res) => {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
  if (!card) return res.status(404).json({ error: 'Not found' });

  const amount = Number(req.body.amount) || 0;
  if (amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });

  const newBalance = Math.max(0, card.balance - amount);
  const note = req.body.note || null;
  const txId = randomUUID();

  db.prepare(`
    INSERT INTO transactions (id, card_id, user_id, type, amount, balance_after, note)
    VALUES (?, ?, ?, 'payment', ?, ?, ?)
  `).run(txId, req.params.id, DEFAULT_USER_ID, amount, newBalance, note);

  db.prepare(`
    UPDATE cards SET balance = ?, updated_at = datetime('now') WHERE id = ?
  `).run(newBalance, req.params.id);

  const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
  res.json({ transactionId: txId, card: toClient(updated) });
});

// Mount transactions sub-router
router.use('/:id/transactions', require('./transactions'));

// Map DB row → camelCase client object
function toClient(row) {
  return {
    id: row.id,
    name: row.name,
    last4: row.last4,
    limit: row.limit_amt,
    balance: row.balance,
    currentBalance: row.current_bal,
    rate: row.rate,
    statementDate: row.statement_date,
    dueDate: row.due_date,
    minimumPayment: row.minimum_payment,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Map client body → DB columns
function fromClient(body) {
  return {
    name: body.name || '',
    last4: body.last4 || null,
    limit_amt: Number(body.limit) || 0,
    balance: Number(body.balance) || 0,
    current_bal: Number(body.currentBalance) || 0,
    rate: Number(body.rate) || 0,
    statement_date: body.statementDate || null,
    due_date: body.dueDate || null,
    minimum_payment: Number(body.minimumPayment) || 0,
  };
}

module.exports = router;
