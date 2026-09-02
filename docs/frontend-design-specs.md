# Especificaciones de Diseño Frontend — CRI (Care Recovery Intelligence)

> **Versión:** 1.0.0  
> **Framework:** Next.js 16 (App Router) + React 19 + Tailwind CSS v4  
> **Tema Visual:** *Warm Organic Medical / Human-Centered Recovery*

---

## 1. Visión General del Diseño

**CRI (Care Recovery Intelligence)** es una plataforma web para la coordinación y monitoreo longitudinal de la recuperación postquirúrgica y terapéutica. El diseño frontend está centrado en la empatía, la claridad médica y la accesibilidad para cuatro perfiles de usuario: **Paciente**, **Cuidador (Caregiver)**, **Clínico (Clinician)** y **Organización/Administrador (Admin)**.

### Filosofía de Diseño
- **Calidez y Serenidad:** Alejado del aspecto clínico estéril o frío mediante una paleta cálida basada en tonos espresso, lino y acentos ámbar/dorados.
- **Explicabilidad:** Los indicadores visuales (como el *Recovery Score* y los gráficos de tendencia) comunican datos complejos de forma intuitiva.
- **Cohesión Multi-Rol:** Una arquitectura de navegación y shell consistente pero adaptada a las necesidades de cada perfil.
- **Microinteracciones Claras:** Transiciones suaves de 150ms, estados de foco accesibles y sombras suaves (`warm-shadow`).

---

## 2. Tokens de Diseño y Fundamentos

El sistema de diseño utiliza variables CSS nativas mapeadas mediante `@theme inline` en Tailwind CSS v4 (`app/globals.css`).

### 2.1 Paleta de Colores

| Token CSS | Variable | Valor Hex | Semántica y Uso |
|---|---|---|---|
| `--background` | `--color-background` | `#f8f7f5` | Fondo principal de la aplicación (tono lino cálido) |
| `--foreground` | `--color-foreground` | `#261b07` | Texto principal y elementos de máximo contraste (espresso profundo) |
| `--card` | `--color-card` | `#ffffff` | Fondo de tarjetas y paneles elevados |
| `--card-foreground` | `--color-card-foreground` | `#261b07` | Texto sobre tarjetas |
| `--primary` | `--color-primary` | `#f9a600` | Color primario de marca y acciones clave (ámbar cálido) |
| `--primary-foreground` | `--color-primary-foreground` | `#261b07` | Texto sobre botones o elementos primarios |
| `--secondary` | `--color-secondary` | `#f0ede7` | Superficies secundarias y chips neutros |
| `--secondary-foreground` | `--color-secondary-foreground` | `#261b07` | Texto en componentes secundarios |
| `--muted` | `--color-muted` | `#f0ede7` | Fondos atenuados para cabeceras de tablas o áreas inactivas |
| `--muted-foreground` | `--color-muted-foreground` | `#726957` | Texto secundario, subtítulos, etiquetas y metadata |
| `--accent` | `--color-accent` | `#f5f1e8` | Resaltados sutiles y fondos de badges |
| `--accent-foreground` | `--color-accent-foreground` | `#261b07` | Texto en áreas acentuadas |
| `--border` | `--color-border` | `#e3dfd5` | Bordes estructurales estándar |
| `--input` | `--color-input` | `#d7d1c4` | Bordes y fondos de controles de formulario |
| `--ring` | `--color-ring` | `#9d6800` | Anillo de enfoque de accesibilidad (`outline` / `focus-visible`) |
| `--success` | `--color-success` | `#426c57` | Estados positivos, recuperación estable, adherencia alta (verde pino) |
| `--warning` | `--color-warning` | `#996515` | Estados de revisión o riesgo moderado (ocre/mostaza) |
| `--destructive` | `--color-destructive` | `#a43e35` | Alertas críticas, riesgo elevado, acciones destructivas (rojo arcilla) |

### 2.2 Tipografía

- **Fuente Sans:** `Inter` (`var(--font-inter)`), configurada vía `next/font/google`.
- **Fuente Mono:** `Geist Mono` (`var(--font-geist-mono)`), para identificadores (ej. `P-1042`), metadatos técnicos, timestamps y logs de auditoría.

