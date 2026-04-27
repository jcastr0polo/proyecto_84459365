/**
 * lib/validators.ts
 * Esquemas de validación Zod para todos los tipos TypeScript
 * 
 * Zod proporciona validación en runtime, asegurando que:
 * - Los datos JSON tienen la estructura esperada
 * - Los tipos literales tienen valores válidos
 * - Las excepciones son claras si los datos son inválidos
 * 
 * Uso:
 *   const validated = HomeDataSchema.parse(rawData)
 *   const validated = AppConfigSchema.parse(rawData)
 */

import { z } from 'zod';

/**
 * HomeDataSchema — Validación de /data/home.json
 * 
 * Estructura esperada:
 * {
 *   hero: {
 *     title: string (min 1 char)
 *     subtitle: string
 *     description: string
 *     animationStyle: "typewriter" | "fadeIn" | "slideUp"
 *   },
 *   meta: {
 *     pageTitle: string
 *     description: string
 *   }
 * }
 */
export const HomeDataSchema = z.object({
  hero: z.object({
    title: z.string()
      .min(1, 'Title debe tener al menos 1 carácter')
      .describe('Título principal del héroe'),
    subtitle: z.string()
      .describe('Subtítulo del héroe'),
    description: z.string()
      .describe('Descripción adicional'),
    animationStyle: z.enum(['typewriter', 'fadeIn', 'slideUp'])
      .describe('Tipo de animación para el título'),
  })
    .describe('Sección hero de la página HOME'),
  meta: z.object({
    pageTitle: z.string()
      .describe('Título HTML <title>'),
    description: z.string()
      .describe('Meta description para SEO'),
  })
    .describe('Metadata SEO de la página'),
})
  .describe('Esquema completo de home.json');

/**
 * AppConfigSchema — Validación de /data/config.json
 * 
 * Estructura esperada:
 * {
 *   appName: string
 *   version: string (semántico MAJOR.MINOR.PATCH)
 *   locale: string (ISO locale code)
 *   theme: "light" | "dark"
 * }
 */
export const AppConfigSchema = z.object({
  appName: z.string()
    .min(1, 'appName es requerido')
    .describe('Nombre único de la aplicación'),
  version: z.string()
    .regex(/^\d+\.\d+\.\d+$/, 'version debe ser semántica: MAJOR.MINOR.PATCH')
    .describe('Versión semántica de la app'),
  locale: z.string()
    .regex(/^[a-z]{2}-[A-Z]{2}$/, 'locale debe ser formato ISO: ej es-CO, en-US')
    .describe('Código de localización ISO'),
  theme: z.enum(['light', 'dark'])
    .describe('Tema visual de la aplicación'),
  timezone: z.string()
    .min(1, 'timezone es requerido')
    .describe('IANA timezone (ej: America/Bogota)')
    .default('America/Bogota'),
})
  .describe('Esquema completo de config.json');

/**
 * Tipos inferidos desde Zod (útil si necesitas tipos desde schema)
 * 
 * Uso:
 *   type HomeDataType = z.infer<typeof HomeDataSchema>
 *   type AppConfigType = z.infer<typeof AppConfigSchema>
 */
export type HomeDataZod = z.infer<typeof HomeDataSchema>;
export type AppConfigZod = z.infer<typeof AppConfigSchema>;
