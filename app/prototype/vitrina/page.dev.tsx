'use client';

import React from 'react';
import ShowcaseClient from '@/app/showcase/ShowcaseClient';
import type { ShowcaseProject } from '@/app/showcase/ShowcaseClient';

/**
 * Taller — la vitrina con proyectos.
 *
 * Desde que solo enseña el semestre en curso, con datos reales la página está
 * vacía hasta diciembre. Sin esto no habría forma de ver el estado lleno.
 */
const captura = (t: string, c: string) =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450">
      <rect width="800" height="450" fill="${c}"/>
      <rect x="0" y="0" width="800" height="52" fill="#0b1220"/>
      <text x="40" y="200" font-family="sans-serif" font-size="38" fill="#e2e8f0">${t}</text>
      <rect x="40" y="240" width="320" height="12" rx="6" fill="#64748b"/>
      <rect x="40" y="266" width="240" height="12" rx="6" fill="#64748b"/>
    </svg>`);

const PROYECTOS: ShowcaseProject[] = [
  { id: '1', projectName: 'Inventario para tiendas', studentName: 'Ana Restrepo',
    courseName: 'LÓGICA Y PROGRAMACIÓN', courseId: 'c1',
    description: 'Control de existencias y ventas para negocios de barrio, con alertas de reposición.',
    githubUrl: 'https://github.com/x/y', vercelUrl: 'https://demo.vercel.app',
    showcaseImageUrl: captura('Inventario', '#0f2027') },
  { id: '2', projectName: 'Rutas del SETP', studentName: 'Bruno Cárdenas',
    courseName: 'TALLER DISEÑO INTERACTIVO', courseId: 'c2',
    description: 'Dónde viene el bus, en tiempo real.',
    githubUrl: 'https://github.com/x/y', showcaseImageUrl: captura('Rutas', '#1a1033') },
  { id: '3', projectName: 'Agenda de laboratorios', studentName: 'Carla Ochoa',
    courseName: 'LÓGICA Y PROGRAMACIÓN', courseId: 'c1',
    description: 'Reserva de equipos y salas sin pelearse por el cuaderno de la entrada.',
    githubUrl: 'https://github.com/x/y', vercelUrl: 'https://demo2.vercel.app' },
  { id: '4', projectName: 'Panel de gastos', studentName: 'Diego Peña',
    courseName: 'GERENCIA DE PROYECTOS', courseId: 'c3',
    description: 'Seguimiento de presupuesto por frente de trabajo.',
    githubUrl: 'https://github.com/x/y', figmaUrl: 'https://figma.com/file/x' },
];

const CURSOS = [
  { id: 'c1', name: 'LÓGICA Y PROGRAMACIÓN' },
  { id: 'c2', name: 'TALLER DISEÑO INTERACTIVO' },
  { id: 'c3', name: 'GERENCIA DE PROYECTOS' },
];

export default function PrototipoVitrina() {
  return (
    <ShowcaseClient
      projects={PROYECTOS}
      semesterLabel="2026 - Segundo Semestre"
      courses={CURSOS}
    />
  );
}
