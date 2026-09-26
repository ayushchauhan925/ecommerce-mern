# Ecommerce MERN

A full-stack e-commerce platform: a Node.js/Express/JavaScript REST API backed by MySQL and Redis, paired with a Next.js/TypeScript storefront and admin dashboard. Handles product catalog browsing, cart, Stripe checkout, order tracking, reviews, and role-based admin management.

## Structure

```
ecommerce-mern/
├── backend/    Express + JavaScript + Prisma (MySQL) REST API
└── frontend/   Next.js (App Router) + TypeScript storefront & admin panel
```

## Tech stack

**Backend** — Node.js, Express, JavaScript, Prisma ORM (MySQL), Redis + BullMQ (background jobs), JWT auth, Stripe (payments), Cloudinary (image uploads), Zod (validation), Jest + Supertest (tests).

**Frontend** — Next.js (App Router), TypeScript, Tailwind CSS, React Query (server state), Zustand (auth/session state), React Hook Form + Zod (forms), Stripe.js / React Stripe Elements (checkout).

## Features

- JWT authentication (access + refresh tokens) with role-based access (`CUSTOMER` / `ADMIN`)
- Product catalog with categories, search, filtering, and sorting
- Cart, checkout, and Stripe-powered payments
- Order history, cancellation, and admin status transitions
- Product reviews and ratings
- Admin dashboard: product CRUD with Cloudinary image uploads, category management, order lookup, user role management

## Prerequisites

- Node.js 20+
- MySQL (a `docker-compose.yml` is included in `backend/` for local MySQL + Redis)
- Redis
- A [Stripe](https://stripe.com) account (test mode keys are fine)
- A [Cloudinary](https://cloudinary.com) account (for product image uploads)

## Getting started

### 1. Backend

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL, JWT secrets, Stripe keys, Cloudinary keys, etc.
npm install
npx prisma migrate deploy
npx prisma db seed      # optional: creates a sample admin user + category
npm run dev              # http://localhost:5000
```

Seeded admin login (if you run the seed script): `admin@ecommerce.com` / `Admin@123`.

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
npm install
npm run dev                   # http://localhost:3001
```

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` should match the `STRIPE_PUBLISHABLE_KEY` set in the backend's `.env`. Make sure `CORS_ORIGIN` in the backend's `.env` matches the URL the frontend runs on.

## Testing (backend)

```bash
cd backend
cp .env.test.example .env.test   # local test database URL
npm test                          # unit + integration tests
```

## API documentation

With the backend running, interactive API docs (Swagger UI) are available at `http://localhost:5000/api/docs`. The raw OpenAPI spec lives at `backend/docs/openapi.yaml`.
