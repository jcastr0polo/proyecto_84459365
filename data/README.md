# 📂 Capa de Datos — Files JSON as Database

> Esta carpeta contiene todos los archivos JSON que actúan como la base de datos del sistema.

## 📋 Propósito

Los archivos JSON en esta carpeta son la **fuente de verdad** de todos los datos de la aplicación. Reemplazan completamente la necesidad de una base de datos convencional (PostgreSQL, MongoDB, etc.).

## ⚠️ Regla Crítica de Acceso

```
Los archivos JSON en /data JAMÁS deben ser accedidos directamente desde el cliente (navegador).
Toda lectura ocurre ÚNICAMENTE en:
  - Server Components de Next.js (sin "use client")
  - Route Handlers en /app/api/*
  - Funciones de servidor
```

### Por qué:
- Evita exposición de datos internos en el bundle del cliente
- Garantiza seguridad de la lógica de negocio
- Mejora performance (lectura en servidor, no en cliente)
- Permite validación de datos antes de enviarlos al frontend

## 📄 Archivos Disponibles

### `config.json`
**Propósito:** Configuración global de la aplicación que se carga una sola vez.

**Estructura actual:**
```json
{
  "appName": "Mi App TypeScript",      // Nombre único de la aplicación
  "version": "1.0.0",                   // Versión semántica actual
  "locale": "es-CO",                    // Localización (idioma-país)
  "theme": "dark"                       // Tema visual: "light" o "dark"
}
```

**Cuándo usarlo:** Valores globales que afectan toda la aplicación.  
**Acceso:** `readAppConfig()` desde `lib/dataService.ts`  
**Servidor-only:** ✅ Nunca exponer al cliente  

---

### `home.json`
**Propósito:** Contenido e información de la página HOME (Hola Mundo inicial).

**Estructura actual:**
```json
{
  "hero": {
    "title": "Hola Mundo",              // Texto principal del héroe
    "subtitle": "TypeScript + Next.js + Vercel",  // Subtítulo
    "description": "Sistema fullstack funcionando correctamente.",
    "animationStyle": "typewriter"      // Estilo: "typewriter", "fadeIn", "slideUp"
  },
  "meta": {
    "pageTitle": "Home | Mi App",       // Título para <head>
    "description": "Página principal del sistema"  // Meta description para SEO
  }
}
```

**Cuándo usarlo:** Contenido de la página HOME, animación y metadata SEO.  
**Acceso:** `readHomeData()` desde `lib/dataService.ts`  
**Servidor-only:** ✅ Los datos se validan/envían desde servidor  

---

1. Crear un nuevo archivo `nombreArchivo.json` en esta carpeta
2. Definir su interfaz TypeScript en `lib/types.ts`
3. Crear su esquema de validación Zod en `lib/validators.ts`
4. Crear una función helper en `lib/dataService.ts` (ej: `readNombreData()`)
5. Usar siempre desde Server Components/Route Handlers
6. Validar con Zod antes de usar los datos

## 🔄 Actualización de Datos en Producción (Vercel)

En Vercel, los cambios en estos archivos JSON requieren:
1. Hacer commit de los cambios en Git
2. Hacer push a GitHub
3. Vercel detecta el cambio y redeploy automáticamente
4. Los nuevos datos estarán disponibles en la próxima build

No se pueden actualizar datos en runtime — todos los cambios van a través del repositorio.

## 📊 Estructura Esperada

```json
{
  "campo1": "tipo de dato",
  "campo2": {
    "subfieldA": "valor",
    "subfieldB": [1, 2, 3]
  }
}
```

Siempre mantener la estructura JSON válida para evitar errores de parsing.

---

*Esta capa de datos fue diseñada para simplificar el desarrollo sin comprometer la seguridad o la performance.*
