/**
 * GET /api/activities/[id]/grades — List all grades for an activity
 *
 * Reads fresh from Blob to avoid stale cache.
 * Returns grades with gradeId, submissionId, studentId, score, feedback, isPublished.
 * Auth: admin only
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { readGradesFresh } from '@/lib/dataService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withAuth(request, async () => {
    try {
      const { id: activityId } = await params;

      // Read fresh from Blob — no stale cache
      const allGrades = await readGradesFresh();
      const activityGrades = allGrades
        .filter((g) => g.activityId === activityId)
        .map((g) => ({
          id: g.id,
          submissionId: g.submissionId,
          studentId: g.studentId,
          score: g.score,
          maxScore: g.maxScore,
          feedback: g.feedback ?? '',
          isPublished: g.isPublished,
          gradedAt: g.gradedAt,
        }));

      return NextResponse.json({ grades: activityGrades });
    } catch (error) {
      console.error('Error en GET /api/activities/[id]/grades:', error);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }, 'admin');
}
