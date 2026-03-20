# AgendateYA Admin Frontend

Frontend web de administracion para AgendateYA.

Este proyecto implementa la interfaz del panel admin para operar el negocio: autenticacion, dashboard operativo, gestion de recursos y base para los modulos administrativos del producto.

Es el frontend que consume una API backend desarrollada en Java 21 con Spring Boot 3.5.

## Stack

- React 19
- TypeScript
- Vite
- TanStack Router
- TanStack Query
- Tailwind CSS
- UI primitives propias estilo shadcn

## Scope Macro

- Autenticacion y sesion para usuarios admin
- App shell administrativa (sidebar, header, layout de modulos)
- Dashboard operacional con KPIs, turnos proximos, canales y alertas
- Gestion de recursos: listado, estado, alta/edicion, transferencia y asignacion de servicios
- Fundaciones para expansion de modulos: agenda, bookings, servicios, clientes, usuarios y tenant settings
