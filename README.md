# DwellOS — Housing & Roommate Management Platform Backend

DwellOS is a modular monolithic backend API powering an end-to-end co-living, housing, and roommate management platform. Built with **Node.js**, **Express 5**, **TypeScript**, and **Prisma 8 (Prisma Next)** with PostgreSQL, Redis distributed background scheduling, and Stripe payment processing.

---

## 🏗️ Architecture & Design Principles

The backend is architected as a **Modular Monolith** adhering to strict separation of concerns, transactional safety, and robust error handling.

### 1. Module Structure

Every domain module under `src/modules/<module-name>/` implements the canonical layer pattern using `<module_name>.<file_type>.ts`:

```text
src/modules/<domain>/
├── <domain>.schemas.ts       # Zod schemas for input validation & typed DTOs (<domain>.schema.ts)
├── <domain>.services.ts      # Business logic, domain rules, Prisma 8 transactions (<domain>.service.ts)
├── <domain>.controllers.ts   # Express route handlers wrapped in catchAsync (<domain>.controller.ts)
└── <domain>.routes.ts        # Express Router mounting validation & RBAC middlewares (<domain>.route.ts)
```

### 2. Standardized `catchAsync` Error Handling

All controller handlers across every module (including `health`) are wrapped in the high-performance `catchAsync` higher-order function:

```typescript
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendSuccess } from '../../lib/errors.ts';
import { roomService } from './rooms.services.ts';

export const createRoomHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await roomService.createRoom(req.params.propertyId, req.body, req.user!.id);
  return sendSuccess(res, result, 201);
});
```

Any asynchronous rejection or unhandled error is forwarded directly to Express `next(err)` and formatted by the **Global Error Middleware** into the standard response envelope.

### 3. Unified Response Envelope

Every API response adheres strictly to the envelope structure:

- **Success (`2xx`)**:

  ```json
  {
    "data": { ... },
    "error": null
  }
  ```

- **Error (`4xx`/`5xx`)**:

  ```json
  {
    "data": null,
    "error": {
      "code": "VALIDATION_ERROR | NOT_FOUND | CONFLICT | UNAUTHORIZED | FORBIDDEN | BAD_REQUEST",
      "message": "Human readable explanation",
      "details": { ... }
    }
  }
  ```

### 4. Concurrency & Financial Integrity

- **Optimistic Concurrency Control**: Any room occupancy change inspects `room.version` inside a database transaction, increments the version atomically, and writes an `AuditLog` row in the same transaction. If another process mutated the room concurrently, an `OptimisticLockError` (`409 Conflict`) is thrown.
- **Integer Minor Units**: All monetary values (rent, deposits, utility splits, refunds) are handled exclusively in **integer cents** (e.g., `$1,350.00` = `135000`) to eliminate IEEE 754 floating-point errors.
- **Fair-Housing Compliance**: Search queries and matching algorithms reject prohibited demographic filters (race, religion, familial status, disability).
- **Immutable Audit Trail**: State transitions across leases, room occupancies, payments, and document signatures record immutable `AuditLog` entries with actor ID, timestamp, and before/after payloads.

---

## 📮 Postman API Client Integration

DwellOS includes a comprehensive, ready-to-import Postman collection and environment covering all 18 modules and 50+ endpoints.

### Files Included

