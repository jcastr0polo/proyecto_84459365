'use client';

import React, { useState } from 'react';
import StudentCourseView from '@/components/student/StudentCourseView';
import { MOCK_COURSES } from '../student-dashboard/mockData';
import { MOCK_GRADES } from '../student-grades/mockData';
import type { Submission } from '@/lib/types';

/** Taller de diseño — vista de curso. Datos falsos, solo desarrollo. */
export default function PrototypeCoursePage() {
  const [version, setVersion] = useState<'actual' | 'v2'>('v2');
  const cd = MOCK_COURSES[0];
  const submissions: Record<string, Submission> = Object.fromEntries(
    cd.submissions.map((s) => [s.activityId, s])
  );

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-50 border-b border-surface-border bg-background/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
          <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">
            Taller de diseño · datos falsos
          </span>
          <div className="flex items-center gap-1 ml-auto">
            {(['actual', 'v2'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVersion(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer active:scale-[0.97]
                  ${version === v
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
                    : 'text-subtle hover:text-foreground border border-transparent'}`}
              >
                {v === 'actual' ? 'Actual' : 'Rediseño'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-8">
        {version === 'actual' ? (
          <StudentCourseView
            course={cd.course}
            activities={cd.activities}
            submissions={submissions}
            gradeData={MOCK_GRADES}
          />
        ) : (
          <StudentCourseView
            course={cd.course}
            activities={cd.activities}
            submissions={submissions}
            gradeData={MOCK_GRADES}
          />
        )}
      </div>
    </div>
  );
}
