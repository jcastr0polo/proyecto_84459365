'use client';

import React, { useMemo } from 'react';
import SubmissionStatus from '@/components/student/SubmissionStatus';
import { nowColombia } from '@/lib/dateUtils';
import { startOfTodayColombia } from '@/lib/activityStatus';
import { MOCK_COURSES } from '../student-dashboard/mockData';
import type { Activity, Submission } from '@/lib/types';

/** Taller de diseño — los siete estados de una entrega. Datos falsos. */
export default function PrototypeSubmissionStates() {
  const today = useMemo(() => startOfTodayColombia(nowColombia()), []);
  const base = MOCK_COURSES[0].activities[3]; // vence en 3 semanas
  const overdue = MOCK_COURSES[0].activities[2]; // vencida

  const sub = (status: Submission['status'], isLate = false): Submission => ({
    id: 's1', activityId: base.id, courseId: base.courseId, studentId: 'student-demo',
    attachments: [], links: [], submittedAt: new Date('2026-09-05T10:00:00-05:00').toISOString(),
    isLate, status, version: isLate ? 2 : 1,
    createdAt: new Date('2026-09-05T10:00:00-05:00').toISOString(),
    updatedAt: new Date('2026-09-06T14:30:00-05:00').toISOString(),
  });

  const closed: Activity = { ...base, status: 'closed' };

  const cases: [string, Activity, Submission | null, boolean][] = [
    ['Devuelta por el profesor', base, sub('returned'), false],
    ['Sin entregar, con plazo', base, null, false],
    ['Sin entregar, vencida pero acepta tardías', { ...overdue, allowLateSubmission: true, latePenaltyPercent: 20 }, null, true],
    ['Sin entregar, vencida sin tardías', { ...overdue, allowLateSubmission: false }, null, true],
    ['Entregada', base, sub('submitted'), false],
    ['Calificada', base, sub('reviewed'), false],
    ['Cerrada sin entrega', closed, null, true],
  ];

  return (
    <div className="px-4 py-8 max-w-3xl mx-auto space-y-8">
      <div>
        <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">
          Taller de diseño · datos falsos
        </span>
        <h1 className="text-2xl font-bold text-foreground mt-1" style={{ fontFamily: 'var(--font-playfair)' }}>
          Estados de una entrega
        </h1>
      </div>
      {cases.map(([label, activity, submission, isPastDue]) => (
        <div key={label}>
          <p className="text-meta uppercase tracking-wider text-faint mb-2">{label}</p>
          <SubmissionStatus
            activity={activity}
            submission={submission}
            isPastDue={isPastDue}
            courseId={activity.courseId}
            actId={activity.id}
            today={today}
          />
        </div>
      ))}
    </div>
  );
}