- [`postman_collection.json`](file:///home/hm/Workshops/programming_hero/DwellOS/backend/postman_collection.json) — Complete Postman Collection v2.1.0 with grouped folders, sample request payloads, and automatic token management.
- [`postman_environment.json`](file:///home/hm/Workshops/programming_hero/DwellOS/backend/postman_environment.json) — Environment variables preconfigured for local development and test users.

### How to Import & Use in Postman

1. Open **Postman**.
2. Click **Import** (top left).
3. Drag & drop `postman_collection.json` and `postman_environment.json` (or import directly from `http://localhost:5000/postman_collection.json` and `http://localhost:5000/postman_environment.json` while the server is running).
4. Select **DwellOS Local Environment** as your active environment in the top-right environment selector.
5. Execute `01. Auth > Login` or `Register Tenant`:
   - Postman's built-in test script automatically stores the returned `accessToken` into the `{{accessToken}}` collection variable.
   - All subsequent authenticated requests automatically inherit and send the `Bearer {{accessToken}}` header.

---

## 🛠️ Technology Stack

| Layer | Technology |
| --- | --- |
| **Runtime & Language** | Node.js (LTS >= 22.18) + TypeScript (strict mode) |
| **HTTP Framework** | Express 5.x (`express@^5.2.1`) |
| **ORM & Database** | Prisma 8 (`@prisma/orm-postgres`, `contract.prisma`) + PostgreSQL |
| **Validation** | Zod (`zod@^4.5.4`) |
| **Authentication** | JWT (Access + Refresh token pair) & bcryptjs |
| **Payments & Payouts** | Stripe SDK (SetupIntents, PaymentIntents, Connect payouts, Webhook deduping) |
| **Background Scheduler** | Lightweight Redis distributed-locking cron scheduler (`ioredis`) |
| **API Client** | Postman Collection v2.1.0 & Postman Environment |

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js**: `v22.18.0` or higher
- **pnpm**: `v11.21.0` or higher
- **PostgreSQL**: Running instance or Neon / Prisma Postgres connection
- **Redis**: Running instance (Local or Redis Cloud)

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd backend
pnpm install
```

### 3. Environment Configuration

Copy the sample environment file:

```bash
cp .env.example .env
```

Update `.env` with your credentials:

```ini
PORT=5000
NODE_ENV=development
CORS_ORIGIN=*

# PostgreSQL / Neon Connection
DATABASE_URL="postgresql://user:password@localhost:5432/dwellos?sslmode=require"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_KEY_PREFIX=dwellos:

# JWT
JWT_SECRET=super_secret_access_jwt_key_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=super_secret_refresh_jwt_key_here
JWT_REFRESH_EXPIRES_IN=30d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. Prisma 8 Database Workflow & Seeding

Emit the typed contract, plan migrations, apply them, and seed initial test data:

```bash
# 1. Compile contract.prisma to TypeScript definitions
pnpm contract:emit

# 2. Plan and apply migration package
pnpm migration:plan --name dwellos_schema
pnpm migrate

# 3. Seed comprehensive test dataset
pnpm tsx prisma/seed.ts
```

The seed script creates a complete live demonstration environment:

- **Admin**: `admin@dwellos.io` / `AdminPassword123!`
- **Owner**: `owner@dwellos.io` / `OwnerPassword123!`
- **Tenants**: `tenant1@dwellos.io` / `TenantPassword123!` and `tenant2@dwellos.io`
- **Property & Rooms**: Downtown Austin apartment with multiple furnished master suites
- **Live Records**: Active leases, invoices, Stripe payment intents, utility splits, maintenance tickets, documents, and audit logs.

### 5. Running the Application

```bash
# Start development server with hot-reload
pnpm dev

# Typecheck codebase
pnpm tsc --noEmit

# Build production bundle with tsdown
pnpm build

# Run production bundle
pnpm start
```

---

## ⏱️ Background Cron Jobs (Lightweight Redis Scheduler)

Rather than heavy external queue dependencies, DwellOS runs a high-performance, fault-tolerant **Lightweight Redis Scheduler** (`src/lib/queue.ts`). It uses atomic distributed locks (`SET key val NX EX`) to guarantee that scheduled tasks run exactly once across multi-instance clusters.

| Job | Frequency | Purpose |
| --- | --- | --- |
| `expire-application-holds` | Every 10 min | Sweeps application holds older than 72 hours, releases room reservations, and logs audit events. |
| `generate-rent-invoices` | Daily (`0 0 * * *`) | Automatically generates recurring rent invoices for active leases matching billing cycle days. |
| `send-reminders` | Daily (`0 8 * * *`) | Issues upcoming rent notifications (3 days prior), overdue notices, and calculates late fees. |
| `reconcile-stripe` | Hourly (`0 * * * *`) | Cross-checks internal payment statuses against Stripe PaymentIntents to detect chargebacks or settled payouts. |

---

## 📋 API Directory & Endpoint Reference

Base URL: `http://localhost:5000/api/v1` (or direct `/` for convenience)

### 00. Health & Diagnostics

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | API and database health status |
| `GET` | `/` | Service root and Postman collection links |
| `GET` | `/postman_collection.json` | Download Postman Collection v2.1.0 |
| `GET` | `/postman_environment.json` | Download Postman Local Environment |

### 01. Authentication (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Register new TENANT or OWNER account |
| `POST` | `/auth/login` | Public | Authenticate with email/password; returns JWT pair |
| `POST` | `/auth/refresh` | Public | Issue new access token using refresh token |
| `POST` | `/auth/logout` | Authenticated | Revoke refresh token and invalidate session |
| `GET` | `/auth/me` | Authenticated | Fetch current user profile |

### 02. User Management (`/api/v1/users`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/users/:id` | Authenticated | Fetch user profile by ID |
| `PATCH` | `/users/:id` | Self / Admin | Update personal profile details |
| `POST` | `/users/:id/suspend` | ADMIN | Suspend or unsuspend a user account |

### 03. Properties (`/api/v1/properties`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/properties` | OWNER / ADMIN | Create new property listing |
| `GET` | `/properties` | Authenticated | List properties with cursor pagination |
| `GET` | `/properties/:id` | Public | Get property details with room list |
| `PATCH` | `/properties/:id` | Owner / Manager | Update property details |
| `DELETE` | `/properties/:id` | Owner / Admin | Soft-archive property |
| `POST` | `/properties/:id/managers` | Property Owner | Assign property manager |
| `DELETE` | `/properties/:id/managers/:managerId` | Property Owner | Revoke manager assignment |

### 04. Rooms & Occupancy (`/api/v1`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/properties/:propertyId/rooms` | Owner / Manager | Create room within property |
| `GET` | `/properties/:propertyId/rooms` | Public | List rooms for a property |
| `GET` | `/rooms/:id` | Public | Get room details |
| `PATCH` | `/rooms/:id` | Owner / Manager | Update room with optimistic concurrency (`version`) |
| `DELETE` | `/rooms/:id` | Owner / Admin | Archive room |

### 05. Search & Discovery (`/api/v1/search`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/search/properties` | Public | Filter search (price, city, amenities) with Fair Housing guardrails |
| `GET` | `/search/saved` | Authenticated | List saved searches |
| `POST` | `/search/saved` | Authenticated | Save search filter criteria with alert preference |
| `DELETE` | `/search/saved/:id` | Owner of Search | Remove saved search |

### 06. Roommate Matching (`/api/v1`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/roommate-profile` | TENANT | Create or update roommate lifestyle profile |
| `GET` | `/roommate-profile` | TENANT | Retrieve own roommate profile |
| `GET` | `/matches` | TENANT | Fetch explainable roommate matches (0-100 score breakdown) |
| `POST` | `/rooms/:id/roommate-approval` | Roommate | Vote to accept/reject incoming roommate applicant |

### 07. Viewing Requests (`/api/v1/viewing-requests`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/viewing-requests` | TENANT | Schedule viewing for room |
| `GET` | `/viewing-requests` | Authenticated | List viewings scoped to user or manager |
| `GET` | `/viewing-requests/:id` | Authenticated | Get viewing request details |
| `PATCH` | `/viewing-requests/:id/status` | Manager / Tenant | Transition viewing status (`CONFIRMED`, `CANCELLED`, etc.) |

### 08. Tenancy Applications (`/api/v1/applications`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/applications` | TENANT | Submit application (places 72-hour hold on room) |
| `GET` | `/applications` | Authenticated | List applications scoped to tenant or property |
| `GET` | `/applications/:id` | Authenticated | Get application details |
| `POST` | `/applications/:id/documents` | Applicant | Upload supporting application documents |
| `PATCH` | `/applications/:id/status` | Manager | Update status (`UNDER_REVIEW`, `REJECTED`, `WITHDRAWN`) |
| `POST` | `/applications/:id/approve` | Manager / Owner | Transactional approval: creates lease & writes audit log |

### 09. Tenant Verification (`/api/v1/verifications`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/verifications` | TENANT | Submit government ID and proof of income |
| `GET` | `/verifications` | Authenticated | List verification submissions |
| `GET` | `/verifications/:id` | Authenticated | Get verification details |
| `PATCH` | `/verifications/:id/review` | ADMIN | Review verification (`VERIFIED` or `REJECTED`) |

### 10. Leases (`/api/v1/leases`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/leases` | Owner / Manager | Draft digital lease agreement |
| `GET` | `/leases` | Authenticated | List leases scoped by tenant or property |
| `GET` | `/leases/:id` | Authenticated | Get lease details, tenants, and ledger |
| `POST` | `/leases/:id/roommates` | Lease Tenant / Mgr | Add roommate to lease |
| `DELETE` | `/leases/:id/roommates/:userId` | Lease Tenant / Mgr | Remove roommate from lease |
| `POST` | `/leases/:id/renew` | Manager / Owner | Offer lease renewal with new term and rent |
| `POST` | `/leases/:id/terminate` | Manager / Owner | Terminate lease early or schedule move-out |

### 11. Rent & Invoicing (`/api/v1`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/leases/:leaseId/invoices` | Authenticated | List all invoices for a lease |
| `GET` | `/invoices/:id` | Authenticated | Get invoice breakdown with line items and status |

### 12. Payments (`/api/v1/payments`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/payments/setup-intent` | Authenticated | Create Stripe SetupIntent to securely save payment method |
| `POST` | `/payments/payment-intent/rent` | Tenant | Create Stripe PaymentIntent for rent invoice |
| `POST` | `/payments/payment-intent/bill` | Tenant | Create Stripe PaymentIntent for utility share |
| `POST` | `/payments/payment-intent/deposit` | Tenant | Create Stripe PaymentIntent for security deposit |
| `POST` | `/payments/refund` | Owner / Admin | Issue partial or full refund through Stripe |
| `POST` | `/payments/webhook` | Stripe Webhook | Receive and deduplicate Stripe webhook events |

### 13. Utility Bills (`/api/v1`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/properties/:propertyId/bills` | Manager / Owner | Create property bill and auto-calculate exact cent splits |
| `GET` | `/properties/:propertyId/bills` | Authenticated | List utility bills for property |
| `GET` | `/bills/:id` | Authenticated | Get bill details with all tenant shares |
| `GET` | `/bills/:id/shares` | Authenticated | List specific tenant share breakdown |

### 14. Maintenance (`/api/v1`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/rooms/:roomId/maintenance` | Room Tenant | Submit maintenance ticket |
| `GET` | `/rooms/:roomId/maintenance` | Authenticated | List tickets for room |
| `GET` | `/maintenance` | Authenticated | List tickets scoped to tenant or property |
| `GET` | `/maintenance/:id` | Authenticated | Get ticket details and history |
| `PATCH` | `/maintenance/:id` | Manager / Admin | Update ticket, assign contractor, set scheduled date |
| `POST` | `/maintenance/:id/rate` | Tenant | Submit 1-5 star rating and feedback on resolved ticket |

### 15. Rental Documents (`/api/v1`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/leases/:leaseId/documents` | Manager / Tenant | Upload lease agreement or addendum |
| `GET` | `/leases/:leaseId/documents` | Authenticated | List documents for lease |
| `GET` | `/documents/:id` | Authenticated | Get document details and signature state |
| `POST` | `/documents/:id/sign` | Signer | Digitally sign document (records IP, timestamp, hash) |
| `GET` | `/documents/:id/audit-log` | Authenticated | Get tamper-evident signature audit trail |

### 16. Notifications (`/api/v1`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/notifications` | Authenticated | Fetch current user notifications |
| `PATCH` | `/notifications/:id/read` | Recipient | Mark notification as read |
| `GET` | `/notification-preferences` | Authenticated | Get user notification channel preferences |
| `PATCH` | `/notification-preferences` | Authenticated | Update notification channel preferences |

### 17. Dashboard (`/api/v1/dashboard`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/dashboard/overview` | Owner / Manager | Portfolio KPIs: occupancy rate, revenue, open tickets |
| `GET` | `/dashboard/properties/:propertyId` | Owner / Manager | Specific property breakdown metrics |

### 18. Administration & Disputes (`/api/v1/admin`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/admin/users` | ADMIN | List and search users across platform |
| `PATCH` | `/admin/users/:id/role` | ADMIN | Elevate or modify user role |
| `GET` | `/admin/disputes` | ADMIN | View open tenant or billing disputes |
| `PATCH` | `/admin/disputes/:id` | ADMIN | Resolve dispute and credit/debit balances |
| `GET` | `/admin/audit-logs` | ADMIN | Query immutable system audit logs with filters |

---

## 🔒 Security & Fair Housing Compliance

- **No Raw Card Data**: Credit card numbers never touch the server; Stripe Elements and SetupIntents handle all PCI compliance.
- **Fair-Housing Safeguards**: Search and roommate matching filters reject prohibited demographic criteria.
- **Resource-Scoped Authorization**: Property managers can only access properties and rooms explicitly assigned to them.
- **Tamper-Evident Signatures**: Signatures record client IP, user agent, cryptographic digest, and immutable timestamp.

---

## 📄 License

MIT License. Built for DwellOS.
