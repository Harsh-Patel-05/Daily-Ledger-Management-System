# Daily Ledger Management System — Django Backend

REST API for Indian shop ledger (Roj Mel): auth, customers, transactions, invoices, ledger, reports.

## Setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# Edit .env — set DB_PASSWORD to your PostgreSQL password
# Create DB once:  createdb -U postgres daily_ledger
# (or in psql: CREATE DATABASE daily_ledger;)
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 8001
```

### Database (PostgreSQL)

Requires a local PostgreSQL server. Defaults in `.env`:

| Variable | Default |
|----------|---------|
| `DB_NAME` | `daily_ledger` |
| `DB_USER` | `postgres` |
| `DB_PASSWORD` | `postgres` |
| `DB_HOST` | `127.0.0.1` |
| `DB_PORT` | `5432` |

Or set `DATABASE_URL=postgres://user:pass@host:5432/daily_ledger` (overrides `DB_*`).

> If port 8000 is already in use, keep using `8001`.

- API: http://127.0.0.1:8001/api/
- Swagger: http://127.0.0.1:8001/api/docs/
- Admin: http://127.0.0.1:8001/admin/

### Demo login

| Field | Value |
|-------|--------|
| Email | `mukesh@ganeshtraders.com` |
| Password | `password123` |

## API overview

| Area | Base path |
|------|-----------|
| Auth | `/api/auth/` |
| Customers | `/api/customers/` |
| Transactions | `/api/transactions/` |
| Invoices | `/api/invoices/` |
| Notifications | `/api/notifications/` |
| Dashboard | `/api/dashboard/` |
| Ledger | `/api/ledger/` |
| Reports | `/api/reports/` |
| Analytics | `/api/analytics/` |
| Health | `/api/health/` |

### Auth

- `POST /api/auth/register/` — register + JWT
- `POST /api/auth/login/` — login + JWT
- `POST /api/auth/refresh/` — refresh token
- `GET /api/auth/me/`
- `POST /api/auth/forgot-password/` · `verify-otp/` · `reset-password/`
- `POST /api/auth/change-password/`
- `GET/PATCH /api/auth/profile/` · `/api/auth/settings/`

Use header: `Authorization: Bearer <access_token>`

### Useful extras

- `POST /api/transactions/record-payment/` — payment (+ optional invoice)
- `GET /api/invoices/next-number/`
- `POST /api/invoices/{id}/duplicate/`
- `POST /api/notifications/mark-all-read/`
- `GET /api/ledger/?customerId=cust_1` — running balance ledger

IDs in JSON use frontend-style prefixes: `cust_`, `txn_`, `inv_`, `notif_`.

## Stack

Django 6 · DRF · SimpleJWT · django-filter · CORS · Pillow · drf-spectacular · SQLite (dev)
