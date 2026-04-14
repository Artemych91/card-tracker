import { daysUntil, fmt, fmtDate } from '../lib/utils';

export default function Reminders({ cards }) {
  const upcoming = cards
    .filter(c => Number(c.balance) > 0 && c.dueDate)
    .map(c => ({ ...c, days: daysUntil(c.dueDate) }))
    .filter(c => c.days != null && c.days <= 14)
    .sort((a, b) => a.days - b.days);

  if (!upcoming.length) return null;

  return (
    <section className="reminders-section">
      <div className="section-label">Upcoming payments</div>
      <div className="reminders">
        {upcoming.map(c => {
          let cls, label;
          if (c.days < 0)       { cls = 'urgent'; label = `Overdue by ${Math.abs(c.days)} day${Math.abs(c.days) !== 1 ? 's' : ''}!`; }
          else if (c.days === 0) { cls = 'urgent'; label = 'Due TODAY'; }
          else if (c.days <= 3)  { cls = 'urgent'; label = `Due in ${c.days} day${c.days !== 1 ? 's' : ''}`; }
          else if (c.days <= 7)  { cls = 'soon';   label = `Due in ${c.days} days`; }
          else                   { cls = 'ok';     label = `Due in ${c.days} days`; }

          return (
            <div key={c.id} className={`reminder-item ${cls}`}>
              <div className="reminder-dot" />
              <div className="reminder-name">{c.name}{c.last4 ? ` ···${c.last4}` : ''}</div>
              <div className="reminder-meta">{label} · {fmtDate(c.dueDate)}</div>
              <div className="reminder-amount">{fmt(c.balance)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
