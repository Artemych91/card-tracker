const express = require('express');
const router = express.Router();
const db = require('../db');
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
    INSERT INTO cards (id, name, last4, limit_amt, balance, current_bal, rate, statement_date, due_date)
    VALUES (@id, @name, @last4, @limit_amt, @balance, @current_bal, @rate, @statement_date, @due_date)
  `).run({ id, ...c });
  const created = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  res.status(201).json(toClient(created));
});

// PUT update card
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const c = fromClient(req.body);
  db.prepare(`
    UPDATE cards SET
      name = @name, last4 = @last4, limit_amt = @limit_amt,
      balance = @balance, current_bal = @current_bal, rate = @rate,
      statement_date = @statement_date, due_date = @due_date,
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
  };
}

module.exports = router;
