# 📋 PROMPTS DE IMPLEMENTACIÓN — Fullstack TypeScript + Vercel + GitHub
> Guía de prompts secuenciales para ejecutar el plan de infraestructura fase por fase
> Cada prompt está diseñado para usarse en una sesión independiente de IA

---

## 📌 INSTRUCCIONES DE USO

Antes de lanzar cualquier prompt:
1. Ten abiertos los tres archivos de referencia: `PLAN_INFRAESTRUCTURA.md`, `PROMPTS.md`, `ESTADO_EJECUCION.md`
2. Copia el bloque completo del prompt de la fase correspondiente
3. Pégalo tal cual en la sesión de IA — no modifiques el bloque de contexto
4. Al finalizar cada fase, el asistente debe generar su archivo de resumen independiente
5. Actualiza manualmente `ESTADO_EJECUCION.md` con fechas y horas reales si trabajas fuera de IA

---

## ⚠️ PROTOCOLO OBLIGATORIO PARA CADA PROMPT

Todo prompt en este documento sigue este protocolo fijo:

```
1. LEER → PLAN_INFRAESTRUCTURA.md  (contexto de arquitectura)
2. LEER → PROMPTS.md               (contexto de secuencia de fases)
3. LEER → ESTADO_EJECUCION.md      (contexto del progreso actual)
4. REGISTRAR inicio en ESTADO_EJECUCION.md
5. EJECUTAR las tareas de la fase
6. REGISTRAR cierre y log en ESTADO_EJECUCION.md
7. GENERAR archivo RESUMEN_FASE_N_*.md independiente
```

---
---

## 🔵 FASE 1 — Setup del Proyecto

### Rol asignado: `Ingeniero Fullstack Senior`

---

### 📋 PROMPT FASE 1 — COPIAR Y PEGAR COMPLETO

```
Actúa como Ingeniero Fullstack Senior especializado en ecosistemas TypeScript y Next.js.

Antes de comenzar cualquier acción, debes leer y procesar en orden los siguientes documentos de referencia del proyecto:
1. PLAN_INFRAESTRUCTURA.md — contiene la arquitectura completa del sistema
2. PROMPTS.md — contiene la secuencia de fases y este mismo prompt
3. ESTADO_EJECUCION.md — contiene el historial y estado actual de implementación

Una vez leídos los tres documentos, realiza lo siguiente:

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
En el archivo ESTADO_EJECUCION.md, actualiza la sección "FASE 1 — Setup del Proyecto":
- Cambia el estado en el Dashboard a 🟡 En progreso
- Registra la fecha y hora actual en el campo [ INICIO ]
- Escribe la entrada: "Fase 1 iniciada — Setup del proyecto Next.js + TypeScript"

──────────────────────────────────────
PASO 1 — INICIALIZACIÓN DEL PROYECTO
──────────────────────────────────────
Ejecuta y documenta los siguientes pasos:

1. Crear el proyecto Next.js con TypeScript usando el comando oficial:
   npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir no --import-alias "@/*"

2. Instalar las dependencias adicionales del plan:
   npm install framer-motion zod
   npm install -D @types/node

3. Verificar que la estructura base de carpetas existe:
   /app, /public, /components (crear si no existe), /lib (crear), /data (crear)

4. Crear el archivo /data/README.md con la descripción de la capa de datos según el plan.

5. Crear el archivo .env.example con el contenido del plan.

6. Verificar y ajustar tsconfig.json para que tenga "strict": true y los paths configurados como indica el plan.

7. Ajustar next.config.ts con ignoreBuildErrors: false y ignoreDuringBuilds: false.

8. Agregar los scripts "typecheck" y "validate" al package.json según el plan.

9. Ejecutar npm run typecheck para validar que TypeScript compila sin errores.

──────────────────────────────────────
PASO 2 — REGISTRO DE CIERRE
──────────────────────────────────────
En ESTADO_EJECUCION.md, completa la sección de Fase 1:
- Cambia el estado en el Dashboard a ✅ Completada
- Registra fecha y hora en [ CIERRE ]
- Documenta en "Acciones ejecutadas" todo lo que se hizo
- Documenta en "Archivos creados/modificados" la lista exacta
- Documenta en "Comandos ejecutados" los comandos corridos
- Anota cualquier problema o desviación del plan en "Observaciones"

──────────────────────────────────────
PASO 3 — GENERAR RESUMEN DE FASE
──────────────────────────────────────
Crea el archivo RESUMEN_FASE_1_SETUP.md con la siguiente estructura:
- Título y fecha de ejecución
- Objetivo de la fase
- Lista completa de acciones realizadas
- Árbol de archivos resultante
- Comandos ejecutados con sus outputs relevantes
- Problemas encontrados y cómo se resolvieron
- Estado final: EXITOSO / CON OBSERVACIONES / FALLIDO
- Próxima fase recomendada

No avances a la Fase 2 hasta que este resumen esté generado y el estado marcado como ✅.
```

