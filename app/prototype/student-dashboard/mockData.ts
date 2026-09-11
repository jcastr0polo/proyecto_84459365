import type { Course, Enrollment, Activity, Submission, Grade, Semester } from '@/lib/types';
import type { ActiveQuiz } from '@/components/student/StudentDashboardView';
import type { CourseWithMeta, UserInfo } from '@/components/student/StudentDashboardView';

/**
 * Datos de prueba del panel del estudiante — NO tocan la base de datos.
 *
 * Modela el periodo activo 202602 con dos cursos, e incluye a propósito los
 * casos que hacen sufrir al diseño: una actividad vencida, una que vence hoy,
 * otra tranquila, notas de distinto rango y un título largo.
 */

const NOW = new Date('2026-09-10T09:00:00-05:00');
const day = (offset: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const ts = (offset: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + offset);
  return d.toISOString();
};

export const MOCK_USER: UserInfo = {
  id: 'student-demo', firstName: 'Valentina', lastName: 'Restrepo Ochoa',
  email: 'valentina.restrepo@ejemplo.edu.co', role: 'student',
};

export const MOCK_SEMESTER: Semester = {
  id: '202602', label: '2026-2', startDate: '2026-08-03', endDate: '2026-11-28',
  isActive: true, createdAt: ts(-40),
};

function course(id: string, code: string, name: string, category: Course['category'], schedule: Course['schedule']): Course {
  return {
    id, code, name, category, schedule,
    description: '', semesterId: '202602', isActive: true,
    createdAt: ts(-40), updatedAt: ts(-40),
  };
}

function activity(id: string, courseId: string, title: string, type: Activity['type'], dueOffset: number, weight = 20): Activity {
  return {
    id, courseId, title, type, weight,
    description: '', category: 'individual', attachments: [],
    dueDate: day(dueOffset), publishDate: day(-20), maxScore: 5,
    allowLateSubmission: true, status: 'published',
    requiresFileUpload: false, requiresLinkSubmission: false,
    createdAt: ts(-20), updatedAt: ts(-20),
  };
}

function submission(activityId: string, courseId: string, offset: number): Submission {
  return {
    id: `sub-${activityId}`, activityId, courseId, studentId: 'student-demo',
    attachments: [], links: [], submittedAt: ts(offset), isLate: false,
    status: 'submitted', version: 1, createdAt: ts(offset), updatedAt: ts(offset),
  };
}

function grade(activityId: string, courseId: string, score: number, offset: number): Grade {
  return {
    id: `grade-${activityId}`, submissionId: `sub-${activityId}`, activityId, courseId,
    studentId: 'student-demo', score, maxScore: 5, isPublished: true,
    gradedBy: 'admin-1', gradedAt: ts(offset), updatedAt: ts(offset),
  };
}

const enrollment = (courseId: string): Enrollment => ({
  id: `enr-${courseId}`, courseId, studentId: 'student-demo',
  status: 'active', enrolledAt: ts(-38), enrolledBy: 'admin-1',
});

const tdi = course('course-tdi-202602', 'TDI-202602', 'Taller de Diseño Interactivo', 'design',
  [{ dayOfWeek: 'martes', startTime: '08:00', endTime: '10:00', modality: 'presencial' }]);
const log = course('course-log-202602', 'LOG-202602', 'Lógica y Programación', 'programming',
  [{ dayOfWeek: 'lunes', startTime: '06:00', endTime: '08:00', modality: 'presencial' }]);

export const MOCK_COURSES: CourseWithMeta[] = [
  {
    course: tdi,
    enrollment: enrollment(tdi.id),
    activities: [
      activity('a1', tdi.id, 'Moodboard y referentes visuales', 'document', -22),
      activity('a4', tdi.id, 'Sistema de diseño: tokens y componentes', 'project', -5, 40),
      activity('a6', tdi.id, 'Pruebas de usabilidad con 5 usuarios', 'document', -2, 40),  // vencida
      activity('a7', tdi.id, 'Entrega final: producto interactivo con documentación de proceso', 'project', 21, 70),
    ],
    submissions: [submission('a1', tdi.id, -23), submission('a4', tdi.id, -6)],
    grades: [grade('a1', tdi.id, 4.5, -21), grade('a4', tdi.id, 2.8, -4)],
    finalScore: 3.4,
  },
  {
    course: log,
    enrollment: enrollment(log.id),
    activities: [
      activity('b1', log.id, 'Ejercicios de condicionales', 'exercise', -14),
      activity('b2', log.id, 'Taller de arreglos', 'exercise', 0),   // vence hoy
      activity('b3', log.id, 'Proyecto: API en Next.js', 'project', 9, 50),
    ],
    submissions: [submission('b1', log.id, -15)],
    grades: [grade('b1', log.id, 3.9, -13)],
    finalScore: 3.9,
  },
];

/** Variante: estudiante recién inscrito, nada entregado ni calificado. */
export const MOCK_COURSES_EMPTY: CourseWithMeta[] = MOCK_COURSES.map((c) => ({
  ...c, submissions: [], grades: [], finalScore: null,
}));

/** Un parcial abierto, para revisar esa sección del panel. */
export const MOCK_QUIZZES: ActiveQuiz[] = [{
  quiz: {
    id: 'quiz-1', courseId: log.id, title: 'Parcial 2: estructuras de control',
    type: 'graded' as const, resultVisibility: 'manual' as const,
    resultsReleased: false, questions: new Array(15).fill(null).map((_, i) => ({
      id: `q${i}`, type: 'single' as const, text: '', options: [], correctOptionIds: [], points: 1, order: i + 1,
    })),
    shuffleQuestions: true, shuffleOptions: true, maxAttempts: 1,
    lockBrowser: true, isActive: true, timeLimit: 45,
    endDate: day(3), weight: 20, maxScore: 5,
    createdAt: ts(-5), updatedAt: ts(-5),
  },
  courseName: log.name,
  courseId: log.id,
}];
