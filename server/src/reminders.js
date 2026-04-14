const nodemailer = require('nodemailer');
const cron = require('node-cron');
const db = require('./db');

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row?.value || null;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target - now) / 86400000);
}

function fmt(n) {
  return '$' + Number(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function sendReminders() {
  const smtpHost = getSetting('smtpHost');
  const smtpPort = getSetting('smtpPort');
  const smtpUser = getSetting('smtpUser');
  const smtpPass = getSetting('smtpPass');
  const toEmail  = getSetting('reminderEmail');
  const threshold = parseInt(getSetting('reminderDays') || '5', 10);

  if (!smtpHost || !smtpUser || !smtpPass || !toEmail) {
    console.log('[reminders] Email not configured, skipping.');
    return;
  }

  const cards = db.prepare('SELECT * FROM cards').all();
  const due = cards.filter(c => {
    if (!c.balance || c.balance <= 0) return false;
    const days = daysUntil(c.due_date);
    return days !== null && days <= threshold;
  });

  if (!due.length) {
    console.log('[reminders] Nothing due soon, no email sent.');
    return;
  }

  const rows = due.map(c => {
    const days = daysUntil(c.due_date);
    const urgency = days < 0 ? 'OVERDUE' : days === 0 ? 'DUE TODAY' : `in ${days} day${days !== 1 ? 's' : ''}`;
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;font-weight:500">${c.name}${c.last4 ? ' ···'+c.last4 : ''}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;color:${days <= 0 ? '#c0392b' : days <= 3 ? '#e67e22' : '#27ae60'};font-weight:500">${urgency}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee">${fmtDate(c.due_date)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;font-family:monospace">${fmt(c.balance)}</td>
      </tr>`;
  }).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="font-size:20px;margin-bottom:4px">💳 Card payments due soon</h2>
      <p style="color:#888;font-size:13px;margin-bottom:20px">${new Date().toLocaleDateString('en-CA', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.5px">Card</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.5px">When</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.5px">Due date</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.5px">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:24px;font-size:12px;color:#aaa">Sent by Card Tracker</p>
    </div>`;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort || '587', 10),
    secure: smtpPort === '465',
    auth: { user: smtpUser, pass: smtpPass },
  });

  try {
    await transporter.sendMail({
      from: `"Card Tracker" <${smtpUser}>`,
      to: toEmail,
      subject: `💳 ${due.length} card payment${due.length !== 1 ? 's' : ''} due soon`,
      html,
    });
    console.log(`[reminders] Email sent to ${toEmail} for ${due.length} card(s).`);
  } catch (err) {
    console.error('[reminders] Failed to send email:', err.message);
  }
}

function startCron() {
  // runs every day at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[reminders] Running daily check...');
    try {
      await sendReminders();
    } catch (err) {
      console.error('[reminders] Cron job failed:', err.message);
    }
  });
  console.log('[reminders] Cron scheduled: daily at 8:00 AM');
}

module.exports = { startCron, sendReminders };