---
---

## 🔵 FASE 2 — Capa de Datos JSON

### Rol asignado: `Ingeniero Fullstack Senior`

---

### 📋 PROMPT FASE 2 — COPIAR Y PEGAR COMPLETO

```
Actúa como Ingeniero Fullstack Senior especializado en arquitectura de datos y TypeScript.

Antes de comenzar cualquier acción, debes leer y procesar en orden los siguientes documentos de referencia del proyecto:
1. PLAN_INFRAESTRUCTURA.md — sección 4 "Capa de Datos — JSON como Base de Datos"
2. PROMPTS.md — para entender la secuencia de fases
3. ESTADO_EJECUCION.md — para verificar que la Fase 1 está en ✅ antes de continuar

Si la Fase 1 no está marcada como ✅ Completada en ESTADO_EJECUCION.md, detente y notifica que debe completarse primero.

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
En ESTADO_EJECUCION.md, actualiza la sección "FASE 2 — Capa de Datos JSON":
- Cambia el estado en el Dashboard a 🟡 En progreso
- Registra la fecha y hora actual en [ INICIO ]
- Escribe: "Fase 2 iniciada — Creación de la capa de datos JSON"

──────────────────────────────────────
PASO 1 — CREAR ARCHIVOS JSON BASE
──────────────────────────────────────
1. Crear /data/config.json con exactamente esta estructura:
   {
     "appName": "Mi App TypeScript",
     "version": "1.0.0",
     "locale": "es-CO",
     "theme": "dark"
   }

2. Crear /data/home.json con exactamente esta estructura:
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

3. Actualizar /data/README.md documentando:
   - Propósito de cada archivo JSON
   - Regla de acceso solo desde servidor
   - Instrucción de cómo agregar nuevos archivos JSON en el futuro

──────────────────────────────────────
PASO 2 — CREAR EL SERVICIO DE DATOS
──────────────────────────────────────
4. Crear /lib/dataService.ts con la función genérica readJsonFile<T> exactamente como indica el plan, usando fs y path de Node.js.

5. Verificar que la función es correctamente importable y que TypeScript no genera errores en ella.

──────────────────────────────────────
PASO 3 — VALIDAR LECTURA
──────────────────────────────────────
6. Crear un archivo temporal /lib/__test__/dataService.check.ts que importe readJsonFile e intente leer config.json y home.json, solo para validar tipado estático con tsc.

7. Ejecutar npm run typecheck — debe pasar sin errores.

8. Eliminar el archivo temporal de prueba.

──────────────────────────────────────
PASO 4 — REGISTRO DE CIERRE
──────────────────────────────────────
En ESTADO_EJECUCION.md, completa la sección de Fase 2:
- Cambia el estado a ✅ Completada
- Registra [ CIERRE ] con fecha y hora
- Documenta "Estructura JSON generada" con el árbol de /data
- Documenta "Acciones ejecutadas" completas
- Anota observaciones si las hay

──────────────────────────────────────
PASO 5 — GENERAR RESUMEN DE FASE
──────────────────────────────────────
Crea el archivo RESUMEN_FASE_2_DATOS.md con:
- Título y fecha
- Objetivo: establecer la capa de persistencia JSON
- Archivos JSON creados con su estructura completa
- Descripción de dataService.ts y su función
- Resultado de typecheck
- Reglas de acceso a datos establecidas
- Estado final: EXITOSO / CON OBSERVACIONES / FALLIDO
- Próxima fase: Tipos y Validación TypeScript
```

