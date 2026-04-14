# Card Tracker

Personal credit card management dashboard with email payment reminders.

## What it does

- Track multiple credit cards: statement balance, current balance, credit limit, due date, APR
- Visualize utilization per card and totals across all cards
- Send daily email reminders when a payment is due within N days (default: 5)
- Configure SMTP settings and reminder threshold via the UI

## Stack

- **Frontend:** React 18 + Vite, plain CSS, no UI framework
- **Backend:** Express.js (port 3001) + SQLite via better-sqlite3
- **Scheduler:** node-cron fires daily at 8:00 AM, sends email via nodemailer
- **Monorepo:** root `package.json` launches both servers with concurrently

## Project structure

```
card-tracker/
├── client/src/
│   ├── App.jsx                  # main component, summary stats
│   ├── components/
│   │   ├── CardItem.jsx         # card display + utilization bar
│   │   ├── CardForm.jsx         # add/edit modal
│   │   ├── Reminders.jsx        # upcoming payments list
│   │   └── SettingsModal.jsx    # SMTP + reminder config
│   ├── hooks/useCards.js        # CRUD state management
│   └── lib/
│       ├── api.js               # fetch wrapper (base: /api)
│       └── utils.js             # daysUntil, fmt, fmtDate, urgencyClass
└── server/src/
    ├── index.js                 # Express entry + cron start
    ├── db.js                    # SQLite init, schema, WAL mode
    ├── reminders.js             # email logic + cron job
    └── routes/
        ├── cards.js             # GET/POST/PUT/DELETE /api/cards
        └── settings.js          # GET/PUT /api/settings
```

## Database

SQLite file at `data/cards.db` (auto-created, gitignored). Two tables:
- `cards`: id, name, last4, limit_amt, balance, current_bal, rate, statement_date, due_date
- `settings`: key/value store for SMTP config and reminder preferences

## API

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/cards` | List, create cards |
| GET/PUT/DELETE | `/api/cards/:id` | Read, update, delete card |
| GET/PUT | `/api/settings` | Load, save SMTP config |
| POST | `/api/reminders/send` | Trigger email immediately |
| GET | `/api/health` | Health check |

## Running locally

```bash
npm run install:all   # first time only
npm run dev           # starts both servers
```

- UI: http://localhost:5173
- API: http://localhost:3001

Vite proxies all `/api/*` requests to Express in dev mode.

## User workflow

1. Receive statement: update statement balance + due date on the card
2. App sends email reminder N days before due date (if balance > 0)
3. After paying: set statement balance to 0 (or remainder if partial)
4. Next statement: repeat

Current balance is separate from statement balance - used only for utilization display, not for reminders.

## Key decisions

- CORS is dev-only: in production Express serves the built client from `client/dist/`
- SMTP password is masked in GET /api/settings response; masked value is never written back to DB
- Cards are sorted by due date ascending on the server
