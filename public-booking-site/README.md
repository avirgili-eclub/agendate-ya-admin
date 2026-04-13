# Public Booking Site

Frontend publico de reservas multi-tenant (white-label) para AgendateYA.

## Estado

- Batch 1 en progreso (Foundation)
- Base SDD: `docs/sdd/public-booking-frontend`

## Alcance inicial del scaffold

- Resolucion de tenant por `host` (subdominio -> `slug`)
- Carga de `booking-config` publico por slug
- Aplicacion de branding por CSS variables en layout
- Landing inicial con CTA principal

## Dependencias externas (backend)

- `GET /api/v1/public/{slug}/booking-config`
- Flag de tenant publicado

## Nota

Este directorio inicia el proyecto SvelteKit del sitio publico sin interferir con el admin actual.
