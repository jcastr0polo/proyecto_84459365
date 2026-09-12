import React from 'react';
import type { Metadata } from 'next';
import LandingClient from '@/components/LandingClient';
import { getActiveSemester, getCoursesBySemester, readHomeData } from '@/lib/dataService';

export const metadata: Metadata = {
  title: 'NEXUS — Plataforma Académica | Fullstack TypeScript',
  description: 'Plataforma de gestión académica universitaria potenciada por IA. Next.js, TypeScript, React 19 y Tailwind CSS.',
};

/**
 * El home se arma en el servidor.
 *
 * Antes no: los tres cursos que anunciaba estaban escritos a mano en el propio
 * componente (`const courses = FALLBACK_COURSES`) y el semestre era la cadena
 * "2026-1" repetida en tres sitios. Así que la cara pública de la plataforma
 * llegó a anunciar un curso que no existe y el semestre equivocado, mientras
 * la vitrina —que sí lee datos— decía otra cosa. Dos páginas públicas
 * contradiciéndose.
 *
 * Leerlo aquí y no con un fetch desde el navegador tiene además dos ventajas:
 * llega ya pintado (nada de un hueco que se rellena al segundo) y lo ve quien
 * indexa la página.
 */
export const revalidate = 300;

export default async function HomePage(): Promise<React.ReactElement> {
  /* Si la base no responde, el home sigue en pie sin su catálogo: es
     preferible una sección menos que una sección que miente. */
  const [semester, home] = await Promise.all([
    getActiveSemester().catch(() => null),
    readHomeData().catch(() => null),
  ]);
  const courses = semester
    ? await getCoursesBySemester(semester.id).catch(() => [])
    : [];

  return (
    <LandingClient
      hero={home?.hero ?? null}
      semesterLabel={semester?.label ?? null}
      courses={courses.filter((c) => c.isActive)}
    />
  );
}