---
---

## 🔵 FASE 3 — Tipos y Validación TypeScript

### Rol asignado: `Ingeniero Fullstack Senior`

---

### 📋 PROMPT FASE 3 — COPIAR Y PEGAR COMPLETO

```
Actúa como Ingeniero Fullstack Senior con especialización en sistemas de tipos TypeScript y validación de datos con Zod.

Antes de comenzar, lee y procesa en orden:
1. PLAN_INFRAESTRUCTURA.md — sección 4 (tipos e interfaces) y sección 9 (validación TS)
2. PROMPTS.md — para mantener el contexto de la secuencia
3. ESTADO_EJECUCION.md — verifica que Fase 1 ✅ y Fase 2 ✅ antes de continuar

Si alguna fase previa no está ✅, detente y notifica.

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
En ESTADO_EJECUCION.md, sección "FASE 3 — Tipos y Validación TypeScript":
- Dashboard → 🟡 En progreso
- Registra [ INICIO ] con fecha y hora
- Escribe: "Fase 3 iniciada — Definición de tipos e interfaces TypeScript y schemas Zod"

──────────────────────────────────────
PASO 1 — CREAR TIPOS E INTERFACES
──────────────────────────────────────
1. Crear /lib/types.ts con las interfaces completas del plan:
   - HomeData (con hero y meta tipados)
   - AppConfig (con appName, version, locale, theme)
   - Asegúrate de que los tipos literales estén correctamente definidos
     (ej: animationStyle: 'typewriter' | 'fadeIn' | 'slideUp')
     (ej: theme: 'light' | 'dark')

2. Exportar todos los tipos individualmente (no default export).

──────────────────────────────────────
PASO 2 — CREAR SCHEMAS DE VALIDACIÓN ZOD
──────────────────────────────────────
3. Crear /lib/validators.ts con los schemas Zod del plan:
   - HomeDataSchema validando la estructura completa de home.json
   - AppConfigSchema validando la estructura completa de config.json
   - Asegúrate de usar z.enum() para los campos con valores literales

4. Agregar exports de los tipos inferidos de Zod si son necesarios:
   export type HomeDataZod = z.infer<typeof HomeDataSchema>

──────────────────────────────────────
PASO 3 — ACTUALIZAR dataService.ts
──────────────────────────────────────
5. Actualizar /lib/dataService.ts para integrar los tipos:
   - Agregar una función tipada readHomeData() que retorna HomeData validado
   - Agregar una función tipada readAppConfig() que retorna AppConfig validado
   - Ambas deben usar readJsonFile<T> internamente y pasar por su schema Zod

──────────────────────────────────────
PASO 4 — VALIDAR TODO CON TSC
──────────────────────────────────────
6. Ejecutar npm run typecheck
7. Verificar que no hay ningún error de tipo
8. Si hay errores, resolverlos y documentar qué fue diferente al plan

──────────────────────────────────────
PASO 5 — REGISTRO DE CIERRE
──────────────────────────────────────
En ESTADO_EJECUCION.md:
- Dashboard → ✅ Completada
- Registra [ CIERRE ]
- Documenta "Interfaces y tipos definidos" con la lista
- Documenta "Schemas Zod creados" con la lista
- Documenta "Resultado de tsc --noEmit"
- Anota observaciones

──────────────────────────────────────
PASO 6 — GENERAR RESUMEN DE FASE
──────────────────────────────────────
Crea RESUMEN_FASE_3_TIPOS.md con:
- Fecha y objetivo
- Interfaces TypeScript creadas (con su código)
- Schemas Zod creados (con su código)
- Actualización de dataService.ts documentada
- Resultado exacto de npm run typecheck
- Decisiones de tipo tomadas (por qué literales en vez de string, etc.)
- Estado final y próxima fase: API Route Handler
```

---
---

## 🔵 FASE 4 — API Route Handler

