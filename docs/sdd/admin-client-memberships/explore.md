# Exploracion: admin-client-memberships

Fecha: 2026-05-13
Estado: planning-ready
Rama: feat/admin-client-memberships

## Contexto

El admin actual esta optimizado para un negocio tipo barberia: agenda diaria, turnos individuales, servicios, profesionales y recursos/equipos. Ese modelo sigue siendo valido, pero queda corto para tenants donde el cliente final compra una membresia o suscripcion mensual con una cantidad de clases por periodo.

La nueva superficie debe servir a dos modelos principales sin romper el flujo actual:

- FIXED: pilates, yoga, cursos, talleres o clases con sala, dia y horario fijos. La capacidad del recurso/clase limita cuantas suscripciones activas pueden tomar ese slot.
- FLEXIBLE: barberias, salones u otros rubros donde la membresia otorga creditos o servicios incluidos por mes, pero el cliente agenda segun disponibilidad.
- BOTH: planes que pueden operar en cualquiera de los dos modos o elegir slots fijos opcionalmente segun el caso.

La diferencia central de UX es que en FIXED la capacidad se administra antes de vender la membresia, mientras que en FLEXIBLE la disponibilidad se resuelve al momento de reservar cada turno.

## Observaciones del admin actual

- La navegacion ya separa superficies operativas: Dashboard, Agenda, Turnos, Clientes, Servicios, Recursos/Equipos y Configuracion.
- Existe una seccion llamada "Suscripcion" dentro de Configuracion, pero corresponde al plan SaaS del tenant. Para evitar ambiguedad, el modulo B2C debe llamarse "Membresias".
- Turnos funciona bien como listado operativo con filtros y acciones. Membresias deberia seguir ese patron para la lista principal.
- Agenda no debe convertirse en el centro de administracion de membresias. Debe seguir siendo agenda/calendario, con badges o contexto cuando un turno venga de una membresia.
- Clientes ya tiene un panel de detalle con informacion personal e historial. Es un buen lugar para agregar una pestana "Membresia" o seccion equivalente.
- Recursos/Equipos sigue siendo relevante para FIXED, porque salas, camillas, reformers o aulas son los limites de capacidad.

## Backend disponible

El backend mantiene compatibilidad con el modelo de turnos actual y agrega contratos para planes, suscripciones de clientes y ocupacion.

Contratos corregidos por backend:

- `durationPeriod` reemplaza al nombre incorrecto `billingPeriod`.
- `durationPeriod` actualmente acepta `MONTHLY`.
- `recurringSlots.dayOfWeek` usa 0=Lunes, 1=Martes, 2=Miercoles, 3=Jueves, 4=Viernes, 5=Sabado, 6=Domingo.

Endpoints relevantes:

- `GET /api/v1/tenant/capabilities`
- `GET /api/v1/admin/subscription-plans`
- `POST /api/v1/admin/subscription-plans`
- `PUT /api/v1/admin/subscription-plans/{id}`
- `DELETE /api/v1/admin/subscription-plans/{id}`
- `GET /api/v1/admin/client-subscriptions`
- `GET /api/v1/admin/client-subscriptions/{id}`
- `POST /api/v1/admin/client-subscriptions`
- `GET /api/v1/admin/client-subscriptions/occupancy?resourceId=&validOn=`
- `DELETE /api/v1/admin/client-subscriptions/{id}`
- `PATCH /api/v1/admin/client-subscriptions/{id}/billing-status`
- `PATCH /api/v1/admin/client-subscriptions/{id}/manual-renewal-override`

Nuevos endpoints confirmados por backend:

- `GET /api/v1/admin/client-subscriptions` lista suscripciones del tenant con filtros opcionales `status`, `clientId` y `planId`, combinados con AND. Devuelve resultados ordenados por `createdAt DESC`.
- `GET /api/v1/admin/client-subscriptions/occupancy` devuelve ocupacion por slot para un `resourceId` y una fecha opcional `validOn`. Solo aparecen slots con ocupacion mayor o igual a 1; los slots ausentes deben interpretarse como disponibles si existen en la disponibilidad del recurso.

## Decisiones UX

- Crear una nueva ruta de primer nivel `/membresias`.
- Usar label "Membresias" en sidebar y en textos de dominio B2C.
- Mantener "Suscripcion" en Configuracion para el plan SaaS del tenant.
- Organizar la pantalla con tabs:
  - Suscripciones: clientes suscriptos, filtros, detalle, acciones de pago/estado.
  - Planes: CRUD de planes de membresia.
  - Cupos: vista semanal de ocupacion por recurso/sala para modelo FIXED.
- En tenants FLEXIBLE, "Cupos" puede estar oculto o en segundo plano, porque no es el flujo primario.
- En tenants FIXED o BOTH, "Cupos" debe ser visible y tambien integrarse en el wizard de creacion.
- El alta de membresia debe ser guiada, no un formulario largo:
  - Cliente y plan.
  - Servicio, periodo y estado de pago.
  - Horarios fijos si el plan lo requiere.
  - Revision y confirmacion.
- Los errores de backend deben convertirse en mensajes accionables:
  - 402: el plan del tenant no habilita el modulo.
  - 422: el modo del plan no coincide con los slots enviados.
  - 409: cupo lleno, cuota agotada o plan con suscripciones activas.

## Riesgos y preguntas abiertas

- La ocupacion devuelve solo slots ocupados. Para pintar una grilla completa de horarios disponibles hay que combinarla con la disponibilidad del recurso o servicio existente. Si esa API ya existe en el admin, reutilizarla; si no, el primer corte puede mostrar ocupacion real y pedir seleccion desde horarios existentes.
- Falta confirmar si los turnos generados por suscripcion incluyen metadata suficiente para pintar badges en Agenda sin endpoint extra.
- Falta confirmar si el rol PROFESSIONAL debe poder entrar a `/membresias` o solo ver cupos desde otra superficie. Backend permite occupancy para PROFESSIONAL, pero no lista completa de suscripciones.
- La cancelacion usa `DELETE`. En UX deberia presentarse como "Dar de baja" o "Cancelar membresia", no como borrado duro.

## Resultado esperado

El admin debe poder:

- Detectar por capabilities si debe mostrar, bloquear o sugerir configurar Membresias.
- Crear y mantener planes de membresia.
- Listar suscripciones activas, pausadas, canceladas o vencidas.
- Crear una suscripcion de cliente con slots fijos cuando el plan lo requiere.
- Validar cupos antes de confirmar una suscripcion FIXED.
- Ver ocupacion por sala/recurso sin pisar el lugar fijo de otro cliente.
- Permitir recuperaciones solo como turnos disponibles, sin cambiar la suscripcion base.
