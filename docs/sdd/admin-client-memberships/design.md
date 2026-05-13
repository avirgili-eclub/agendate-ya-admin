# Diseno tecnico: admin-client-memberships

Fecha: 2026-05-13
Estado: planning-ready

## Arquitectura propuesta

Crear un feature module nuevo `src/features/memberships` para aislar el dominio B2C de membresias y evitar mezclarlo con la seccion SaaS de Configuracion.

Estructura sugerida:

```text
src/features/memberships/
  memberships-page.tsx
  memberships-service.ts
  use-memberships-query.ts
  use-membership-plans-query.ts
  membership-types.ts
  components/
    membership-create-panel.tsx
    membership-detail-panel.tsx
    membership-error-state.tsx
    membership-gate.tsx
    membership-occupancy-grid.tsx
    membership-plan-form-panel.tsx
    membership-plan-table.tsx
    membership-status.tsx
    membership-subscriptions-table.tsx
```

Crear o extender un feature compartido de tenant:

```text
src/features/tenant/
  tenant-capabilities-service.ts
  use-tenant-capabilities-query.ts
  tenant-capabilities-types.ts
```

## Rutas y navegacion

Cambios esperados:

- `src/router.tsx`: agregar ruta `/membresias`.
- `src/app/navigation.ts`: agregar item "Membresias".
- `src/shared/layout/app-shell.tsx`: solo modificar si se decide soportar nav items dinamicos o locked state.

Decision de primer corte:

- Implementar page-level gating primero para reducir riesgo.
- Mostrar el item de sidebar si el modulo aplica al tenant o si capabilities aun estan cargando.
- Si luego se necesita nav dinamica por tier, extender el contrato de navegacion con `featureKey`.

## Data fetching

Usar TanStack Query siguiendo patrones existentes del repo.

Query keys sugeridas:

```ts
['tenantCapabilities']
['membershipPlans', filters]
['clientSubscriptions', filters]
['clientSubscription', id]
['membershipOccupancy', resourceId, validOn]
```

Mutations:

- `createMembershipPlan`
- `updateMembershipPlan`
- `deleteMembershipPlan`
- `createClientSubscription`
- `cancelClientSubscription`
- `updateClientSubscriptionBillingStatus`
- `updateClientSubscriptionManualRenewalOverride`

Invalidaciones:

- Crear/editar/eliminar plan invalida `membershipPlans` y `tenantCapabilities`.
- Crear/cancelar suscripcion invalida `clientSubscriptions`, `membershipOccupancy` y detalle de cliente si esta cargado.
- Cambios de pago invalidan `clientSubscriptions` y `clientSubscription`.

## Tipos frontend

Enums:

```ts
type MembershipScheduleMode = 'FIXED' | 'FLEXIBLE' | 'BOTH';
type MembershipDurationPeriod = 'MONTHLY';
type MembershipStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';
type MembershipBillingStatus = 'PAID' | 'PENDING' | 'OVERDUE';
```

Recurring slot:

```ts
type MembershipRecurringSlot = {
  resourceId: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string;
};
```

Regla importante:

- No convertir `dayOfWeek` a convencion JS `Date.getDay()` sin una funcion explicita. Backend usa lunes=0 y domingo=6.

## UX por tab

### Suscripciones

Pantalla de trabajo principal.

Componentes:

- Barra de filtros compacta.
- Tabla densa con estados visuales.
- Boton primario "Nueva membresia".
- Panel lateral de detalle.
- Empty state segun contexto: sin planes, sin suscripciones, sin resultados por filtros.

### Planes

Configuracion de productos de membresia.

Componentes:

- Tabla de planes.
- Panel lateral de crear/editar.
- Confirmacion de baja.
- Indicadores de modo: Fijo, Flexible, Ambos.

### Cupos

Vista operativa para FIXED.

Componentes:

- Selector de recurso/sala.
- Selector de fecha de referencia.
- Grilla semanal lunes a domingo.
- Slots con `activeSubscriptions / capacity` o `availableSlots`.
- Estados: disponible, casi lleno, lleno, sin datos.

Fuente de verdad:

- Occupancy indica ocupacion real.
- Disponibilidad/capacidad del recurso completa la grilla cuando este disponible.

## Creacion de membresia

Usar un panel lateral amplio o modal con pasos.

Paso 1: Cliente y plan.

- Seleccionar cliente existente.
- Permitir crear cliente rapido solo si el repo ya tiene patron para eso.
- Seleccionar plan.

Paso 2: Servicio y periodo.

- Servicio asociado.
- Location.
- Start date.
- End date opcional.
- Estado de pago inicial.

Paso 3: Horarios.

- Se muestra para `FIXED`.
- Opcional o configurable para `BOTH`.
- Oculto para `FLEXIBLE`.
- Usa occupancy para bloquear slots llenos.

Paso 4: Revision.

- Resumen de cliente, plan, precio, clases por periodo y horarios.
- Submit.

## Manejo de errores

Crear un mapper de errores de membresias, idealmente cerca del feature:

```text
src/features/memberships/membership-errors.ts
```

Debe traducir codigo HTTP y codigo de negocio a:

- titulo corto.
- descripcion accionable.
- severidad.
- accion sugerida cuando aplique.

## Integracion con Clientes

Archivo probable:

- `src/features/clients/components/client-detail-panel.tsx`

Agregar una pestana "Membresia" o una seccion si el componente no usa tabs.

Datos:

- Reutilizar `GET /api/v1/admin/client-subscriptions?clientId=...`.
- Mostrar activa primero.
- Reusar componentes de estado del feature memberships.

## Integracion con Agenda

Primer corte opcional:

- Solo pintar badges si la respuesta de turnos ya incluye origen o metadata de membresia.
- No crear consultas extra por cada evento del calendario.

## Estados visuales

Estados necesarios:

- Loading skeleton para tabs y tablas.
- Empty state sin planes.
- Empty state sin suscripciones.
- Empty state sin resultados filtrados.
- Locked state por tier.
- Error state con retry.
- Conflict state para slot lleno.

## Verificacion

Comandos:

```bash
npm run typecheck
npm run build
```

Browser smoke:

- Abrir `http://localhost:5173/membresias`.
- Verificar gating con tenant actual.
- Crear plan de prueba si backend/dev lo permite.
- Verificar responsive desktop y mobile.
- Verificar que Agenda, Turnos, Clientes, Servicios y Recursos sigan navegando.

## Fases de implementacion

1. Foundation: types, services, capabilities, route y page shell.
2. Planes: CRUD visual y mutations.
3. Suscripciones: lista, filtros y detalle.
4. Crear membresia: wizard con FIXED/FLEXIBLE/BOTH.
5. Cupos: occupancy grid y seleccion de slots.
6. Integraciones: cliente detail y badges de agenda si hay metadata.
7. QA: typecheck, build y browser smoke.
