---
trigger: always_on
---

# Nuxt 4 Frontend Architecture Rules

These rules describe the structure of the SPA, how it integrates with the Laravel API, and where new functionality should live.

## 1. High-Level Overview
1. **Project type** – Nuxt 4 SPA (client-side only). Dev server exposed at `http://localhost:3000` via `devServer` host `0.0.0.0`.
2. **Backend** – Laravel 12 API served under `/api/*` with Sanctum authentication. Same origin when running locally (`runtimeConfig.public.apiBase`).
3. **Modules** – `@nuxt/ui`, `@nuxt/eslint`, `@vueuse/nuxt`. Additional charting via `@unovis/vue`/`@unovis/ts`.

## 2. Directory Structure
1. `app/components/` – Reusable UI blocks grouped by feature (`customers/`, `home/`, etc.). Keep components focused and typed.
2. `app/pages/` (if added) – Route-level views. Currently SPA is menu-driven; future pages must follow Nuxt file-based routing.
3. `app/composables/` – Business logic modules (`useAuth`, `useShops`, `usePurchases`, etc.). Add new composables per API domain.
4. `app/plugins/axiosPlugin.ts` – Single Axios instance configuration, CSRF bootstrap, auth interceptors.
5. `app/assets/css/main.css` – Theme definitions (Public Sans font, green palette, animations). Extend via CSS variables and `@theme`.
6. `server/api/` – Mock/data endpoints for local testing (customers, mails, members). Real data flows from Laravel API, but these mocks aid UI dev.

## 3. Data & API Flow
1. **Runtime config** – `apiBase` + `appURL` defined in `nuxt.config.ts`. All network requests call `${apiBase}/api/...`.
2. **Auth bootstrap** – On plugin init, call `GET /sanctum/csrf-cookie` (baseURL `apiBase`). Afterward, axios uses `withCredentials`/`withXSRFToken`.
3. **Composables <-> API** – Each composable owns CRUD for its resource:
   - `useAuth` – login/logout/user fetch, token persistence.
   - `useShops`, `useShopForm`, `useShopAddresses` – `/api/shops/*` and `/api/shops/{id}/addresses`.
   - `usePurchases`, `usePurchaseChart`, `useReceiptParser` – `/api/purchases/*`, `/api/receipts/*`.
   - `useUserPaymentMethods` – `/api/user-payment-methods/*`.
   - `useLinks`, `useUser` (if added) – `/api/links/*`, `/api/profiles/{id}`.
4. **Error propagation** – Axios interceptors auto-logout on 401/419 (except `/api/user`, `/api/logout`). Composables should surface domain errors via return values or `useAsyncState`.

## 4. Authentication Lifecycle
1. User initiates login → Sanctum token stored via backend cookie; frontend tracks session via `useAuth`.
2. Authenticated requests rely on axios defaults (`withCredentials`). No manual token headers.
3. Logout uses `/api/logout`, then resets local composable state (shops, purchases, etc.).
4. 401/419 triggers `useAuth().logout()` once (guarded by `isLoggingOut` flag) to prevent loops.

## 5. UI & Navigation
1. Layouts in `app/layouts/` (`default.vue`, `plain.vue`). Shared navigation (sidebar/menu) lives in `app/components/home`, `app/components/UserMenu`, etc.
2. SPA navigation handled via Nuxt router. Keep state persistent via composables rather than page-level data.
3. Feature-specific UI resides under `app/components/<feature>/`. When adding new features, create a directory with subcomponents plus matching composable.

## 6. Styling System
1. Base styles in `app/assets/css/main.css` using Tailwind via `@import "tailwindcss" theme(static);` and Nuxt UI tokens.
2. Custom animations/effects (e.g., `.total-spent-animate`) should be documented in comments when non-obvious.
3. For global tokens, extend the `@theme` block or define CSS variables under `:root`. Avoid inline styles with literal colors.

## 7. Testing & Tooling Expectations
1. **Unit tests** – Add via Nuxt Test Utils + Vitest (`npx nuxi test unit`). Place specs under `tests/unit`.
2. **E2E tests** – Use Playwright (`npx nuxi test e2e`). Flow coverage: login, shops CRUD, purchases + receipt upload.
3. **CI scripts** – `pnpm lint`, `pnpm typecheck`, (future) `pnpm test:unit`, `pnpm test:e2e`.

## 8. Extending the Architecture
1. When introducing a new domain, add:
   - A composable in `app/composables/use<Domain>.ts`.
   - Components under `app/components/<domain>/`.
   - Route/page if needed.
   - Documentation updates in this file and the standards file.
2. Align new API resources with backend naming and describe endpoint paths in this document.

Keeping this architecture doc current ensures every Cascade agent understands how to work within the Nuxt SPA and its integration with the Laravel backend.
