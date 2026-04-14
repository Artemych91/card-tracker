import { useState, useEffect } from 'react';

const EMPTY = {
  name: '', last4: '', limit: '', balance: '',
  currentBalance: '', rate: '', statementDate: '', dueDate: '',
};

export default function CardForm({ card, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (card) {
      setForm({
        name:            card.name || '',
        last4:           card.last4 || '',
        limit:           card.limit ?? '',
        balance:         card.balance ?? '',
        currentBalance:  card.currentBalance ?? '',
        rate:            card.rate ?? '',
        statementDate:   card.statementDate || '',
        dueDate:         card.dueDate || '',
      });
    } else {
      setForm(EMPTY);
    }
  }, [card]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Card name is required'); return; }
    setSaving(true); setErr('');
    try {
      await onSave(form);
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
        <h2>{card ? 'Edit card' : 'Add card'}</h2>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-group full">
              <label>Card name</label>
              <input value={form.name} onChange={set('name')} placeholder="e.g. CIBC Visa" autoFocus />
            </div>
            <div className="form-group">
              <label>Last 4 digits</label>
              <input value={form.last4} onChange={set('last4')} placeholder="1234" maxLength={4} />
            </div>
            <div className="form-group">
              <label>Credit limit ($)</label>
              <input type="number" value={form.limit} onChange={set('limit')} placeholder="4000" />
            </div>
            <div className="form-group">
              <label>Statement balance ($)</label>
              <input type="number" value={form.balance} onChange={set('balance')} placeholder="921" />
            </div>
            <div className="form-group">
              <label>Current balance ($)</label>
              <input type="number" value={form.currentBalance} onChange={set('currentBalance')} placeholder="1200" />
            </div>
            <div className="form-group">
              <label>Interest rate (% APR)</label>
              <input type="number" step="0.01" value={form.rate} onChange={set('rate')} placeholder="21.75" />
            </div>
            <div className="form-group">
              <label>Statement date</label>
              <input type="date" value={form.statementDate} onChange={set('statementDate')} />
            </div>
            <div className="form-group">
              <label>Due date</label>
              <input type="date" value={form.dueDate} onChange={set('dueDate')} />
            </div>
          </div>
          {err && <p className="form-error">{err}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent" disabled={saving}>
              {saving ? 'Saving…' : 'Save card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