#### Escala y Jerarquía Tipográfica
- **Hero Headings (H1 Landing):** `text-5xl md:text-7xl font-semibold tracking-[-.06em] leading-[1.02]`
- **Page Titles (H1 Dashboard):** `text-3xl md:text-4xl font-semibold tracking-[-.04em]`
- **Card / Section Titles (H2):** `text-lg md:text-xl font-semibold tracking-tight`
- **Eyebrows / Badges:** `font-mono text-xs font-semibold uppercase tracking-wider`
- **Body Regular:** `text-sm leading-6 text-muted-foreground` o `text-foreground`
- **Metrics / Big Numbers:** `text-3xl md:text-4xl font-semibold tracking-[-.05em]`

### 2.3 Radios de Borde y Sombras

```css
--radius-sm: 4px;   /* Chips, badges pequeños, checkboxes */
--radius-md: 6px;   /* Botones secundarios, items de menú */
--radius-lg: 8px;   /* Botones estándar, inputs, modales compactos */
--radius-xl: 12px;  /* Tarjetas principales, contenedores grandes */
```

- **Sombra Cálida (`.warm-shadow`):** `box-shadow: 0 10px 30px rgba(38,27,7, 0.06);`
- **Patrón de Cuadrícula (`.paper-grid`):** Fondo decorativo sutil con líneas de `rgba(38,27,7, 0.035)` espaciadas cada 24px.

---

## 3. Estructura de Rutas y Layouts

La aplicación utiliza la arquitectura App Router de Next.js 16 con grupos de rutas `(route-group)` para segmentar los layouts de cada rol.

```
app/
├── (admin)/                    # Portal de Administración y Organización
│   ├── admin/dashboard/page.tsx
│   ├── admin/users/page.tsx
│   ├── admin/cohorts/page.tsx
│   ├── admin/audit/page.tsx
│   ├── admin/settings/page.tsx
│   └── layout.tsx
├── (caregiver)/                # Portal del Cuidador
│   ├── caregiver/dashboard/page.tsx
│   ├── caregiver/patient/[id]/page.tsx
│   ├── caregiver/messages/page.tsx
│   └── layout.tsx
├── (clinician)/                # Portal Clínico
│   ├── clinician/dashboard/page.tsx
│   ├── clinician/patients/page.tsx
│   ├── clinician/patients/[id]/page.tsx
│   ├── clinician/alerts/page.tsx
│   ├── clinician/reports/page.tsx
│   └── layout.tsx
├── (patient)/                  # Portal del Paciente
│   ├── patient/dashboard/page.tsx
│   ├── patient/check-in/page.tsx
│   ├── patient/recovery/page.tsx
│   ├── patient/insights/page.tsx
│   ├── patient/plan/page.tsx
│   ├── patient/messages/page.tsx
│   ├── patient/reports/page.tsx
│   ├── patient/profile/page.tsx
│   └── layout.tsx
├── globals.css                 # Importaciones Tailwind v4 y variables CSS
├── layout.tsx                  # Root Layout con fuentes Google (Inter y Geist Mono)
└── page.tsx                    # Landing Page principal con selector de portales
```

### 3.1 Shell de Aplicación (`DashboardLayout`)

Ubicado en `components/layouts/dashboard-layout.tsx`, provee la estructura persistente para los 4 roles:

1. **Sidebar (`components/layouts/sidebar.tsx`):**
   - Ancho fijo de 16rem (`w-64`), fondo `bg-card` con borde `border-r`.
   - Navegación contextual basada en `lib/cri-data.ts` según el rol activo.
   - Drawer responsivo deslizable en dispositivos móviles con botón de cierre.
   - Indicador de entorno prototype en la parte inferior.

2. **Header (`components/layouts/header.tsx`):**
   - Barra superior `sticky top-0 z-20` con efecto backdrop blur (`bg-background/95`).
   - Botón toggle de menú móvil.
   - Selector interactivo de rol para switching rápido durante demostraciones.
   - Botón de notificaciones con punto indicador de alerta (`bg-destructive`).
   - Avatar con iniciales del usuario según el rol (`MC`, `EC`, `OB`, `AL`).

