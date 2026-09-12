'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { formatDateTimeColombia as formatDate } from '@/lib/dateUtils';
import Badge from '@/components/ui/Badge';
import { Inbox, Search as SearchIcon, GitBranch, Palette, Link as LinkIcon, Paperclip } from 'lucide-react';
import SearchInput from '@/components/ui/SearchInput';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Chip from '@/components/ui/Chip';
import Table from '@/components/ui/Table';
import { Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import SubmissionDetail from '@/components/submissions/SubmissionDetail';
import { SUBMISSION_STATUS_CONFIG } from '@/components/submissions/SubmissionCard';
import type { SubmissionWithDetails, Activity } from '@/lib/types';
import BackLink from '@/components/ui/BackLink';

type StatusFilter = 'all' | 'pending' | 'submitted' | 'reviewed' | 'returned' | 'resubmitted' | 'late';

/**
 * Admin — Submissions List Page
 * Table of all student submissions for an activity
 */
export default function AdminSubmissionsPage() {
  const params = useParams();
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
    if (statusFilter === 'pending') {
      // Lo que el docente tiene realmente en cola: entregadas y re-entregadas.
      result = result.filter((s) => s.status === 'submitted' || s.status === 'resubmitted');
    } else if (statusFilter === 'late') {
      result = result.filter((s) => s.isLate);
    } else if (statusFilter !== 'all') {
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
    // Copia antes de ordenar: sin filtros, `result` ES el array de estado y
    // sort() lo mutaba en el sitio.
    return [...result].sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt));
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
    pending: submissions.filter((s) => s.status === 'submitted' || s.status === 'resubmitted').length,
  }), [submissions]);

    if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-32" />)}
        </div>
        <SkeletonList rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <BackLink href={`/admin/courses/${courseId}/activities/${actId}`}>Volver a la actividad</BackLink>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Entregas</h1>
        {activity && (
          <p className="text-sm text-subtle mt-1">{activity.title}</p>
        )}
      </div>

      {/*
        Los contadores ahora filtran. Antes eran seis tarjetas informativas y
        el filtro de verdad estaba escondido en un desplegable aparte: se veía
        "Devueltas 3", se hacía clic y no pasaba nada.

        "Por calificar" va primero y en cian porque es la cola de trabajo real
        del docente; antes ni siquiera existía como concepto, había que sumar
        entregadas más re-entregadas a ojo.
      */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')} dot="bg-cyan-500">
            Por calificar ({stats.pending})
          </Chip>
          <Chip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
            Todas ({stats.total})
          </Chip>
          <Chip active={statusFilter === 'reviewed'} onClick={() => setStatusFilter('reviewed')} dot="bg-emerald-500">
            Calificadas ({stats.reviewed})
          </Chip>
          {stats.returned > 0 && (
            <Chip active={statusFilter === 'returned'} onClick={() => setStatusFilter('returned')} dot="bg-amber-500">
              Devueltas ({stats.returned})
            </Chip>
          )}
          {stats.late > 0 && (
            <Chip active={statusFilter === 'late'} onClick={() => setStatusFilter('late')} dot="bg-red-500">
              Tardías ({stats.late})
            </Chip>
          )}
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar estudiante..."
          className="w-full sm:w-64 sm:ml-auto"
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
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-micro font-bold text-muted shrink-0">
                            {sub.student.firstName[0]}{sub.student.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm text-foreground/80">{sub.student.firstName} {sub.student.lastName}</p>
                            <p className="text-meta text-subtle">{sub.student.email}</p>
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
                           hover:border-foreground/15 hover:bg-foreground/[0.06] transition-colors duration-[var(--dur-fast)]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-micro font-bold text-muted">
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


const LINK_ICONS: Record<string, React.ReactNode> = {
  github: <GitBranch className="w-3.5 h-3.5" />,
  vercel: <span>▲</span>,
  figma: <Palette className="w-3.5 h-3.5" />,
  other: <LinkIcon className="w-3.5 h-3.5" />,
};
