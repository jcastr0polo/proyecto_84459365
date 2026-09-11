import type { StudentGradeSummary } from '@/lib/types';

/**
 * Datos de prueba para el prototipo de diseño — NO tocan la base de datos.
 *
 * Modela un estudiante a mitad de semestre en "Taller de Diseño Interactivo"
 * (periodo 202602), que es el caso real que queremos poder mirar:
 * corte 1 cerrado, corte 2 a medias, corte 3 sin empezar.
 *
 * Incluye a propósito los casos límite que un solo estudiante real no mostraría:
 * una actividad reprobada, una sin retroalimentación, un título largo,
 * un corte completamente vacío y notas aún sin publicar.
 */

const C1 = 'corte-1';
const C2 = 'corte-2';
const C3 = 'corte-3';

export const MOCK_GRADES: StudentGradeSummary = {
  studentId: 'student-demo',
  courseId: 'course-tdi-202602',
  courseName: 'Taller de Diseño Interactivo',
  cortes: [
    { id: C1, name: 'Corte 1', weight: 30, order: 1 },
    { id: C2, name: 'Corte 2', weight: 30, order: 2 },
    { id: C3, name: 'Corte 3', weight: 40, order: 3 },
  ],
  corteScores: {
    [C1]: 4.3,
    [C2]: 2.8,
    [C3]: null,
  },
  activities: [
    // ── Corte 1: cerrado ──
    {
      id: 'a1', title: 'Moodboard y referentes visuales', type: 'document',
      maxScore: 5, weight: 20, corteId: C1,
      grade: { score: 4.5, maxScore: 5, feedback: 'Muy buena curaduría de referentes. Te faltó justificar la paleta.', gradedAt: '2026-08-14T10:00:00-05:00', publishedAt: '2026-08-15T08:00:00-05:00' },
    },
    {
      id: 'a2', title: 'Wireframes de baja fidelidad', type: 'exercise',
      maxScore: 5, weight: 30, corteId: C1,
      grade: { score: 4.0, maxScore: 5, gradedAt: '2026-08-21T10:00:00-05:00', publishedAt: '2026-08-22T08:00:00-05:00' },
    },
    {
      id: 'a3', title: 'Prototipo navegable en Figma con microinteracciones y estados de error', type: 'project',
      maxScore: 5, weight: 50, corteId: C1,
      grade: { score: 4.4, maxScore: 5, feedback: 'El flujo principal quedó muy sólido. Revisa los estados vacíos.', gradedAt: '2026-08-28T10:00:00-05:00', publishedAt: '2026-08-29T08:00:00-05:00' },
    },

    // ── Corte 2: a medias, con una reprobada ──
    {
      id: 'a4', title: 'Sistema de diseño: tokens y componentes', type: 'project',
      maxScore: 5, weight: 40, corteId: C2,
      grade: { score: 2.8, maxScore: 5, feedback: 'Los tokens de color no tienen contraste suficiente en modo oscuro. Reenvía corrigiendo AA.', gradedAt: '2026-09-04T10:00:00-05:00', publishedAt: '2026-09-05T08:00:00-05:00' },
    },
    {
      id: 'a5', title: 'Parcial: heurísticas de Nielsen', type: 'quiz',
      maxScore: 100, weight: 20, corteId: C2,
      grade: { score: 78, maxScore: 100, gradedAt: '2026-09-08T10:00:00-05:00', publishedAt: '2026-09-08T14:00:00-05:00' },
    },
    {
      id: 'a6', title: 'Pruebas de usabilidad con 5 usuarios', type: 'document',
      maxScore: 5, weight: 40, corteId: C2,
      grade: null, // entregada, aún sin publicar
    },

    // ── Corte 3: sin empezar ──
    {
      id: 'a7', title: 'Entrega final: producto interactivo', type: 'project',
      maxScore: 5, weight: 70, corteId: C3,
      grade: null,
    },
    {
      id: 'a8', title: 'Sustentación', type: 'presentation',
      maxScore: 5, weight: 30, corteId: C3,
      grade: null,
    },
  ],
  finalScore: 3.6,
  isPartial: true,
  isApproved: true,
};

/** Variante: estudiante que apenas arranca, sin ninguna nota publicada. */
export const MOCK_EMPTY: StudentGradeSummary = {
  ...MOCK_GRADES,
  corteScores: { [C1]: null, [C2]: null, [C3]: null },
  activities: MOCK_GRADES.activities.map((a) => ({ ...a, grade: null })),
  finalScore: null,
  isPartial: true,
  isApproved: null,
};