3. **Page Header (`components/layouts/page-header.tsx`):**
   - Componente estándar para todas las vistas con `eyebrow`, `title`, `description` y ranura `action` (para botones CTA o badges).

---

## 4. Catálogo de Componentes UI

### 4.1 Componentes Base (`components/ui/`)

- **`Button` (`button.tsx`):** Construido sobre `@radix-ui/react-slot` (`Slot`) con `class-variance-authority` (CVA).
  - *Variantes:* `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`.
  - *Tamaños:* `xs`, `sm`, `default` (h-8), `lg` (h-9), `icon`, `icon-xs`, `icon-sm`, `icon-lg`.
- **`Badge` (`badge.tsx`):** Indicador visual de estado con soporte de tonos (`tone`):
  - `neutral`: Gris lino suave.
  - `good`: Verde pino con mezcla de color (`--success`).
  - `warn`: Ocre cálido (`--warning`).
  - `bad`: Rojo arcilla (`--destructive`).
- **`Card` (`card.tsx`):** Contenedor de sección elevado con borde, padding estándar y sombra `.warm-shadow`.

### 4.2 Componentes de Dashboard y Métricas (`components/dashboard/`)

- **`ScoreGauge` (`score-gauge.tsx`):** Gráfico circular radial con gradiente cónico (`conic-gradient`) para visualizar la puntuación de recuperación (0-100), estado, cambio semanal y badge de diagnóstico.
- **`TrendChart` (`trend-chart.tsx`):** Gráfico temporal interactivo desarrollado con Recharts (`AreaChart` + `Line`), con gradientes de área ámbar, grid suave y tooltip personalizado. Admite modo clínico para superponer curvas de movilidad.
- **`StatCard` (`stat-card.tsx`):** Tarjeta de métrica clave con etiqueta, valor de alto impacto, descripción secundaria e icono de Lucide.
- **`TodayPlan` (`today-plan.tsx`):** Lista interactiva de tareas diarias con checkboxes de estado, conteo dinámico de pendientes y soporte para tachado.
- **`InsightCard` (`insight-card.tsx`):** Tarjeta destacada para recomendaciones automáticas basadas en datos (sueño, movilidad, adherencia).

### 4.3 Sistema Completo de Formularios (`components/forms/`)

Diseñado con una arquitectura desacoplada mediante `FieldWrapper` (`components/forms/field-wrapper.tsx`):

| Componente | Archivo | Descripción |
|---|---|---|
| `TextField` | `text-field.tsx` | Entrada de texto con soporte de iconos izquierdo/derecho y botón de limpiar |
| `TextareaField` | `textarea-field.tsx` | Área de texto con auto-redimensionamiento y contador de caracteres |
| `SelectField` | `select-field.tsx` | Menú desplegable nativo estilizado |
| `ComboboxField` | `combobox-field.tsx` | Selector con filtrado dinámico y búsqueda integrada |
| `MultiSelectField` | `multi-select-field.tsx` | Selector múltiple con etiquetas desmontables (tags/badges) |
| `NumberField` | `number-field.tsx` | Entrada numérica con botones de incremento/decremento |
| `CurrencyField` | `currency-field.tsx` | Campo con formato de moneda y prefijo monetario |
| `PhoneField` | `phone-field.tsx` | Campo de teléfono formateado |
| `CalendarField` | `calendar-field.tsx` | Selector de fechas con calendario |
| `DatetimeField` | `datetime-field.tsx` | Selector combinado de fecha y hora |
| `TimeField` | `time-field.tsx` | Selector de tiempo |
| `SwitchField` | `switch-field.tsx` | Interruptor toggle tipo iOS con soporte inline |
| `CheckboxField` | `checkbox-field.tsx` | Checkbox accesible con estados indeterminate y error |
| `RadioGroupField` | `radio-group-field.tsx` | Grupos de radio estándar o estilo botonera segmentada |
| `ToggleField` | `toggle-field.tsx` | Botones de alternancia para opciones exclusivas |
| `ColorPickerField` | `color-picker-field.tsx` | Selector visual de color con paleta preestablecida y preview |
| `InputOtpField` | `input-otp-field.tsx` | Casillas individuales para códigos OTP / 2FA |
| `ProgressField` | `progress-field.tsx` | Barra de rango deslizable (`slider`) con badges de valor |
| `SearchField` | `search-field.tsx` | Barra de búsqueda con icono lupa y debounce/limpieza |
| `UploadField` | `upload-field.tsx` | Zona de carga drag-and-drop con preview de archivos |

