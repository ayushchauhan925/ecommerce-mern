# E-Commerce Backend

A REST API for an e-commerce platform, built with Node.js, Express, and Prisma (MySQL). Handles authentication, product catalog, cart, Stripe checkout, order tracking, reviews, and role-based admin management. Background jobs (order emails, expired token cleanup) run through BullMQ on Redis.

Part of the [ecommerce-mern](../) monorepo, paired with a Next.js frontend in `../frontend`.

## Tech stack

Node.js, Express, JavaScript, Prisma ORM (MySQL), Redis + BullMQ (background jobs), JWT auth, Stripe (payments), Cloudinary (image uploads), Zod (validation), Jest + Supertest (tests).

## Features

- JWT authentication (access + refresh tokens) with role-based access (`CUSTOMER` / `ADMIN`)
- Product catalog with categories, search, filtering, and sorting
- Cart, checkout, and Stripe-powered payments (with webhook handling)
- Order history, cancellation, and admin status transitions
- Product reviews and ratings
- Admin management: product CRUD with Cloudinary image uploads, category management, order lookup, user role management
- OpenAPI docs served at `/api/docs`

## Prerequisites

- Node.js 20+
- MySQL (`docker-compose.yml` spins up local MySQL + Redis)
- Redis
- A [Stripe](https://stripe.com) account (test mode keys are fine)
- A [Cloudinary](https://cloudinary.com) account (for product image uploads)

## Getting started

```bash
cp .env.example .env   # fill in DATABASE_URL, JWT secrets, Stripe keys, Cloudinary keys, etc.
npm install
npx prisma migrate deploy
npx prisma db seed      # optional: creates a sample admin user + category
npm run dev              # http://localhost:5000
```

Seeded admin login (if you run the seed script): `admin@ecommerce.com` / `Admin@123`.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the server with nodemon, restarting on changes under `src/` |
| `npm start` | Start the server (production) |
| `npm test` | Run the full Jest suite (unit + integration), serially |
| `npm run test:unit` | Run only unit tests (no database/Redis needed) |
| `npm run test:integration` | Run only integration tests against a real MySQL test database |
| `npm run test:coverage` | Run the full suite with coverage |
| `npm run lint` / `npm run lint:fix` | Lint (and optionally fix) `src/**/*.js` |
| `npm run format` | Format `src/**/*.js` with Prettier |

## Testing

Integration tests run against a real MySQL database and expect `.env.test` (see `.env.test.example`) with a `DATABASE_URL` whose database name ends in `_test` — the suite refuses to run otherwise, and deletes every row between tests. External services (Redis, BullMQ, Stripe, Cloudinary) are replaced with in-process fakes, so no real network calls are made.

## Project structure

```
src/
├── config/       Environment, database, Redis, Stripe, Cloudinary setup
├── docs/         OpenAPI/Swagger docs router
├── jobs/         BullMQ queue + workers (email, order, cleanup)
├── middleware/   Auth, error handling, rate limiting, validation, uploads
├── modules/      Feature modules (auth, users, categories, products, cart, orders, payments, reviews),
│                 each with controller/service/repository/routes/validation
├── routes/       Top-level route mounting
├── utils/        Shared helpers (JWT, caching, pagination, password hashing, logging, etc.)
├── app.js        Express app wiring
└── server.js     Entry point
```
