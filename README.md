# Aura Beauty Ecommerce

Full-stack ecommerce app with:

- `frontend/`: React + Vite + React Router + Tailwind + DaisyUI
- `backend/`: Express + MongoDB + JWT auth + Mercado Pago checkout

## Features

- User registration, login, logout, and session restore with httpOnly cookies
- Product catalog seeded automatically in MongoDB on first boot
- Persistent client-side cart
- Authenticated checkout flow using Mercado Pago Preferences API
- Order persistence in MongoDB and Mercado Pago webhook handling
- Responsive frontend with toast feedback and checkout result screens

## Project structure

- `backend/src/controllers/` — auth, products, checkout
- `backend/src/models/` — user, product, order
- `backend/src/routes/` — API routes
- `frontend/src/context/` — auth and cart state
- `frontend/src/pages/` — catalog, auth, cart, checkout result pages
- `frontend/src/services/` — API clients

## Environment variables

### Backend
Copy `backend/.env.example` to `backend/.env` and fill in the values.

Important variables:

- `MONGO_DB_URI`
- `MONGO_DB_USER`
- `MONGO_DB_PASSWORD`
- `MONGO_DB_NAME`
- `JWT_SECRET`
- `FRONTEND_URL`
- `BACKEND_URL`
- `MERCADO_PAGO_ACCESS_TOKEN`

`FRONTEND_URL` must match the exact frontend origin used in the browser (for example `http://localhost:5173` vs `http://127.0.0.1:5173`). If you use multiple dev origins, provide them as a comma-separated list.

### Frontend
Copy `frontend/.env.example` to `frontend/.env`.

- `VITE_BACKEND_URL=http://localhost:3001/api`

## Running locally

### 1. Install dependencies

Dependencies are already declared in each package:

```bash
npm install --prefix backend
npm install --prefix frontend
```

### 2. Start the backend

```bash
npm --prefix backend run dev
```

### 3. Start the frontend

```bash
npm --prefix frontend run dev
```

## Mercado Pago notes

- The checkout integration uses the backend to create a Mercado Pago preference.
- Users must be logged in before starting checkout.
- Payment confirmation is updated through the backend webhook endpoint:
  - `POST /api/checkout/mercadopago/webhook`
- For local webhook testing, you will usually need a public backend URL, for example with a tunnel service, and set that value in `BACKEND_URL`.

## API overview

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/profile`

### Products
- `GET /api/products`
- `GET /api/products/:productId`

### Checkout
- `POST /api/checkout/mercadopago/preference`
- `POST /api/checkout/mercadopago/webhook`
- `GET /api/checkout/orders/:orderId`

## Validation run

Validated with:

- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `node --check backend/src/server.js && node --check backend/src/controllers/checkoutControllers.js && node --check backend/src/authControllers.js && node --check backend/src/config/mercadoPago.js`
