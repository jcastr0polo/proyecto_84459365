'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import QuestionEditor, { type QuestionData } from './QuestionEditor';
import QuestionImporter from './QuestionImporter';
import { Plus, Trash2, Upload } from 'lucide-react';

interface QuizFormProps {
  onSubmit: (data: Record<string, unknown>) => void;
  loading?: boolean;
  initial?: {
    title: string;
    description?: string;
    type: 'training' | 'graded';
    resultVisibility: 'immediate' | 'after_all' | 'manual';
    timeLimit?: number | null;
    lockBrowser: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    maxAttempts: number;
    startDate?: string;
    endDate?: string;
    questions: QuestionData[];
  };
}

export default function QuizForm({ onSubmit, loading, initial }: QuizFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [type, setType] = useState<'training' | 'graded'>(initial?.type ?? 'graded');
  const [resultVisibility, setResultVisibility] = useState<'immediate' | 'after_all' | 'manual'>(initial?.resultVisibility ?? 'manual');
  const [useTimer, setUseTimer] = useState(!!initial?.timeLimit);
  const [timeLimit, setTimeLimit] = useState(initial?.timeLimit ?? 30);
  const [lockBrowser, setLockBrowser] = useState(initial?.lockBrowser ?? true);
  const [shuffleQuestions, setShuffleQuestions] = useState(initial?.shuffleQuestions ?? false);
  const [shuffleOptions, setShuffleOptions] = useState(initial?.shuffleOptions ?? false);
  const [maxAttempts, setMaxAttempts] = useState(initial?.maxAttempts ?? 1);
  const [startDate, setStartDate] = useState(initial?.startDate ?? '');
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [questions, setQuestions] = useState<QuestionData[]>(
    initial?.questions ?? [{ text: '', type: 'single', points: 1, options: [{ text: '', weight: 100 }, { text: '', weight: 0 }] }]
  );
  const [showImporter, setShowImporter] = useState(false);

  function addQuestion() {
    setQuestions([...questions, { text: '', type: 'single', points: 1, options: [{ text: '', weight: 100 }, { text: '', weight: 0 }] }]);
  }

  function updateQuestion(index: number, q: QuestionData) {
    const updated = [...questions];
    updated[index] = q;
    setQuestions(updated);
  }

  function removeQuestion(index: number) {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      resultVisibility,
      timeLimit: useTimer ? timeLimit : null,
      lockBrowser,
      shuffleQuestions,
      shuffleOptions,
      maxAttempts,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      questions: questions.map((q) => ({
        text: q.text.trim(),
        type: q.type,
        points: q.points,
        options: q.options.map((o) => ({ text: o.text.trim(), weight: o.weight })),
      })),
    });
  }

  const totalPoints = questions.reduce((s, q) => s + q.points, 0);
  const isValid = title.trim().length > 0 && questions.length > 0 &&
    questions.every((q) => q.text.trim().length > 0 && q.options.length >= 2 && q.options.every((o) => o.text.trim().length > 0));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted mb-1.5 block">Título *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Parcial 1 — Fundamentos"
            required
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground placeholder:text-faint outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted mb-1.5 block">Descripción / Instrucciones</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Instrucciones para el estudiante..."
            rows={3}
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground placeholder:text-faint outline-none focus:border-cyan-500/50 resize-y"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted mb-1.5 block">Tipo *</label>
          <select
            value={type}
            onChange={(e) => {
              const t = e.target.value as 'training' | 'graded';
              setType(t);
              if (t === 'training') {
                setResultVisibility('immediate');
                setMaxAttempts(0);
              } else {
                setResultVisibility('manual');
                setMaxAttempts(1);
              }
            }}
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
          >
            <option value="graded">Calificable</option>
            <option value="training">Entrenamiento</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted mb-1.5 block">Visibilidad de resultados</label>
          <select
            value={resultVisibility}
            onChange={(e) => setResultVisibility(e.target.value as 'immediate' | 'after_all' | 'manual')}
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
          >
            <option value="immediate">Inmediato al terminar</option>
            <option value="after_all">Cuando todos terminen</option>
            <option value="manual">Yo decido cuándo</option>
          </select>
        </div>
      </div>

      {/* Settings */}
      <div className="border-t border-foreground/[0.06] pt-5">
        <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-4">Configuración</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Timer toggle */}
          <div className="sm:col-span-2 flex items-center gap-3 p-3 rounded-lg bg-foreground/[0.02] border border-foreground/[0.06]">
            <label className="flex items-center gap-2 cursor-pointer flex-1">
              <input
                type="checkbox"
                checked={useTimer}
                onChange={(e) => setUseTimer(e.target.checked)}
                className="w-4 h-4 rounded accent-cyan-500"
              />
              <span className="text-sm text-muted">Cronómetro</span>
            </label>
            {useTimer && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  className="w-20 px-2 py-1.5 text-sm rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground outline-none focus:border-cyan-500/50 text-center"
                />
                <span className="text-xs text-subtle">minutos</span>
              </div>
            )}
          </div>

          {/* Anti-cheat */}
          <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg bg-foreground/[0.02] border border-foreground/[0.06]">
            <input
              type="checkbox"
              checked={lockBrowser}
              onChange={(e) => setLockBrowser(e.target.checked)}
              className="w-4 h-4 rounded accent-cyan-500"
            />
            <span className="text-sm text-muted">Anti-trampas (enviar si pierde foco)</span>
          </label>

          {/* Shuffle */}
          <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg bg-foreground/[0.02] border border-foreground/[0.06]">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="w-4 h-4 rounded accent-cyan-500"
            />
            <span className="text-sm text-muted">Mezclar preguntas</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg bg-foreground/[0.02] border border-foreground/[0.06]">
            <input
              type="checkbox"
              checked={shuffleOptions}
              onChange={(e) => setShuffleOptions(e.target.checked)}
              className="w-4 h-4 rounded accent-cyan-500"
            />
            <span className="text-sm text-muted">Mezclar opciones</span>
          </label>

          {/* Max attempts */}
          <div className="p-3 rounded-lg bg-foreground/[0.02] border border-foreground/[0.06]">
            <label className="text-xs font-medium text-muted mb-1.5 block">Intentos máximos (0 = ilimitado)</label>
            <input
              type="number"
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Math.max(0, parseInt(e.target.value) || 0))}
              min={0}
              className="w-full px-2 py-1.5 text-sm rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Dates */}
          <div>
            <label className="text-xs font-medium text-muted mb-1.5 block">Disponible desde</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2 py-2.5 text-sm rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground outline-none focus:border-cyan-500/50"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted mb-1.5 block">Disponible hasta</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2 py-2.5 text-sm rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="border-t border-foreground/[0.06] pt-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider">
            Preguntas ({questions.length}) · {totalPoints} pts
          </h3>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowImporter(!showImporter)}>
              <Upload className="w-4 h-4 mr-1" /> Importar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={addQuestion}>
              <Plus className="w-4 h-4 mr-1" /> Agregar
            </Button>
          </div>
        </div>

        {showImporter && (
          <div className="mb-4 p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.03]">
            <QuestionImporter
              onImport={(imported) => {
                setQuestions((prev) => {
                  // If only the default empty question exists, replace it
                  const isEmpty = prev.length === 1 && !prev[0].text.trim();
                  return isEmpty ? imported : [...prev, ...imported];
                });
                setShowImporter(false);
              }}
              onClose={() => setShowImporter(false)}
            />
          </div>
        )}

        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={idx} className="relative">
              <QuestionEditor
                question={q}
                index={idx}
                onChange={(updated) => updateQuestion(idx, updated)}
              />
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(idx)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Eliminar pregunta"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="border-t border-foreground/[0.06] pt-5 flex items-center justify-between sticky bottom-0 bg-[var(--background)] py-4 -mx-6 px-6 z-10">
        <p className="text-xs text-subtle">{questions.length} preguntas · {totalPoints} puntos</p>
        <Button type="submit" variant="primary" disabled={!isValid || loading}>
          {loading ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear parcial'}
        </Button>
      </div>
    </form>
  );
}
