# Propuesta: admin-client-memberships

Fecha: 2026-05-13
Estado: planning-ready

## Problema

El admin puede gestionar turnos individuales, servicios, clientes y recursos, pero no tiene una superficie clara para membresias de clientes finales. Esto limita rubros como pilates o yoga, donde la venta real no es un turno aislado sino una suscripcion mensual con clases recurrentes, cupos por sala y recuperaciones.

Tambien limita barberias o salones que quieran vender membresias flexibles con una cantidad de servicios incluidos por mes.

## Objetivo

Agregar un modulo de administracion de Membresias que permita a un tenant:

- Ver si el modulo esta habilitado por su tier.
- Configurar planes de membresia.
- Crear, listar, filtrar, editar y cancelar suscripciones de clientes.
- Gestionar cupos por recurso y horario para planes de modalidad FIXED.
- Mantener el flujo actual de agenda/turnos sin regresiones.

## No objetivos iniciales

- No redisenar Agenda.
- No cambiar el modelo de Turnos existente.
- No crear portal de cliente final.
- No implementar cobros online ni facturacion automatica.
- No resolver la logica completa de recuperaciones si el backend aun no expone una entidad especifica para eso.
- No crear una nueva vista de calendario paralela a Agenda.

## Alcance frontend

Crear la ruta `/membresias` con tres tabs:

- Suscripciones: tabla principal, filtros, detalle y acciones.
- Planes: configuracion CRUD de planes.
- Cupos: lectura de ocupacion por recurso/sala y fecha de referencia.

Integrar:

- `GET /api/v1/tenant/capabilities` para gating del modulo.
- Endpoints de subscription plans.
- Endpoints de client subscriptions.
- Endpoint de occupancy para FIXED/BOTH.
- Pestana o seccion de Membresia en detalle de cliente.

## Criterios de aceptacion

- Un tenant con capabilities habilitadas ve el item "Membresias" y puede abrir `/membresias`.
- Un tenant sin tier habilitado ve una pantalla bloqueada con accion de upgrade, sin romper navegacion.
- Un tenant sin planes configurados ve un empty state orientado a crear el primer plan.
- El admin puede listar planes y crear un plan con `durationPeriod: MONTHLY`, `classesPerPeriod` y `scheduleMode`.
- El admin puede listar suscripciones con filtros por estado, cliente y plan.
- El admin puede crear una suscripcion FLEXIBLE sin `recurringSlots`.
- El admin puede crear una suscripcion FIXED seleccionando `recurringSlots` con `dayOfWeek` 0..6.
- Si un slot esta lleno, la UI bloquea la seleccion cuando occupancy lo permite y muestra un mensaje claro si backend devuelve 409.
- Los errores 402, 422 y 409 se muestran como problemas de negocio, no como errores genericos.
- El detalle de cliente muestra su membresia o estado vacio si no tiene ninguna.

## Trazabilidad

Los artefactos de esta propuesta viven en:

- `docs/sdd/admin-client-memberships/explore.md`
- `docs/sdd/admin-client-memberships/proposal.md`
- `docs/sdd/admin-client-memberships/spec.md`
- `docs/sdd/admin-client-memberships/design.md`
- `docs/sdd/admin-client-memberships/tasks.md`
- `docs/sdd/admin-client-memberships/memory.md`
- `docs/sdd/admin-client-memberships/state.yaml`
