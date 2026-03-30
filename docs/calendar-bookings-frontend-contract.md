# Frontend Team - Calendar Bookings Endpoint Contract

## Endpoint

- Method: `GET`
- Path: `/api/v1/bookings/calendar`
- Auth: `Authorization: Bearer {token}`

## Query Parameters

| Param         | Tipo                  | Requerido | Ejemplo             | Descripcion                             |
| ------------- | --------------------- | --------- | ------------------- | --------------------------------------- |
| `resourceIds` | string (CSV UUIDs)    | Si        | `uuid1,uuid2,uuid3` | IDs de los recursos seleccionados       |
| `startDate`   | string (`yyyy-MM-dd`) | Si        | `2026-03-30`        | Inicio del rango visible del calendario |
| `endDate`     | string (`yyyy-MM-dd`) | Si        | `2026-04-05`        | Fin del rango visible del calendario    |
| `statuses`    | string (CSV)          | No        | `PENDING,CONFIRMED` | Default backend: `PENDING,CONFIRMED`    |

## Example Request

```http
GET /api/v1/bookings/calendar?resourceIds=aaa-111,bbb-222&startDate=2026-03-30&endDate=2026-04-05
Authorization: Bearer {token}
```

## Example Response

```json
{
  "data": [
    {
      "id": "ccc-333",
      "resourceId": "aaa-111",
      "resourceName": "Carlos (Barbero)",
      "serviceId": "ddd-444",
      "serviceName": "Corte + Barba",
      "clientId": "eee-555",
      "clientName": "Carlos Martinez",
      "clientPhone": "+595981999888",
      "locationId": "fff-666",
      "startTime": "2026-03-30T13:15:00Z",
      "endTime": "2026-03-30T14:00:00Z",
      "status": "CONFIRMED",
      "notes": "El cliente pidio que le dejen el fade bajo",
      "sourceChannel": "WHATSAPP",
      "createdAt": "2026-03-28T10:00:00Z",
      "updatedAt": "2026-03-28T10:00:00Z"
    }
  ],
  "meta": {}
}
```

## Frontend Expected Behavior

- `0` resources seleccionados: no hacer request y limpiar calendario.
- Selecciona `1` resource: llamar con `resourceIds=uuid1`.
- Agrega otro resource: re-llamar con `resourceIds=uuid1,uuid2`.
- Quita un resource: re-llamar sin ese UUID. Si queda `0`, limpiar y no llamar.
- Cambia location: limpiar resources seleccionados y limpiar calendario; cuando seleccione resources nuevos, recien ahi llamar.
- Cambia semana/mes del calendario: re-llamar con nuevo `startDate/endDate` manteniendo `resourceIds`.

## Calendar Card Mapping

- `startTime` -> hora inicio (convertida a timezone local del tenant/usuario).
- `endTime` -> hora fin.
- `clientName` -> nombre del cliente (truncar si es muy largo).
- `serviceName` -> nombre del servicio.
- `notes` -> mostrar solo si no es `null`/vacio.

## Valid Statuses

- `PENDING`
- `CONFIRMED`
- `CANCELLED`
- `COMPLETED`
- `NO_SHOW`

## Possible Errors

- `400`: `resourceIds` vacio, UUID invalido, fecha invalida, `endDate < startDate`.
- `401`: token expirado o invalido.
- `403`: sin permisos.

## Implementation Notes

- En Agenda, el flujo actual de listado de bookings debe migrar progresivamente a este endpoint para el calendario.
- Mantener fallback UX consistente con `ErrorState`/`FeedbackBanner`.
- No bloquear render UI por filtros vacios; limpiar estado de calendario de forma explicita.
