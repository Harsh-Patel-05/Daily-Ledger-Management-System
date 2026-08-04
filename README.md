# Daily Ledger Management System

Professional React frontend for Indian shop ledger management (Roj Mel style).

## Tech Stack

- React 19 + Vite
- React Router
- Context API
- Tailwind CSS v4
- Recharts
- Framer Motion
- React Icons

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Demo Login

Email and password are pre-filled on the login page. Click **Sign In**.

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