### Rol asignado: `Ingeniero Fullstack Senior`

---

### 📋 PROMPT FASE 4 — COPIAR Y PEGAR COMPLETO

```
Actúa como Ingeniero Fullstack Senior especializado en Next.js App Router, Route Handlers serverless y arquitecturas API RESTful.

Antes de comenzar, lee y procesa en orden:
1. PLAN_INFRAESTRUCTURA.md — sección 5 "Arquitectura de la Aplicación" y sección 3 "Estructura del Repositorio"
2. PROMPTS.md — contexto de secuencia
3. ESTADO_EJECUCION.md — verifica Fases 1 ✅, 2 ✅ y 3 ✅ antes de continuar

Si alguna fase previa no está ✅, detente y notifica cuál falta.

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
En ESTADO_EJECUCION.md, sección "FASE 4 — API Route Handler":
- Dashboard → 🟡 En progreso
- Registra [ INICIO ]
- Escribe: "Fase 4 iniciada — Creación de Route Handler /api/data"

──────────────────────────────────────
PASO 1 — CREAR EL ROUTE HANDLER
──────────────────────────────────────
1. Crear /app/api/data/route.ts con:
   - Método GET que lee home.json usando readHomeData() de dataService
   - Valida con HomeDataSchema antes de responder
   - Retorna NextResponse.json() con los datos tipados
   - Manejo de errores: si el JSON falla, retorna 500 con mensaje claro
   - Headers apropiados (Content-Type: application/json)

2. El archivo debe estar completamente tipado — sin ningún 'any'.

──────────────────────────────────────
PASO 2 — CREAR ROUTE HANDLER DE CONFIG
──────────────────────────────────────
3. Crear /app/api/config/route.ts con:
   - Método GET que lee config.json usando readAppConfig()
   - Misma estructura de validación y manejo de errores que /api/data

──────────────────────────────────────
PASO 3 — PROBAR LOS ENDPOINTS EN LOCAL
──────────────────────────────────────
4. Iniciar el servidor de desarrollo:
   npm run dev

5. Probar manualmente (o documentar los comandos para probar):
   curl http://localhost:3000/api/data
   curl http://localhost:3000/api/config

6. Documentar los outputs recibidos.

7. Detener el servidor de desarrollo.

──────────────────────────────────────
PASO 4 — EJECUTAR TYPECHECK
──────────────────────────────────────
8. npm run typecheck — debe pasar sin errores.

──────────────────────────────────────
PASO 5 — REGISTRO DE CIERRE
──────────────────────────────────────
En ESTADO_EJECUCION.md:
- Dashboard → ✅ Completada
- Registra [ CIERRE ]
- Documenta "Endpoints creados": rutas, métodos y respuestas
- Documenta "Pruebas de endpoint realizadas" con outputs
- Anota observaciones

──────────────────────────────────────
PASO 6 — GENERAR RESUMEN DE FASE
──────────────────────────────────────
Crea RESUMEN_FASE_4_API.md con:
- Fecha y objetivo
- Endpoints creados con su código completo
- Outputs de pruebas locales documentados
- Manejo de errores implementado
- Resultado de typecheck
- Notas sobre el patrón Server-only de los datos
- Estado final y próxima fase: UI / Home Hola Mundo
```

---
---

## 🟣 FASE 5 — UI / Home — Hola Mundo

### Rol asignado: `Diseñador UX/UI Senior + Ingeniero Frontend`

---

### 📋 PROMPT FASE 5 — COPIAR Y PEGAR COMPLETO

