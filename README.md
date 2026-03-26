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

## Deployment

### Requisitos
- Docker + Docker Compose en el VPS
- Traefik configurado como reverse proxy (ver docker-compose.traefik.yml en el backend)
- Acceso SSH al VPS
- GitHub Container Registry (GHCR) configurado
- Cloudflare DNS apuntando al VPS (ver docs/cloudflare-setup.md)

### Arquitectura
```
Internet → Cloudflare DNS → Hetzner VPS
                              │
                           Traefik (:443, SSL auto)
                              │
                    ┌─────────┴──────────┐
                    │                    │
              PathPrefix(/api)     Default (/)
              priority: 10         priority: 1
                    │                    │
              spring-boot:8080     nginx:80
              (agendateya-api)     (agendateya-admin)
```

### Build local
```bash
npm run build        # Genera dist/ con el SPA
npm run preview      # Preview del build de producción
```

### Docker local
```bash
docker build -t agendateya-admin .
docker run -p 3000:80 agendateya-admin
# Abrir http://localhost:3000
```

### Deploy manual (VPS)
1. Build y push de la imagen Docker
2. SSH al VPS
3. Pull de la imagen
4. `docker compose -f docker-compose.dev.yml up -d`

### CI/CD (GitHub Actions)
- Push a `main` → typecheck → build Docker → push GHCR → deploy a dev
- El workflow está en `.github/workflows/deploy.yml`
- Secrets necesarios en GitHub:
  - `VPS_HOST` — IP o hostname del VPS
  - `VPS_USER` — Usuario SSH
  - `VPS_SSH_KEY` — Clave privada SSH
  - `DEPLOY_PATH_ADMIN` — Path en el VPS donde están los compose files del frontend

### Variables de entorno
| Variable | Descripción | Dónde se configura |
|----------|-------------|-------------------|
| `VITE_API_BASE_URL` | Base URL de la API (build-time) | `.env.production` |
| `ADMIN_HOST` | Dominio para Traefik | `.env.dev` en el VPS |
| `GITHUB_REPO` | Repo para GHCR image | `.env.dev` en el VPS |

### Cambio necesario en el backend
Para que frontend y backend convivan en el mismo dominio, el backend necesita agregar `PathPrefix` a sus Traefik labels:

```yaml
# En docker-compose.dev.yml del BACKEND (agendate-ya)
# Cambiar la línea:
- traefik.http.routers.agendateya-dev.rule=Host(`${API_HOST}`)
# Por:
- traefik.http.routers.agendateya-dev.rule=Host(`${API_HOST}`) && PathPrefix(`/api`)
- traefik.http.routers.agendateya-dev.priority=10
```

Y en el router HTTP redirect también:
```yaml
- traefik.http.routers.agendateya-dev-http.rule=Host(`${API_HOST}`) && PathPrefix(`/api`)
```

### Estructura de archivos de deploy
```
├── .github/workflows/deploy.yml   # CI/CD pipeline
├── Dockerfile                      # Multi-stage build (node → nginx)
├── nginx/default.conf              # SPA serving config
├── docker-compose.dev.yml          # Dev environment compose
├── .env.production                 # Build-time env vars
├── .env.dev.example                # Template para VPS env vars
├── .dockerignore                   # Docker build exclusions
└── docs/cloudflare-setup.md        # Guía de configuración DNS
```
