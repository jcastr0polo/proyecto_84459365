/**
 * lib/uploadService.ts
 * Servicio de carga de archivos — Fase 11
 *
 * Manejo seguro de uploads: validación MIME, límite de tamaño,
 * sanitización de nombres, prevención de path traversal.
 * Referencia: PLAN sección 15.3
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { ActivityAttachment } from '@/lib/types';

// ────────────────────────────────────────────────────────────
// Vercel read-only filesystem workaround
// ────────────────────────────────────────────────────────────
const IS_VERCEL = !!process.env.VERCEL;

function getDataDir(...segments: string[]): string {
  const base = IS_VERCEL ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
  return path.join(base, ...segments);
}

// ────────────────────────────────────────────────────────────
// CONSTANTES
// ────────────────────────────────────────────────────────────

/** Tamaño máximo de archivo: 10 MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Tipos MIME permitidos para actividades (material del docente)
 * Según PLAN sección 15.3
 */
const ALLOWED_MIME_TYPES_ACTIVITIES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
  'text/markdown': ['.md'],
  'text/plain': ['.txt'],
};

/**
 * Tipos MIME permitidos para entregas de estudiantes
 * Incluye todo de actividades + ZIP
 */
const ALLOWED_MIME_TYPES_SUBMISSIONS: Record<string, string[]> = {
  ...ALLOWED_MIME_TYPES_ACTIVITIES,
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
};

// ────────────────────────────────────────────────────────────
// ERRORES
// ────────────────────────────────────────────────────────────

export class UploadError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'UploadError';
    this.statusCode = statusCode;
  }
}

// ────────────────────────────────────────────────────────────
// FUNCIONES AUXILIARES
// ────────────────────────────────────────────────────────────

/**
 * Sanitiza un nombre de archivo:
 * - Elimina path traversal (.., /, \)
 * - Elimina caracteres especiales peligrosos
 * - Reemplaza espacios por guiones
 * - Limita longitud a 200 caracteres
 */
