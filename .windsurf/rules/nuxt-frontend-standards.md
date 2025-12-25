---
trigger: always_on
---

# Nuxt 4 Frontend Standards

These rules apply to every Cascade session in this workspace. They complement the global Cascade guidance and keep the Nuxt 4 SPA in sync with the Laravel backend.

## 1. Architectural Principles
1. **SPA only** – SSR is disabled via `routeRules['/*'].ssr = false`. Avoid server-only APIs or assumptions.
2. **SOLID components** – Each component/composable should have one reason to change. Reuse Nuxt composables for logic.
3. **TypeScript everywhere** – Use `<script setup lang="ts">`. Avoid `any`; define interfaces/types for API payloads and composable contracts.
4. **Naming** – camelCase for variables, functions, props, emits, composables (`useShopAddressForm`). Vue file names stay kebab-case.

## 2. Coding Conventions
1. **Linting** – Follow `eslint.config.mjs` (semicolons on, one attribute/line). Run `pnpm lint` before handing off.
2. **Imports** – Prefer `~/` aliases. Group imports (external → internal → styles). No unused imports.
3. **Error handling** – Surface axios errors via UI or logging; never silently fail async calls.
4. **Type safety** – Run `pnpm typecheck` regularly. Keep generics explicit when wrapping axios responses.

## 3. State & Composables
1. **Composables first** – Shared logic belongs under `app/composables`. Keep UI components as thin renderers.
2. **Return contracts** – Export typed objects from composables (`const { shops, fetchShops } = useShops();`). Document expected refs.
3. **Pinia in future** – If global state emerges, scaffold Pinia stores per domain (auth, purchases, etc.). Avoid ad-hoc emit chains.

## 4. API Integration
1. **Axios plugin only** – Use `/app/plugins/axiosPlugin.ts` (baseURL, Sanctum CSRF, auth response interceptor). Do not instantiate new clients.
2. **Runtime config** – All endpoints derive from `useRuntimeConfig().public.apiBase`. Never hardcode hostnames.
3. **Auth** – Sanctum cookie bootstrap happens on plugin init. On 401/419, rely on `useAuth().logout()` logic already wired.
4. **Payload casing** – Frontend uses camelCase. Backend transformations (camel ↔ snake) happen server-side; keep frontend camelCase consistent.
5. **Endpoints covered** – Shops, shop addresses, purchases (+receipt uploads), payment methods, receipts/OCR, links, profiles. Document new endpoints in the architecture file.

## 5. UI / Styling
1. **Nuxt UI** – Default component library. Extend via props/slots instead of heavy custom overrides.
2. **Modern CSS** – Use CSS variables, logical properties, `@layer`, `@property`, `clamp()`, etc. Avoid legacy floats or vendor-specific hacks.
3. **Theme tokens** – `app/assets/css/main.css` defines typography and green palette via `@theme`. Introduce new tokens instead of literal hex codes.
4. **Responsiveness & accessibility** – Follow Nuxt UI guidelines, keep focus states, provide aria labels, ensure keyboard navigation.

## 6. Testing Standards
1. **Unit/Component** – Adopt Nuxt Test Utils + Vitest (`npx nuxi test unit`). Add `pnpm test:unit` when tests exist.
2. **E2E** – Use Playwright via `npx nuxi test e2e` for auth/purchases/receipts flows.
3. **Type confidence** – `pnpm typecheck` is mandatory for CI and before PRs.

## 7. Tooling & Process
1. **Scripts** – Use pnpm commands (`dev`, `build`, `preview`, `lint`, `typecheck`). No yarn/npm mixing.
2. **Docs** – Store helper docs in `app/PSD/docs/` (git-ignored). Reference them in PRs if relevant.
3. **Commits** – Keep rule edits separate from runtime changes; reference affected files.

Following these standards ensures the Nuxt frontend stays consistent, testable, and aligned with the backend contract.