---

## 5. Módulos de Funcionalidad por Rol

### 5.1 Portal del Paciente (`/patient/*`)
- **Dashboard (`/patient/dashboard`):** Puntuación global de recuperación (Score Gauge), trayectoria a 7 días, tarjetas de adherencia/dolor/citas, plan del día e insights inteligentes.
- **Check-in Diario (`/patient/check-in`):** Flujo guiado paso a paso para reportar dolor (0-10), calidad de sueño, movilidad y bienestar emocional con selector de tipo de sensación y notas.
- **Timeline de Recuperación (`/patient/recovery`):** Línea de tiempo con hitos quirúrgicos y terapéuticos completados y futuros.
- **Plan de Cuidado (`/patient/plan`):** Horarios de medicación con badges de adherencia, ejercicios y citas médicas.
- **Mensajería (`/patient/messages`):** Chat dividido en dos paneles con el equipo médico.
- **Reportes (`/patient/reports`):** Resumen de recuperación exportable e imprimible (`window.print()`).
- **Perfil y Ajustes (`/patient/profile`):** Configuración de datos de contacto, accesibilidad (texto grande, alto contraste), recordatorios SMS y sincronización de wearables.

### 5.2 Portal del Cuidador (`/caregiver/*`)
- **Vista Protegida por Privacidad:** Información filtrada sobre el estado de recuperación y tareas de asistencia sin exponer notas clínicas privadas ni detalles confidenciales de prescripción.
- **Canal de Ayuda:** Sugerencias accionables diarias para apoyar al paciente (ej. recordatorios de medicación o ejercicios).

### 5.3 Portal Clínico (`/clinician/*`)
- **Gestión de Caseload (`/clinician/dashboard`, `/clinician/patients`):** Tabla interactiva con búsqueda por nombre o contexto de recuperación, total de síntomas (0–48), porcentaje de adherencia y clasificación de riesgo (`Stable`, `Review`, `Elevated`).
- **Alertas Clínicas (`/clinician/alerts`):** Triage de eventos adversos (ej. signos de alarma neurológica o incremento súbito de cefalea).
- **Detalle de Paciente (`/clinician/patients/[id]`):** Vista clínica profunda con telemetría longitudinal y registro de encuentros.
- **Modal de Encuentro Clínico (`components/clinician/clinical-encounter-modal.tsx`):** Registro de consultas presenciales, telemedicina o revisión de expediente con diagnóstico, notas y adjuntos.

### 5.4 Portal de Administración y Organización (`/admin/*`)
- **Resumen Organizacional (`/admin/dashboard`):** Métricas de población, volumen de pacientes activos y tasas de finalización.
- **Gestión de Usuarios (`/admin/users`):** Listado y modal de enrolamiento e invitación de usuarios (`UserInviteModal`).
- **Análisis de Cohortes (`/admin/cohorts`):** Comparativas de recuperación por vía clínica (Conmoción deportiva, Protocolo Return-to-Learn, Síntomas persistentes).
- **Registro de Auditoría (`/admin/audit`):** Tabla de logs con acciones de usuario, IP, marcas de tiempo y nivel de severidad.
- **Configuración (`/admin/settings`):** Parámetros globales de la organización y políticas de retención.

---

## 6. Accesibilidad y Buenas Prácticas

1. **Contraste de Color:** La combinación de texto `#261b07` sobre fondo `#f8f7f5` o `#ffffff` cumple con las pautas WCAG 2.1 AA / AAA.
2. **Navegación por Teclado:** Estados `:focus-visible` universales con outline de 2px en color `--ring` y desplazamiento de 2px.
3. **Soporte de Impresión:** Clase utilitaria `.no-print` en barra de navegación y cabecera para permitir la generación limpia de reportes clínicos en papel o PDF.
4. **Semántica HTML:** Uso estructurado de etiquetas `<main>`, `<header>`, `<aside>`, `<nav>`, `<section>`, `<article>`, `<table role="table">` y atributos ARIA en botones e inputs interactivos.
