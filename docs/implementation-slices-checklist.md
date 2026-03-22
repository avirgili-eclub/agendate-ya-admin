# AgendateYA Admin - Implementation Slices (3-Day Cadence)

## Working Rules

- Small slices only. Each slice should be executable by one agent without context overflow.
- Max target per slice: 6-10 files and one clear deliverable.
- Each slice closes with a short QA checklist and explicit handoff.
- Visual implementation must follow docs/ui-references/README.md first.

## Pending API Integration Debt (must close before MVP release)

- [x] Slice 3 Dashboard: replace mocked service data with real API aggregation for KPI cards, upcoming bookings, channel distribution, and alerts.
- [x] Slice 4 Resources: replace local in-memory resources with real endpoints from OpenAPI:
  - [x] GET /api/v1/locations
  - [x] GET /api/v1/locations/{locationId}/resources
  - [x] PUT /api/v1/resources/{id} for active/inactive toggle
  - [x] Real assigned services via GET /api/v1/resources/{id}/services

## Slice 0 - Project Bootstrap (Day 1-3)

Goal: Leave a running frontend shell with routing, theme tokens, and API base client.

### Scope

- [x] Initialize React + TypeScript + Vite project structure
- [x] Configure Tailwind and shadcn/ui base
- [x] Create theme tokens (navy/orange palette)
- [x] Configure TanStack Router root routes
- [x] Configure TanStack Query provider
- [x] Add API client base and envelope parser
- [x] Add global error model (400/401/403/404/409/422)

### Deliverables

- [x] App starts locally with empty shell layout
- [x] Theme tokens and typography applied globally
- [x] Health test route (for smoke check)

### QA checks

- [ ] Build passes
- [x] Typecheck passes
- [x] Root route renders
- [x] 404 route renders
- [x] Query client and router providers mounted once

Note: Build check is intentionally pending in this workflow; typecheck and dev-server smoke run were used for Slice 0 validation.

## Slice 1 - Auth + Session (Day 4-6)

Goal: Working login and refresh flow against /api/v1/auth/\*.

### Scope

- [x] Login page UI (aligned with theme)
- [x] Auth service: login and refresh endpoints
- [x] Access token memory storage strategy
- [x] Refresh flow and retry once interceptor
- [x] Route guard for private pages
- [x] Session expired UX state

### Deliverables

- [x] User can login and access private layout
- [x] Expired access token refreshes automatically
- [x] Failed refresh redirects to login

### QA checks

- [ ] 401 refresh success path verified
- [ ] 401 refresh failure path verified
- [x] Forbidden route guard behavior verified

Note: 401 success/failure QA checks remain pending until backend auth endpoints are available for runtime validation.

## Slice 2 - App Shell (Day 7-9)

Goal: Build reusable layout from screenshots: top header + sidebar + content frame.

### Scope

- [x] Sidebar navigation component
- [x] Top header component
- [x] Breadcrumb/page title pattern
- [x] Shared page container and section cards
- [x] Status chip primitives (success, warning, neutral, danger)

### Deliverables

- [x] Visual shell matches current references
- [x] Navigation routes connected to placeholders

### QA checks

- [x] Layout responsive baseline (desktop/tablet/mobile)
- [x] Active route highlight works
- [x] Theme contrast accessible for key actions

## Slice 3 - Dashboard (Day 10-12)

Goal: Implement dashboard page based on PageDashboard.png.

### Scope

- [x] KPI cards section
- [x] Operational alerts section
- [x] Placeholder chart sections with real API wiring when available
- [x] Loading and empty states

### Deliverables

- [x] Dashboard route complete for MVP visual and data skeleton

### QA checks

- [x] Error state for failed requests
- [x] Empty state for no data
- [x] KPI cards keep stable layout while loading

## Slice 4 - Resources List + Actions (Day 13-15)

Goal: Implement resources management main page from PageGestionDeRecursos.png.

### Scope

- [x] Resources list route
- [x] Search/filter UI shell
- [x] Resource cards/grid
- [x] Activate/deactivate action
- [x] Pagination UI

### Deliverables

- [x] Functional resources listing with status actions

### QA checks

- [x] Active/inactive states map correctly
- [x] Pagination controls usable
- [x] 403 and 404 responses handled clearly

## Slice 5 - Resource Create/Edit (Day 16-18)

Goal: Cover visual gaps for resource create/edit and complete resource CRUD UX.

### Scope

- [x] Create resource form page/modal
- [x] Edit resource form page/modal
- [x] Validation (required fields, capacity min)
- [x] Transfer resource flow with clearSchedule warning
- [x] Assign/unassign services actions

### Deliverables

- [x] Resource CRUD and transfer usable end-to-end

### QA checks

- [x] 400 validation messages bound to fields
- [x] 402 subscription limit behavior visible
- [x] Success and error toasts consistent

## Slice 6 - Weekly Agenda / Bookings Calendar (Day 19-21)

