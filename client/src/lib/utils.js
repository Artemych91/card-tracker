export function nextMonthDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return d.toISOString().slice(0, 10);
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target - now) / 86400000);
}

export function fmt(n) {
  if (n == null || n === '' || isNaN(n)) return '—';
  return '$' + Number(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDate(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

export function urgencyClass(days, hasBalance) {
  if (!hasBalance || days == null) return '';
  if (days < 0)  return 'overdue';
  if (days <= 3) return 'urgent';
  if (days <= 7) return 'soon';
  return 'ok';
}

export function daysLabel(days, type = 'due') {
  if (days == null) return '';
  if (days < 0)  return { text: `${Math.abs(days)}d ago`, cls: 'days-past' };
  if (days === 0) return { text: 'today', cls: 'days-urgent' };
  if (days <= 3 && type === 'due') return { text: `${days}d left`, cls: 'days-urgent' };
  if (days <= 7 && type === 'due') return { text: `${days}d left`, cls: 'days-warn' };
  return { text: `${days}d`, cls: 'days-ok' };
}
