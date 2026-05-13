# Memoria operativa: admin-client-memberships

Fecha: 2026-05-13
Rama: feat/admin-client-memberships

## Nota sobre Engram

El usuario pidio usar Engram para guardar el plan y los avances. En esta sesion no hay herramientas Engram o memoria expuestas en el toolset activo. Se busco una herramienta relacionada y no aparecio ninguna integracion disponible.

Fallback elegido: guardar la memoria del cambio en este archivo versionado, dentro de `docs/sdd/admin-client-memberships/`, para mantener trazabilidad y poder migrarla a Engram cuando la herramienta este disponible.

## Resumen del objetivo

Preparar el admin para membresias de clientes finales, cubriendo tanto:

- Pilates/yoga con suscripciones mensuales a clases fijas, cupos por sala/recurso y recuperaciones.
- Barberias/salones con membresias flexibles de servicios incluidos por mes.

## Decisiones persistidas

- El modulo se llamara "Membresias".
- No se reutilizara el label "Suscripcion" porque ya representa el plan SaaS del tenant en Configuracion.
- La ruta propuesta es `/membresias`.
- La pantalla se divide en tabs: `Suscripciones`, `Planes`, `Cupos`.
- Agenda queda como vista operativa de turnos, no como admin principal de membresias.
- El detalle de cliente debe incorporar informacion de membresia.
- Para FIXED, la UI debe mostrar ocupacion antes de confirmar el alta.
- Para FLEXIBLE, la UI no debe pedir horarios recurrentes.
- Para BOTH, la UI debe permitir elegir modalidad de la suscripcion.

## Contrato backend corregido

- Usar `durationPeriod`, no `billingPeriod`.
- Usar `durationPeriod: "MONTHLY"` por ahora.
- `recurringSlots.dayOfWeek`: 0=Lunes, 1=Martes, 2=Miercoles, 3=Jueves, 4=Viernes, 5=Sabado, 6=Domingo.
- Listar suscripciones con `GET /api/v1/admin/client-subscriptions`.
- Consultar ocupacion con `GET /api/v1/admin/client-subscriptions/occupancy?resourceId=&validOn=`.

## Estado inicial observado

- Branch base local `dev` estaba detras de `origin/dev` por 2 commits.
- Se creo `feat/admin-client-memberships` desde `origin/dev`.
- Cambios locales preexistentes preservados:
  - `.env.development`
  - `vite.config.ts`
  - `.claude/`

## Proxima accion recomendada

Batch 1 quedo implementado el 2026-05-13:

- Tipos de capabilities, planes, suscripciones, slots recurrentes y occupancy.
- Service y hook para `GET /tenant/capabilities`.
- Service y hooks base para planes, suscripciones y occupancy.
- Ruta `/membresias`.
- Item de navegacion "Membresias" con visibilidad basada en capabilities.
- Page shell con tabs `Suscripciones`, `Planes` y `Cupos`.
- Gating por tier, rubro no aplicable y tenant sin planes.
- Mapper de errores de negocio para 402, 422, 409 y 404.
- Typecheck y build pasaron.

Batch 2 quedo implementado el 2026-05-13:

- Tab `Planes` conectada a `GET /admin/subscription-plans`.
- Tabla responsive con plan, modalidad, clases por mes, precio y estado.
- Panel lateral para crear planes.
- Panel lateral para editar planes.
- Confirmacion para eliminar planes.
- Mutations de create/update/delete con invalidacion de `membership-plans` y `tenant-capabilities`.
- Error `PLAN_HAS_ACTIVE_SUBSCRIPTIONS` mapeado a mensaje de negocio.
- Empty state inicial conectado al alta del primer plan.
- Typecheck y build pasaron.

Proxima accion recomendada:

Implementar fase 3 de `tasks.md`:

- Listado de suscripciones.
- Filtros por estado, cliente y plan.
- Panel de detalle.
- Acciones de pago, override y baja.

Despues de cada fase, actualizar `tasks.md`, `memory.md` y `state.yaml`.
