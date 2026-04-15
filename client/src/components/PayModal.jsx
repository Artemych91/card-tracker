import { useState } from 'react';
import { fmt } from '../lib/utils';

export default function PayModal({ card, onSave, onClose }) {
  const [amount,  setAmount]  = useState(card.balance ?? '');
  const [note,    setNote]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) { setErr('Amount must be positive'); return; }
    setSaving(true); setErr('');
    try {
      await onSave(amt, note || null);
      onClose();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaving(false);
    }
  };

  const payFull = async () => {
    if (!card.balance || card.balance <= 0) return;
    setSaving(true); setErr('');
    try {
      await onSave(card.balance, 'Paid in full');
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
        <h2>Record Payment</h2>
        <p className="modal-subtitle">{card.name}{card.last4 ? ` ···· ${card.last4}` : ''}</p>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-group full">
              <label>Amount paid ($)</label>
              <input type="number" step="0.01" min="0.01" value={amount}
                onChange={e => setAmount(e.target.value)} placeholder="921.00" autoFocus />
            </div>
            <div className="form-group full">
              <label>Note (optional)</label>
              <input value={note} onChange={e => setNote(e.target.value)}
                placeholder="e.g. partial payment" />
            </div>
          </div>
          {err && <p className="form-error">{err}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            {card.balance > 0 && (
              <button type="button" className="btn btn-ghost btn-pay" onClick={payFull} disabled={saving}>
                Pay in full ({fmt(card.balance)})
              </button>
            )}
            <button type="submit" className="btn btn-accent" disabled={saving}>
              {saving ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
