# Daily Ledger Management System

Indian shop ledger (Roj Mel) — React frontend + Django REST backend.

## Tech Stack

**Frontend:** React 19 + Vite · React Router · Context API · Tailwind CSS v4 · Recharts · Framer Motion  

**Backend:** Django 6 · DRF · SimpleJWT · django-filter · CORS · SQLite (dev)

## Frontend

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

Copy `.env.example` → `.env` if needed (`VITE_API_URL=http://127.0.0.1:8001/api`). Frontend talks to Django after login.

## Backend

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 8001
```

- API docs: http://127.0.0.1:8001/api/docs/  
- Full API notes: [backend/README.md](backend/README.md)

## Demo Login

| | |
|--|--|
| Email | `mukesh@ganeshtraders.com` |
| Password | `password123` |

Same credentials for frontend demo and API. Click **Sign In** on the login page.

## Features

- Auth flow (Login, Forgot Password, OTP, Reset Password)
- Dashboard with KPIs, unpaid invoices, activity log & charts
- Customer CRUD + credit utilization + record payment
- Transactions with date filters & CSV export
- **Invoices**: generate with logo, OCR upload, PDF/print, duplicate, record payment
- Customer Ledger with timeline & table views
- Reports & Analytics
- Notifications, Profile, Settings (bank/UPI on invoices)
- **Ctrl+K** command palette
- Auto localStorage persistence + backup/restore JSON
- Dark mode (UI toggle)
- Fully responsive

## Keyboard

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Open command palette |

## Project Structure

```
src/
  components/   # Reusable UI + layout
  pages/        # Route pages
  layouts/      # Auth & App shells
  context/      # Auth, Theme, Toast, App state
  hooks/        # Custom hooks
  routes/       # Routing
  data/         # Dummy JSON data
  utils/        # Helpers & formatters
  styles/       # Global CSS / Tailwind
```

## Scripts

| Command       | Description          |
|---------------|----------------------|
| `npm run dev` | Start dev server     |
| `npm run build` | Production build   |
| `npm run preview` | Preview build    |
