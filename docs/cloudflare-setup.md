# Guía de Configuración DNS con Cloudflare

> **Dominio:** agendateya.app
> **VPS:** Hetzner con Traefik + Let's Encrypt (ACME HTTP challenge)
> **Entorno dev:** dev.agendateya.app

---

## 1. Configuración DNS

### Agregar el registro A

1. Entrá al dashboard de Cloudflare → seleccioná el dominio `agendateya.app`
2. Andá a **DNS → Records → Add Record**
3. Configurá:
   - **Type:** `A`
   - **Name:** `dev`
   - **IPv4 address:** `TU_IP_VPS`
   - **Proxy status:** ver sección siguiente
   - **TTL:** Auto

### Proxy de Cloudflare: la decisión más importante

Acá es donde la mayoría se manda una cagada. Cloudflare tiene dos modos para los registros DNS:

| Modo | Ícono | Qué hace |
|------|-------|----------|
| **DNS-only** | ☁️ Nube gris | Cloudflare solo resuelve DNS. El tráfico va directo a tu VPS. |
| **Proxied** | 🟠 Nube naranja | Cloudflare intercepta TODO el tráfico. Termina SSL en su edge y reenvía al origen. |

#### ¿Por qué importa esto?

Traefik usa Let's Encrypt con **HTTP challenge** (ACME). Eso significa que Let's Encrypt necesita llegar al puerto 80 de tu VPS directamente para validar que sos el dueño del dominio.

**Si activás el proxy de Cloudflare (nube naranja), el HTTP challenge de Let's Encrypt VA A FALLAR** porque Cloudflare intercepta la request antes de que llegue a Traefik.

### Opción A — DNS-only (Recomendada para dev)

La más simple y la que menos quilombo te va a dar.

1. Dejá el registro `dev` con **nube gris (DNS-only)**
2. Traefik maneja SSL con Let's Encrypt directamente
3. No tenés CDN de Cloudflare, pero para dev no lo necesitás
4. Todo funciona out of the box sin cambiar nada en Traefik

**Config DNS:**

```
Type: A
Name: dev
Content: TU_IP_VPS
Proxy: OFF (DNS only - nube gris)
TTL: Auto
```

### Opción B — Proxy de Cloudflare completo (para producción a futuro)

Si querés usar el CDN y la protección DDoS de Cloudflare, necesitás ajustar cosas:

1. Activá el proxy (nube naranja)
2. Configurá SSL mode en **Full (Strict)** (ver sección 2)
3. Cambiá Traefik para que use **DNS challenge** en vez de HTTP challenge, O usá **Cloudflare Origin Certificates**

**Para el DNS challenge de Traefik con Cloudflare necesitás:**

```yaml
# En tu docker-compose o config de Traefik
certificatesResolvers:
  letsencrypt:
    acme:
      email: tu-email@ejemplo.com
      storage: /letsencrypt/acme.json
      dnsChallenge:
        provider: cloudflare
        resolvers:
          - "1.1.1.1:53"
          - "1.0.0.1:53"
```

Y las variables de entorno del contenedor de Traefik:

```yaml
environment:
  - CF_API_EMAIL=tu-email@cloudflare.com
  - CF_DNS_API_TOKEN=tu-api-token-de-cloudflare
```

> **Recomendación:** Usá **Opción A para dev**, **Opción B para producción** cuando esté todo estable. No te compliques la vida en dev con el proxy.

---

## 2. Configuración SSL/TLS (solo si usás proxy de Cloudflare)

En el dashboard de Cloudflare → **SSL/TLS**:

| Setting | Valor | Por qué |
|---------|-------|---------|
| **SSL mode** | Full (Strict) | Cloudflare verifica que el cert del origen sea válido. Evita MITM. |
| **Minimum TLS Version** | 1.2 | TLS 1.0 y 1.1 están deprecados. No hay razón para soportarlos. |
| **Always Use HTTPS** | ON | Redirige todo HTTP a HTTPS automáticamente. |
| **Automatic HTTPS Rewrites** | ON | Cambia links HTTP a HTTPS en el HTML para evitar mixed content. |

Para configurar esto:

1. **SSL/TLS → Overview** → Seleccioná "Full (Strict)"
2. **SSL/TLS → Edge Certificates** → Minimum TLS Version: 1.2
3. **SSL/TLS → Edge Certificates** → Always Use HTTPS: ON
4. **SSL/TLS → Edge Certificates** → Automatic HTTPS Rewrites: ON

---

## 3. Estructura de dominios planificada (producción)

```
agendateya.app              → Landing page
app.agendateya.app          → Admin frontend + API (producción)
dev.agendateya.app          → Admin frontend + API (desarrollo)
api.agendateya.app          → Legacy/deprecado, migrar a app.agendateya.app/api
```

**Registros DNS necesarios a futuro:**

```
A    @      TU_IP_VPS_O_HOSTING_LANDING    (landing)
A    app    TU_IP_VPS                       (producción)
A    dev    TU_IP_VPS                       (desarrollo)
```

> **Nota:** `api.agendateya.app` no necesita registro propio si migrás todo a rutas bajo `app.agendateya.app/api`. Traefik ya se encarga del ruteo por PathPrefix entre el frontend (nginx:80) y el backend (Spring Boot:8080).

---

## 4. Troubleshooting

### "Too many redirects" (ERR_TOO_MANY_REDIRECTS)

**Causa más común:** Cloudflare SSL mode en "Flexible" con el proxy activado.

Lo que pasa:

1. El browser pide HTTPS a Cloudflare
2. Cloudflare (en modo Flexible) manda HTTP al origen
3. Traefik recibe HTTP y redirige a HTTPS
4. Cloudflare recibe la redirección y vuelve a mandar HTTP
5. Loop infinito

**Solución:** Cambiá SSL mode a **Full (Strict)** o desactivá el proxy (nube gris).

### Errores de certificado / Let's Encrypt falla

Verificá estos puntos:

1. **¿El puerto 80 está abierto?** Let's Encrypt necesita llegar al puerto 80 para el HTTP challenge
   ```bash
   # Desde tu VPS
   curl -I http://dev.agendateya.app/.well-known/acme-challenge/test
   ```
2. **¿Cloudflare proxy está desactivado?** Si está en nube naranja, Let's Encrypt no puede validar (ver Opción A vs B arriba)
3. **¿Traefik tiene los logs?** Revisá:
   ```bash
   docker logs traefik 2>&1 | rg -i "acme\|certificate\|challenge"
   ```
4. **¿El firewall del VPS permite tráfico en puerto 80 y 443?**
   ```bash
   # Verificar reglas de firewall (ufw)
   ufw status
   ```

### DNS no propaga / el dominio no resuelve

- Con Cloudflare la propagación suele ser **instantánea o pocos minutos**
- En el peor caso puede tardar hasta 24 horas, pero es raro
- Verificá la propagación:
  ```bash
  # Desde cualquier máquina
  dig dev.agendateya.app +short
  nslookup dev.agendateya.app
  ```
- Si no resuelve después de 10 minutos, revisá que el registro DNS esté bien en el dashboard de Cloudflare

### Traefik no rutea correctamente

Si el DNS funciona pero las rutas no llegan al servicio correcto:

```bash
# Verificar que Traefik esté levantado y escuchando
docker ps | rg traefik

# Ver las rutas configuradas en Traefik
curl -s http://localhost:8080/api/http/routers | python3 -m json.tool
```

Recordá que el frontend (nginx) y el backend (Spring Boot) se diferencian por **PathPrefix** en Traefik, no por subdominio.
