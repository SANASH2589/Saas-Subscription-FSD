<div align="center">

# 🚀 SaaS Subscription & Entitlement Platform

**A production-grade, full-stack multi-tenant SaaS engine — Node.js · React · Supabase**

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)

</div>

---

## Overview

A plug-and-play SaaS entitlement backend + frontend for registering tenants, managing subscription plans, gating features per plan, tracking usage, and administering everything from role-separated dashboards.

**Core capabilities:**
- 🏢 Multi-tenant isolation with API key management
- 💳 FREE / PRO / ENTERPRISE subscription plans
- ⚡ Real-time feature entitlement with per-user, per-month usage tracking
- 🛡️ Rate limiting (1000 req/min), idempotency protection, RLS on all tables
- 💰 Payment webhook flow to activate subscriptions
- 👑 Role-based dashboards: `super_admin`, `tenant_admin`, `end_user`
- 🐳 One-command Docker deployment

---

## Architecture

```
 React Frontend (Vite + TailwindCSS + TypeScript)
       │ JWT Bearer                │ x-api-key
       ▼                           ▼
 Express.js Backend  ──────────────────────────────
 CORS → Logger → Auth/ApiKey → RateLimit → Routes
 /api/auth  /api/admin  /api/tenant  /api/v1  /api/webhooks
       │
       ▼ Supabase service_role
 PostgreSQL (Supabase) — RLS enforced on all tables
 tenants · api_keys · user_profiles · plans · plan_features · subscriptions · usage_events
```

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js 20, Express 4.19, @supabase/supabase-js 2.42 |
| **Frontend** | React 19, TypeScript 5.9, Vite 8, React Router 7, TailwindCSS 4, Lucide |
| **Database** | Supabase (PostgreSQL), Row Level Security, Supabase Auth |
| **Infra** | Docker Compose, Nginx (SPA), dotenv |

---

## Project Structure

```
Saas-Subscription-FSD/
├── docker-compose.yml
├── .env.example
├── database/
│   ├── schema.sql                  # Tables, RLS, indexes, seeded plans & features
│   └── migration_001_checkout.sql
├── backend/src/
│   ├── index.js                    # Express entry, mounts all routes
│   ├── supabaseAdmin.js
│   ├── seedPlanFeatures.js         # Auto-seeds on startup
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT → req.user (role, tenant_id)
│   │   ├── apiKeyAuth.js           # x-api-key → req.tenantId
│   │   ├── rateLimiter.js          # 1000 req/min per key
│   │   └── idempotency.js          # 24h deduplication
│   ├── routes/                     # authRoutes, superAdminRoutes, tenantMgmtRoutes,
│   │   └── ...                     # planRoutes, subscriptionRoutes, entitlementRoutes,
│   │                               # usageRoutes, webhookRoutes, checkoutRoutes, …
│   └── services/
│       ├── entitlementService.js   # Core check-access + fallback logic
│       ├── subscriptionService.js
│       └── apiKeyService.js
└── frontend/src/
    ├── App.tsx                     # Router + SuperAdminGuard / TenantAdminGuard
    ├── context/AuthContext.tsx
    ├── components/                 # Layout, UpgradeModal, LoadingSkeleton, EmptyState
    └── pages/
        ├── Login.tsx
        ├── SuperAdminDashboard.tsx
        ├── DeveloperDashboard.tsx
        └── DemoApp.tsx             # Public entitlement demo (no auth)
```

---

## Database Schema & Seeded Plans

```
tenants ──< api_keys
        ──< user_profiles
        ──< subscriptions >── plans ──< plan_features >── features
        ──< usage_events
```

| Plan | Price | EXPORT_PDF | API_ACCESS | ANALYTICS | BRANDING | SUPPORT |
|---|---|---|---|---|---|---|
| **FREE** | $0/mo | 5 | ❌ | ❌ | ❌ | ❌ |
| **PRO** | $49/mo | 100 | ∞ | 50 | ❌ | ❌ |
| **ENTERPRISE** | $199/mo | ∞ | ∞ | ∞ | ✅ | ✅ |

> `-1` = unlimited · `0` = disabled · `N` = N uses/month

---

## API Reference

### Public (`/api/v1`) — `x-api-key` required

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/register-tenant` | Register a tenant |
| `GET` | `/plans` / `/features` | List plans or features |
| `POST` | `/subscriptions` | Create a subscription |
| `POST` | `/check-access` | **Check feature entitlement** |
| `POST` | `/usage` | Record a usage event |
| `POST` | `/create-checkout` | Create checkout session |
| `POST` | `/api/webhooks/payment-success` | Activate subscription |

### Management — JWT required

| Prefix | Role | Examples |
|---|---|---|
| `/api/auth` | Any | login, register, profile |
| `/api/admin` | `super_admin` | tenants, plans, platform stats |
| `/api/tenant` | `tenant_admin` | api-keys, subscriptions, usage |

### Health

```
GET /health      → { status: 'UP' }
GET /health-db   → { status: 'UP', database: 'CONNECTED' }
```

---

## Entitlement Engine

**`POST /api/v1/check-access`** (authenticated with `x-api-key`)

```json
// Request
{ "external_user_id": "user_abc", "feature_code": "EXPORT_PDF" }

// Response
{ "allowed": true, "plan": "PRO", "used": 12, "limit": 100, "remaining": 88 }
```

**Decision flow:**
```
Active subscription? ─── No  ──► allowed: false (no_active_subscription)
       │ Yes
Plan feature limit? ─── 0   ──► allowed: false (feature_disabled_in_plan)
       │              ─1   ──► allowed: true  (unlimited)
Count this month's usage
       │
used >= limit  ──► allowed: false (limit_exceeded)
used <  limit  ──► allowed: true, remaining = limit - used
```

---

## Getting Started

### 1. Configure environment

```bash
cp .env.example .env   # Fill in your Supabase credentials
```

### 2. Initialize database

Run in Supabase SQL Editor (in order):
```
database/schema.sql
database/migration_001_checkout.sql
```

### 3. Run locally

```bash
# Backend
cd backend && npm install && npm run dev    # http://localhost:8080

# Frontend
cd frontend && npm install && npm run dev   # http://localhost:5173
```

### 4. Promote first super admin

```sql
UPDATE user_profiles SET role = 'super_admin' WHERE email = 'you@example.com';
```

### Docker (one command)

```bash
docker compose up --build
# Backend → :8080 | Frontend → :3000
```

---

## Environment Variables

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...          # Backend only — never expose
SUPABASE_ANON_KEY=...
PORT=8080
NODE_ENV=development
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=http://localhost:8080/api
```

> ⚠️ Never commit `.env` — it's already in `.gitignore`.

---

## Security

| Mechanism | Detail |
|---|---|
| **JWT Auth** | Supabase-issued tokens validated server-side; `role` + `tenant_id` injected via middleware |
| **API Key Auth** | SHA-256 hashed; raw key shown only once at generation |
| **Rate Limiting** | 1000 req/min per key (in-memory, Redis-ready) |
| **Idempotency** | 24-hour key cache prevents duplicate subscriptions |
| **RLS** | All tables locked; `service_role` (backend) bypasses, `anon` (frontend) enforces |
| **Route Guards** | `SuperAdminGuard` / `TenantAdminGuard` on all protected frontend routes |

---

<div align="center">

**Built with ❤️ · Node.js · React · Supabase · TypeScript · Docker**

</div>