```
Actúa como Diseñador UX/UI Senior con sólidas habilidades de ingeniería frontend en React, TypeScript y Framer Motion. Tu objetivo en esta fase es crear una experiencia visual de alta calidad para el Home del sistema — el "Hola Mundo" que valide visualmente el funcionamiento del stack completo.

Antes de comenzar, lee y procesa en orden:
1. PLAN_INFRAESTRUCTURA.md — sección 8 "Implementación del Home — Hola Mundo" y sección 5 "Arquitectura de la Aplicación"
2. PROMPTS.md — contexto de secuencia y esta fase
3. ESTADO_EJECUCION.md — verifica Fases 1 ✅, 2 ✅, 3 ✅ y 4 ✅

Si alguna fase previa no está ✅, detente y notifica.

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
En ESTADO_EJECUCION.md, sección "FASE 5 — UI / Home — Hola Mundo":
- Dashboard → 🟡 En progreso
- Registra [ INICIO ]
- Escribe: "Fase 5 iniciada — Diseño e implementación del Home con animación elegante"

──────────────────────────────────────
PASO 1 — DECISIONES DE DISEÑO
──────────────────────────────────────
Antes de escribir código, define y documenta las siguientes decisiones de diseño:

1. Paleta de colores (fondo, texto principal, acentos)
2. Tipografía: fuente display para "Hola Mundo", fuente secundaria para el subtítulo
   — NO uses Inter, Roboto ni Arial. Elige algo distintivo de Google Fonts.
3. Tipo de animación elegida para el título (letra por letra, typewriter, fade escalonado, etc.)
4. Elementos decorativos adicionales (línea separadora, partículas, glow, etc.)
5. Responsive: cómo se adapta en mobile vs desktop

──────────────────────────────────────
PASO 2 — CREAR COMPONENTE AnimatedText
──────────────────────────────────────
2. Crear /components/AnimatedText.tsx:
   - Client Component ("use client")
   - Recibe text: string, delay?: number
   - Anima cada letra individualmente con Framer Motion
   - Variantes: hidden → visible con stagger escalonado
   - Completamente tipado en TypeScript

──────────────────────────────────────
PASO 3 — CREAR COMPONENTE HolaMundo
──────────────────────────────────────
3. Crear /components/HolaMundo.tsx:
   - Client Component ("use client")
   - Props: { title: string; subtitle: string; description: string }
   - Usa AnimatedText para el título
   - Subtítulo con fade-in retardado
   - Elemento decorativo (línea, glow, borde animado — según decisiones de diseño)
   - Todos los elementos con timing orquestado

──────────────────────────────────────
PASO 4 — ACTUALIZAR app/layout.tsx
──────────────────────────────────────
4. Actualizar /app/layout.tsx:
   - Agregar import de Google Fonts elegidos
   - Configurar variables CSS para las fuentes
   - Metadata global con title y description desde home.json (si aplica)
   - Fondo base establecido (color/gradiente según paleta)

──────────────────────────────────────
PASO 5 — CREAR app/page.tsx
──────────────────────────────────────
5. Crear /app/page.tsx como Server Component:
   - Sin "use client"
   - Leer /data/home.json usando readHomeData() de dataService
   - Validar con Zod
   - Pasar props a HolaMundo como Client Component hijo
   - Metadata de la página (generateMetadata o export const metadata)

──────────────────────────────────────
PASO 6 — ACTUALIZAR globals.css
──────────────────────────────────────
6. Actualizar /app/globals.css:
   - Variables CSS del sistema de diseño
   - Reset básico necesario
   - Estilos de fondo global
   - Animación de cursor si se usa typewriter

──────────────────────────────────────
PASO 7 — VERIFICAR EN DESARROLLO
──────────────────────────────────────
7. Iniciar npm run dev
8. Navegar a http://localhost:3000
9. Verificar visualmente que:
   - La animación corre completa y elegante
   - El texto está perfectamente centrado
   - Funciona en mobile (resize del browser)
   - No hay errores en consola del browser
10. Detener el servidor

──────────────────────────────────────
PASO 8 — TYPECHECK FINAL
──────────────────────────────────────
11. npm run typecheck — cero errores

──────────────────────────────────────
PASO 9 — REGISTRO DE CIERRE
──────────────────────────────────────
En ESTADO_EJECUCION.md:
- Dashboard → ✅ Completada
- Registra [ CIERRE ]
- Documenta "Componentes creados" con la lista
- Documenta "Decisiones de diseño tomadas" (paleta, tipografía, animación)
- Documenta "Animaciones implementadas"
- Describe "Validación visual" con lo observado

──────────────────────────────────────
PASO 10 — GENERAR RESUMEN DE FASE
──────────────────────────────────────
Crea RESUMEN_FASE_5_UI.md con:
- Fecha y objetivo
- Brief de diseño (decisiones tomadas y por qué)
- Componentes creados con su código completo
- Descripción de las animaciones implementadas
- Capturas de pantalla (describir visualmente qué se ve)
- Resultado de typecheck
- Estado final y próxima fase: Pipeline CI/CD
```

