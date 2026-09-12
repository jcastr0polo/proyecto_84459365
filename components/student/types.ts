import type { Course, Enrollment, Activity, Submission, Grade, Quiz } from '@/lib/types';

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
  grades: Grade[];
  /**
   * Nota del curso tal como la calcula el servidor, que incluye parciales y
   * notas manuales. Recalcularla en el cliente daba un número distinto al de
   * la vista de notas.
   */
  finalScore?: number | null;
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
