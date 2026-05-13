# Spec: admin-client-memberships

Fecha: 2026-05-13
Estado: planning-ready

## Requisitos

### REQ-001: Gating por capabilities

La UI debe consultar las capabilities del tenant y decidir el estado del modulo Membresias.

Escenarios:

- Si `recommended.showSubscriptionsUI` es falso o no existe, el modulo no debe presentarse como flujo principal.
- Si el tier no permite subscriptions, la ruta debe mostrar una pantalla de upgrade.
- Si `anyPlanConfigured` es falso, la ruta debe mostrar un empty state para crear el primer plan.
- Si el modulo esta habilitado y hay planes, la ruta debe mostrar las tabs operativas.

### REQ-002: Navegacion de Membresias

La UI debe exponer una ruta `/membresias` separada de Configuracion.

Escenarios:

- El sidebar muestra "Membresias" para tenants donde el modulo aplica.
- La seccion "Suscripcion" de Configuracion sigue representando el plan SaaS del tenant.
- Profesionales no deben acceder a listados administrativos si backend no lo autoriza.

### REQ-003: Gestion de planes

La UI debe permitir listar, crear, editar y eliminar planes de membresia.

Campos minimos:

- `name`
- `description`
- `price`
- `currency`
- `classesPerPeriod`
- `durationPeriod`
- `scheduleMode`
- `active`

Reglas:

- `durationPeriod` debe enviarse como `MONTHLY` hasta que backend habilite otros valores.
- `scheduleMode` debe soportar `FIXED`, `FLEXIBLE` y `BOTH`.
- La eliminacion de un plan con suscripciones activas debe mostrar el error de negocio correspondiente.

### REQ-004: Listado de suscripciones

La UI debe listar suscripciones del tenant usando filtros opcionales.

Filtros:

- Estado.
- Cliente.
- Plan.

Columnas recomendadas:

- Cliente.
- Plan.
- Modalidad.
- Uso del periodo.
- Proxima clase o proximo turno.
- Estado de pago.
- Estado de suscripcion.
- Acciones.

Reglas:

- Sin filtros, se muestran todas las suscripciones del tenant.
- Los resultados se consumen ordenados por backend (`createdAt DESC`).

### REQ-005: Creacion de suscripcion

La UI debe permitir crear una suscripcion guiada.

Pasos:

- Cliente y plan.
- Servicio, periodo y estado de pago.
- Horarios recurrentes si corresponde.
- Revision.

Reglas:

- Para planes `FIXED`, debe enviarse `recurringSlots`.
- Para planes `FLEXIBLE`, no debe enviarse `recurringSlots`.
- Para planes `BOTH`, la UI debe permitir elegir si la suscripcion se crea con slots fijos o flexible, respetando el contrato backend.
- `recurringSlots.dayOfWeek` debe usar 0=Lunes a 6=Domingo.
- Los horarios se deben validar con occupancy antes de confirmar cuando haya `resourceId`.

### REQ-006: Ocupacion de cupos

La UI debe mostrar ocupacion por recurso/sala para ayudar a vender planes FIXED.

Datos:

- `resourceId`
- `validOn`
- `dayOfWeek`
- `startTime`
- `activeSubscriptions`
- `availableSlots`

Reglas:

- Los slots que no aparecen en occupancy se consideran sin suscripciones activas.
- Si se conoce la disponibilidad/capacidad del recurso, se deben mostrar tambien los slots vacios.
- Si no se conoce la disponibilidad completa, la UI debe aclarar que solo se muestran horarios con ocupacion registrada.
- Un slot con `availableSlots <= 0` debe verse lleno y no debe poder seleccionarse para una suscripcion nueva.

### REQ-007: Detalle y acciones de suscripcion

La UI debe permitir consultar detalle de una suscripcion y ejecutar acciones administrativas.

Acciones:

- Actualizar estado de pago.
- Activar o desactivar override de renovacion manual.
- Dar de baja/cancelar suscripcion.

Reglas:

- `DELETE` debe presentarse como "Dar de baja" o "Cancelar", no como borrado tecnico.
- El panel debe mostrar slots recurrentes, uso del periodo, periodo vigente y estado de pago.

### REQ-008: Integracion con Clientes

El detalle de cliente debe mostrar informacion de membresia.

Escenarios:

- Cliente con membresia activa: mostrar plan, estado, slots y uso.
- Cliente sin membresia: mostrar empty state con accion para crear membresia.
- Cliente con multiples membresias historicas: priorizar activa y permitir ver historial si backend lo permite.

### REQ-009: Integracion ligera con Agenda

Agenda debe mantenerse como vista operativa de turnos, con contexto de membresia si los datos existen.

Escenarios:

- Un turno generado por suscripcion puede mostrar badge "Membresia".
- Un turno de recuperacion puede mostrar badge "Recuperacion" si backend lo informa.
- No bloquear el lanzamiento del modulo si esta metadata aun no existe.

### REQ-010: Manejo de errores de negocio

La UI debe mapear errores conocidos a mensajes accionables.

Errores:

- 402: modulo no habilitado por tier.
- 422 `SLOTS_REQUIRED_FOR_FIXED_PLAN`: seleccionar horarios fijos.
- 422 `SLOTS_NOT_ALLOWED_FOR_FLEXIBLE_PLAN`: quitar horarios para plan flexible.
- 409 `SUBSCRIPTION_SLOT_FULL`: elegir otro horario o liberar cupo.
- 409 `SUBSCRIPTION_QUOTA_EXHAUSTED`: revisar cupos del periodo.
- 409 `PLAN_HAS_ACTIVE_SUBSCRIPTIONS`: no se puede eliminar un plan con suscripciones activas.
- 404 `SUBSCRIPTION_NOT_FOUND`: la suscripcion ya no existe o no pertenece al tenant.
