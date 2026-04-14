const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all settings
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
  // never send smtp password to client
  if (settings.smtpPass) settings.smtpPass = '••••••••';
  res.json(settings);
});

// PUT upsert settings
router.put('/', (req, res) => {
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  const upsertMany = db.transaction((entries) => {
    for (const [key, value] of entries) {
      // don't overwrite real password with masked value
      if (key === 'smtpPass' && value === '••••••••') continue;
      upsert.run({ key, value: String(value) });
    }
  });
  upsertMany(Object.entries(req.body));
  res.json({ ok: true });
});

module.exports = router;
