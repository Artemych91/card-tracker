import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function SettingsModal({ onClose }) {
  const [form, setForm] = useState({
    reminderEmail: '', smtpHost: '', smtpPort: '587',
    smtpUser: '', smtpPass: '', reminderDays: '5',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.settings.get().then(data => {
      setForm(f => ({ ...f, ...data }));
      setLoading(false);
    }).catch((err) => {
      setMsg('Error loading settings: ' + err.message);
      setLoading(false);
    });
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      await api.settings.save(form);
      setMsg('Settings saved!');
    } catch (ex) {
      setMsg('Error: ' + ex.message);
    } finally {
      setSaving(false);
    }
  };

  const testEmail = async () => {
    setTesting(true); setMsg('');
    try {
      await api.reminders.sendNow();
      setMsg('Test email triggered! Check your inbox.');
    } catch (ex) {
      setMsg('Error: ' + ex.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <h2>Email reminders</h2>
        {loading ? <p className="muted">Loading…</p> : (
          <form onSubmit={save}>
            <div className="settings-hint">
              Use any SMTP provider. For Gmail: enable 2FA → create an App Password at
              <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer"> myaccount.google.com/apppasswords</a>
            </div>

            <div className="form-grid">
              <div className="form-group full">
                <label>Send reminders to (email)</label>
                <input type="email" value={form.reminderEmail} onChange={set('reminderEmail')} placeholder="you@gmail.com" />
              </div>
              <div className="form-group">
                <label>Remind N days before due</label>
                <input type="number" value={form.reminderDays} onChange={set('reminderDays')} min={1} max={30} />
              </div>
              <div className="form-group" />

              <div className="form-group full"><div className="settings-divider">SMTP config</div></div>

              <div className="form-group">
                <label>SMTP host</label>
                <input value={form.smtpHost} onChange={set('smtpHost')} placeholder="smtp.gmail.com" />
              </div>
              <div className="form-group">
                <label>SMTP port</label>
                <input type="number" value={form.smtpPort} onChange={set('smtpPort')} placeholder="587" />
              </div>
              <div className="form-group">
                <label>SMTP user</label>
                <input value={form.smtpUser} onChange={set('smtpUser')} placeholder="you@gmail.com" />
              </div>
              <div className="form-group">
                <label>SMTP password / app password</label>
                <input type="password" value={form.smtpPass} onChange={set('smtpPass')} placeholder="••••••••" />
              </div>
            </div>

            {msg && <p className={`form-msg ${msg.startsWith('Error') ? 'form-error' : 'form-success'}`}>{msg}</p>}

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={testEmail} disabled={testing}>
                {testing ? 'Sending…' : 'Test email now'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-accent" disabled={saving}>
                {saving ? 'Saving…' : 'Save settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