---
---

## 🔵 FASE 6 — Pipeline CI/CD

### Rol asignado: `Ingeniero Fullstack Senior / DevOps`

---

### 📋 PROMPT FASE 6 — COPIAR Y PEGAR COMPLETO

```
Actúa como Ingeniero Fullstack Senior con especialización en DevOps, CI/CD y plataformas de despliegue cloud (GitHub Actions + Vercel).

Antes de comenzar, lee y procesa en orden:
1. PLAN_INFRAESTRUCTURA.md — sección 7 "Pipeline CI/CD — GitHub → Vercel" y sección 6 "Configuración del Entorno"
2. PROMPTS.md — contexto de secuencia
3. ESTADO_EJECUCION.md — verifica Fases 1 ✅ a 5 ✅ antes de continuar

Si alguna fase previa no está ✅, detente y notifica.

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
En ESTADO_EJECUCION.md, sección "FASE 6 — Pipeline CI/CD":
- Dashboard → 🟡 En progreso
- Registra [ INICIO ]
- Escribe: "Fase 6 iniciada — Configuración de pipeline GitHub → Vercel + GitHub Actions"

──────────────────────────────────────
PASO 1 — CREAR vercel.json
──────────────────────────────────────
1. Crear /vercel.json con la configuración exacta del plan:
   framework, buildCommand, outputDirectory, installCommand, regions.

──────────────────────────────────────
PASO 2 — VERIFICAR .gitignore
──────────────────────────────────────
2. Revisar /.gitignore y asegurarse de que incluye exactamente:
   - node_modules/
   - .next/
   - .env.local
   - .env*.local
   - *.log
   - .DS_Store
   Agregar cualquier entrada faltante.

──────────────────────────────────────
PASO 3 — CREAR GITHUB ACTIONS WORKFLOW
──────────────────────────────────────
3. Crear /.github/workflows/validate.yml con el workflow completo del plan:
   - Trigger en push a main y develop
   - Trigger en pull_request a main
   - Job: typecheck (Node 20, npm ci, tsc --noEmit)
   - Job: lint (next lint)
   - Los jobs deben correr en paralelo si es posible

──────────────────────────────────────
PASO 4 — PRIMER COMMIT Y PUSH
──────────────────────────────────────
4. Ejecutar en el repositorio local:
   git add .
   git commit -m "feat: initial TypeScript fullstack setup — Fases 1-5 completas"
   git push origin main

5. Verificar en GitHub que:
   - El push llegó correctamente
   - GitHub Actions se disparó automáticamente
   - El workflow de validación corre (typecheck + lint)

──────────────────────────────────────
PASO 5 — VINCULAR CON VERCEL
──────────────────────────────────────
6. Documentar el proceso de vinculación paso a paso:
   a. Ir a vercel.com/new
   b. Importar el repositorio GitHub
   c. Verificar detección automática de Next.js
   d. Configurar variables de entorno si aplica
   e. Hacer clic en Deploy
   f. Esperar y registrar la URL de producción generada

7. Registrar la URL de producción en ESTADO_EJECUCION.md.

──────────────────────────────────────
PASO 6 — REGISTRO DE CIERRE
──────────────────────────────────────
En ESTADO_EJECUCION.md:
- Dashboard → ✅ Completada
- Registra [ CIERRE ]
- Documenta "Archivos de configuración creados"
- Documenta "Vinculación GitHub → Vercel" con la URL
- Documenta "GitHub Actions configurado" con el resultado del primer run
- Anota observaciones

──────────────────────────────────────
PASO 7 — GENERAR RESUMEN DE FASE
──────────────────────────────────────
Crea RESUMEN_FASE_6_CICD.md con:
- Fecha y objetivo
- Configuración de Vercel documentada
- Workflow de GitHub Actions completo
- Log del primer push y resultado del workflow
- URL de producción obtenida
- Diagrama textual del pipeline (origen → build → deploy)
- Estado final y próxima fase: Validación Final
```

