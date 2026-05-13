# Tasks: admin-client-memberships

Fecha: 2026-05-13
Estado: planning-ready

## 0. Preparacion

- [x] 0.1 Crear rama `feat/admin-client-memberships` desde `origin/dev`.
- [x] 0.2 Revisar estado inicial del worktree y preservar cambios locales existentes.
- [x] 0.3 Leer la guia backend de membresias y registrar correcciones de contrato.
- [x] 0.4 Explorar UI actual del admin en `http://localhost:5173`.
- [x] 0.5 Crear artefactos SDD trazables para la implementacion.

## 1. Foundation y gating

- [x] 1.1 Crear tipos frontend para capabilities, planes, suscripciones, recurring slots y occupancy.
- [x] 1.2 Crear service y hook para `GET /api/v1/tenant/capabilities`.
- [x] 1.3 Crear service base de memberships con endpoints de planes, suscripciones y occupancy.
- [x] 1.4 Agregar ruta `/membresias`.
- [x] 1.5 Agregar item "Membresias" en la navegacion.
- [x] 1.6 Crear page shell con tabs `Suscripciones`, `Planes` y `Cupos`.
- [x] 1.7 Implementar page-level gating por capabilities.
- [x] 1.8 Crear mapper de errores de negocio 402, 422, 409 y 404.

## 2. Planes

- [x] 2.1 Implementar query de planes.
- [x] 2.2 Implementar tabla de planes con estados de modo, precio, clases y estado activo.
- [x] 2.3 Implementar panel de crear plan.
- [x] 2.4 Implementar panel de editar plan.
- [x] 2.5 Implementar eliminar/desactivar plan con confirmacion.
- [x] 2.6 Manejar error `PLAN_HAS_ACTIVE_SUBSCRIPTIONS`.
- [x] 2.7 Conectar empty state inicial cuando no hay planes.

## 3. Suscripciones

- [x] 3.1 Implementar query `GET /api/v1/admin/client-subscriptions` con filtros.
- [x] 3.2 Crear filtros por estado, cliente y plan.
- [x] 3.3 Implementar tabla de suscripciones.
- [x] 3.4 Implementar panel de detalle de suscripcion.
- [x] 3.5 Mostrar slots recurrentes, uso del periodo, estado de pago y estado de suscripcion.
- [x] 3.6 Implementar actualizar estado de pago.
- [x] 3.7 Implementar override de renovacion manual.
- [x] 3.8 Implementar cancelar/dar de baja suscripcion.

## 4. Alta de membresia

- [ ] 4.1 Crear wizard o panel lateral de "Nueva membresia".
- [ ] 4.2 Paso cliente y plan.
- [ ] 4.3 Paso servicio, location, periodo y estado de pago.
- [ ] 4.4 Paso horarios condicionado por `scheduleMode`.
- [ ] 4.5 Enviar `recurringSlots` solo cuando corresponde.
- [ ] 4.6 Validar `dayOfWeek` con convencion lunes=0 a domingo=6.
- [ ] 4.7 Mostrar revision antes de confirmar.
- [ ] 4.8 Manejar errores `SLOTS_REQUIRED_FOR_FIXED_PLAN` y `SLOTS_NOT_ALLOWED_FOR_FLEXIBLE_PLAN`.

## 5. Cupos y occupancy

- [ ] 5.1 Implementar query de occupancy por `resourceId` y `validOn`.
- [ ] 5.2 Reutilizar disponibilidad/capacidad de recursos si ya existe en el frontend.
- [ ] 5.3 Crear grilla semanal de cupos.
- [ ] 5.4 Interpretar slots ausentes de occupancy como cero ocupacion cuando exista disponibilidad base.
- [ ] 5.5 Bloquear seleccion de slots con `availableSlots <= 0`.
- [ ] 5.6 Manejar error `SUBSCRIPTION_SLOT_FULL`.
- [ ] 5.7 Integrar occupancy en tab `Cupos` y en el wizard de alta.

## 6. Integraciones

- [ ] 6.1 Agregar seccion o pestana `Membresia` al detalle de cliente.
- [ ] 6.2 Consultar suscripciones por `clientId` desde el detalle de cliente.
- [ ] 6.3 Mostrar accion para crear membresia desde un cliente.
- [ ] 6.4 Agregar badges en Agenda para turnos de membresia si el payload actual lo permite.
- [ ] 6.5 Confirmar que Turnos, Servicios y Recursos no cambien de comportamiento.

## 7. QA y release

- [x] 7.1 Ejecutar `npm run typecheck`.
- [x] 7.2 Ejecutar `npm run build`.
- [ ] 7.3 Browser smoke en `/membresias` desktop.
- [ ] 7.4 Browser smoke en `/membresias` mobile.
- [ ] 7.5 Probar tenant sin planes configurados.
- [ ] 7.6 Probar tenant con plan FIXED y slot lleno.
- [ ] 7.7 Probar tenant con plan FLEXIBLE sin slots.
- [ ] 7.8 Actualizar este archivo con avances reales.
