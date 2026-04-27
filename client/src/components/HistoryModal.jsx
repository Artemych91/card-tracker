import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { fmt } from '../lib/utils';

function fmtTxDate(str) {
  if (!str) return '';
  return new Date(str.replace(' ', 'T')).toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

const DOT_COLOR = { statement: '#64c8f0', payment: '#c8f064', interest: '#f0c464' };

function BalanceChart({ rows }) {
  const pts = [...rows].reverse();
  if (pts.length < 2) return null;

  const W = 500, H = 120;
  const pL = 52, pR = 10, pT = 12, pB = 20;
  const cW = W - pL - pR;
  const cH = H - pT - pB;

  const maxV = Math.max(...pts.map(p => p.balanceAfter), 1);
  const xOf = i => pL + (i / (pts.length - 1)) * cW;
  const yOf = v => pT + (1 - v / maxV) * cH;
  const poly = pts.map((p, i) => `${xOf(i).toFixed(1)},${yOf(p.balanceAfter).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="balance-chart" aria-hidden="true">
      <line x1={pL} y1={pT} x2={pL} y2={pT + cH} stroke="var(--border2)" strokeWidth="1" />
      <line x1={pL} y1={pT + cH} x2={W - pR} y2={pT + cH} stroke="var(--border2)" strokeWidth="1" />
      <text x={pL - 4} y={pT + 4} textAnchor="end" className="chart-label">{fmt(maxV)}</text>
      <text x={pL - 4} y={pT + cH + 1} textAnchor="end" className="chart-label">$0</text>
      <polyline points={poly} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={p.id} cx={xOf(i)} cy={yOf(p.balanceAfter)} r="3.5"
          fill={DOT_COLOR[p.type] || 'var(--muted)'}
          stroke="var(--surface)" strokeWidth="1.5" />
      ))}
    </svg>
  );
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
          <>
          <BalanceChart rows={rows} />
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
          </>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
