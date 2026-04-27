const express = require('express');
const router = express.Router();
const db = require('../db');
const { DEFAULT_USER_ID } = db;
const { randomUUID } = require('crypto');

const CARD_WITH_PLAN = `
  SELECT c.*,
    pp.monthly_payment AS plan_monthly_payment,
    pp.start_date      AS plan_start_date,
    pp.start_balance   AS plan_start_balance,
    pp.rate            AS plan_rate
  FROM cards c
  LEFT JOIN payoff_plans pp ON pp.card_id = c.id
`;

function getCardWithPlan(id) {
  return db.prepare(CARD_WITH_PLAN + ' WHERE c.id = ?').get(id);
}

// GET all cards
router.get('/', (req, res) => {
  const cards = db.prepare(CARD_WITH_PLAN + ' ORDER BY c.due_date ASC').all();
  res.json(cards.map(toClient));
});

// GET single card
router.get('/:id', (req, res) => {
  const card = getCardWithPlan(req.params.id);
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
  res.status(201).json(toClient(getCardWithPlan(id)));
});

// PUT update card
router.put('/:id', (req, res) => {
  if (!db.prepare('SELECT id FROM cards WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ error: 'Not found' });
  }
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
  res.json(toClient(getCardWithPlan(req.params.id)));
});

// DELETE card
router.delete('/:id', (req, res) => {
  if (!db.prepare('SELECT id FROM cards WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ error: 'Not found' });
  }
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
        `).run(randomUUID(), req.params.id, DEFAULT_USER_ID, newBalance - expected, newBalance);
      }
    }

    db.prepare(`
      INSERT INTO transactions (id, card_id, user_id, type, amount, balance_after)
      VALUES (?, ?, ?, 'statement', ?, ?)
    `).run(randomUUID(), req.params.id, DEFAULT_USER_ID, newBalance, newBalance);

    db.prepare(`
      UPDATE cards SET balance = ?, due_date = ?, statement_date = date('now'), updated_at = datetime('now') WHERE id = ?
    `).run(newBalance, dueDate, req.params.id);
  })();

  res.json(toClient(getCardWithPlan(req.params.id)));
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

  res.json({ transactionId: txId, card: toClient(getCardWithPlan(req.params.id)) });
});

// GET payoff plan
router.get('/:id/payoff-plan', (req, res) => {
  const plan = db.prepare('SELECT * FROM payoff_plans WHERE card_id = ?').get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'No plan' });
  res.json(planToClient(plan));
});

// PUT upsert payoff plan
router.put('/:id/payoff-plan', (req, res) => {
  if (!db.prepare('SELECT id FROM cards WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const { monthlyPayment, startBalance, rate } = req.body;
  db.prepare(`
    INSERT INTO payoff_plans (id, card_id, user_id, monthly_payment, start_date, start_balance, rate)
    VALUES (?, ?, ?, ?, date('now'), ?, ?)
    ON CONFLICT(card_id) DO UPDATE SET
      monthly_payment = excluded.monthly_payment,
      start_date      = excluded.start_date,
      start_balance   = excluded.start_balance,
      rate            = excluded.rate
  `).run(randomUUID(), req.params.id, DEFAULT_USER_ID, monthlyPayment, startBalance, rate);
  const plan = db.prepare('SELECT * FROM payoff_plans WHERE card_id = ?').get(req.params.id);
  res.json(planToClient(plan));
});

// DELETE payoff plan
router.delete('/:id/payoff-plan', (req, res) => {
  db.prepare('DELETE FROM payoff_plans WHERE card_id = ?').run(req.params.id);
  res.status(204).end();
});

// Mount transactions sub-router
router.use('/:id/transactions', require('./transactions'));

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
    payoffPlan: row.plan_monthly_payment != null ? planToClient({
      monthly_payment: row.plan_monthly_payment,
      start_date:      row.plan_start_date,
      start_balance:   row.plan_start_balance,
      rate:            row.plan_rate,
    }) : null,
  };
}

function planToClient(row) {
  return {
    monthlyPayment: row.monthly_payment,
    startDate:      row.start_date,
    startBalance:   row.start_balance,
    rate:           row.rate,
  };
}

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
