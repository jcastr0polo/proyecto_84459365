/**
 * POST /api/upload/entrega — permiso para subir un archivo de entrega
 *
 * El archivo NO pasa por aquí. Aquí solo se firma un permiso corto y el
 * navegador sube directo al almacenamiento.
 *
 * El motivo es un tope de la plataforma, no una preferencia: el cuerpo de
 * una petición no puede pasar de ~4,5 MB, y los rechaza ella antes de que
 * corra una línea de código nuestro, con un 413 que ni siquiera es JSON. Una
 * estudiante se quedó sin entregar por eso, viendo «Error al enviar entrega»
 * y sin nada que hacer con ese mensaje. Mientras el archivo viajara dentro
 * de la petición no había número que subir: el techo era de Vercel.
 *
 * Lo que este permiso acota, porque el archivo ya no lo vemos pasar:
 *
 * · QUIÉN sube — hay que tener sesión y estar inscrito en el curso.
 * · DÓNDE — la ruta se construye aquí con el id de la actividad y el del
 *   usuario. No se acepta la que mande el cliente: si no coincide, no se
 *   firma. Sin esto, cualquiera escribiría en la carpeta de otro.
 * · QUÉ — tipo y tamaño van dentro del permiso, y los hace cumplir el
 *   almacenamiento. Es lo que sustituye a la validación que antes hacía
 *   uploadService con el archivo en la mano.
 *
 * Los archivos siguen siendo privados, igual que cuando los subía el
 * servidor: se leen por la ruta de visor, no por su URL.
 */

import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { withAuth } from '@/lib/withAuth';
import { readActivitiesFresh, isStudentEnrolled } from '@/lib/dataService';
import {
  MAX_ENTREGA_BYTES, tiposPermitidosEnEntrega, extensionesPermitidasEnEntrega,
} from '@/lib/uploadService';

function token(): string | undefined {
  return process.env.NEXUS_READ_WRITE_TOKEN;
}

/**
 * Lo que cabe cuando el archivo viaja DENTRO de la petición.
 *
 * La plataforma corta en ~4,5 MB el cuerpo entero. Se deja holgura para el
 * resto del formulario —enlaces, comentario, los límites del multipart— y
 * para que el aviso llegue antes que el corte.
 */
const TOPE_EN_LA_PETICION = 4 * 1024 * 1024;

/**
 * GET — ¿hay subida directa, y hasta cuánto?
 *
 * El formulario lo pregunta antes de enseñar un límite: prometer 8 MB donde
 * no los hay es exactamente el error que se está corrigiendo.
 */
export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async (user) => NextResponse.json({
    directo: !!token(),
    maxBytes: token() ? MAX_ENTREGA_BYTES : TOPE_EN_LA_PETICION,
    /* La carpeta la arma el cliente para poder subir, pero el id sale de
       aquí: lo que mande se comprueba igual al firmar el permiso. */
    userId: user.id,
  }));
}

export async function POST(request: Request): Promise<NextResponse> {
  return withAuth(request, async (user) => {
    /*
     * Sin almacenamiento configurado no hay subida directa. Se dice con un
     * código propio para que el formulario pueda volver al camino de
     * siempre —el archivo dentro de la petición— en vez de dejar al
     * estudiante sin entregar. En local sin Blob es lo normal.
     */
    if (!token()) {
      return NextResponse.json({ error: 'sin-almacenamiento' }, { status: 501 });
    }

    const body = (await request.json()) as HandleUploadBody;

    try {
      const respuesta = await handleUpload({
        body,
        request,
        token: token(),
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          let activityId = '';
          try {
            activityId = String(JSON.parse(clientPayload ?? '{}').activityId ?? '');
          } catch { /* payload ilegible: se trata como si no viniera */ }
          if (!activityId) throw new Error('Falta la actividad');

          const activity = (await readActivitiesFresh()).find((a) => a.id === activityId);
          if (!activity) throw new Error('Esa actividad no existe');
          /* En una lista de tareas no se entrega: tampoco se sube nada. */
          if (activity.type === 'checklist') throw new Error('Esta actividad no se entrega');
          if (!(await isStudentEnrolled(user.id, activity.courseId))) {
            throw new Error('No estás inscrito en este curso');
          }

          /*
           * La carpeta la decide el servidor, no el cliente. `pathname` se
           * compara contra la que corresponde: así nadie escribe en la
           * carpeta de otro estudiante ni de otra actividad.
           */
          const carpeta = `uploads/submissions/act-${activityId}/stu-${user.id}/`;
          if (!pathname.startsWith(carpeta)) {
            throw new Error('Ruta de subida no permitida');
          }
          const nombre = pathname.slice(carpeta.length);
          if (!nombre || nombre.includes('/') || nombre.includes('..')) {
            throw new Error('Nombre de archivo no permitido');
          }
          const ext = nombre.slice(nombre.lastIndexOf('.')).toLowerCase();
          if (!extensionesPermitidasEnEntrega().includes(ext)) {
            throw new Error(`No se admiten archivos ${ext || 'sin extensión'}`);
          }

          return {
            allowedContentTypes: tiposPermitidosEnEntrega(),
            maximumSizeInBytes: MAX_ENTREGA_BYTES,
            addRandomSuffix: false,
            allowOverwrite: true,
            cacheControlMaxAge: 0,
            tokenPayload: JSON.stringify({ userId: user.id, activityId }),
          };
        },
      });

      return NextResponse.json(respuesta);
    } catch (e) {
      /*
       * El mensaje se devuelve tal cual: lo escribe este archivo, dice qué
       * pasó y el estudiante puede actuar sobre él. Es justo lo que faltaba
       * cuando el 413 llegaba mudo.
       */
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'No se pudo autorizar la subida' },
        { status: 400 },
      );
    }
  });
}
