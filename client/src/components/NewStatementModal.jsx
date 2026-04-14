import { useState } from 'react';

export default function NewStatementModal({ card, onSave, onClose }) {
  const [balance,  setBalance]  = useState(card.balance ?? '');
  const [dueDate,  setDueDate]  = useState(card.dueDate || '');
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
