# Aarambh AI — Intelligent Event Planning & Operations Platform

A full-stack, production-oriented GenAI-powered Event Planning Assistant built with **React 19 + Vite + Tailwind CSS v4**, **Node.js + Express**, **MongoDB + Mongoose**, **Zod**, and the **Google Gemini SDK (`@google/genai`)**.

---

## 1. Architecture & System Overview

```text
+-----------------------------------------------------------------------------------+
|                        BROWSER CLIENT (React 19 + Vite SPA)                       |
|  Landing | Auth & Recovery | Portfolio Dashboard | 4-Step Event Wizard            |
|  Event Workspace: Overview · AI Planner · Paise Budget · Timeline · Vendors ·     |
|                   Guests · Printable Reports | Profile/DPDP | Admin Console       |
+-----------------------------------------+-----------------------------------------+
                                          |
                        HTTPS / SameSite=Lax HttpOnly Cookie
                        + X-CSRF-Token Header + Bearer Token
                                          v
+-----------------------------------------------------------------------------------+
|                     EXPRESS BACKEND API (/api/v1/* on Port 3000)                  |
|  - Helmet Security Headers & Explicit CORS Allowlist                              |
|  - Request ID Tracing (`X-Request-Id`) & 100kb JSON Body Limit                    |
|  - NoSQL Operator Sanitizer (`$gt`, `$ne`, `$where` stripped recursively)         |
|  - Rate Limiters (`authRateLimiter`, `aiRateLimiter`) with Audit Logging          |
|  - Deny-by-Default RBAC (`requireRole`) & Resource Isolation (`verifyEventAccess`)|
+-------------------+-------------------------------------------+-------------------+
                    |                                           |
                    v                                           v
+---------------------------------------+   +---------------------------------------+
|   MONGODB ATLAS / MONGOOSE ENGINE     |   |   SERVER-SIDE GEMINI LLM SERVICE      |
|  12 Validated Collections & Indexes:  |   |  - `@google/genai` (`gemini-3.8-flash`)|
|  User, Event, EventMembership,        |   |  - Prompt-Injection Sanitization      |
|  BudgetCategory, Expense, Task,       |   |  - Strict `Type` JSON Response Schema |
|  Vendor, EventVendor, Guest,          |   |  - Zod Post-Generation Validation     |
|  AiPlanGeneration, Notification,      |   |  - Per-User Daily Quota & Timeouts    |
|  AuditLog (+ Durable Local Store)     |   |  - Explicit User Approval Gate        |
+---------------------------------------+   +---------------------------------------+
```

---

## 2. Database Schemas & Indexes (`src/server/models/schemas.ts`)

1. **`User`**: `name`, `email` (unique index), `passwordHash` (`select: false`), `role` (`customer`, `admin`, `vendor`, `collaborator`), `emailVerified`, `verificationTokenHash`, `resetTokenHash`, `sessionVersion`, `status`, `privacySettings`, `aiDailyCount`.
2. **`Event`**: `ownerId` (indexed), `title`, `eventType`, `startDate`, `endDate`, `timezone`, `city`, `venueName`, `indoorOutdoor`, `estimatedGuests`, `totalBudgetPaise` (integer paise), `emergencyReservePaise`, `currency`, `dietaryRequirements`, `accessibilityRequirements`, `planningStatus`.
3. **`EventMembership`**: Compound unique index `{ eventId: 1, userId: 1 }` with granular permissions (`read`, `tasks:write`, `guests:write`, `budget:write`, `vendors:write`).
4. **`BudgetCategory`**: Compound unique index `{ eventId: 1, name: 1 }`, `plannedAmountPaise`, `isAiEstimated`.
5. **`Expense`**: `eventId`, `categoryId`, `amountPaise`, `advancePaidPaise`, `paymentStatus`, `priceType` (`confirmed_invoice`, `vendor_quotation`, `ai_estimate`).
6. **`Task`**: `eventId`, `title`, `category`, `priority`, `status`, `dueDate`, `isEventDayRunSheet`, `runSheetTime`.
7. **`Vendor` & `EventVendor`**: Quotation comparison, `quotedAmountPaise`, `advancePaidPaise`, `isVerifiedQuotation`, `status`, `documentReference`.
8. **`Guest`**: `eventId`, `fullName`, `groupName`, `rsvpStatus`, `headcount`, `dietaryPreference`, `tableOrSeatingNote`, `requiresAccessibilitySupport`.
9. **`AiPlanGeneration`**: Versioned AI blueprints, `modelName`, `status`, `structuredPlan`, `estimatedInputTokens`, `estimatedOutputTokens`, `latencyMs`.
10. **`Notification` & `AuditLog`**: Security and operational telemetry.