---
---

## 🟢 FASE 7 — Validación y Despliegue Final

### Rol asignado: `Ingeniero Fullstack Senior`

---

### 📋 PROMPT FASE 7 — COPIAR Y PEGAR COMPLETO

```
Actúa como Ingeniero Fullstack Senior responsable de la validación final y entrega del sistema. Tu objetivo es certificar que el sistema completo funciona correctamente en producción y que TypeScript valida sin errores en toda la cadena.

Antes de comenzar, lee y procesa en orden:
1. PLAN_INFRAESTRUCTURA.md — sección 9 "Validación TypeScript" y sección 10 "Checklist de Despliegue"
2. PROMPTS.md — contexto completo de todas las fases anteriores
3. ESTADO_EJECUCION.md — verifica que TODAS las fases 1 ✅ a 6 ✅ están completas

Si alguna fase no está ✅, detente, identifica cuál y notifica. No ejecutar validación final con fases incompletas.

──────────────────────────────────────
PASO 0 — REGISTRO DE INICIO
──────────────────────────────────────
En ESTADO_EJECUCION.md, sección "FASE 7 — Validación y Despliegue Final":
- Dashboard → 🟡 En progreso
- Registra [ INICIO ]
- Escribe: "Fase 7 iniciada — Validación integral del sistema en producción"

──────────────────────────────────────
PASO 1 — VALIDACIÓN LOCAL COMPLETA
──────────────────────────────────────
Ejecutar en orden y documentar el output de cada comando:

1. npm run typecheck     → debe terminar sin errores
2. npm run lint          → debe terminar sin warnings ni errores
3. npm run build         → debe compilar exitosamente
4. npm run start         → iniciar servidor de producción local
5. Verificar http://localhost:3000 → animación "Hola Mundo" visible y correcta
6. Verificar http://localhost:3000/api/data → JSON de home válido
7. Verificar http://localhost:3000/api/config → JSON de config válido
8. Detener el servidor

──────────────────────────────────────
PASO 2 — CHECKLIST DEL PLAN
──────────────────────────────────────
Revisar y marcar cada ítem del Checklist de Despliegue de PLAN_INFRAESTRUCTURA.md:

Fase 1 del checklist (Setup Local):
- [ ] Repositorio creado en GitHub
- [ ] Proyecto inicializado con TypeScript
- [ ] Dependencias instaladas
- [ ] Carpeta /data con archivos JSON
- [ ] lib/types.ts, lib/dataService.ts, lib/validators.ts creados
- [ ] components/HolaMundo.tsx creado
- [ ] strict: true en tsconfig
- [ ] npm run validate sin errores

Fase 2 del checklist (Primer Commit):
- [ ] .gitignore cubre .next/, node_modules/, .env.local
- [ ] Commit realizado con mensaje convencional
- [ ] Push a main exitoso

Fase 3 del checklist (Vinculación Vercel):
- [ ] Proyecto importado en Vercel
- [ ] Next.js detectado automáticamente
- [ ] Variables de entorno configuradas
- [ ] Deploy exitoso
- [ ] URL de producción obtenida

Fase 4 del checklist (Validación Final):
- [ ] URL de producción abre correctamente
- [ ] Animación "Hola Mundo" corre en producción
- [ ] npm run typecheck pasa sin errores
- [ ] Cambio en JSON → commit → re-deploy verificado

──────────────────────────────────────
PASO 3 — PRUEBA DE RE-DEPLOY AUTOMÁTICO
──────────────────────────────────────
9. Hacer un cambio menor en /data/home.json
   (ej: cambiar "subtitle" a "TypeScript + Next.js + Vercel ✓")
10. Commit: git commit -m "test: validar re-deploy automático desde JSON"
11. Push: git push origin main
12. Verificar en Vercel dashboard que el nuevo deploy se disparó
13. Verificar en la URL de producción que el cambio se refleja
14. Documentar el tiempo total del ciclo commit → deploy → visible

──────────────────────────────────────
PASO 4 — VERIFICAR GITHUB ACTIONS
──────────────────────────────────────
15. Ir a la sección Actions del repositorio GitHub
16. Verificar que el workflow "Validate TypeScript" corrió en el último push
17. Confirmar que todos los jobs pasaron (typecheck ✅, lint ✅)
18. Documentar el log del workflow

──────────────────────────────────────
PASO 5 — ACTUALIZAR ESTADO_EJECUCION.md
──────────────────────────────────────
Completar en ESTADO_EJECUCION.md la sección de Fase 7:
- Dashboard → ✅ Completada
- Registra [ CIERRE ]
- Marcar todos los ítems del checklist interno de la sección Fase 7
- Documentar "Resultado del build final" con el output exacto
- Documentar "URL de producción verificada"
- Anota cualquier observación final

──────────────────────────────────────
PASO 6 — GENERAR RESUMEN FINAL DE FASE
──────────────────────────────────────
Crea RESUMEN_FASE_7_DEPLOY.md con:
- Fecha y objetivo
- Resultados de todos los comandos de validación (con outputs)
- Checklist completo marcado
- URL de producción y resultado visual
- Log de GitHub Actions del último run
- Tiempo del ciclo de re-deploy medido
- Conclusión: sistema CERTIFICADO / CON OBSERVACIONES / REQUIERE REVISIÓN

──────────────────────────────────────
PASO 7 — CIERRE TOTAL DEL PROYECTO
──────────────────────────────────────
Una vez completado RESUMEN_FASE_7_DEPLOY.md, actualiza ESTADO_EJECUCION.md:

En la sección "Información del Proyecto":
- Registra la fecha real de cierre
- Actualiza el Dashboard con todos los estados ✅

Escribe una entrada final en el Historial:
"[FECHA HORA] | PROYECTO | CERRADO | Sistema Fullstack TypeScript + Vercel + GitHub
certificado y funcionando en producción. URL: [URL]. 7 fases completadas.
Archivos de resumen generados: RESUMEN_FASE_1 a RESUMEN_FASE_7."

El proyecto está oficialmente entregado.
```

