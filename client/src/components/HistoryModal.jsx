import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { fmt } from '../lib/utils';

function fmtTxDate(str) {
  if (!str) return '';
  return new Date(str.replace(' ', 'T')).toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function HistoryModal({ card, onClose }) {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.cards.transactions(card.id)
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [card.id]);

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <h2>History</h2>
        <p className="modal-subtitle">{card.name}{card.last4 ? ` ···· ${card.last4}` : ''}</p>

        {loading ? (
          <p className="muted" style={{ padding: '1rem 0' }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p className="muted" style={{ padding: '1rem 0' }}>No history yet.</p>
        ) : (
          <div className="tx-list">
            {rows.map(tx => (
              <div key={tx.id} className="tx-row">
                <span className="tx-date">{fmtTxDate(tx.createdAt)}</span>
                <span className={`tx-badge tx-badge--${tx.type}`}>{tx.type}</span>
                <span className="tx-amount">{fmt(tx.amount)}</span>
                <span className="tx-after">bal. {fmt(tx.balanceAfter)}</span>
                {tx.note && <span className="tx-note">{tx.note}</span>}
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
