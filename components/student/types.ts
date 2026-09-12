import type { Course, Enrollment, Activity, Submission, Quiz } from '@/lib/types';

/**
 * Formas compartidas por las vistas del estudiante.
 *
 * Vivían dentro del componente del panel, así que la página tenía que
 * importar un componente que ya no renderiza solo para usar sus tipos.
 */

export interface CourseWithMeta {
  course: Course;
  enrollment: Enrollment;
  activities: Activity[];
  submissions: Submission[];
  /**
   * Las notas que el estudiante ya puede ver, de las tres fuentes: actividad,
   * parcial y nota manual. Las tres pesan en su definitiva, así que las tres
   * tienen que aparecer en su lista de notas.
   */
  grades: {
    id: string;
    title: string;
    kind: 'activity' | 'quiz' | 'manual';
    score: number;
    maxScore: number;
    gradedAt: string;
    isPublished: boolean;
  }[];
  /**
   * Nota del curso tal como la calcula el servidor, que incluye parciales y
   * notas manuales. Recalcularla en el cliente daba un número distinto al de
   * la vista de notas.
   */
  finalScore?: number | null;
  /**
   * Qué media necesita en lo que queda para llegar a 3.0, y cuánto peso del
   * curso falta por calificar. null si ya no queda nada por calificar o si el
   * curso no pondera por cortes.
   */
  needed?: { score: number; remainingWeight: number } | null;
}

export interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface ActiveQuiz {
  quiz: Quiz;
  courseName: string;
  courseId: string;
}
