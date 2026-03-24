# Rediseño de Pantallas de Autenticación - Documentación

**Fecha**: 2026-03-24  
**Proyecto**: agendate-ya-admin  
**Tipo**: Refactor UI/UX

## Objetivo

Rediseñar las páginas de autenticación (login y registro) con un layout split 50/50 que combine:

- Panel azul de marca (branding)
- Panel claro de formulario
- Estilo limpio y consistente
- Botón de "Login with Google"
- Experiencia visual mejorada

## Archivos Modificados

### Nuevos Componentes

1. **src/features/auth/components/auth-layout.tsx**
   - Layout reutilizable con split 50/50
   - Panel izquierdo (azul primary): logo AgendateYA + descripción + testimonial (opcional)
   - Panel derecho (neutral): contenedor de formulario centrado
   - Responsive: en mobile (<lg) solo muestra el panel de formulario

2. **src/features/auth/components/google-button.tsx**
   - Botón reutilizable para autenticación con Google
   - Incluye logo oficial de Google (SVG)
   - Estilos consistentes con el design system (border, hover, focus)
   - Actualmente muestra alert placeholder (lógica OAuth pendiente)

### Páginas Actualizadas

3. **src/features/auth/login-page.tsx**
   - Usa `AuthLayout` con testimonial
   - Título: "Bienvenido de vuelta"
   - Botón "Continuar con Google" arriba del formulario
   - Divisor visual "O continua con email"
   - Campos: email, password
   - Mensaje de sesión expirada (si aplica)
   - CTA de registro: "¿Todavía no tienes una cuenta? Regístrate"

4. **src/features/auth/register-page.tsx**
   - Usa `AuthLayout` sin testimonial (más espacio para formulario)
   - Mantiene sistema de steps (2 pasos) con barra de progreso
   - **Step 1 (Negocio)**: businessName, businessType, timezone
   - **Step 2 (Sede y Admin)**:
     - Botón "Continuar con Google" al inicio
     - Divisor "O completa el formulario"
     - Campos: locationName, locationAddress, locationPhone, fullName, email, password, confirmPassword
   - Validaciones de contraseña visuales (requisitos con colores)
   - Botones "Volver" y "Crear cuenta"

### Componentes Compartidos Mejorados

5. **src/shared/ui/password-input.tsx**
   - Actualizado con estilos consistentes del nuevo diseño
   - Agregado: `bg-white`, `text-sm`, `transition`, `focus:border-primary`
   - Mantiene funcionalidad de mostrar/ocultar contraseña

## Decisiones de Diseño

### Colores y Tema

Se mantiene el palette existente del proyecto:

- **Primary** (azul navy): `#1a365d` → usado para panel de marca y textos principales
- **Secondary** (naranja): `#ff6b35` → usado para acentos y CTA
- **Neutral**: `#f7fafc` → fondo del panel de formulario
- **White**: `#ffffff` → fondo de inputs y botones secundarios

### Layout Split

- **Desktop (≥1024px)**: 50% panel azul + 50% panel blanco
- **Mobile (<1024px)**: Solo panel blanco (el azul se oculta para optimizar espacio)
- Panel de formulario: contenedor `max-w-md` centrado con padding responsive

### Tipografía

- Títulos principales: `text-3xl font-bold`
- Subtítulos/descripciones: `text-sm text-primary-light`
- Labels de campos: `text-sm font-medium text-primary-dark`
- Inputs: `text-sm` para mejor legibilidad

### Componentes Reutilizables

Se creó `AuthLayout` siguiendo principios **DRY** y **Clean Architecture**:

- Encapsula lógica de layout split
- Prop `showTestimonial` para controlar bloque de testimonial
- Slot pattern con `children` para máxima flexibilidad
- Footer con copyright incluido en panel azul

`GoogleButton` componente reutilizable:

- Separado de lógica de autenticación (Single Responsibility)
- Reusable en login, registro, y futuras pantallas
- Extensible vía props estándar de `ButtonHTMLAttributes`

### Espaciado y Accesibilidad

- Inputs: altura consistente `h-11` (44px, WCAG touch target)
- Espaciado vertical: `space-y-4` entre campos
- Focus states con `ring-2` visible para navegación por teclado
- Labels con `font-medium` para mejorar legibilidad
- Placeholders con color suficiente contraste

## Estado de Google OAuth

- **UI implementada**: Botón presente en ambas páginas
- **Lógica pendiente**: Actualmente muestra `alert()` de placeholder
- **Integración futura**: Requiere configuración OAuth2 backend y frontend

## Lógica Preservada

✅ No se modificó:

- Validaciones de formulario (emails, contraseñas, teléfonos)
- Sistema de steps en registro
- Normalización de teléfonos Paraguay
- Manejo de errores y mensajes de error
- Integración con `/api/v1/auth/login` y `/api/v1/auth/register`
- Navegación post-autenticación

## Consideraciones Responsive

- AuthLayout usa `hidden lg:flex` para ocultar panel azul en mobile
- Formulario responsivo con padding adaptativo: `p-6 sm:p-8 md:p-12`
- Testimonial con padding y tipografía optimizada para legibilidad
- PhoneInput mantiene estilos custom de `globals.css` para funcionar correctamente

## Testing Realizado

✅ **TypeScript**: `npm run typecheck` → sin errores  
✅ **Compilación**: Código válido, sin imports faltantes  
⏳ **Visual QA**: Pendiente preview en navegador (no ejecutado `build` según restricción)

## Próximos Pasos Sugeridos

1. **Preview visual**: Ejecutar `npm run dev` y revisar en navegador
2. **Responsive testing**: Verificar en mobile/tablet/desktop
3. **Google OAuth**: Implementar flujo real con backend
4. **Animaciones**: Considerar transiciones suaves entre steps
5. **A11y audit**: Verificar navegación por teclado y screen readers
6. **Recovery password**: Agregar link "¿Olvidaste tu contraseña?" si aplica

## Notas Técnicas

- **Performance**: Layout split usa Tailwind JIT, overhead mínimo de CSS
- **Bundle size**: GoogleButton SVG inline (no requiere asset externo)
- **Maintenance**: AuthLayout centraliza cambios de branding (logo, colores, copy)
- **Theme tokens**: Todo usa variables CSS de `theme.css` para fácil customización

---

**Autor**: Frontend Web Agent  
**Review status**: Pendiente de aprobación visual
