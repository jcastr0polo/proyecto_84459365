# RESUMEN FASE 22 — Landing Pública y Vitrina

> Fase completada: 17 de Abril 2026
> Rol: Diseñador UX/UI Senior — Landing pages de alto impacto visual

---

## Objetivo

Transformar el "Hola Mundo" de la Fase 5 en una landing page completa tipo Vercel/Linear/Stripe que presenta la plataforma como caso de estudio y da acceso a todas las rutas públicas. Elegancia minimalista con impacto.

---

## Archivos Creados

| Archivo | Descripción |
| ------- | ----------- |
| `components/LandingClient.tsx` | Componente cliente con 5 secciones + navbar + footer, scroll animations, fallback de cursos |

## Archivos Modificados

| Archivo | Cambio |
| ------- | ------ |
| `app/page.tsx` | Reescrito: server component que pasa datos a LandingClient, metadata con Open Graph |
| `app/layout.tsx` | viewport export separado (Next.js best practice), metadata template, OG tags, favicon, themeColor |
| `data/home.json` | Subtitle y description actualizados para la landing |

---

## Secciones de la Landing

### 1. Navbar Fija

- Logo + nombre "Plataforma Académica"
- Link "Vitrina" → /showcase
- Botón "Iniciar Sesión" → /login (blanco sobre negro)
- backdrop-blur-xl, border sutil

### 2. Hero

- Badge animado: "Semestre 202601 · En curso" con pulse indicator
- Título grande animado (AnimatedText — letter-by-letter stagger de Fase 5)
- Subtítulo: "Plataforma de Gestión Académica | Fullstack TypeScript"
- Descripción del sistema
- 2 CTA: "Iniciar Sesión" (primario, blanco) + "Ver Proyectos" (secundario, outline)
- Glow de fondo: cyan + purple blur radials
- Línea decorativa gradient que anima con scaleX

### 3. Cursos del Semestre

- 3 cards en grid: Lógica y Programación, Diseño de Interfaces RA, Gerencia de Proyectos
- Badge de categoría coloreado (cyan/purple/amber)
- Nombre, descripción, código, sesiones por semana
- Gradient de fondo por categoría
- Datos dinámicos via GET /api/courses con fallback estático
- whileInView fade-in con stagger

### 4. ¿Cómo Funciona?

- 4 pasos con iconos + número mono
- Docente crea actividad → Estudiante ejecuta con IA → Entrega proyecto → Calificación y feedback
- Connector lines entre steps (desktop)
- stagger fade-in al scroll

### 5. Stack Tecnológico

- Grid 6 columnas: Next.js, TypeScript, React 19, Tailwind CSS, Vercel, GitHub
- Cada item: icono, nombre, descripción corta
- Summary card: "100% TypeScript" / "JSON DB" / "IA como metodología"

### 6. Footer

- Logo + nombre + semestre
- Links: Login, Vitrina
- Crédito: "Construido con Next.js + TypeScript + IA"
- Copyright 2026

---

## SEO y Metadata

| Aspecto | Detalle |
| ------- | ------- |
| viewport | Export separado (Next.js 14+ pattern) |
| title | Template: "%s \| Plataforma Académica" |
| og:type | website |
| og:locale | es_CO |
| themeColor | #000000 |
| favicon | /favicon.ico |
| metadataBase | https://plataforma-academica.vercel.app |
| keywords | gestión académica, Next.js, TypeScript, React, etc. |

---

## Animaciones

| Elemento | Tipo | Detalle |
| -------- | ---- | ------- |
| Hero title | letter stagger | AnimatedText de Fase 5 reutilizado |
| Secciones | scroll reveal | useInView + fade-in y (margin: -80px) |
| Course cards | scroll + hover | whileInView stagger + whileHover y:-4 |
| Step cards | scroll stagger | whileInView con delay incremental |
| Stack items | scale + scroll | initial scale 0.9 → 1 on scroll |
| CTA buttons | entrance | fade-in after title animation |
| Decorative line | scaleX | Center origin, after CTA |
| Semester badge | pulse | Green dot with animate-pulse |

---

## Validaciones

- **TypeScript**: `npx tsc --noEmit` → 0 errores
- **ESLint**: `npx eslint` → 0 errores, 0 warnings en archivos nuevos/modificados

---

## Stack

- Next.js 16.2.2 + React 19.2.4 + TypeScript 5
- Tailwind CSS 4 + Framer Motion 12.38.0
- Dark theme (#000 bg, #06b6d4 cyan accent)
- Server component (page.tsx) + Client component (LandingClient.tsx)
- No modificaciones de backend
