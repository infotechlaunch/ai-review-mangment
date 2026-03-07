# Backend API Endpoints — Technical Analysis Report

**Generated:** 2026-03-05  
**Scope:** `d:/infotech-lanuch/AI-review-mgnt/backend`  
**Base URL:** `http://localhost:4000`

---

## Table of Contents

1. [Complete Endpoint Inventory](#1-complete-endpoint-inventory)
2. [Duplicate Routes](#2-duplicate-routes)
3. [Unused / Orphaned Route Files](#3-unused--orphaned-route-files)
4. [Missing Authentication Protection](#4-missing-authentication-protection)
5. [Missing Error Handling](#5-missing-error-handling)
6. [Inconsistent Naming Conventions](#6-inconsistent-naming-conventions)
7. [REST Best Practices Audit](#7-rest-best-practices-audit)
8. [Response Structure Consistency](#8-response-structure-consistency)
9. [Security Risk Assessment](#9-security-risk-assessment)
10. [Scalability & Maintainability Suggestions](#10-scalability--maintainability-suggestions)
11. [Summary Matrix](#11-summary-matrix)

---

## 1. Complete Endpoint Inventory

> Routes are grouped by the router prefix registered in `server.js`.  
> Routes from **hybrid** files (`admin_route_hybrid.js`, `review_route_hybrid.js`) are listed separately in §3 because they are **not mounted** in `server.js`.

---

### 1.1 Health Check — `server.js` (inline)

| # | Method | Path | Controller | Middleware | Access |
|---|--------|------|-----------|-----------|--------|
| 1 | `GET` | `/health` | Inline handler | None | Public |

---

### 1.2 Auth — prefix `/api/auth` → `auth_route.js`

| # | Method | Path | Controller | Middleware | Access |
|---|--------|------|-----------|-----------|--------|
| 2 | `POST` | `/api/auth/login` | `auth_controller.login` | None | Public |
| 3 | `POST` | `/api/auth/register/client` | `auth_controller.registerClientOwner` | None | Public |
| 4 | `GET`  | `/api/auth/google` | `auth_controller.googleLogin` (delegates to `google_oauth_controller.initiateOAuthFlow`) | None | Public |
| 5 | `GET`  | `/api/auth/google/callback` | `auth_controller.googleCallback` (delegates to `google_oauth_controller.handleOAuthCallback`) | None | Public |
| 6 | `GET`  | `/api/auth/verify` | `auth_controller.verifyTokenEndpoint` | `authenticate` | Authenticated |

---

### 1.3 Google OAuth — prefix `/api/google-oauth` → `google_oauth_route.js`

| # | Method | Path | Controller | Middleware | Access |
|---|--------|------|-----------|-----------|--------|
| 7  | `GET`  | `/api/google-oauth/connect` | `google_oauth_controller.initiateOAuthFlow` | `authenticate`, `authorize(['CLIENT_OWNER'])` | CLIENT_OWNER |
| 8  | `GET`  | `/api/google-oauth/connect-onboarding/:tenantId` | `google_oauth_controller.initiateOAuthFlow` | None | Public |
| 9  | `GET`  | `/api/google-oauth/callback` | `google_oauth_controller.handleOAuthCallback` | None | Public (OAuth redirect) |
| 10 | `POST` | `/api/google-oauth/sync-locations` | `google_oauth_controller.syncGoogleLocations` | `authenticate`, `authorize(['CLIENT_OWNER','STAFF'])` | CLIENT_OWNER, STAFF |
| 11 | `GET`  | `/api/google-oauth/status` | `google_oauth_controller.getConnectionStatus` | `authenticate`, `authorize(['CLIENT_OWNER','STAFF'])` | CLIENT_OWNER, STAFF |
| 12 | `POST` | `/api/google-oauth/disconnect` | `google_oauth_controller.disconnectGoogleAccount` | `authenticate`, `authorize(['CLIENT_OWNER'])` | CLIENT_OWNER |
| 13 | `GET`  | `/api/google-oauth/locations` | `google_oauth_controller.getLocations` | `authenticate`, `authorize(['CLIENT_OWNER','STAFF'])` | CLIENT_OWNER, STAFF |
| 14 | `POST` | `/api/google-oauth/initial-sync` | `google_oauth_controller.initialGoogleSync` | `authenticate`, `authorize(['CLIENT_OWNER','STAFF'])` | CLIENT_OWNER, STAFF |
| 15 | `POST` | `/api/google-oauth/sync-reviews` | `google_oauth_controller.fetchAndSyncReviews` | `authenticate`, `authorize(['CLIENT_OWNER','STAFF'])` | CLIENT_OWNER, STAFF |
| 16 | `GET`  | `/api/google-oauth/verify-business-account` | `google_oauth_controller.verifyGoogleBusinessAccount` | `authenticate`, `authorize(['CLIENT_OWNER','STAFF'])` | CLIENT_OWNER, STAFF |

---

### 1.4 Admin — prefix `/api/admin` → `admin_route.js`

> Router-level middleware: `authenticate` + `authorize(['ADMIN','SUPER_ADMIN'])`

| # | Method | Path | Controller | Middleware | Access |
|---|--------|------|-----------|-----------|--------|
| 17 | `GET` | `/api/admin/dashboard` | `admin_controller.getDashboardStats` | router middleware | ADMIN, SUPER_ADMIN |
| 18 | `GET` | `/api/admin/clients` | `admin_controller.getClients` | router middleware | ADMIN, SUPER_ADMIN |
| 19 | `PUT` | `/api/admin/clients/:id/toggle-status` | `admin_controller.toggleClientStatus` | router middleware | ADMIN, SUPER_ADMIN |

---

### 1.5 Monitoring — prefix `/api/monitor` → `monitor_route.js`

| # | Method | Path | Controller | Middleware | Access |
|---|--------|------|-----------|-----------|--------|
| 20 | `GET` | `/api/monitor/quota` | Inline handler | `authenticate`, `authorize(['ADMIN'])` | ADMIN |
| 21 | `GET` | `/api/monitor/quota/report` | Inline handler | `authenticate`, `authorize(['ADMIN'])` | ADMIN |
| 22 | `GET` | `/api/monitor/quota/check` | Inline handler | `authenticate` | Authenticated |
| 23 | `GET` | `/api/monitor/health` | Inline handler | None | Public |

---

### 1.6 Onboarding — prefix `/api/onboarding` → `onboarding_route.js`

| # | Method | Path | Controller | Middleware | Access |
|---|--------|------|-----------|-----------|--------|
| 24 | `POST` | `/api/onboarding/submit` | `onboarding_controller.submitOnboardingForm` | None | **Public** |
| 25 | `POST` | `/api/onboarding/update-place-id` | `onboarding_controller.updatePlaceId` | `authenticate` | Authenticated |
| 26 | `POST` | `/api/onboarding/search-place` | `onboarding_controller.searchAndSavePlaceId` | `authenticate` | Authenticated |
| 27 | `GET`  | `/api/onboarding/search-suggestions` | `onboarding_controller.searchPlaceSuggestions` | `authenticate` | Authenticated |

---

### 1.7 Reviews — prefix `/api/reviews` → `review_route.js`

> Router-level middleware: `router.use(authenticate)`

| # | Method | Path | Controller | Middleware | Access |
|---|--------|------|-----------|-----------|--------|
| 28 | `POST` | `/api/reviews/fetch` | `review_controller.fetchReviews` | router auth, `authorize(['ADMIN','CLIENT_OWNER'])` | ADMIN, CLIENT_OWNER |
| 29 | `POST` | `/api/reviews/fetch-places` | `review_controller.fetchReviewsFromPlaces` | router auth, `authorize(['ADMIN','CLIENT_OWNER'])` | ADMIN, CLIENT_OWNER |
| 30 | `POST` | `/api/reviews/fetch-third-party` | `review_controller.fetchReviewsFromThirdParty` | router auth, `authorize(['ADMIN','CLIENT_OWNER'])` | ADMIN, CLIENT_OWNER |
| 31 | `GET`  | `/api/reviews/` | `review_controller.getReviews` | router auth, `authorize(['ADMIN','CLIENT_OWNER','STAFF'])` | All roles |
| 32 | `GET`  | `/api/reviews/:id` | `review_controller.getReviewById` | router auth, `authorize(['ADMIN','CLIENT_OWNER','STAFF'])` | All roles |
| 33 | `POST` | `/api/reviews/:id/generate-reply` | `review_controller.generateAIReply` | router auth, `authorize(['ADMIN','CLIENT_OWNER'])` | ADMIN, CLIENT_OWNER |
| 34 | `PUT`  | `/api/reviews/:id/reply` | `review_controller.updateReply` | router auth, `authorize(['ADMIN','CLIENT_OWNER'])` | ADMIN, CLIENT_OWNER |
| 35 | `POST` | `/api/reviews/:id/approve-reply` | `review_controller.approveAndPostReply` | router auth, `authorize(['ADMIN','CLIENT_OWNER'])` | ADMIN, CLIENT_OWNER |
| 36 | `POST` | `/api/reviews/:id/post-social` | `review_controller.postToSocial` | router auth, `authorize(['ADMIN','CLIENT_OWNER'])` | ADMIN, CLIENT_OWNER |
| 37 | `POST` | `/api/reviews/pipeline/run` | `review_controller.runPipelineManually` | router auth, `authorize(['ADMIN','CLIENT_OWNER'])` | ADMIN, CLIENT_OWNER |

---

### 1.8 Client — prefix `/api/client` → `client_route.js`

> Router-level middleware: `authenticate` + `authorize(['CLIENT_OWNER','STAFF'])`

| # | Method | Path | Controller | Middleware | Access |
|---|--------|------|-----------|-----------|--------|
| 38 | `GET`  | `/api/client/settings` | `client_controller.getClientSettings` | router middleware | CLIENT_OWNER, STAFF |
| 39 | `PUT`  | `/api/client/settings` | `client_controller.updateClientSettings` | router middleware | CLIENT_OWNER, STAFF |
| 40 | `GET`  | `/api/client/dashboard` | `client_controller.getClientDashboard` | router middleware | CLIENT_OWNER, STAFF |
| 41 | `GET`  | `/api/client/reviews` | `client_controller.getClientReviews` | router middleware | CLIENT_OWNER, STAFF |
| 42 | `GET`  | `/api/client/google-reviews` | `client_controller.fetchGoogleBusinessReviews` | router middleware | CLIENT_OWNER, STAFF |
| 43 | `GET`  | `/api/client/google-reviews/:reviewId` | `client_controller.getSpecificGoogleReview` | router middleware | CLIENT_OWNER, STAFF |
| 44 | `POST` | `/api/client/google-reviews/:reviewId/reply` | `client_controller.replyToGoogleReview` | router middleware + `authorize(['CLIENT_OWNER'])` | CLIENT_OWNER only |
| 45 | `DELETE`| `/api/client/google-reviews/:reviewId/reply` | `client_controller.deleteGoogleReply` | router middleware + `authorize(['CLIENT_OWNER'])` | CLIENT_OWNER only |
| 46 | `POST` | `/api/client/google-reviews/batch` | `client_controller.batchFetchGoogleReviews` | router middleware | CLIENT_OWNER, STAFF |

---

### 1.9 Social — prefix `/api/social` → `social_route.js`

| # | Method | Path | Controller | Middleware | Access |
|---|--------|------|-----------|-----------|--------|
| 47 | `POST` | `/api/social/post` | `social_controller.postReview` | **None** | ⚠️ Public |
| 48 | `GET`  | `/api/social/settings` | `social_controller.getAutoPostSettings` | **None** | ⚠️ Public |
| 49 | `POST` | `/api/social/settings` | `social_controller.saveAutoPostSettings` | **None** | ⚠️ Public |

---

### 1.10 Tenant — prefix `/api/tenant` → `tenant_route.js`

> Router-level middleware: `authenticate`

| # | Method | Path | Controller | Middleware | Access |
|---|--------|------|-----------|-----------|--------|
| 50 | `GET` | `/api/tenant/profile` | `tenant_controller.getTenantProfile` | `authenticate` | Authenticated |
| 51 | `PUT` | `/api/tenant/profile` | `tenant_controller.updateTenantProfile` | `authenticate` | Authenticated |

---

### 1.11 Dev-Only — `server.js` (inline, non-production only)

| # | Method | Path | Controller | Middleware | Access |
|---|--------|------|-----------|-----------|--------|
| 52 | `POST` | `/api/dev/clear-google-cooldown` | Inline handler | `NODE_ENV !== 'production'` guard | ⚠️ No auth |

---

**Total active endpoints: 52**

---

## 2. Duplicate Routes

### 2.1 Route path collisions (both mounted at same prefix)

None. The hybrid route files are not mounted in `server.js` (see §3), so there are no runtime collisions.

### 2.2 Logical duplicates (same action, different path)

| Issue | Route A | Route B | Notes |
|-------|---------|---------|-------|
| Reviews listing duplicated | `GET /api/reviews/` (`review_controller.js`) | `GET /api/reviews/` (`review_controller_hybrid.js`) | Same path, different data sources (PostgreSQL vs Google Sheets). Only the DB version is active. |
| Single review lookup | `GET /api/reviews/:id` | `GET /api/reviews/:reviewKey` | Same path pattern, different param names. Hybrid version is inactive. |
| Dashboard stats | `GET /api/admin/dashboard` (`admin_controller.js`) | `GET /api/admin/dashboard` (`admin_route_hybrid.js`) | Inline handler in hybrid uses Google Sheets; DB version is active. |
| Client list | `GET /api/admin/clients` (`admin_controller.js`) | `GET /api/admin/clients` (`admin_route_hybrid.js`) | Same path, different data source. |
| AI reply generation | `POST /api/reviews/:id/generate-reply` | `POST /api/reviews/:reviewKey/generate-reply` | Functionally equivalent, different archives. |
| Google OAuth initiation | `GET /api/auth/google` | `GET /api/google-oauth/connect` | Two separate entry points for the same OAuth flow. |
| OAuth callback | `GET /api/auth/google/callback` | `GET /api/google-oauth/callback` | Two endpoints both delegate to `handleOAuthCallback`. |

---

## 3. Unused / Orphaned Route Files

The following route files exist on disk but are **never `require()`d in `server.js`**:

| File | Would-be Prefix | Reason Not Mounted | Risk |
|------|-----------------|--------------------|------|
| `src/routers/review_route_hybrid.js` | `/api/reviews` | Dead code — superseded by `review_route.js` | Low (not accessible) |
| `src/routers/admin_route_hybrid.js` | `/api/admin` | Dead code — superseded by `admin_route.js` | Low (not accessible) |

**Impact:** These files create developer confusion about which data source is canonical. They also contain inline route handlers with business logic (e.g., `admin_route_hybrid.js` builds dashboard stats inline without separation of concerns).

---

## 4. Missing Authentication Protection

### 4.1 Completely unprotected routes (critical)

| Route | File | Risk Level | Notes |
|-------|------|-----------|-------|
| `POST /api/social/post` | `social_route.js` | 🔴 Critical | Anyone can trigger a social media post |
| `GET /api/social/settings` | `social_route.js` | 🔴 Critical | Tenant auto-post settings readable by anyone |
| `POST /api/social/settings` | `social_route.js` | 🔴 Critical | Anyone can modify tenant's social auto-post config |
| `POST /api/dev/clear-google-cooldown` | `server.js` | 🔴 Critical | No auth; only guarded by `NODE_ENV` check which can be bypassed if env is misconfigured |

### 4.2 Public by design (acceptable but worth noting)

| Route | Justification | Recommendation |
|-------|--------------|----------------|
| `POST /api/onboarding/submit` | Lead capture form — pre-login | Add rate limiting (e.g., express-rate-limit) and CAPTCHA protection |
| `GET /api/google-oauth/connect-onboarding/:tenantId` | OAuth initiated during onboarding | Validate `tenantId` exists and is in pending/onboarding state before proceeding |
| `GET /api/google-oauth/callback` | OAuth redirect URI, must be public | Already validated via `state` parameter |
| `GET /api/monitor/health` | System health probe | Acceptable; does not expose sensitive data |

### 4.3 Partial protection gaps

| Route | File | Issue |
|-------|------|-------|
| `GET /api/tenant/profile` | `tenant_route.js` | `authenticate` applied but `ensureTenantAccess` middleware is **imported but never applied** to any route. Any authenticated user theoretically gets their own tenant only by relying solely on JWT `tenantId`, but the guard is not enforced at middleware layer. |
| `PUT /api/tenant/profile` | `tenant_route.js` | Same as above — `ensureTenantAccess` imported but unused. |

---

## 5. Missing Error Handling

### 5.1 No try/catch in route handlers

| Route | File | Issue |
|-------|------|-------|
| All `social_route.js` routes | `social_route.js` | Social controller functions have try/catch, but `saveAutoPostSettings` silently ignores a missing `req.user` (crashes if `req.user.slug` is accessed without auth guard — see §4.1). |

### 5.2 Controllers missing specific HTTP error codes

| Controller | Missing Case | Current Behavior |
|-----------|-------------|-----------------|
| `review_controller.js` `fetchReviews` | `GOOGLE_NOT_CONNECTED` error | Returns generic 500 instead of a specific 412 / 503 |
| `review_controller.js` `approveAndPostReply` | If Google token refresh fails | Propagates raw error message containing internal details |
| `onboarding_controller.js` `submitOnboardingForm` | Google Sheets write failure | Logs a warning but still returns 201 even if data was NOT saved |
| `client_controller.js` `batchFetchGoogleReviews` | No 400 validation for empty location list | Could silently succeed with empty result |
| `google_oauth_controller.js` all handlers | Rate-limit retry logic — QUOTA_EXCEEDED | Thrown correctly but not all callers catch and map to 429 consistently |

### 5.3 Global error handler gaps

The global error handler in `server.js` is correct in structure, but:
- It leaks `err.stack` in development mode — acceptable.
- It does not differentiate Sequelize validation errors (`SequelizeValidationError`) from generic 500s, meaning constraint violations appear as opaque server errors to the client.

---

## 6. Inconsistent Naming Conventions

### 6.1 Route parameter naming

| Route | Param | File | Inconsistency |
|-------|-------|------|---------------|
| `GET /api/reviews/:id` | `:id` | `review_route.js` | Uses `id` |
| `GET /api/reviews/:reviewKey` | `:reviewKey` | `review_route_hybrid.js` | Uses `reviewKey` — different for the same resource |
| `GET /api/client/google-reviews/:reviewId` | `:reviewId` | `client_route.js` | Uses `reviewId` for same Google review concept |
| `PUT /api/admin/clients/:id/toggle-status` | `:id` | `admin_route.js` | Uses `id` |

### 6.2 HTTP verb inconsistency

| Route | Method Used | Correct REST Method | File |
|-------|-------------|---------------------|------|
| `POST /api/social/settings` | `POST` | `PUT` or `PATCH` | `social_route.js` |
| `POST /api/google-oauth/disconnect` | `POST` | `DELETE` | `google_oauth_route.js` |
| `POST /api/google-oauth/sync-locations` | `POST` | `PUT` (idempotent sync) | `google_oauth_route.js` |
| `POST /api/google-oauth/initial-sync` | `POST` | `POST` ← acceptable for one-time ops | `google_oauth_route.js` |
| `POST /api/onboarding/update-place-id` | `POST` | `PUT` or `PATCH` | `onboarding_route.js` |

### 6.3 Response field naming

| Controller | Field | Inconsistency |
|-----------|-------|---------------|
| `auth_controller.login` | Returns both `token` and redundant flat fields (`role`, `email`, `firstName`, etc.) alongside `user` object | Data is duplicated |
| `social_controller.getAutoPostSettings` | Returns `{ success, settings }` | Most controllers return `{ success, data }` — `settings` is non-standard key |
| `social_controller.saveAutoPostSettings` | Returns `{ success, message, settings }` | Inconsistent with `{ success, data }` pattern |
| `monitor_route.js` quota handlers | Returns `{ success, data }` | Consistent ✅ |
| `admin_route_hybrid.js` inline handlers | Returns `{ success, data }` | Consistent ✅ (but file is unused) |

### 6.4 URL path style

| Pattern | Routes Using It |
|---------|----------------|
| `kebab-case` ✅ | Most routes: `/fetch-places`, `/toggle-status`, `/sync-locations` |
| `camelCase` ❌ | None found |
| Mixed segment meanings | `/api/google-oauth/verify-business-account` — could be `/api/google-oauth/account/verify` |

---

## 7. REST Best Practices Audit

| # | Issue | Affected Routes | Severity |
|---|-------|----------------|----------|
| R1 | `POST` used for state mutation that should be `DELETE` | `POST /api/google-oauth/disconnect` | Medium |
| R2 | `POST` used for update that should be `PUT`/`PATCH` | `POST /api/social/settings`, `POST /api/onboarding/update-place-id` | Medium |
| R3 | Action verbs in URLs — not resource-oriented | `/toggle-status`, `/generate-reply`, `/approve-reply`, `/post-social`, `/pipeline/run` | Low–Medium |
| R4 | Route ordering issue — wildcard route `/:id` precedes static `/pipeline/run` (same verb family) | `review_route.js` lines 31–37 | Low (Express resolves correctly for POST, but position is fragile) |
| R5 | `GET /api/client/google-reviews/batch` does not exist; batch fetch is `POST`, but `GET /google-reviews/batch` would match `/:reviewId` with `reviewId=batch` | `client_route.js` | Medium |
| R6 | No versioning — all routes use `/api/` without version prefix (`/api/v1/`) | All | Low (future risk) |
| R7 | `/api/auth/register/client` uses a nested resource path for a flat operation | `auth_route.js` | Low |
| R8 | `POST /api/reviews/fetch-*` — side-effect fetch actions are POSTs, which is acceptable but unusual vs. query params on `GET` | `review_route.js` | Low |

---

## 8. Response Structure Consistency

### Standard pattern (used by majority of routes):
```json
{
  "success": true | false,
  "message": "...",
  "data": { ... }
}
```

### Deviations:

| Route | Non-Standard Shape | File |
|-------|-------------------|------|
| `POST /api/auth/login` | Returns `success`, `token`, `user`, `role`, `email`, `firstName`, `lastName`, `tenant`, `isOnboarded` at root level (not inside `data`) | `auth_controller.js` |
| `GET /api/social/settings` | Returns `{ success, settings }` instead of `{ success, data }` | `social_controller.js` |
| `POST /api/social/settings` | Returns `{ success, message, settings }` | `social_controller.js` |
| `POST /api/social/post` | Returns `{ success, message, postId }` | `social_controller.js` |
| `GET /api/monitor/health` | Wraps body inside `data` key — consistent ✅ but sets `503` when quota is critical | `monitor_route.js` |
| `GET /api/auth/verify` | Shape not documented in controller (delegates to token payload) | `auth_controller.js` |

### HTTP Status Code Consistency:

| Status | Usage | Notes |
|--------|-------|-------|
| `200` | Standard success | ✅ Consistent |
| `201` | `POST /api/auth/register/client`, `POST /api/onboarding/submit` | ✅ Correct for resource creation |
| `400` | Validation failures | ✅ Used correctly |
| `401` | Missing / invalid token | ✅ Correct |
| `403` | Role / tenant access denied | ✅ Correct |
| `404` | Resource not found | ✅ Used in some controllers, missing in others (e.g., review not found in pipeline) |
| `429` | Quota cooldown active | ✅ Correct and explicit |
| `500` | Catch-all server error | ⚠️ Overused — used even when a more specific 4xx would be appropriate (e.g., `GOOGLE_NOT_CONNECTED`) |
| `503` | Only in monitor health when quota critical | ✅ Correct |

---

## 9. Security Risk Assessment

### 9.1 Critical

| ID | Risk | Location | Detail |
|----|------|----------|--------|
| S1 | **Unauthenticated social media write access** | `POST /api/social/post` | No authentication. Any unauthenticated actor can trigger social media posts via this endpoint. `req.user.slug` access inside handler will throw `TypeError` in production. |
| S2 | **Unauthenticated tenant settings modification** | `POST /api/social/settings` | Auto-post configuration writable without any auth. Attacker can enable auto-posting or change platform targets for any tenant they can guess the slug of. |
| S3 | **Wildcard CORS** | `server.js` line: `app.use(cors())` | `Access-Control-Allow-Origin: *` means any website can make credentialed requests. Should be restricted to specific allowed origins. |

### 9.2 High

| ID | Risk | Location | Detail |
|----|------|----------|--------|
| S4 | **Dev endpoint without auth in production** | `POST /api/dev/clear-google-cooldown` | Only guarded by `NODE_ENV !== 'production'`. If the environment variable is accidentally unset or misconfigured, this endpoint is live and unprotected, allowing any caller to clear quota throttles. |
| S5 | **Internal error details leaked to client** | Multiple controllers | `error: error.message` returned in 500 responses (e.g., `review_controller.js`, `auth_controller.js`). Stack traces / SQL messages can reveal schema and internal logic. |
| S6 | **No rate limiting on authentication endpoints** | `POST /api/auth/login` | No brute-force protection. An attacker can attempt unlimited password guesses. |
| S7 | **No rate limiting on onboarding submit** | `POST /api/onboarding/submit` | Public endpoint with no rate limit — susceptible to spam and Google Sheets quota exhaustion. |

### 9.3 Medium

| ID | Risk | Location | Detail |
|----|------|----------|--------|
| S8 | **Tenant isolation relies solely on JWT payload** | `tenant_route.js` | `ensureTenantAccess` is imported but never applied. A JWT with a crafted `tenant` claim could access any tenant's profile if the signing secret is compromised. |
| S9 | **Old JWT tokens silently accepted** | `auth.js` middleware | `"⚠️ Old JWT token detected"` warning is logged but execution continues unchanged. Old tokens missing tenant data may lead to data cross-contamination. |
| S10 | **`req.path` exposed in 404 responses** | `server.js` 404 handler | Reveals internal routing structure: `{ path: req.path }`. Minor but provides recon data. |
| S11 | **Mock implementation in production code** | `social_controller.js` | `postReview` uses `setTimeout` + `Math.random()` to simulate errors. This is placeholder code that must not reach production — it bypasses real API validation. |
| S12 | **No input sanitization on onboarding form** | `onboarding_controller.submitOnboardingForm` | Form data is written directly to Google Sheets without sanitization. Malicious content (e.g., formula injection via `=CMD()`) could exploit Google Sheets. |

### 9.4 Low

| ID | Risk | Location | Detail |
|----|------|----------|--------|
| S13 | **Location cache has no size bound** | `google_oauth_controller.js` | `locationCache` (Map) grows unbounded. A large tenant volume could exhaust server memory over time. |
| S14 | **`quotaCooldowns` Map unbounded** | `google_oauth_controller.js` | Same issue — no eviction policy for the cooldown map. |
| S15 | **No Content-Type enforcement** | `server.js` | `express.json()` is registered but no middleware rejects non-JSON `Content-Type` on POST routes expecting JSON bodies. |

---

## 10. Scalability & Maintainability Suggestions

### 10.1 Architecture

| # | Suggestion | Priority |
|---|-----------|---------|
| A1 | **Remove or archive hybrid route files** (`admin_route_hybrid.js`, `review_route_hybrid.js`) to eliminate confusion about canonical data source. | High |
| A2 | **Add API versioning** — prefix all routes with `/api/v1/` to allow future breaking changes without disrupting active clients. | Medium |
| A3 | **Centralise in-memory state** (`quotaCooldowns`, `accountFetchLocks`, `activeSyncs`, `locationCache`) into a Redis-backed cache for multi-instance deployments. Currently each Node process has isolated state — horizontal scaling will break quota tracking. | High |
| A4 | **Replace cron polling** in `server.js` with a dedicated job queue (e.g., BullMQ + Redis) to support retries, failure tracking, and distributed workers. | Medium |

### 10.2 Security

| # | Suggestion | Priority |
|---|-----------|---------|
| B1 | Add `authenticate` + `authorize` middlewares to all social routes immediately (§4.1, S1–S2). | Critical |
| B2 | Add `express-rate-limit` to `POST /api/auth/login` (max 10 attempts / 15 min per IP) and `POST /api/onboarding/submit` (max 5 requests / hour per IP). | High |
| B3 | Restrict CORS to an explicit allowlist: `cors({ origin: ['https://yourdomain.com'] })`. | High |
| B4 | Strip `error.message` from production 500 responses — return generic message; log full error server-side. | High |
| B5 | Add `authorize(['CLIENT_OWNER'])` to `PUT /api/tenant/profile` and apply `ensureTenantAccess` middleware to both tenant profile routes. | Medium |
| B6 | Sanitize Google Sheets input to prevent formula injection — strip leading `=`, `+`, `-`, `@` characters from all user-supplied strings before writing to Sheets. | High |

### 10.3 Consistency & Developer Experience

| # | Suggestion | Priority |
|---|-----------|---------|
| C1 | Standardise all response shapes to `{ success, message, data }`. Fix `social_controller.js` response format. | Medium |
| C2 | Move all inline route handlers (`monitor_route.js`, `admin_route_hybrid.js`, `server.js`) into dedicated controller functions for testability. | Medium |
| C3 | Replace `POST /api/google-oauth/disconnect` with `DELETE /api/google-oauth/connection` for REST compliance. | Low |
| C4 | Replace `POST /api/social/settings` with `PUT /api/social/settings`. | Low |
| C5 | Consolidate the duplicate OAuth entry points (`GET /api/auth/google` and `GET /api/google-oauth/connect`) into a single route. | Medium |
| C6 | Add request validation middleware (e.g., `express-validator` or `zod`) for all POST/PUT bodies — currently validation is scattered across controllers. | Medium |
| C7 | Add `404` responses in all controllers when a primary resource is not found (e.g., review not found, location not found) rather than falling through to a 500. | Medium |

### 10.4 Production Readiness

| # | Suggestion | Priority |
|---|-----------|---------|
| D1 | Replace `social_controller.postReview` mock implementation with real Facebook/Instagram Graph API calls before any production deployment. | Critical |
| D2 | Add structured request logging (currently the logging middleware in `server.js` is empty — `next()` without any `console.log`). Use `morgan` or similar. | Medium |
| D3 | Implement database connection pooling configuration explicitly in `database.js` and set `pool.max` based on expected concurrency. | Medium |
| D4 | Add health check for database connectivity in `GET /health` — currently it only reports that Express is running. | Low |

---

## 11. Summary Matrix

| Module | Active Routes | Auth Protected | REST Compliant | Issues |
|--------|--------------|----------------|----------------|--------|
| Health | 1 | ❌ (public by design) | ✅ | None |
| Auth | 5 | Partial | ⚠️ Partial | Duplicate OAuth entry, no brute-force limit |
| Google OAuth | 10 | Mostly ✅ | ⚠️ Partial | POST vs DELETE for disconnect |
| Admin | 3 | ✅ | ⚠️ Partial | Action verb in URL (`toggle-status`) |
| Monitor | 4 | Partial | ✅ | One endpoint public (health — acceptable) |
| Onboarding | 4 | Partial | ⚠️ Partial | Submit unauthenticated, no rate limit, formula injection risk |
| Reviews | 10 | ✅ | ⚠️ Partial | Route ordering fragile, action verbs in path |
| Client | 9 | ✅ | ⚠️ Partial | `GET /batch` collision risk |
| Social | 3 | ❌ | ❌ | **All 3 routes completely unprotected**, mock implementation |
| Tenant | 2 | ✅ (partial) | ✅ | `ensureTenantAccess` unused |
| Dev (non-prod) | 1 | ❌ | N/A | Guard relies on env var only |
| **TOTAL** | **52** | | | |

### Quick-Win Priority List

1. 🔴 **Add auth to all `/api/social/*` routes** — immediate security fix  
2. 🔴 **Replace mock `social_controller.postReview`** before production  
3. 🔴 **Restrict CORS origins** from wildcard to explicit allowlist  
4. 🟠 **Add rate limiting** to login and onboarding submit  
5. 🟠 **Strip `error.message` from production responses**  
6. 🟠 **Sanitize Sheets input** against formula injection  
7. 🟡 **Remove or archive hybrid route files**  
8. 🟡 **Apply `ensureTenantAccess`** to tenant profile routes  
9. 🟡 **Standardise response shape** (`{ success, message, data }`) across social controller  
10. 🟢 **Add API version prefix** (`/api/v1/`) for future-proofing

---

*End of Report*
