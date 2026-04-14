# Card Tracker

Track Canadian credit cards — statement balances, due dates, utilization, and email reminders.

**Stack:** Express + SQLite (better-sqlite3) + React (Vite)

---

## Quick start

### 1. Install dependencies

```bash
cd card-tracker
npm run install:all
```

### 2. Start dev servers

```bash
npm run dev
```

- Frontend: http://localhost:5173  
- Backend API: http://localhost:3001/api

Both run concurrently. Vite proxies `/api` requests to Express automatically.

---

## Project structure

```
card-tracker/
├── package.json          # root — concurrently scripts
├── data/                 # auto-created, holds cards.db (gitignored)
├── server/
│   ├── package.json
│   └── src/
│       ├── index.js      # Express entry point + cron start
│       ├── db.js         # SQLite init + schema
│       ├── reminders.js  # nodemailer + node-cron daily check
│       └── routes/
│           ├── cards.js    # GET/POST/PUT/DELETE /api/cards
│           └── settings.js # GET/PUT /api/settings
└── client/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── styles.css
        ├── lib/
        │   ├── api.js      # fetch wrapper
        │   └── utils.js    # daysUntil, fmt, fmtDate…
        ├── hooks/
        │   └── useCards.js
        └── components/
            ├── CardItem.jsx
            ├── CardForm.jsx
            ├── Reminders.jsx
            └── SettingsModal.jsx
```

---

## Email reminders

Reminders run daily at **8:00 AM** via `node-cron`. They send an email if any card has a balance and the due date is within N days (default: 5).

Configure via the **Email settings** button in the UI, or directly in the DB.

### Gmail setup

1. Enable 2-factor authentication on your Google account  
2. Go to https://myaccount.google.com/apppasswords  
3. Create an App Password (name it "Card Tracker")  
4. Use these settings in the UI:
   - SMTP host: `smtp.gmail.com`
   - SMTP port: `587`
   - SMTP user: `your@gmail.com`
   - SMTP password: the 16-char app password

### Test immediately

Click **Test email now** in the settings modal, or:

```bash
curl -X POST http://localhost:3001/api/reminders/send
```

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/cards | List all cards |
| POST | /api/cards | Create card |
| PUT | /api/cards/:id | Update card |
| DELETE | /api/cards/:id | Delete card |
| GET | /api/settings | Get settings |
| PUT | /api/settings | Save settings |
| POST | /api/reminders/send | Trigger email now |
| GET | /api/health | Health check |

---

## Production build

```bash
cd client && npm run build
cd ../server && NODE_ENV=production node src/index.js
```

Express serves the built client from `client/dist/` on port 3001.

---

## Deploy free (Railway)

1. Push to GitHub  
2. Create new project on https://railway.app  
3. Connect your repo  
4. Set root directory to `/server`  
5. Add env var: `NODE_ENV=production`  
6. Done — Railway gives you a public URL

The SQLite DB persists on Railway's volume between deploys.