Goal: Implement calendar page from PageAgendaSemanal.png as operational core.

### Scope

- [x] Weekly calendar board UI
- [x] Location/resource filters panel
- [x] Booking cards with status colors
- [x] New booking CTA
- [x] Booking status actions with valid transition rules

### Deliverables

- [x] Agenda route with booking interaction baseline

### QA checks

- [x] State transitions follow backend rules
- [x] 409 conflict state shown with guidance
- [x] Timezone conversion correctly displayed

## Slice 7 - Bookings CRUD Details (Day 22-24)

Goal: Complete bookings management around table/list and details.

### Scope

- [x] Bookings list table with pagination
- [x] Booking create form
- [x] Booking detail drawer/modal
- [x] Status change actions and cancel flow

### Deliverables

- [x] Bookings module MVP complete

### QA checks

- [ ] Invalid transition 422 UX verified
- [ ] Cancel flow restrictions verified
- [x] Source channel visible in list/detail

## Slice 8 - Services + Availability (Day 25-27)

Goal: Complete service catalog and availability setup.

### Scope

- [x] Services list/create/edit
- [x] Availability weekly rules editor
- [x] Availability overrides editor
- [x] Rule/override visual composition panel

### Deliverables

- [x] Services and availability modules MVP complete

### QA checks

- [ ] Day-of-week mapping validated (0 Monday to 6 Sunday)
- [ ] available=false override behavior validated
- [ ] Delete vs deactivate guidance visible

## Slice 9 - Clients + Users + Tenant Settings (Day 28-30)

Goal: Complete operational management modules.

### Scope

- [x] Clients list and client detail history
- [x] Client edit flow with phone conflict handling
- [x] Users list/create/deactivate
- [x] Tenant settings page
- [x] Client detail chat history UI (WhatsApp-like with upward pagination)

### Deliverables

- [x] Clients, users, tenant settings ready for MVP
- [x] Chat history UI implemented with API-ready architecture (backend pending)

### QA checks

- [ ] Role restrictions for user create enforced
- [ ] 409 conflict messaging for unique phone/email handled
- [ ] Read-only subscription information rendered correctly
- [ ] Chat history loads older messages on scroll up
- [ ] Client booking history displays correctly

## Slice 10 - Hardening + Visual Gap Closure (Day 31-33)

Goal: close pending visual gaps and stabilize UX quality.

### Scope

- [x] Created shared UI primitives for consistent state handling
  - [x] LoadingState and SkeletonCards components
  - [x] ErrorState component with retry capability
  - [x] EmptyState component with icon and description
  - [x] FeedbackBanner component for success/error messages
- [x] Updated Resources page with loading/empty/error states and accessibility improvements
- [x] Updated Services page with loading/empty/error states and accessibility improvements
- [x] Improved AppShell accessibility with semantic landmarks (header, nav, main)
- [ ] Full state handling for Agenda, Bookings, Availability pages (foundation ready, can be applied)
- [ ] Full state handling for Users, Clients, Tenant pages (foundation ready, can be applied)
- [x] Mobile layout improvements (flex-wrap on cards, responsive controls)
- [x] Accessibility pass started: aria-labels, focus-visible, semantic HTML
- [ ] Comprehensive accessibility audit across all pages
- [ ] Consistency pass for spacing and tokens

### Deliverables

- [x] Reusable UI primitives for state management created
- [x] Resources and Services modules updated with polished UX
- [x] Improved mobile responsiveness baseline
- [x] Accessibility foundations established
- [ ] All modules updated with consistent patterns (partial - foundation complete)

### QA checks

- [ ] No major visual regressions in core pages
- [ ] Keyboard navigation works in critical forms
- [ ] Contrast acceptable in primary components

### Implementation Notes

Created four shared UI primitives in src/shared/ui/:

1. loading-state.tsx - LoadingState spinner and SkeletonCards grid
2. error-state.tsx - ErrorState with retry button
3. empty-state.tsx - EmptyState with icon, title, description
4. feedback-banner.tsx - FeedbackBanner for alerts

Updated pages:

- Resources: Full update with new state components, aria-labels on buttons/inputs, mobile-responsive pagination
- Services: Full update with new state components, aria-labels, mobile improvements
- AppShell: Added semantic landmarks (role="banner", role="navigation", role="main"), focus-visible styles, aria-labels

Remaining pages (Agenda, Bookings, Availability, Users, Clients, Tenant) have the foundation ready and can apply the same patterns using the shared components.

Mobile improvements: button groups use flex-wrap, pagination controls stack on mobile, search/filter controls are responsive.

## Suggested Agent Task Envelope (for every slice)

- [ ] Inputs read: master plan + ui references + OpenAPI
- [ ] Scope respected (no side quests)
- [ ] Files changed listed
- [ ] QA checks run and reported
- [ ] Risks and follow-ups documented
