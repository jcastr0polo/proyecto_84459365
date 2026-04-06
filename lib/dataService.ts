import fs from 'fs';
import path from 'path';
import { HomeDataSchema, AppConfigSchema } from './validators';
import type { HomeData, AppConfig } from './types';

/**
 * Lee un archivo JSON de la carpeta /data y lo parsea con tipado genérico.
 * 
 * @param filename - Nombre del archivo JSON (ej: "config.json", "home.json")
 * @returns Objeto parseado con tipo T
 * @throws Error si el archivo no existe o el JSON es inválido
 * 
 * Uso (bajo nivel):
 *   const config = readJsonFile<AppConfig>('config.json');
 *   const home = readJsonFile<HomeData>('home.json');
 */
export function readJsonFile<T>(filename: string): T {
  const filePath = path.join(process.cwd(), 'data', filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

/**
 * Lee y valida /data/home.json con tipado estricto
 * 
 * @returns HomeData validado con Zod
 * @throws ZodError si la estructura no es válida
 * 
 * Garantiza:
 * - ✅ El archivo existe
 * - ✅ JSON es válido
 * - ✅ Estructura matches HomeDataSchema
 * - ✅ Valores literales son correctos
 * 
 * Uso (recomendado):
 *   const home = readHomeData();
 *   console.log(home.hero.title);  // Tipado como string ✅
 */
export function readHomeData(): HomeData {
  const raw = readJsonFile<HomeData>('home.json');
  return HomeDataSchema.parse(raw);
}

/**
 * Lee y valida /data/config.json con tipado estricto
 * 
 * @returns AppConfig validado con Zod
 * @throws ZodError si la estructura no es válida
 * 
 * Garantiza:
 * - ✅ El archivo existe
 * - ✅ JSON es válido
 * - ✅ Estructura matches AppConfigSchema
 * - ✅ Versión es semántica (MAJOR.MINOR.PATCH)
 * - ✅ Locale es formato ISO válido
 * - ✅ Theme es "light" o "dark"
 * 
 * Uso (recomendado):
 *   const config = readAppConfig();
 *   console.log(config.appName);  // Tipado como string ✅
 *   console.log(config.theme);    // Tipado como 'light' | 'dark' ✅
 */
export function readAppConfig(): AppConfig {
  const raw = readJsonFile<AppConfig>('config.json');
  return AppConfigSchema.parse(raw);
}
