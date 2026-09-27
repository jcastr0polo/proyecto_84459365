import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Sin sesión, al login. Antes de pintar nada.
 *
 * Los layouts de /admin y /student ya preguntaban por la sesión al montar y
 * redirigían, pero eso ocurre DESPUÉS de cargar la página: se veía el armazón
 * y el esqueleto de carga un instante antes del salto, y cada pantalla nueva
 * tenía que acordarse de hacerlo. El tablero de proyección, por ejemplo, vive
 * fuera de /admin y no heredaba ninguna guarda.
 *
 * Aquí se decide antes de renderizar, para todas las rutas de una vez.
 *
 * Solo se comprueba que la cookie ESTÉ. Verificar la firma del JWT exigiría
 * criptografía en el borde y una dependencia más, y no hace falta: un token
 * caducado o manipulado lo rechaza igual la API, y el manejador de 401 del
 * cliente lleva al login. Lo que esto resuelve es el caso normal —la cookie
 * expiró y el navegador la tiró— sin enseñar una pantalla vacía por el camino.
 *
 * Nota: en esta versión de Next el fichero ya no se llama middleware.
 */

const COOKIE = 'session_token';

/** Todo lo que hay detrás de una sesión. */
const PROTEGIDAS = ['/admin', '/student', '/tablero', '/change-password'];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!PROTEGIDAS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  if (request.cookies.get(COOKIE)) return NextResponse.next();

  /* Se recuerda a dónde iba para devolverlo ahí después de entrar: quien abre
     un enlace directo a una entrega no quiere aterrizar en el panel. */
  const login = new URL('/login', request.url);
  login.searchParams.set('next', pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  /* Se excluyen las rutas de API —responden 401, que es lo correcto para una
     petición— y todo lo estático. */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|iconos|.*\\.png$).*)'],
};
