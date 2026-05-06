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



<div align="center">
 
ENTITLEMENT PLATFORM
<img width="500" height="270" alt="image" src="https://github.com/user-attachments/assets/60891eac-a194-41ed-8bf6-2f46e0f0e4bf" />
</div>

<br>

<div align="center">
DEMO PAGE
<img width="500" height="270" alt="image" src="https://github.com/user-attachments/assets/e4a14d7f-1b63-424a-a064-22c48b0ea05c" />
</div>


<div align="center">

**Built with ❤️ · Node.js · React · Supabase · TypeScript · Docker**

</div>
