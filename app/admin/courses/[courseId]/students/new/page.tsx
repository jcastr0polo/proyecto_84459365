'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { CheckCircle2, Info } from 'lucide-react';
import Card from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import EnrollForm from '@/components/students/EnrollForm';
import type { EnrollFormData } from '@/components/students/EnrollForm';
import SearchInput from '@/components/ui/SearchInput';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import type { Course, SafeUser } from '@/lib/types';

export default function NewStudentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Dos formas de inscribir. Antes solo existía la de crear: para meter a un
  // estudiante de un semestre anterior había que reteclear todos sus datos, y
  // si el correo no coincidía exacto se creaba un duplicado.
  const [mode, setMode] = useState<'buscar' | 'crear'>('buscar');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SafeUser[]>([]);
  const [searching, setSearching] = useState(false);

  const [lastResult, setLastResult] = useState<{
    message: string;
    created: boolean;
    studentName: string;
  } | null>(null);

  /** `all=true` incluye a los de semestres cerrados, que es justo el caso. */
  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/students?all=true&search=${encodeURIComponent(q)}`);
      if (res.ok) setResults((await res.json()).students ?? []);
    } catch { /* sin resultados */ } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(search), 300);
    return () => clearTimeout(t);
  }, [search, runSearch]);

  const fetchCourse = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}`);
      if (res.ok) {
        const data = await res.json();
        setCourse(data.course);
      } else {
        toast('Curso no encontrado', 'error');
        router.push('/admin/courses');
      }
    } catch {
      toast('Error al cargar curso', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, toast, router]);

  useEffect(() => { fetchCourse(); }, [fetchCourse]);

  async function handleSubmit(data: EnrollFormData) {
    setSubmitting(true);
    setLastResult(null);

    try {
      const res = await fetch(`/api/courses/${courseId}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.code === 'ALREADY_ENROLLED') {
          toast(`${data.firstName} ya está inscrito en este curso`, 'info');
        } else {
          toast(result.error || 'Error al inscribir', 'error');
        }
        return;
      }

      const studentName = `${data.firstName} ${data.lastName}`;
      toast(result.message ?? `${studentName} inscrito exitosamente`, 'success');

      setLastResult({
        message: result.created
          ? `Se creó la cuenta de ${studentName} y se inscribió al curso.`
          : `${studentName} ya tenía cuenta. Se vinculó al curso.`,
        created: result.created,
        studentName,
      });
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back link */}
      <button
        onClick={() => router.push(`/admin/courses/${courseId}/students`)}
        className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-muted transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver a estudiantes
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Inscribir Estudiante
        </h1>
        {course && (
          <p className="text-sm text-subtle mt-1">
            {course.name} · <span className="font-mono">{course.code}</span>
          </p>
        )}
      </div>

      {/* Success result */}
      {lastResult && (
        <Card padding="md" className="border-emerald-500/20 bg-emerald-500/[0.04]">
          <p className="text-sm text-emerald-300 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {lastResult.message}
          </p>
          {!lastResult.created && (
            <p className="text-xs text-subtle mb-3 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              El usuario ya existía en el sistema. Solo se creó la inscripción al curso.
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setLastResult(null)}
            >
              Inscribir otro
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/admin/courses/${courseId}/students`)}
            >
              Volver a la lista
            </Button>
          </div>
        </Card>
      )}

      {!lastResult && (
        <>
          <div role="tablist" aria-label="Forma de inscribir"
            className="flex gap-1 p-1 rounded-lg bg-surface-sunken border border-surface-border w-fit">
            {([['buscar', 'Buscar existente'], ['crear', 'Crear nuevo']] as const).map(([k, label]) => (
              <button
                key={k}
                role="tab"
                aria-selected={mode === k}
                onClick={() => setMode(k)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border cursor-pointer
                  transition-colors duration-[var(--dur-fast)]
                  active:scale-[0.97] motion-reduce:active:scale-100
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40
                  ${mode === k
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                    : 'text-muted hover:text-foreground hover:bg-surface-hover border-transparent'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'buscar' ? (
            <div className="space-y-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Nombre, correo o documento del estudiante..."
                className="w-full"
              />
              {search.trim().length < 2 ? (
                <EmptyState compact kind="empty" title="Busca al estudiante"
                  description="Escribe su nombre, correo o documento. Aparecen también los de semestres anteriores." />
              ) : searching ? (
                <SkeletonList rows={3} />
              ) : results.length === 0 ? (
                <EmptyState compact kind="filtered" title="Sin resultados"
                  description={`Ningún estudiante coincide con "${search}". Si es nuevo, créalo en la otra pestaña.`}
                  action={<Button variant="ghost" size="sm" onClick={() => setMode('crear')}>Crear nuevo</Button>} />
              ) : (
                <div className="rounded-xl border border-surface-border divide-y divide-surface-border overflow-hidden">
                  {results.map((st) => (
                    <div key={st.id} className="flex items-center gap-3 p-3.5 bg-surface">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground/90 leading-snug">
                          {st.lastName}, {st.firstName}
                        </p>
                        <p className="text-meta text-subtle mt-0.5">
                          {st.email} · doc {st.documentNumber}
                          {!st.isActive && <span className="text-subtle"> · cuenta inactiva</span>}
                        </p>
                      </div>
                      <Button
                        variant="secondary" size="sm"
                        disabled={submitting}
                        onClick={() => handleSubmit({
                          firstName: st.firstName, lastName: st.lastName,
                          email: st.email, documentNumber: st.documentNumber, phone: st.phone ?? '',
                        })}
                      >
                        Inscribir
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Card padding="lg">
              <EnrollForm onSubmit={handleSubmit} loading={submitting} />
            </Card>
          )}
        </>
      )}

      {/* Help text */}
      <p className="text-xs text-faint leading-relaxed">
        Al inscribir un estudiante, se crea automáticamente su cuenta con la contraseña igual
        al número de documento. El estudiante deberá cambiarla en su primer inicio de sesión.
      </p>
    </div>
  );
}
