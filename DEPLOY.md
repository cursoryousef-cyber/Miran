# 🚀 Miran Platform — Render Deployment Guide

Guide for deploying the Miran Enterprise Backend API to [Render](https://render.com) using Neon PostgreSQL.

---

## 📋 One-Click Deployment Configuration

### 1. Build Command
```bash
cd backend && npm install && npx prisma generate && npm run build
```

### 2. Start Command
```bash
cd backend && npx prisma db push && npx ts-node src/seed/seed.ts && node dist/main.js
```

### 3. Required Environment Variables
Configure these in Render Dashboard (**Environment Settings**):

| Variable Name | Required Value / Description | Example |
|---|---|---|
| `NODE_ENV` | `production` | `production` |
| `PORT` | `10000` (Render default port) | `10000` |
| `API_PREFIX` | `api/v1` | `api/v1` |
| `DATABASE_URL` | Neon PostgreSQL Connection String | `postgresql://neondb_owner:...@ep-...neon.tech/neondb?sslmode=require` |
| `JWT_ACCESS_SECRET` | Secret key for access tokens (min 32 chars) | `miran-prod-jwt-access-secret-2024` |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens (min 32 chars) | `miran-prod-jwt-refresh-secret-2024` |
| `CARD_HMAC_SECRET` | Secret key for Digital ID Cards HMAC | `miran-prod-card-hmac-secret-2024` |
| `SWAGGER_ENABLED` | Enable/Disable Swagger Docs (`true`/`false`) | `true` |
| `CORS_ORIGIN` | Allowed CORS Origins | `*` |
| `STORAGE_PROVIDER` | Storage Provider (`local`, `s3`, `azure_blob`) | `local` |

---

## 🔍 Health Check Endpoint
- **URL**: `https://<your-render-app>.onrender.com/api/v1/health`
- **Swagger Documentation**: `https://<your-render-app>.onrender.com/api/docs`

---

## 🗄️ Database Migration Command
To manually run Prisma schema sync against Neon:
```bash
npx prisma db push
```

To run Prisma seed data:
```bash
npx ts-node src/seed/seed.ts
```

---

## 🔑 Initial Admin Credentials (Platform Owner)
- **Email**: `admin@miran.health`
- **Password**: `Miran@Admin2024!`
