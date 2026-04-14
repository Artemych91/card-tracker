import { fmt, fmtDate, daysUntil, daysLabel } from '../lib/utils';

export default function CardItem({ card, onEdit, onDelete }) {
  const limit   = Number(card.limit || 0);
  const balance = Number(card.balance || 0);
  const current = Number(card.currentBalance || 0);
  const util    = limit > 0 ? (current / limit * 100) : 0;
  const barCls  = util > 70 ? 'bar-danger' : util > 30 ? 'bar-warn' : 'bar-good';

  const dueDays  = daysUntil(card.dueDate);
  const stmtDays = daysUntil(card.statementDate);
  const dueLabel = daysLabel(dueDays, 'due');
  const stmtLabel= daysLabel(stmtDays, 'stmt');

  let cardCls = '';
  if (balance > 0) {
    if (dueDays != null && dueDays < 0)      cardCls = 'card--overdue';
    else if (dueDays != null && dueDays <= 3) cardCls = 'card--urgent';
  }

  return (
    <div className={`card ${cardCls}`}>
      <div className="card-header">
        <div>
          <div className="card-name">{card.name}</div>
          {card.last4 && <div className="card-last4">···· {card.last4}</div>}
        </div>
        <div className="card-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(card)}>Edit</button>
          <button className="btn btn-ghost btn-sm btn-danger" onClick={() => onDelete(card.id)}>✕</button>
        </div>
      </div>

      <div className="card-amounts">
        <div className="amount-block">
          <div className="amount-label">Statement balance</div>
          <div className={`amount-value ${balance > 0 ? 'amount-warn' : 'amount-ok'}`}>
            {fmt(balance)}
          </div>
        </div>
        <div className="amount-block">
          <div className="amount-label">Current balance</div>
          <div className="amount-value">{fmt(current)}</div>
        </div>
      </div>

      {limit > 0 && (
        <div className="utilization-bar">
          <div className="util-row">
            <span>Utilization</span>
            <span>{util.toFixed(0)}% of {fmt(limit)}</span>
          </div>
          <div className="bar-track">
            <div className={`bar-fill ${barCls}`} style={{ width: `${Math.min(util, 100)}%` }} />
          </div>
        </div>
      )}

      <div className="card-dates">
        <div className="date-chip">
          <div className="date-chip-label">Statement</div>
          <div className="date-chip-value">{fmtDate(card.statementDate)}</div>
          {stmtLabel && <div className={`date-chip-days ${stmtLabel.cls}`}>{stmtLabel.text}</div>}
        </div>
        <div className="date-chip">
          <div className="date-chip-label">Due date</div>
          <div className="date-chip-value">{fmtDate(card.dueDate)}</div>
          {dueLabel && <div className={`date-chip-days ${dueLabel.cls}`}>{dueLabel.text}</div>}
        </div>
      </div>

      {card.rate > 0 && (
        <div className="card-rate">
          APR {card.rate}% · ~{(card.rate / 12).toFixed(2)}%/month
        </div>
      )}
    </div>
  );
}
