# 🏗️ Plan de Infraestructura — Fullstack TypeScript + Vercel + GitHub
> Versión 1.0 | Arquitecto de Software | Abril 2026

---

## 📋 Índice

1. [Visión General](#1-visión-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Estructura del Repositorio](#3-estructura-del-repositorio)
4. [Capa de Datos — JSON como Base de Datos](#4-capa-de-datos--json-como-base-de-datos)
5. [Arquitectura de la Aplicación](#5-arquitectura-de-la-aplicación)
6. [Configuración del Entorno](#6-configuración-del-entorno)
7. [Pipeline CI/CD — GitHub → Vercel](#7-pipeline-cicd--github--vercel)
8. [Implementación del Home — Hola Mundo](#8-implementación-del-home--hola-mundo)
9. [Validación TypeScript](#9-validación-typescript)
10. [Checklist de Despliegue](#10-checklist-de-despliegue)
11. [Convenciones y Estándares](#11-convenciones-y-estándares)

---

## 1. Visión General

### Objetivo
Implementar un sistema web **Fullstack en TypeScript** con despliegue continuo desde GitHub hacia Vercel, utilizando una capa de datos basada en **archivos JSON** como fuente de verdad, sin dependencia de bases de datos convencionales.

### Principios de Diseño
| Principio | Descripción |
|-----------|-------------|
| **TypeScript-first** | Todo el código, tanto frontend como backend, está tipado estáticamente |
| **JSON as DB** | La carpeta `/data` actúa como capa de persistencia plana |
| **Zero-config deploy** | Cada `push` a `main` dispara un despliegue automático en Vercel |
| **File-based routing** | Next.js App Router gestiona las rutas sin configuración adicional |
| **Separation of Concerns** | La lógica de lectura de datos está desacoplada de la UI |

---

## 2. Stack Tecnológico

### Frontend
| Tecnología | Versión | Rol |
|------------|---------|-----|
| **Next.js** | 14+ (App Router) | Framework fullstack principal |
| **React** | 18+ | Motor de UI |
| **TypeScript** | 5.x | Tipado estático en todo el proyecto |
| **Tailwind CSS** | 3.x | Estilos utilitarios |
| **Framer Motion** | 11.x | Animaciones elegantes (efecto Hola Mundo) |

### Backend / API
| Tecnología | Versión | Rol |
|------------|---------|-----|
| **Next.js Route Handlers** | 14+ | API endpoints serverless (reemplaza Express) |
| **TypeScript** | 5.x | Tipado en endpoints y modelos de datos |
| **fs (Node.js)** | Built-in | Lectura de archivos JSON en tiempo de servidor |
| **zod** | 3.x | Validación de esquemas JSON en runtime |

### Infraestructura
| Tecnología | Rol |
|------------|-----|
| **GitHub** | Control de versiones + disparador del CI/CD |
| **Vercel** | Hosting, despliegue automático, Edge Network |
| **GitHub Actions** (opcional) | Validaciones previas al merge (lint, typecheck) |

---

## 3. Estructura del Repositorio

```
📦 mi-proyecto/
│
├── 📁 app/                          # Next.js App Router
│   ├── 📁 api/                      # Route Handlers (API serverless)
│   │   └── 📁 data/
│   │       └── route.ts             # GET /api/data → lee JSONs
│   ├── 📄 layout.tsx                # Layout raíz con metadata global
│   ├── 📄 page.tsx                  # Home → "Hola Mundo"
│   └── 📄 globals.css               # Estilos globales + variables CSS
│
├── 📁 components/                   # Componentes React reutilizables
│   ├── 📄 HolaMundo.tsx             # Componente animado principal
│   └── 📄 AnimatedText.tsx          # Efecto letra por letra
│
├── 📁 data/                         # ⚠️ CAPA DE DATOS (JSON como DB)
│   ├── 📄 config.json               # Configuración global de la app
│   ├── 📄 home.json                 # Contenido de la página Home
│   └── 📄 README.md                 # Documentación del esquema de datos
│
├── 📁 lib/                          # Utilidades y servicios
│   ├── 📄 dataService.ts            # Funciones para leer archivos JSON
│   ├── 📄 types.ts                  # Tipos e interfaces globales TypeScript
│   └── 📄 validators.ts             # Esquemas Zod para validar JSONs
│
├── 📁 public/                       # Assets estáticos
│   └── 📄 favicon.ico
│
├── 📄 .env.local                    # Variables de entorno locales (no commitear)
├── 📄 .env.example                  # Plantilla de variables de entorno
├── 📄 .gitignore                    # Exclusiones de Git
├── 📄 next.config.ts                # Configuración de Next.js
├── 📄 tailwind.config.ts            # Configuración de Tailwind
├── 📄 tsconfig.json                 # Configuración TypeScript
├── 📄 package.json                  # Dependencias y scripts
└── 📄 vercel.json                   # Configuración del despliegue Vercel
```

---

## 4. Capa de Datos — JSON como Base de Datos

### Filosofía
En lugar de un motor de base de datos, se utiliza una **carpeta `/data`** con archivos JSON estructurados. Estos archivos son leídos en el servidor (nunca expuestos directamente al cliente) a través del módulo `fs` de Node.js.

> ⚠️ **Regla de Oro**: Los archivos JSON en `/data` **jamás son accedidos directamente desde el cliente**. Toda lectura ocurre en Server Components o Route Handlers.

### Estructura de Archivos JSON

#### `/data/config.json`
```json
{
  "appName": "Mi App TypeScript",
  "version": "1.0.0",
  "locale": "es-CO",
  "theme": "dark"
}
```

#### `/data/home.json`
```json
{
  "hero": {
    "title": "Hola Mundo",
    "subtitle": "TypeScript + Next.js + Vercel",
    "description": "Sistema fullstack funcionando correctamente.",
    "animationStyle": "typewriter"
  },
  "meta": {
    "pageTitle": "Home | Mi App",
    "description": "Página principal del sistema"
  }
}
```

### Servicio de Datos — `lib/dataService.ts`
```typescript
import fs from 'fs';
import path from 'path';

// Tipo genérico para lectura de cualquier JSON
export function readJsonFile<T>(filename: string): T {
  const filePath = path.join(process.cwd(), 'data', filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}
```

### Tipos TypeScript — `lib/types.ts`
```typescript
export interface HomeData {
  hero: {
    title: string;
    subtitle: string;
    description: string;
    animationStyle: 'typewriter' | 'fadeIn' | 'slideUp';
  };
  meta: {
    pageTitle: string;
    description: string;
  };
}

export interface AppConfig {
  appName: string;
  version: string;
  locale: string;
  theme: 'light' | 'dark';
}
```

### Validación con Zod — `lib/validators.ts`
```typescript
import { z } from 'zod';

export const HomeDataSchema = z.object({
  hero: z.object({
    title: z.string().min(1),
    subtitle: z.string(),
    description: z.string(),
    animationStyle: z.enum(['typewriter', 'fadeIn', 'slideUp']),
  }),
  meta: z.object({
    pageTitle: z.string(),
    description: z.string(),
  }),
});
```

---

## 5. Arquitectura de la Aplicación

### Flujo de Datos
```
Usuario (Browser)
      │
      ▼
┌─────────────────────────────────┐
│         Next.js App Router       │
│                                 │
│  ┌──────────────────────────┐   │
│  │   Server Component       │   │
│  │   app/page.tsx           │   │
│  │                          │   │
│  │  readJsonFile('home.json')│  │
│  └──────────┬───────────────┘   │
│             │                   │
│  ┌──────────▼───────────────┐   │
│  │   /data/home.json        │   │
│  │   (File System — Server) │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
      │
      ▼
 HTML renderizado + props
      │
      ▼
┌─────────────────────────────────┐
│   Client Component              │
│   HolaMundo.tsx (Framer Motion) │
│   → Animación elegante          │
└─────────────────────────────────┘
```

### Patrón Server → Client Component
```
app/page.tsx          →  Server Component  (lee JSON, sin "use client")
components/HolaMundo  →  Client Component  (animaciones, "use client")
```

Esto garantiza que:
- Los datos JSON **nunca** viajan al bundle del cliente.
- Las animaciones corren **solo en el browser**.
- El SEO recibe el HTML pre-renderizado con el contenido real.

---

## 6. Configuración del Entorno

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### `next.config.ts`
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Habilitar TypeScript estricto en build
  typescript: {
    ignoreBuildErrors: false,
  },
  // Habilitar comprobación de ESLint en build
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
```

### `vercel.json`
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "regions": ["iad1"]
}
```

### `package.json` — Scripts esenciales
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "validate": "npm run typecheck && npm run lint"
  }
}
```

### `.gitignore`
```
node_modules/
.next/
.env.local
.env*.local
*.log
.DS_Store
```

### `.env.example`
```env
# Agrega aquí tus variables de entorno
# Copia este archivo como .env.local para uso local
NEXT_PUBLIC_APP_NAME="Mi App TypeScript"
```

---

## 7. Pipeline CI/CD — GitHub → Vercel

### Flujo Completo de Despliegue

```
┌──────────────┐     push/PR      ┌──────────────────┐
│  Desarrollador│ ──────────────► │   GitHub Repo     │
│  (Local)      │                 │   rama: main      │
└──────────────┘                  └────────┬─────────┘
                                           │  Webhook automático
                                           ▼
                                  ┌──────────────────┐
                                  │  Vercel Build    │
                                  │  1. npm install  │
                                  │  2. tsc --noEmit │
                                  │  3. next build   │
                                  └────────┬─────────┘
                                           │  Build exitoso
                                           ▼
                                  ┌──────────────────┐
                                  │  Vercel Edge     │
                                  │  Network         │
                                  │  (Producción)    │
                                  └──────────────────┘
```

### Configuración Vercel (pasos de vinculación)

1. Ir a [vercel.com](https://vercel.com) → **Add New Project**
2. Importar el repositorio GitHub correspondiente
3. Vercel detecta automáticamente Next.js
4. Configurar variables de entorno en el dashboard de Vercel
5. Cada `push` a `main` → despliegue automático a producción
6. Cada Pull Request → Preview URL automática

### GitHub Actions (Validación previa — opcional pero recomendado)

Archivo: `.github/workflows/validate.yml`
```yaml
name: Validate TypeScript

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npm run typecheck

      - name: Lint check
        run: npm run lint
```

---

## 8. Implementación del Home — Hola Mundo

### `app/page.tsx` — Server Component
```typescript
import { readJsonFile } from '@/lib/dataService';
import { HomeDataSchema } from '@/lib/validators';
import HolaMundo from '@/components/HolaMundo';
import type { HomeData } from '@/lib/types';

export default function HomePage() {
  // Lectura desde /data/home.json — solo en servidor
  const rawData = readJsonFile<HomeData>('home.json');

  // Validación con Zod
  const homeData = HomeDataSchema.parse(rawData);

  return (
    <main className="min-h-screen flex items-center justify-center bg-black">
      <HolaMundo
        title={homeData.hero.title}
        subtitle={homeData.hero.subtitle}
        animationStyle={homeData.hero.animationStyle}
      />
    </main>
  );
}
```

### `components/HolaMundo.tsx` — Client Component con Framer Motion
```typescript
'use client';

import { motion } from 'framer-motion';

interface HolaMundoProps {
  title: string;
  subtitle: string;
  animationStyle: 'typewriter' | 'fadeIn' | 'slideUp';
}

const letterVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

export default function HolaMundo({ title, subtitle }: HolaMundoProps) {
  const letters = title.split('');

  return (
    <div className="text-center select-none">
      {/* Título animado letra por letra */}
      <motion.h1
        className="text-7xl md:text-9xl font-bold tracking-tight"
        aria-label={title}
      >
        {letters.map((letter, i) => (
          <motion.span
            key={i}
            custom={i}
            variants={letterVariants}
            initial="hidden"
            animate="visible"
            className="inline-block text-white"
            style={{ textShadow: '0 0 40px rgba(255,255,255,0.3)' }}
          >
            {letter === ' ' ? '\u00A0' : letter}
          </motion.span>
        ))}
      </motion.h1>

      {/* Subtítulo con fade-in retardado */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: title.length * 0.08 + 0.3, duration: 0.8 }}
        className="mt-6 text-lg text-white/40 font-light tracking-widest uppercase"
      >
        {subtitle}
      </motion.p>

      {/* Línea decorativa */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: title.length * 0.08 + 0.8, duration: 0.6 }}
        className="mt-8 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto w-64"
      />
    </div>
  );
}
```

---

## 9. Validación TypeScript

### Checklist de Validación TS

| Validación | Comando | Descripción |
|------------|---------|-------------|
| **Compilación** | `npm run typecheck` | Verifica tipos sin emitir JS |
| **Build de producción** | `npm run build` | Compila y chequea tipos en Next.js |
| **Lint** | `npm run lint` | Reglas ESLint + TypeScript |
| **Completo** | `npm run validate` | typecheck + lint en un solo comando |

### Indicadores de TypeScript funcionando correctamente

Al ejecutar `npm run build` exitosamente deberás ver:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Creating an optimized production build
✓ Collecting page data
✓ Generating static pages (3/3)

Route (app)          Size    First Load JS
┌ ○ /                2.5 kB  87.5 kB
└ ○ /api/data        0 B     0 B

○  (Static) → prerendered as static content
```

### Errores comunes a evitar

```typescript
// ❌ MAL — any rompe el tipado
const data: any = readJsonFile('home.json');

// ✅ BIEN — genérico tipado
const data: HomeData = readJsonFile<HomeData>('home.json');

// ❌ MAL — acceso sin validar
const title = data.hero.title;

// ✅ BIEN — validado con Zod antes de acceder
const validated = HomeDataSchema.parse(data);
const title = validated.hero.title;
```

---

## 10. Checklist de Despliegue

### Fase 1 — Setup Local
- [ ] Crear repositorio en GitHub (público o privado)
- [ ] Inicializar proyecto: `npx create-next-app@latest --typescript`
- [ ] Instalar dependencias: `npm install framer-motion zod`
- [ ] Crear carpeta `/data` con archivos JSON base
- [ ] Crear `lib/types.ts`, `lib/dataService.ts`, `lib/validators.ts`
- [ ] Crear `components/HolaMundo.tsx`
- [ ] Configurar `tsconfig.json` con `strict: true`
- [ ] Ejecutar `npm run validate` → sin errores

### Fase 2 — Primer Commit
- [ ] `git init` (si no se clonó desde GitHub)
- [ ] Verificar `.gitignore` cubre `.next/`, `node_modules/`, `.env.local`
- [ ] `git add .`
- [ ] `git commit -m "feat: initial TypeScript fullstack setup"`
- [ ] `git push origin main`

### Fase 3 — Vinculación con Vercel
- [ ] Ingresar a [vercel.com/new](https://vercel.com/new)
- [ ] Seleccionar el repositorio GitHub
- [ ] Vercel detecta Next.js automáticamente
- [ ] Agregar variables de entorno si aplica
- [ ] Hacer clic en **Deploy**
- [ ] Verificar URL de producción generada por Vercel

### Fase 4 — Validación Final
- [ ] Abrir URL de producción → ver "Hola Mundo" con animación
- [ ] Verificar que la animación corre suavemente
- [ ] Confirmar que `npm run typecheck` pasa sin errores
- [ ] Hacer un cambio en `data/home.json` → commit → verificar que Vercel re-despliega

---

## 11. Convenciones y Estándares

### Convenciones de Nombrado
| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Componentes React | PascalCase | `HolaMundo.tsx` |
| Funciones / variables | camelCase | `readJsonFile()` |
| Archivos de utilidad | camelCase | `dataService.ts` |
| Archivos JSON | kebab-case | `home.json` |
| Interfaces/Types | PascalCase | `HomeData` |
| Schemas Zod | PascalCase + Schema | `HomeDataSchema` |

### Reglas de la Capa de Datos
1. **Solo lectura en servidor**: los JSONs nunca se exponen al cliente directamente.
2. **Validación obligatoria**: todo JSON leído debe pasar por su schema Zod.
3. **Un archivo por dominio**: cada entidad conceptual tiene su propio JSON.
4. **Sin lógica en JSON**: los archivos solo contienen datos, nunca funciones.

### Ramas de Git
```
main        → Producción (Vercel auto-deploy)
develop     → Integración y QA
feature/*   → Nuevas funcionalidades
fix/*       → Corrección de bugs
```

### Mensajes de Commit (Conventional Commits)
```
feat: nueva funcionalidad
fix: corrección de bug
chore: mantenimiento
docs: documentación
style: estilos sin cambio de lógica
refactor: refactorización
```

---

## 📌 Resumen Ejecutivo

| Aspecto | Decisión |
|---------|---------|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript 5.x (strict mode) |
| Estilos | Tailwind CSS + Framer Motion |
| Persistencia | Archivos JSON en `/data` (file system) |
| Hosting | Vercel (auto-deploy desde GitHub) |
| CI/CD | GitHub → Vercel Webhook + GitHub Actions (typecheck) |
| Validación de datos | Zod schemas |
| Validación TS | `tsc --noEmit` en pre-deploy |

---

> 📝 **Próximos pasos sugeridos**: Una vez validado el Hola Mundo, la arquitectura está lista para escalar — agregar nuevas páginas sigue el mismo patrón: nuevo archivo en `/data`, nuevo tipo en `lib/types.ts`, nuevo schema en `lib/validators.ts`, nueva ruta en `/app`.

---
*Documento generado como Plan de Infraestructura v1.0 — TypeScript Fullstack*
