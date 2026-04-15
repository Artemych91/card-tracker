import { useState } from 'react';

function suggestDueDate(card) {
  const due = card.dueDate ? new Date(card.dueDate + 'T00:00:00') : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // suggest today+21 if no due date or due date is in the past
  if (!due || due < today) {
    const d = new Date(today);
    d.setDate(d.getDate() + 21);
    return d.toISOString().slice(0, 10);
  }
  return card.dueDate;
}

export default function NewStatementModal({ card, onSave, onClose }) {
  const [balance,  setBalance]  = useState(card.balance ?? '');
  const [dueDate,  setDueDate]  = useState(suggestDueDate(card));
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (balance === '' || balance === null) { setErr('Balance is required'); return; }
    setSaving(true); setErr('');
    try {
      await onSave(Number(balance), dueDate || null);
      onClose();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>New Statement</h2>
        <p className="modal-subtitle">{card.name}{card.last4 ? ` ···· ${card.last4}` : ''}</p>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-group full">
              <label>Statement balance ($)</label>
              <input type="number" step="0.01" min="0" value={balance}
                onChange={e => setBalance(e.target.value)} placeholder="921.00" autoFocus />
            </div>
            <div className="form-group full">
              <label>Due date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              <span className="form-hint">21 days is the legal minimum</span>
            </div>
          </div>
          {err && <p className="form-error">{err}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent" disabled={saving}>
              {saving ? 'Saving…' : 'Save Statement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
