/**
 * GET  /api/admin/audit — Ver log de auditoría
 * 
 * Query params: ?limit=50&action=login&entity=user
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { readAudit } from '@/lib/auditService';

export async function GET(request: Request): Promise<NextResponse> {
  return withAuth(request, async () => {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '100', 10);
    const action = searchParams.get('action');
    const entity = searchParams.get('entity');

    let entries = await readAudit();

    if (action) {
      entries = entries.filter((e) => e.action === action);
    }
    if (entity) {
      entries = entries.filter((e) => e.entity === entity);
    }

    entries = entries.slice(0, Math.min(limit, 500));

    return NextResponse.json({ entries, total: entries.length });
  }, 'admin');
}