function sanitizeFileName(name: string): string {
  let sanitized = name
    // Eliminar path traversal
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    // Eliminar caracteres peligrosos
    .replace(/[<>:"|?*\x00-\x1f]/g, '')
    // Reemplazar espacios y caracteres especiales por guiones
    .replace(/\s+/g, '-')
    // Eliminar guiones múltiples
    .replace(/-+/g, '-')
    // Eliminar puntos iniciales (archivos ocultos)
    .replace(/^\.+/, '')
    .trim();

  // Limitar longitud (preservando extensión)
  const ext = path.extname(sanitized);
  const base = path.basename(sanitized, ext);
  if (base.length > 190) {
    sanitized = base.substring(0, 190) + ext;
  }

  return sanitized || 'unnamed-file';
}

/**
 * Obtiene la extensión de un nombre de archivo (normalizada a minúsculas)
 */
function getExtension(fileName: string): string {
  return path.extname(fileName).toLowerCase();
}

/**
 * Determina los tipos MIME permitidos según el destino
 */
function getAllowedMimeTypes(destination: string): Record<string, string[]> {
  if (destination.startsWith('submissions')) {
    return ALLOWED_MIME_TYPES_SUBMISSIONS;
  }
  return ALLOWED_MIME_TYPES_ACTIVITIES;
}

/**
 * Valida que un tipo MIME esté permitido para el destino dado
 */
function isAllowedMimeType(mimeType: string, destination: string): boolean {
  const allowed = getAllowedMimeTypes(destination);
  return mimeType in allowed;
}

/**
 * Valida la extensión del archivo contra el tipo MIME declarado
 */
function isExtensionMatchingMime(fileName: string, mimeType: string, destination: string): boolean {
  const allowed = getAllowedMimeTypes(destination);
  const extensions = allowed[mimeType];
  if (!extensions) return false;
  const ext = getExtension(fileName);
  return extensions.includes(ext);
}

// ────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ────────────────────────────────────────────────────────────

/**
 * Sube un archivo al sistema de archivos local
 *
 * @param file - Objeto File del FormData
 * @param destination - Carpeta de destino relativa (ej: "activities/act-xxx")
 * @returns Metadata del archivo subido (ActivityAttachment)
 * @throws UploadError si la validación falla
 *
 * Proceso:
 * 1. Validar tamaño (max 10MB)
 * 2. Validar tipo MIME (según destino)
 * 3. Validar extensión vs MIME
 * 4. Sanitizar nombre
 * 5. Renombrar: {timestamp}-{uuid}-{sanitized-name}.{ext}
 * 6. Guardar en data/uploads/{destination}/
 * 7. Retornar metadata
 */
export async function uploadFile(
  file: File,
  destination: string
): Promise<ActivityAttachment> {
  // 1. Validar que sea un archivo
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new UploadError('No se recibió un archivo válido');
  }

  // 2. Validar tamaño
  if (file.size > MAX_FILE_SIZE) {
    throw new UploadError(
      `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    );
  }

  if (file.size === 0) {
    throw new UploadError('El archivo está vacío');
  }

  // 3. Validar tipo MIME
  const mimeType = file.type || 'application/octet-stream';
  if (!isAllowedMimeType(mimeType, destination)) {
    const allowed = Object.keys(getAllowedMimeTypes(destination)).join(', ');
    throw new UploadError(
      `Tipo de archivo no permitido: ${mimeType}. Permitidos: ${allowed}`
    );
  }

  // 4. Validar extensión vs MIME
  if (!isExtensionMatchingMime(file.name, mimeType, destination)) {
    throw new UploadError(
      `La extensión del archivo no coincide con el tipo MIME declarado (${mimeType})`
    );
  }

  // 5. Sanitizar y generar nombre único
  const sanitizedName = sanitizeFileName(path.basename(file.name, path.extname(file.name)));
  const ext = getExtension(file.name);
  const timestamp = Date.now();
  const uuid = uuidv4().split('-')[0]; // Primeros 8 chars del UUID
  const finalFileName = `${timestamp}-${uuid}-${sanitizedName}${ext}`;

  // 6. Sanitizar destino (prevenir path traversal)
  const safeDest = destination
    .replace(/\.\./g, '')
    .replace(/[\\]/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '');

  // 7. Crear directorio si no existe
  const uploadDir = getDataDir('uploads', safeDest);
  fs.mkdirSync(uploadDir, { recursive: true });

  // 8. Escribir archivo
  const filePath = path.join(uploadDir, finalFileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  // 9. Retornar metadata
  const relativePath = `uploads/${safeDest}/${finalFileName}`;

  return {
    id: uuidv4(),
    fileName: file.name,
    filePath: relativePath,
    fileSize: file.size,
    mimeType,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Elimina un archivo del sistema de archivos
 * @param relativePath - Ruta relativa desde /data/ (ej: "uploads/activities/act-xxx/file.pdf")
 * @returns true si se eliminó, false si no existía
 */
export function deleteFile(relativePath: string): boolean {
  // Prevenir path traversal
  if (relativePath.includes('..')) {
    throw new UploadError('Ruta inválida', 400);
  }

  const absolutePath = getDataDir(relativePath);

  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
    return true;
  }
  return false;
}

/**
 * Lee un archivo y retorna su contenido como Buffer
 * @param relativePath - Ruta relativa desde /data/ (ej: "uploads/activities/act-xxx/file.pdf")
 * @returns Buffer con el contenido del archivo
 * @throws UploadError si el archivo no existe o la ruta es inválida
 */
export function readUploadedFile(relativePath: string): { buffer: Buffer; mimeType: string } {
  // Prevenir path traversal
  if (relativePath.includes('..')) {
    throw new UploadError('Ruta inválida', 403);
  }

  const absolutePath = getDataDir(relativePath);

  // Verificar que el path resuelto esté dentro de data/uploads/
  const uploadsRoot = getDataDir('uploads');
  const resolved = path.resolve(absolutePath);
  if (!resolved.startsWith(uploadsRoot)) {
    throw new UploadError('Acceso no autorizado', 403);
  }

  if (!fs.existsSync(absolutePath)) {
    throw new UploadError('Archivo no encontrado', 404);
  }

  const buffer = fs.readFileSync(absolutePath);
  const ext = getExtension(absolutePath);

  // Mapear extensión a MIME type para servir archivos
  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.md': 'text/markdown',
    '.txt': 'text/plain',
    '.zip': 'application/zip',
  };

  return {
    buffer,
    mimeType: mimeMap[ext] || 'application/octet-stream',
  };
}
