# AgendateYA Admin - Backlog por Batches de Implementacion

Estado general: Activo
Fuente de verdad funcional: este documento + docs/implementation-slices-checklist.md

## Reglas de ejecucion

- Cada batch debe cerrar con QA funcional y QA visual del alcance incluido.
- Mantener arquitectura y patrones actuales (core api, services por feature, shared ui).
- Mantener look and feel actual del admin (tokens, spacing, componentes y feedback).
- Si falta contrato backend, registrar bloqueo puntual y continuar con lo no bloqueado.

## Batch A - Agenda E2E Nuevo Turno + Calendario Multi-Recurso

Objetivo: cerrar end-to-end la creacion de turnos desde Agenda y reflejarlo correctamente en el calendario por localidad y recurso.

### Alcance

- [x] Implementar form real en el slide de Nuevo Turno de Agenda (hoy es shell).
- [x] Conectar POST al backend para crear turno (payload, mapeo, errores de contrato).
- [x] Manejar feedback completo: exito, error de validacion, conflicto, errores inesperados.
- [x] Reflejar turno creado en el calendario sin recarga manual (invalidate/refetch o update optimista seguro).
- [x] Reutilizar referencia funcional de la pagina /turnos para flujo de alta.
- [x] Reutilizar input de telefono con mask y placeholder igual a registro/onboarding.

### Filtros y calendario

- [x] Soportar filtro por localidad y recurso con seleccion multiple.
- [x] Al seleccionar localidad(es), cargar recursos correspondientes para seleccionar uno o mas.
- [x] Al seleccionar recurso(s), traer agendamientos de esos recursos y renderizarlos en el calendario.
- [x] Resolver superposicion por fecha/hora entre recursos distintos sin perder legibilidad.
- [x] Mantener claridad de lectura cuando dos o mas profesionales tienen turnos en mismo rango horario.

### Integracion endpoint calendario (nuevo contrato backend)

- [x] Integrar `GET /api/v1/bookings/calendar` para poblar calendario por rango visible y recursos seleccionados.
- [x] Si hay 0 recursos seleccionados: no hacer request y limpiar calendario.
- [x] Al agregar/quitar recursos: recalcular CSV de `resourceIds` y relanzar request.
- [x] Al cambiar location: limpiar resources seleccionados y limpiar calendario; no llamar hasta nueva seleccion.
- [x] Al cambiar semana/mes: relanzar request con nuevo `startDate/endDate` manteniendo `resourceIds`.
- [x] Soportar `statuses` (default backend: `PENDING,CONFIRMED`) y permitir futura extension de filtros por estado.
- [x] Manejar errores esperados del endpoint (`400`, `401`, `403`) con UX consistente.
- [x] Mantener mapeo de card (hora inicio-fin local, cliente truncado, servicio, nota opcional).

Referencia de contrato para implementacion:

- docs/calendar-bookings-frontend-contract.md

### Card de agendamiento en calendario

- [x] Mostrar formato visual:
  - [x] Hora inicio - hora fin
  - [x] Nombre del cliente
  - [x] Icono WhatsApp junto al cliente para contacto rapido
  - [x] Servicio elegido
  - [x] Nota solo si existe
- [x] Respetar colores por estado del turno para referencia visual consistente.

### Definition of Done

- [x] Crear turno desde Agenda funciona end-to-end con backend.
- [x] Turno nuevo se visualiza en calendario con filtros activos.
- [x] Error handling cubierto para 400/409/422 y fallback generico.
- [ ] QA manual con escenarios de superposicion multi-recurso completado.

Nota: los items marcados como completados estan implementados en frontend y typecheck OK. Falta validacion QA E2E contra backend en ambiente integrado.

## Batch B - Modulo Locales (CRUD completo)

Objetivo: agregar la pagina de Locales con obtener, ver, crear, editar y acciones relacionadas.

### Alcance

- [x] Crear ruta y pagina de Locales en navegacion principal.
- [x] Implementar listado con estados loading/empty/error.
- [x] Implementar crear local (form + validaciones + alta backend).
- [x] Implementar editar local (form + validaciones + actualizacion backend).
- [x] Implementar ver detalle basico y acciones disponibles segun rol.
- [x] Implementar eliminacion o desactivacion segun contrato backend vigente.

Nota: según OpenAPI actual, para Locales existe eliminación (`DELETE /locations/{id}`) y no endpoint explícito de desactivación. Se implementó eliminación con validación de dependencias.

### Definition of Done

- [x] CRUD operativo segun endpoint disponible.
- [x] Manejo de errores consistente con el resto del admin.
- [ ] QA responsive y accesibilidad basica del modulo.

## Batch C - Fix visual Recursos + micro-UX

