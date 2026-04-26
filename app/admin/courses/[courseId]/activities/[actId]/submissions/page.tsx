'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDateTimeColombia as formatDate } from '@/lib/dateUtils';
import Badge from '@/components/ui/Badge';
import { Inbox, Search as SearchIcon, GitBranch, Palette, Link as LinkIcon, Paperclip } from 'lucide-react';
import SearchInput from '@/components/ui/SearchInput';
import Pagination, { usePagination } from '@/components/ui/Pagination';
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
  const [search, setSearch] = useState('');
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
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) =>
        s.student.firstName.toLowerCase().includes(q) ||
        s.student.lastName.toLowerCase().includes(q) ||
        s.student.email.toLowerCase().includes(q)
      );
    }
    // Sort: latest first
    result.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return result;
  }, [submissions, statusFilter, search]);

  const selected = selectedId ? submissions.find((s) => s.id === selectedId) : null;
  const { page, setPage, totalPages, paginated, totalItems, pageSize } = usePagination(filtered, 10);

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
        className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-muted transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver a la actividad
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Entregas</h1>
        {activity && (
          <p className="text-sm text-subtle mt-1">{activity.title}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <StatCard label="Total" value={stats.total} color="text-muted" />
        <StatCard label="Entregadas" value={stats.submitted} color="text-emerald-400" />
        <StatCard label="Calificadas" value={stats.reviewed} color="text-cyan-400" />
        <StatCard label="Devueltas" value={stats.returned} color="text-amber-400" />
        <StatCard label="Re-entregadas" value={stats.resubmitted} color="text-purple-400" />
        <StatCard label="Tardías" value={stats.late} color="text-red-400" />
      </div>

      {/* Filter + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          aria-label="Filtrar por estado"
          className="px-3 py-2 rounded-lg border border-foreground/10 bg-foreground/[0.04] text-sm text-foreground
                     outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
        >
          <option value="all">Todos los estados</option>
          <option value="submitted">Entregadas</option>
          <option value="reviewed">Calificadas</option>
          <option value="returned">Devueltas</option>
          <option value="resubmitted">Re-entregadas</option>
        </select>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar estudiante..."
          className="w-full sm:w-64"
        />
      </div>

      {/* Table */}
      {submissions.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-6 h-6 text-subtle" />}
          title="Sin entregas"
          description="Ningún estudiante ha enviado una entrega aún."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="w-6 h-6 text-subtle" />}
          title="Sin resultados"
          description="No hay entregas con ese filtro."
          action={<Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setSearch(''); }}>Limpiar filtros</Button>}
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
                {paginated.map((sub) => {
                  const statusCfg = SUBMISSION_STATUS_CONFIG[sub.status];
                  return (
                    <Tr key={sub.id}>
                      <Td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-[10px] font-bold text-muted shrink-0">
                            {sub.student.firstName[0]}{sub.student.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm text-foreground/80">{sub.student.firstName} {sub.student.lastName}</p>
                            <p className="text-[11px] text-subtle">{sub.student.email}</p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <span className="text-sm text-muted">{formatDate(sub.submittedAt)}</span>
                        {sub.isLate && <Badge variant="danger" size="sm" className="ml-1.5">Tardía</Badge>}
                      </Td>
                      <Td>
                        <Badge variant={statusCfg.variant} size="sm" dot>{statusCfg.label}</Badge>
                      </Td>
                      <Td>
                        <span className="text-sm text-muted font-mono">v{sub.version}</span>
                      </Td>
                      <Td>
                        <span className="text-sm text-muted">{sub.attachments.length || '—'}</span>
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
                              {LINK_ICONS[link.type] ?? <LinkIcon className="w-3.5 h-3.5" />}
                            </a>
                          ))}
                          {sub.links.length === 0 && <span className="text-sm text-subtle">—</span>}
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
            {paginated.map((sub) => {
              const statusCfg = SUBMISSION_STATUS_CONFIG[sub.status];
              return (
                <div
                  key={sub.id}
                  onClick={() => setSelectedId(sub.id)}
                  className="p-4 rounded-xl border border-foreground/[0.08] bg-foreground/[0.03] cursor-pointer
                           hover:border-foreground/15 hover:bg-foreground/[0.06] transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-[10px] font-bold text-muted">
                        {sub.student.firstName[0]}{sub.student.lastName[0]}
                      </div>
                      <p className="text-sm text-foreground/80">{sub.student.firstName} {sub.student.lastName}</p>
                    </div>
                    <Badge variant={statusCfg.variant} size="sm" dot>{statusCfg.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-subtle">
                    <span>{formatDate(sub.submittedAt)}</span>
                    <span className="font-mono">v{sub.version}</span>
                    {sub.isLate && <Badge variant="danger" size="sm">Tardía</Badge>}
                    {sub.attachments.length > 0 && <span className="flex items-center gap-0.5"><Paperclip className="w-3 h-3" />{sub.attachments.length}</span>}
                    {sub.links.length > 0 && <span className="flex items-center gap-0.5"><LinkIcon className="w-3 h-3" />{sub.links.length}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalItems}
            pageSize={pageSize}
          />
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
    <div className="p-3 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-subtle">{label}</p>
    </div>
  );
}

const LINK_ICONS: Record<string, React.ReactNode> = {
  github: <GitBranch className="w-3.5 h-3.5" />,
  vercel: <span>▲</span>,
  figma: <Palette className="w-3.5 h-3.5" />,
  other: <LinkIcon className="w-3.5 h-3.5" />,
};
