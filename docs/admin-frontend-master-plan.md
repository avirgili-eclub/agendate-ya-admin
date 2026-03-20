# AgendateYA Admin Frontend - Master Plan (UI/UX + Frontend Delivery)

## 1. Objective

Design and prepare the admin web frontend for AgendateYA so it can be implemented by a frontend agent with minimal ambiguity.

This document is aligned with:

- API contract in `docs/openapi-admin.yaml`
- Product context shared for multi-tenant scheduling (web + WhatsApp + API/MCP)
- Constraint: no implementation code yet, only planning and architecture

## 1.1 Visual Handoff (Mandatory Before UI Implementation)

Before starting frontend implementation, the agent MUST read and apply visual guidance from:

- `docs/ui-references/README.md`

Current references available:

- `docs/ui-references/PageDashboard.png`
- `docs/ui-references/PageGestionDeRecursos.png`
- `docs/ui-references/PageAgendaSemanal.png`

If a screen is not covered by an image yet, implementation must follow the shared layout and theme direction documented in `docs/ui-references/README.md`, then be flagged for visual validation.

## 2. Product Scope (Admin Site)

### In Scope (MVP)

- Authentication and session management
- Tenant profile management
- Locations management
- Resources management (professional/table/room/equipment)
- Services management
- Availability rules and date overrides
- Bookings lifecycle management
- Clients directory and booking history
- Team users management
- Dashboard with operational KPIs

### Out of Scope (for this plan iteration)

- Billing/payment UI
- Advanced analytics/BI
- Marketing automation
- Public booking widget implementation (admin only consumes the same API)

## 3. API-Driven Domain Map (from OpenAPI)

Primary modules detected from tags and endpoints:

- `auth`
- `tenant`
- `locations`
- `resources`
- `services`
- `availability`
- `bookings`
- `clients`
- `users`
- `public` (reference only; useful for preview/testing behavior)

Standard API envelopes:

- Success object: `{ data: {...} }`
- Success list paginated: `{ data: [...], meta: { page, size, total } }`
- Error: `{ error: { code, message, details[] } }`

## 4. Information Architecture (Navigation)

### Core navigation

- Dashboard
- Agenda / Turnos
- Clientes
- Operacion
- Locales
- Recursos
- Servicios
- Disponibilidad
- Equipo
- Configuracion

### Suggested grouping

- Operacion: Dashboard, Agenda, Clientes
- Configuracion de negocio: Locales, Recursos, Servicios, Disponibilidad, Equipo, Configuracion

## 5. Screen Inventory (UI/UX Deliverables)

For each module below, UI/UX should produce: list view, create/edit form, empty states, validation/error states, and mobile variants.

### 5.1 Auth

- Login screen
- Session expired modal + refresh handling UI

### 5.2 Dashboard

- KPI cards: bookings hoy, bookings semana, cancelaciones, no-show rate, ocupacion por recurso
- Upcoming bookings timeline
- Resource utilization chart
- Source channel breakdown (WEB/WHATSAPP/API/MCP/ADMIN)
- Alerts panel (conflicts, inactive resources with future bookings)

### 5.3 Tenant / Settings

- Business profile form (name, timezone, metadata)
- Read-only cards for plan and subscription status (tier, expiration)

### 5.4 Locations

- Locations list
- Create/Edit location modal or page
- Delete confirmation with dependency warning

### 5.5 Resources

- Resource list by location
- Resource detail/edit
- Resource transfer flow (`PUT /resources/{id}/location`) with risk warning for `clearSchedule`
- Assign/unassign services to resource

### 5.6 Services

- Services list
- Create/Edit service form (duration, price, currency, requiresResource)
- Soft guidance for deactivate vs delete

### 5.7 Availability

- Weekly rules editor (day/time windows)
- Date overrides editor (closed day / special schedule)
- Calendar-style visualization of rule + override composition

### 5.8 Bookings

- Paginated bookings table
- Create booking flow (manual admin booking)
- Booking detail drawer
- Status transition actions (confirm/cancel/complete/no-show) based on valid transitions
- Conflict handling state for `409 BOOKING_CONFLICT`

### 5.9 Clients

- Paginated clients table
- Client detail with booking history
- Edit client form with unique phone conflict handling

### 5.10 Users

- Team users list
- Create user form (role restricted to PROFESSIONAL or LOCATION_MANAGER)
- Deactivate user action (soft delete)

## 6. UX Rules and Interaction Contracts

### Role-aware UX

- Hide/disable admin actions if role does not allow mutation
- Display clear permission message for `403`

### State machine for booking actions

- Pending: Confirm / Cancel
- Confirmed: Complete / Cancel / No-show
- Completed, Cancelled, No-show: read-only state actions

### Timezone strategy

- Tenant timezone is the source for scheduling forms and calendar display
- UTC timestamps from API must be converted to tenant timezone for display

### Error handling standardization

