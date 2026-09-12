'use client';

import React from 'react';
import CourseOverviewTab from '@/components/admin/CourseOverviewTab';
import { MOCK_COURSES, MOCK_SEMESTER } from '../student-dashboard/mockData';

/** Taller — panel del curso con drilldown. Datos falsos. */
export default function PrototypeCourseOverview() {
  return (
    <div className="px-4 py-8 max-w-5xl mx-auto space-y-4">
      <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">
        Taller de diseño · datos falsos
      </span>
      <CourseOverviewTab course={MOCK_COURSES[0].course} semester={MOCK_SEMESTER} />
    </div>
  );
}
