import { useState } from 'react';
import { fmt } from '../lib/utils';

function calcPayoff(balance, rate, payment) {
  if (!balance || !rate || payment <= 0) return null;
  const monthlyRate = rate / 100 / 12;
  const monthlyInterest = balance * monthlyRate;
  if (payment <= monthlyInterest) return { tooLow: true, minPayment: monthlyInterest };

  let bal = balance;
  let totalInterest = 0;
  let months = 0;
  while (bal > 0.005 && months < 600) {
    const interest = bal * monthlyRate;
    totalInterest += interest;
    bal = bal + interest - payment;
    months++;
  }

  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const payoffStr = d.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });

  return { months, totalInterest, payoffStr };
}

export default function PayoffModal({ card, onClose }) {
  const [payment, setPayment] = useState(card.minimumPayment > 0 ? String(card.minimumPayment) : '');

  const pmtNum = Number(payment);
  const result = calcPayoff(Number(card.balance), Number(card.rate), pmtNum);

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Payoff Planner</h2>
        <p className="modal-subtitle">{card.name}{card.last4 ? ` ···· ${card.last4}` : ''}</p>

        <div className="form-group full" style={{ marginBottom: '1.25rem' }}>
          <label>Monthly payment ($)</label>
          <input type="number" step="any" min="0" value={payment}
            onChange={e => setPayment(e.target.value)} placeholder="500.00" autoFocus />
        </div>

        {pmtNum > 0 && result?.tooLow && (
          <p className="form-error" style={{ marginBottom: '1rem' }}>
            Payment too low — must exceed {fmt(result.minPayment)}/mo to cover interest.
          </p>
        )}

        {result && !result.tooLow && (
          <div className="payoff-results">
            <div className="payoff-row">
              <span className="payoff-label">Months to payoff</span>
              <span className="payoff-value">{result.months} mo</span>
            </div>
            <div className="payoff-row">
              <span className="payoff-label">Total interest</span>
              <span className="payoff-value amount-warn">{fmt(result.totalInterest)}</span>
            </div>
            <div className="payoff-row">
              <span className="payoff-label">Paid off by</span>
              <span className="payoff-value">{result.payoffStr}</span>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