---
---

## 📎 REFERENCIA RÁPIDA

| Fase | Rol | Prompt | Resumen generado |
|------|-----|--------|-----------------|
| 1 — Setup | Ingeniero Fullstack | ✅ Listo arriba | `RESUMEN_FASE_1_SETUP.md` |
| 2 — JSON DB | Ingeniero Fullstack | ✅ Listo arriba | `RESUMEN_FASE_2_DATOS.md` |
| 3 — Tipos TS | Ingeniero Fullstack | ✅ Listo arriba | `RESUMEN_FASE_3_TIPOS.md` |
| 4 — API | Ingeniero Fullstack | ✅ Listo arriba | `RESUMEN_FASE_4_API.md` |
| 5 — UI/Home | Diseñador UX/UI | ✅ Listo arriba | `RESUMEN_FASE_5_UI.md` |
| 6 — CI/CD | Ingeniero Fullstack | ✅ Listo arriba | `RESUMEN_FASE_6_CICD.md` |
| 7 — Deploy | Ingeniero Fullstack | ✅ Listo arriba | `RESUMEN_FASE_7_DEPLOY.md` |

---

## 🔗 Documentos del ecosistema

| Documento | Propósito | Se lee en |
|-----------|-----------|-----------|
| `PLAN_INFRAESTRUCTURA.md` | Arquitectura y decisiones técnicas | Inicio de cada prompt |
| `PROMPTS.md` | Este archivo — secuencia de ejecución | Inicio de cada prompt |
| `ESTADO_EJECUCION.md` | Historial de progreso en tiempo real | Inicio y cierre de cada prompt |
| `RESUMEN_FASE_N_*.md` | Evidencia detallada por fase | Al completar cada fase |

---
*PROMPTS.md v1.0 — 7 fases definidas | Fullstack TypeScript + Vercel + GitHub*
