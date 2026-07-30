# Aura Beauty Ecommerce

Tienda online de productos de maquillaje y belleza. Explora productos, registráte, iniciá sesión, agregá productos al carrito y pagá utilizando mercadopago.

## Stack

- Frontend: React, Vite, React Router, Tailwind, DaisyUI, Axios
- Backend: Node.js, Express, MongoDB (Mongoose), autenticación con JWT
- Pagos: Mercadopago

## Estructura del proyecto

- `backend/src/controllers/` — auth, productos, checkout
- `backend/src/models/` — usuario, producto, orden
- `backend/src/routes/` — rutas de la API
- `frontend/src/context/` — estado de auth y carrito
- `frontend/src/pages/` — catálogo, auth, carrito, páginas de checkout
- `frontend/src/services/` — clientes de la API

## Ejecutar en local

```bash
npm install --prefix backend
npm install --prefix frontend

npm --prefix backend run dev
npm --prefix frontend run dev
```

## Resumen de la API

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/profile`

### Productos
- `GET /api/v1/products`
- `GET /api/v1/products/:productId`
- `GET /api/v1/products/admin` (admin)
- `POST /api/v1/products` (admin)
- `PUT /api/v1/products/:productId` (admin)
- `DELETE /api/v1/products/:productId` (admin)

### Checkout
- `POST /api/v1/checkout/mercadopago/preference`
- `POST /api/v1/checkout/mercadopago/webhook`
- `GET /api/v1/checkout/orders/:orderId`
- `GET /api/v1/checkout/orders/admin` (admin)

### Health
- `GET /api/health`

## Variables de entorno

Frontend: `VITE_BACKEND_URL` (default local: `http://localhost:3001/api/v1`)

Backend: ver `backend/src/config/validateEnv.js` para variables requeridas.
