# Security Fixes Implementation Guide

This guide provides step-by-step instructions to implement all critical security fixes for production deployment.

## Table of Contents
1. [Critical Issues (Must Fix Before Deployment)](#critical-issues)
2. [High Priority Issues](#high-priority-issues)
3. [Medium Priority Issues](#medium-priority-issues)
4. [Testing & Verification](#testing--verification)

---

## CRITICAL ISSUES

### Issue 1: Mandatory Environment Variable Validation

**Problem**: Missing env vars can cause silent failures or expose defaults  
**Location**: `backend/src/server.js`  
**Severity**: 🔴 CRITICAL

#### Solution:
1. Create a new file: `backend/src/config/validateEnv.js`
2. Add environment validation at server startup
3. See: `backend/src/config/validateEnv.js` (provided below)

---

### Issue 2: Mandatory Webhook Secret Validation

**Problem**: Webhook can be processed without authentication (line 68 in checkoutControllers.js)  
**Location**: `backend/src/controllers/checkoutControllers.js`  
**Severity**: 🔴 CRITICAL

#### Solution:
1. Make `MERCADOPAGO_WEBHOOK_SECRET` mandatory
2. Reject webhooks if secret validation fails
3. See: Modified `backend/src/controllers/checkoutControllers.js` (provided below)

---

### Issue 3: Add Helmet for Security Headers

**Problem**: Missing security headers (clickjacking protection, XSS, MIME type sniffing)  
**Location**: `backend/src/server.js`  
**Severity**: 🔴 CRITICAL

#### Solution:
1. Install helmet: `npm install --prefix backend helmet`
2. Add helmet middleware to server.js
3. See: Modified `backend/src/server.js` (provided below)

---

## HIGH PRIORITY ISSUES

### Issue 4: Add CSRF Protection

**Problem**: No CSRF tokens on state-changing operations  
**Location**: Backend routes + Frontend forms  
**Severity**: 🟠 HIGH

#### Solution:
1. Install dependency: `npm install --prefix backend csurf cookie-parser`
   - Note: `cookie-parser` is already installed
2. Add CSRF middleware
3. Create CSRF token endpoint
4. See: New middleware file provided

---

### Issue 5: Add Input Sanitization

**Problem**: NoSQL injection risk (Zod helps but belt-and-suspenders approach)  
**Location**: `backend/src/server.js`  
**Severity**: 🟠 HIGH

#### Solution:
1. Install: `npm install --prefix backend express-mongo-sanitize`
2. Add sanitization middleware before JSON parsing
3. See: Modified `backend/src/server.js` (provided below)

---

## MEDIUM PRIORITY ISSUES

### Issue 6: Structured Logging & Request Correlation

**Problem**: Difficult to trace malicious requests; error messages may leak info  
**Location**: Backend entire app  
**Severity**: 🟡 MEDIUM

#### Solution:
1. Install: `npm install --prefix backend pino pino-http`
2. Add structured logging middleware
3. Sanitize error responses
4. See: New logging utilities provided

---

### Issue 7: Add Request Logging

**Problem**: No audit trail for API operations  
**Severity**: 🟡 MEDIUM

#### Solution:
1. Use pino-http for access logs
2. Track all checkout operations
3. See: Logging setup in server.js

---

### Issue 8: API Versioning

**Problem**: Breaking changes impact clients without control  
**Severity**: 🟡 MEDIUM

#### Solution:
1. Update all route prefixes to `/api/v1/`
2. Maintain backward compatibility
3. See: Modified route files

---

### Issue 9: Content Security Policy

**Problem**: Inline scripts and unauthorized resources can execute  
**Severity**: 🟡 MEDIUM

#### Solution:
1. Configure CSP headers via Helmet
2. See: CSP configuration in helmet setup

---

### Issue 10: Rate Limit Bypass Detection

**Problem**: Distributed attacks not detected  
**Severity**: 🟡 MEDIUM

#### Solution:
1. Monitor failed login attempts
2. Alert on unusual patterns
3. See: Advanced rate limiting setup

---

## Implementation Steps

### Step 1: Install Security Dependencies

```bash
cd backend
npm install helmet express-mongo-sanitize pino pino-http
```

### Step 2: Create Environment Validation

File: `backend/src/config/validateEnv.js`
- See file provided below

### Step 3: Update Server Configuration

File: `backend/src/server.js`
- See modified file provided below

### Step 4: Update Checkout Controller

File: `backend/src/controllers/checkoutControllers.js`
- See modified validation section

### Step 5: Create CSRF Middleware

File: `backend/src/middleware/csrfProtection.js`
- See file provided below

### Step 6: Update Auth Controller with Logging

File: `backend/src/controllers/authControllers.js`
- See modified file with sanitized errors

### Step 7: Create Logging Utilities

File: `backend/src/utils/logger.js`
- See file provided below

### Step 8: Update Routes to v1

Files:
- `backend/src/routes/authRoutes.js`
- `backend/src/routes/productRoutes.js`
- `backend/src/routes/checkoutRoutes.js`

### Step 9: Update Frontend API Client

File: `frontend/src/services/api.js`
- Update all endpoints to `/api/v1/`

### Step 10: Add Environment Variables Template

File: `backend/.env.example`
- See file provided below

---

## Testing & Verification

### Security Headers Test
```bash
# Test CORS with valid origin
curl -H "Origin: http://localhost:5173" http://localhost:3001/api/v1/health

# Test CORS with invalid origin (should fail)
curl -H "Origin: http://evil.com" http://localhost:3001/api/v1/health
```

### Rate Limiting Test
```bash
# Attempt multiple rapid auth requests
for i in {1..20}; do curl -X POST http://localhost:3001/api/v1/auth/login; done
```

### Webhook Signature Test
- Verify `MERCADOPAGO_WEBHOOK_SECRET` is set in .env
- Test that unsigned webhooks are rejected

### Environment Variable Test
```bash
# Start server without JWT_SECRET
NODE_ENV=production npm start
# Should fail with clear error message
```

---

## Pre-Deployment Checklist

- [ ] All dependencies installed
- [ ] All files created/updated per guide
- [ ] Environment variables template created
- [ ] Tests pass
- [ ] Security headers verified
- [ ] CSRF protection enabled
- [ ] Rate limiting verified
- [ ] Logging configured
- [ ] Error messages sanitized
- [ ] API versioning applied
- [ ] Webhook secret mandatory
- [ ] Run OWASP ZAP scan
- [ ] Penetration test payment flows

---

## Deployment Environment Variables

Set these in production:
```bash
NODE_ENV=production
JWT_SECRET=<strong-random-secret-64-chars>
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxxxxxxx
MERCADOPAGO_WEBHOOK_SECRET=<webhook-secret-from-mp>
MONGO_DB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net
MONGO_DB_USER=<username>
MONGO_DB_PASSWORD=<password>
MONGO_DB_NAME=aura_beauty
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
PORT=3001
```

---

## References

- [OWASP Top 10](https://owasp.org/Top10/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Mercado Pago Security](https://www.mercadopago.com.ar/developers/en/docs/your-integrations/security)
