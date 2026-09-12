import { notFound } from 'next/navigation';

/**
 * Las rutas de /prototype son un taller de diseño con datos falsos.
 * Se bloquean en producción para que nunca lleguen al despliegue público.
 */
export default function PrototypeLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') notFound();
  return <>{children}</>;
}
