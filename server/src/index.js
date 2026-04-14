const express = require('express');
const cors = require('cors');
const path = require('path');
const cardsRouter = require('./routes/cards');
const settingsRouter = require('./routes/settings');
const emailLogsRouter = require('./routes/emailLogs');
const { startCron, sendReminders } = require('./reminders');

const app = express();
const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: 'http://localhost:5173' }));
}
app.use(express.json());

// API routes
app.use('/api/cards', cardsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/email-logs', emailLogsRouter);

// Trigger reminder manually (useful for testing)
app.post('/api/reminders/send', async (req, res) => {
  try {
    await sendReminders();
    res.json({ ok: true });
  } catch (err) {
    console.error('[reminders] Manual trigger failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Serve built client in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
  startCron();
});
