'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Table from '@/components/ui/Table';
import { Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import SubmissionDetail from '@/components/submissions/SubmissionDetail';
import { SUBMISSION_STATUS_CONFIG } from '@/components/submissions/SubmissionCard';
import type { SubmissionWithDetails, Activity } from '@/lib/types';

type StatusFilter = 'all' | 'submitted' | 'reviewed' | 'returned' | 'resubmitted';

/**
 * Admin — Submissions List Page
 * Table of all student submissions for an activity
 */
export default function AdminSubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;
  const actId = params.actId as string;

  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([]);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [returnLoading, setReturnLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [subRes, actRes] = await Promise.all([
        fetch(`/api/activities/${actId}/submissions`),
        fetch(`/api/activities/${actId}`),
      ]);

      if (subRes.ok) {
        const data = await subRes.json();
        setSubmissions(data.submissions ?? []);
        if (data.activity) {
          setActivity({ ...data.activity } as Activity);
        }
      }
      if (actRes.ok) {
        const data = await actRes.json();
        setActivity(data.activity);
      }
    } catch {
      toast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  }, [actId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    let result = submissions;
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }
    // Sort: latest first
    result.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return result;
  }, [submissions, statusFilter]);

  const selected = selectedId ? submissions.find((s) => s.id === selectedId) : null;

  async function handleReturn(submissionId: string) {
    setReturnLoading(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'return' }),
      });
      const data = await res.json();
      if (res.ok) {
        toast('Entrega devuelta al estudiante', 'success');
        setSelectedId(null);
        await fetchData();
      } else {
        toast(data.error || 'Error al devolver', 'error');
      }
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setReturnLoading(false);
    }
  }

  // Statistics
  const stats = useMemo(() => ({
    total: submissions.length,
    submitted: submissions.filter((s) => s.status === 'submitted').length,
    reviewed: submissions.filter((s) => s.status === 'reviewed').length,
    returned: submissions.filter((s) => s.status === 'returned').length,
    resubmitted: submissions.filter((s) => s.status === 'resubmitted').length,
    late: submissions.filter((s) => s.isLate).length,
  }), [submissions]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push(`/admin/courses/${courseId}/activities/${actId}`)}
        className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver a la actividad
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Entregas</h1>
        {activity && (
          <p className="text-sm text-white/40 mt-1">{activity.title}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <StatCard label="Total" value={stats.total} color="text-white/70" />
        <StatCard label="Entregadas" value={stats.submitted} color="text-emerald-400" />
        <StatCard label="Calificadas" value={stats.reviewed} color="text-cyan-400" />
        <StatCard label="Devueltas" value={stats.returned} color="text-amber-400" />
        <StatCard label="Re-entregadas" value={stats.resubmitted} color="text-purple-400" />
        <StatCard label="Tardías" value={stats.late} color="text-red-400" />
      </div>

      {/* Filter */}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        aria-label="Filtrar por estado"
        className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white
                   outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
      >
        <option value="all">Todos los estados</option>
        <option value="submitted">Entregadas</option>
        <option value="reviewed">Calificadas</option>
        <option value="returned">Devueltas</option>
        <option value="resubmitted">Re-entregadas</option>
      </select>

      {/* Table */}
      {submissions.length === 0 ? (
        <EmptyState
          icon={<span>📭</span>}
          title="Sin entregas"
          description="Ningún estudiante ha enviado una entrega aún."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<span>🔍</span>}
          title="Sin resultados"
          description="No hay entregas con ese estado."
          action={<Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>Limpiar filtro</Button>}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <Thead>
                <Tr>
                  <Th>Estudiante</Th>
                  <Th>Fecha</Th>
                  <Th>Estado</Th>
                  <Th>Versión</Th>
                  <Th>Archivos</Th>
                  <Th>Enlaces</Th>
                  <Th>Acciones</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filtered.map((sub) => {
                  const statusCfg = SUBMISSION_STATUS_CONFIG[sub.status];
                  return (
                    <Tr key={sub.id}>
                      <Td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-[10px] font-bold text-white/70 shrink-0">
                            {sub.student.firstName[0]}{sub.student.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm text-white/80">{sub.student.firstName} {sub.student.lastName}</p>
                            <p className="text-[11px] text-white/30">{sub.student.email}</p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <span className="text-sm text-white/60">{formatDate(sub.submittedAt)}</span>
                        {sub.isLate && <Badge variant="danger" size="sm" className="ml-1.5">Tardía</Badge>}
                      </Td>
                      <Td>
                        <Badge variant={statusCfg.variant} size="sm" dot>{statusCfg.label}</Badge>
                      </Td>
                      <Td>
                        <span className="text-sm text-white/50 font-mono">v{sub.version}</span>
                      </Td>
                      <Td>
                        <span className="text-sm text-white/50">{sub.attachments.length || '—'}</span>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1">
                          {sub.links.map((link, i) => (
                            <a
                              key={i}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 text-sm"
                              title={link.label || link.url}
                            >
                              {LINK_ICONS[link.type] ?? '🔗'}
                            </a>
                          ))}
                          {sub.links.length === 0 && <span className="text-sm text-white/30">—</span>}
                        </div>
                      </Td>
                      <Td>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedId(sub.id)}>
                          Ver
                        </Button>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((sub) => {
              const statusCfg = SUBMISSION_STATUS_CONFIG[sub.status];
              return (
                <div
                  key={sub.id}
                  onClick={() => setSelectedId(sub.id)}
                  className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.03] cursor-pointer
                           hover:border-white/15 hover:bg-white/[0.06] transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-[10px] font-bold text-white/70">
                        {sub.student.firstName[0]}{sub.student.lastName[0]}
                      </div>
                      <p className="text-sm text-white/80">{sub.student.firstName} {sub.student.lastName}</p>
                    </div>
                    <Badge variant={statusCfg.variant} size="sm" dot>{statusCfg.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span>{formatDate(sub.submittedAt)}</span>
                    <span className="font-mono">v{sub.version}</span>
                    {sub.isLate && <Badge variant="danger" size="sm">Tardía</Badge>}
                    {sub.attachments.length > 0 && <span>📎{sub.attachments.length}</span>}
                    {sub.links.length > 0 && <span>🔗{sub.links.length}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title="Detalle de Entrega"
        maxWidth="lg"
      >
        {selected && (
          <SubmissionDetail
            submission={selected}
            isAdmin
            onReturn={() => handleReturn(selected.id)}
            returnLoading={returnLoading}
          />
        )}
      </Modal>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-white/40">{label}</p>
    </div>
  );
}

const LINK_ICONS: Record<string, string> = {
  github: '🐙',
  vercel: '▲',
  figma: '🎨',
  other: '🔗',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-CO', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}