---

## 3. API Contracts (`/api/v1`)

- `GET /api/v1/health` & `GET /api/v1/ready` — Process health and database/AI readiness checks.
- `POST /api/v1/auth/register` — Register account, hash password with bcrypt, issue verification token.
- `POST /api/v1/auth/login` — Authenticate, issue `HttpOnly` session cookie + `X-CSRF-Token`.
- `POST /api/v1/auth/verify-email` & `POST /api/v1/auth/resend-verification` — Verify email with expiring token.
- `POST /api/v1/auth/forgot-password` & `POST /api/v1/auth/reset-password` — Single-use password reset with automatic `sessionVersion` increment (revoking all prior sessions).
- `GET /api/v1/events` & `POST /api/v1/events` — List owned/shared events; create validated event with atomic default budget categories.
- `GET /api/v1/events/:eventId` & `PATCH /api/v1/events/:eventId` & `DELETE /api/v1/events/:eventId` — Resource-isolated event operations.
- `POST /api/v1/events/:eventId/ai-plans/generate` — Generate schema-validated 12-part AI event blueprint.
- `POST /api/v1/events/:eventId/ai-plans/:planId/apply` — Explicit user approval gate syncing AI categories and tasks.
- `POST /api/v1/events/:eventId/personalized-ideas` — Generate themed decor, menu, low-budget, sustainable, and weather-backup ideas.
- `GET/POST /api/v1/events/:eventId/budget/*` — Paise-accurate budget categories and expense ledger.
- `GET/POST/PATCH/DELETE /api/v1/events/:eventId/tasks` — Checklist, calendar, and event-day run sheet items.
- `GET/POST/PATCH/DELETE /api/v1/events/:eventId/vendors` — Vendor quotation comparison and advance tracking.
- `GET/POST/PATCH/DELETE /api/v1/events/:eventId/guests` & `/guests/import` — Guest RSVP & dietary management.
- `GET /api/v1/events/:eventId/reports/export.csv` — Authorized, formula-injection-sanitized CSV exports.
- `GET/PATCH /api/v1/admin/*` — Server-enforced Admin Console endpoints.

---

## 4. Local Development, MongoDB Atlas Setup & Deployment

### Local Development
1. Copy `backend/.env.example` to `.env` and configure `MONGODB_URI`, `SESSION_SECRET`, `CSRF_SECRET`, and `GEMINI_API_KEY`.
2. Install dependencies: `npm install`
3. Start full-stack server on Port 3000: `npm run dev`
4. Run automated unit, integration, and security tests: `npm test`
5. Build production bundle: `npm run build`

### MongoDB Atlas Production Setup
1. Provision a MongoDB Atlas cluster (`M10+` for replica-set transactions or `M0/Flex` for general workloads).
2. Create a least-privilege database user (`readWrite` on database `aarambh_ai` only).
3. Enable TLS and restrict network IP access to your Node.js application host egress IPs.
4. Set `MONGODB_URI` in your backend host environment variables. On startup, `ensureDatabaseIndexes()` safely synchronizes all collection indexes without dropping existing data.

### Security & Production Launch Checklist
- [x] Passwords hashed with `bcryptjs` (10 rounds); never logged or returned in API responses.
- [x] Browser sessions use `HttpOnly`, `SameSite=Lax`, `Secure` (in production) cookies paired with HMAC-SHA256 `X-CSRF-Token` validation and `sessionVersion` revocation on logout/password reset.
- [x] Deny-by-default resource isolation (`verifyEventAccess`) prevents cross-user horizontal privilege escalation (`403 FORBIDDEN_EVENT_ACCESS`).
- [x] Server-side role middleware (`requireRole('admin')`) protects all `/api/v1/admin/*` routes independently of frontend navigation.
- [x] NoSQL operator injection (`$gt`, `$ne`, `$where`) recursively stripped by `sanitizeNoSqlMiddleware`.
- [x] Gemini API key accessed strictly server-side (`process.env.GEMINI_API_KEY`); AI outputs validated with Zod before storage; explicit user approval required before syncing to event budgets/tasks.
- [x] CSV exports neutralize spreadsheet formula injection (`=`, `+`, `-`, `@` prefixes).
- [ ] **Remaining Manual Production Steps**: Configure production SMTP credentials (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) when switching `EMAIL_PROVIDER` from `console` to `smtp`, and attach custom TLS domain certificates on your hosting provider.