Objetivo: corregir desborde del boton Desactivar en card de recursos y evitar regresiones visuales.

### Alcance

- [x] Corregir layout de acciones en card de recurso para que el cuarto boton quede contenido.
- [x] Revisar variantes de ancho (desktop/tablet/mobile) y textos largos.
- [x] Ajustar espaciado/alineacion para mantener consistencia con el design system actual.

### Definition of Done

- [x] No hay overflow horizontal en acciones de card.
- [x] Botones alineados y accesibles en breakpoints principales.

## Batch D - Hardening funcional y QA transversal

Objetivo: cerrar deuda de validaciones y hardening que quedo abierta en slices previos.

### Alcance heredado del checklist

- [ ] Validar 401 refresh success/failure en runtime.
- [ ] Validar 422 invalid transition y restricciones de cancelacion.
- [ ] Validar reglas de availability (day mapping, available=false, guidance delete/deactivate).
- [ ] Cerrar QA de usuarios/clientes/tenant pendientes (roles, 409, historial, etc.).
- [ ] Completar state handling en paginas restantes (Agenda/Bookings/Availability/Users/Clients/Tenant).
- [ ] Completar auditoria de accesibilidad y consistencia de tokens/spacing.
- [ ] Production-grade auth: migrar refresh token desde storage a cookie segura (httpOnly/secure/sameSite) y ejecutar silent refresh al boot.

### Definition of Done

- [ ] Checklist de QA sin pendientes criticos de MVP.
- [ ] Sin regresiones visuales mayores en paginas core.

## Dependencias y riesgos abiertos

- Backend en construccion: pueden cambiar payloads o endpoints.
- Si falta endpoint para algun flujo, registrar gap y acordar contrato temporal.
- Si cambia contrato, priorizar adaptar service layer sin romper UX.

## Traza de tareas estilo SDD

Estado actual: parcial (Batch A en progreso)

### Batch A (Agenda)

- [x] A-01 Form slide Nuevo Turno implementado
- [x] A-02 POST create booking integrado con service layer
- [x] A-03 Manejo de exito y errores (400/409/422/generico)
- [x] A-04 Refresco de calendario al crear turno
- [x] A-05 Filtro multi-localidad y multi-recurso
- [x] A-06 Carga de agendamientos por recursos seleccionados
- [x] A-07 Render superposicion horaria multi-recurso
- [x] A-08 Card con hora cliente servicio nota opcional
- [x] A-09 Mapeo visual de estados en cards de calendario
- [x] A-10 Reuso mask/placeholder de telefono de registro
- [x] A-11 Integrar endpoint /bookings/calendar con query params (resourceIds,startDate,endDate,statuses)
- [x] A-12 Regla 0 recursos: limpiar calendario y no request
- [x] A-13 Re-fetch por cambios de resources/location/rango de calendario
- [x] A-14 Manejo de errores 400/401/403 del endpoint calendario
- [x] A-15 Mapeo final de card calendario segun contrato (timezone local + nota opcional)
- [ ] A-16 Verificacion QA de comportamiento esperado del endpoint calendario
- [x] A-17 Accion manual WhatsApp Web desde card (mensaje prearmado con contexto)

### Batch B (Locales)

- [x] B-01 Ruta y pagina de Locales
- [x] B-02 Listado con loading empty error
- [x] B-03 Crear local con validaciones
- [x] B-04 Editar local con validaciones
- [x] B-05 Acciones por rol (ver/editar/desactivar/eliminar segun contrato)

### Batch C (Recursos)

- [x] C-01 Fix overflow del boton Desactivar en card
- [x] C-02 Ajustes responsive de acciones en card
- [x] C-03 Consistencia visual final de la card

### Batch D (Hardening)

- D-01 QA runtime refresh 401 success/failure
- D-02 QA transiciones booking 422 y cancelaciones
- D-03 QA availability y guidance de acciones
- D-04 QA usuarios/clientes/tenant pendientes
- D-05 State handling completo en modulos faltantes
- D-06 Auditoria a11y y consistencia visual
- D-07 Production-grade auth (refresh token en cookie segura + silent refresh al boot)

## Siguiente corte sugerido

1. Ejecutar Batch A primero (impacto operativo directo en Agenda).
2. Ejecutar Batch C en paralelo si se quiere quick win visual sin bloquear negocio.
3. Ejecutar Batch B (Locales) y luego Batch D (hardening transversal).

## Notas UX/UI (recomendaciones)

- Para superposicion multi-recurso en calendario, usar diferenciador por columna o marcador de recurso en card para evitar ambiguedad.
- En cards con poco ancho, truncar una sola linea en cliente/servicio y mantener tooltip para lectura completa.
- En Nuevo Turno, priorizar feedback inline por campo y banner resumido arriba para errores de backend.