- `400 VALIDATION_ERROR`: inline field messages from `details[]`
- `401`: trigger refresh token flow; if fails, redirect to login
- `403`: permission toast + disabled controls
- `404`: not found page/state
- `409`: conflict banner and suggested alternative actions
- `422`: invalid state transition explanatory modal

## 7. Frontend Architecture (Clean, without over-engineering)

## 7.1 Recommended stack (default)

- Framework: Next.js 15 (App Router) + React 19 + TypeScript
- Styling/UI: Tailwind CSS + shadcn/ui + CSS variables tokens
- Data fetching/cache: TanStack Query
- Forms/validation: React Hook Form + Zod
- Table/virtualization: TanStack Table
- Charts: Recharts
- Date/time: date-fns + date-fns-tz
- Auth storage: memory + secure cookie strategy aligned with backend JWT/refresh contract
- API client: generated from OpenAPI (`openapi-typescript` + lightweight fetch client)

Why this option:

- Fast delivery with mature ecosystem
- Easy to theme/rebrand with design tokens
- Strong fit for dashboard/admin patterns

### Alternative A (faster MVP, less SSR complexity)

- Vite + React + TypeScript with same UI/data stack
- Tradeoff: simpler setup, fewer server rendering options

### Alternative B (enterprise-heavy)

- Angular 19 + Nx
- Tradeoff: strong structure, slower initial velocity for this MVP

## 7.2 Folder architecture (feature-first + clean boundaries)

```text
src/
  app/                    # routing/layout shell
  shared/
    ui/                   # design-system primitives
    lib/                  # utils, date, formatting
    config/               # env/runtime settings
  core/
    api/                  # generated types + http client + interceptors
    auth/                 # token/session refresh flow
    errors/               # error normalizers
  features/
    dashboard/
    bookings/
    clients/
    locations/
    resources/
    services/
    availability/
    users/
    tenant/
```

Guideline:

- Keep domain logic near each feature
- Keep API transport and auth in `core/`
- Keep UI primitives in `shared/ui`
- Avoid premature abstraction layers

## 8. Design System Strategy (Rebrand-ready)

To make future branding changes cheap:

- Define semantic tokens in CSS variables: `--color-bg`, `--color-surface`, `--color-primary`, `--color-success`, etc.
- Use spacing/typography/radius/shadow tokens, not hardcoded values
- Theme contract in one place (`theme.css` + token map)
- Prefer semantic component props (`variant="danger"`) over raw color classes

Mandatory deliverables from UI/UX:

- Color tokens
- Typography scale
- Spacing scale
- Component states (hover/focus/disabled/error)
- Light and optional dark theme policy

## 9. Dashboard Specification (MVP)

### KPI cards

- Turnos hoy
- Turnos confirmados hoy
- Cancelados (7 dias)
- No-show rate (30 dias)
- Utilizacion promedio por recurso

### Charts/widgets

- Booking trend (7/30 days)
- Distribution by source channel
- Top services by demand
- Upcoming bookings next 24h

### Operational alerts

- Resources inactive with upcoming bookings
- Services active without assigned resources
- Capacity/subscription warning when creating professionals

## 10. API Integration Rules for Frontend Agent

- Base path: `/api/v1`
- Always send `Authorization: Bearer {accessToken}` for admin endpoints
- Implement centralized refresh flow using `/auth/refresh`
- Respect envelope unwrapping (`data`, `meta`, `error`)
- Normalize backend error codes to UI actions
- Preserve `sourceChannel` semantics in booking views

## 11. Delivery Plan (No Code Yet)

### Phase 1 - Product + UX Definition

- Finalize this plan with stakeholder feedback
- Produce wireframes for all modules
- Produce high-fidelity key screens (Dashboard, Bookings, Resources, Availability)
- Approve design tokens and branding baseline

### Phase 2 - Frontend Technical Plan

- Freeze stack decision
- Define repository structure and conventions
- Define API client generation strategy
- Define auth/session behavior and route guards

### Phase 3 - Implementation SDD (after approval)

- `/sdd-new admin-frontend-foundation`
- `/sdd-new admin-dashboard`
- `/sdd-new admin-bookings-flow`
- `/sdd-new admin-resources-services-availability`
- `/sdd-new admin-clients-users-settings`

## 12. Risks and Mitigations

- Risk: OpenAPI currently lacks admin-side filtering for bookings list.
  - Mitigation: design UI with local filters first, and add server filters when API exposes them.

- Risk: Role differences can create hidden UX states and confusion.
  - Mitigation: explicit permission matrix and visible read-only badges.

- Risk: Timezone misunderstandings between UTC and tenant local time.
  - Mitigation: strict date utility layer and timezone badge in all scheduling screens.

- Risk: Delete actions can cause operational data issues.
  - Mitigation: prefer deactivate flows and warning confirmations.

## 13. Definition of Ready for Frontend Agent

Frontend implementation can start when these are approved:

- Screen inventory and navigation
- UX for booking status transitions
- Dashboard KPI definitions
- Design token contract
- Stack decision (Default or Alternative A/B)
- Priority order of modules for MVP

---

Status: Planning complete, pending stakeholder approval before any code implementation.
