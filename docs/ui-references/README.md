# UI References - AgendateYA Admin

## Purpose

This folder stores the current visual references used to guide UI implementation for the admin panel.

## Current Visual Assets

### 1) Main Dashboard / Control Panel

- File: PageDashboard.png
- Route (target): /dashboard
- What this defines:
  - Main top navigation
  - High-level KPI cards
  - Overall shell spacing and visual rhythm
- Implementation notes:
  - Keep the same shell structure (top header + content area).
  - Preserve card hierarchy: key metrics first, detail second.

### 2) Resource Management Main Page

- File: PageGestionDeRecursos.png
- Route (target): /resources
- What this defines:
  - Left sidebar navigation
  - Header search and page actions
  - Resource cards grid with status and actions
  - Pagination style
- Implementation notes:
  - This reference covers listing and quick actions only.
  - Create/Edit resource forms are not shown and must follow same visual language.

### 3) Weekly Schedule / Bookings Calendar

- File: PageAgendaSemanal.png
- Route (target): /bookings or /agenda
- What this defines:
  - Weekly calendar board
  - Resource and location filtering panel
  - Booking blocks by status
  - Primary action for creating a booking
- Implementation notes:
  - Calendar is the operational center for day-to-day staff.
  - Status chips must map to backend booking statuses.

## Shared Layout Observed in References

- Sidebar navigation for admin modules
- Top header with contextual actions
- Card-first UI with soft surfaces and clear hierarchy
- Filters and actions above main content

## Theme Direction (Approved Base)

### Fonts

- Sans: Inter, ui-sans-serif, system-ui
- Body: Nunito, ui-sans-serif, system-ui

### Color Tokens

- Primary (navy):
  - primary: #1a365d
  - primary-light: #2c4f82
  - primary-dark: #102a4c
- Secondary (orange):
  - secondary: #ff6b35
  - secondary-light: #ff8c5a
  - secondary-dark: #e55a2a
- Success:
  - success: #48bb78
  - success-light: #68d391
  - success-dark: #38a169
- Neutral:
  - neutral: #f7fafc
  - neutral-light: #ffffff
  - neutral-dark: #e2e8f0

### Suggested UI Mapping

- Sidebar/background emphasis: primary and primary-dark
- Primary buttons and active navigation: primary
- Main CTA/accent actions: secondary
- Positive statuses and confirmations: success
- Surfaces and cards: neutral-light over neutral

## Pending Visual Gaps

- Resource create form
- Resource edit form
- Booking detail drawer/modal
- Empty, loading, and error states
- Mobile-specific variants

## QA Checklist Per Added Image

- File name is stable and descriptive.
- Route target is documented.
- Main user goal is stated.
- Notes include important behavior constraints.

## Change Log

- 2026-03-20: README simplified and filled with the 3 real references currently available.
