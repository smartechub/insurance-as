# IT Asset Insurance Management System

## Overview

Full-stack IT Asset Insurance Management System (AssetGuard) with role-based access control, claim management, document uploads, and analytics dashboard.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Session**: express-session (httpOnly cookies)
- **Password hashing**: bcryptjs
- **File uploads**: multer (stored in `/uploads` directory)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **Frontend**: React + Vite + Tailwind CSS v4
- **Charts**: Recharts
- **Forms**: react-hook-form

## Default Login Credentials

- **Admin**: `admin@company.com` / `admin123`
- **User**: `john@company.com` / `user123`

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── it-asset-insurance/ # React + Vite frontend
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
│   └── src/seed.ts         # Database seeding script
└── uploads/                # File uploads directory
```

## Database Tables

- **users**: id, name, email, password, role (admin/user), resetToken, createdAt
- **claims**: id, employeeId, employeeName, assetCode, assetType, serialNo, damageDate, repairDate, effectedPart, caseId, payableAmount, recoverAmount, fileCharge, claimStatus, employeeFileChargeStatus, remark, createdBy, timestamps
- **documents**: id, claimId, fileName, filePath, fileType, documentType, createdAt

## API Endpoints

- `POST /api/auth/login` — Login (email + password)
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Current user
- `POST /api/auth/forgot-password` — Request password reset
- `POST /api/auth/reset-password` — Reset password with token
- `GET /api/claims` — List claims (with pagination, search, filter, sort)
- `POST /api/claims` — Create claim
- `GET /api/claims/stats` — Dashboard statistics
- `GET /api/claims/:id` — Get claim with documents
- `PUT /api/claims/:id` — Update claim
- `DELETE /api/claims/:id` — Delete claim (admin only)
- `POST /api/documents/upload/:claimId` — Upload document (multipart)
- `GET /api/documents/claim/:claimId` — Get documents for claim
- `GET /api/documents/file/:filename` — Serve uploaded file
- `DELETE /api/documents/:id` — Delete document
- `GET /api/users` — List users (admin only)
- `POST /api/users` — Create user (admin only)
- `PUT /api/users/:id` — Update user (admin only)
- `DELETE /api/users/:id` — Delete user (admin only)

## Frontend Pages

- `/login` — Login page
- `/forgot-password` — Forgot password page
- `/` or `/dashboard` — Dashboard with stats and charts
- `/claims` — Claims list with search, filter, sort, pagination
- `/claims/new` — Create claim form
- `/claims/:id` — Claim detail + document management
- `/users` — User management (admin only)

## Claim Status Flow

Pending → Processing → Approved / Rejected → Settled

## Re-seeding Database

```bash
pnpm --filter @workspace/scripts run seed
```

## Running Codegen (after OpenAPI changes)

```bash
pnpm --filter @workspace/api-spec run codegen
```

## Building API Server

```bash
pnpm --filter @workspace/api-server run build
```
