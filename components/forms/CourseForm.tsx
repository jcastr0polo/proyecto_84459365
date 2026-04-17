'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import type { Course, CourseSchedule, Semester } from '@/lib/types';

interface CourseFormProps {
  course?: Course;
  semesters: Semester[];
  onSubmit: (data: CourseFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface CourseFormData {
  code: string;
  name: string;
  description: string;
  semesterId: string;
  category: Course['category'];
  schedule: CourseSchedule[];
}

const CATEGORIES: { value: Course['category']; label: string }[] = [
  { value: 'programming', label: 'Programación' },
  { value: 'design', label: 'Diseño' },
  { value: 'management', label: 'Gerencia' },
  { value: 'leadership', label: 'Liderazgo' },
  { value: 'other', label: 'Otro' },
];

const DAYS: CourseSchedule['dayOfWeek'][] = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MODALITIES: { value: CourseSchedule['modality']; label: string }[] = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'híbrido', label: 'Híbrido' },
];

const emptySlot: CourseSchedule = { dayOfWeek: 'lunes', startTime: '08:00', endTime: '10:00', room: '', modality: 'presencial' };

export default function CourseForm({ course, semesters, onSubmit, onCancel, loading = false }: CourseFormProps) {
  const isEdit = !!course;

  const [formData, setFormData] = useState<CourseFormData>({
    code: course?.code ?? '',
    name: course?.name ?? '',
    description: course?.description ?? '',
    semesterId: course?.semesterId ?? semesters.find((s) => s.isActive)?.id ?? '',
    category: course?.category ?? 'programming',
    schedule: course?.schedule ?? [{ ...emptySlot }],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!isEdit && !formData.code.trim()) e.code = 'El código es requerido';
    if (!formData.name.trim()) e.name = 'El nombre es requerido';
    if (!formData.description.trim()) e.description = 'La descripción es requerida';
    if (!formData.semesterId) e.semesterId = 'Seleccione un semestre';
    if (formData.schedule.length === 0) e.schedule = 'Al menos un horario es requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
  }

  function updateField(field: keyof CourseFormData, value: unknown) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  function updateSlot(idx: number, field: keyof CourseSchedule, value: string) {
    const newSchedule = [...formData.schedule];
    newSchedule[idx] = { ...newSchedule[idx], [field]: value };
    updateField('schedule', newSchedule);
  }

  function addSlot() {
    updateField('schedule', [...formData.schedule, { ...emptySlot }]);
  }

  function removeSlot(idx: number) {
    if (formData.schedule.length <= 1) return;
    updateField('schedule', formData.schedule.filter((_, i) => i !== idx));
  }

  const inputClass = (field: string) =>
    `w-full px-3 py-2 rounded-lg border bg-white/[0.04] text-white text-sm
     placeholder:text-white/30 outline-none transition-colors
     focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25
     ${errors[field] ? 'border-red-500/50' : 'border-white/10'}`;

  const selectClass = (field: string) =>
    `${inputClass(field)} appearance-none cursor-pointer`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Code + Name row */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="course-code" className="block text-xs font-medium text-white/60 mb-1.5">
            Código
          </label>
          <input
            id="course-code"
            type="text"
            placeholder="LOG-202601"
            value={formData.code}
            onChange={(e) => updateField('code', e.target.value)}
            disabled={isEdit}
            className={`${inputClass('code')} ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {errors.code && <p className="mt-1 text-xs text-red-400">{errors.code}</p>}
        </div>
        <div className="col-span-2">
          <label htmlFor="course-name" className="block text-xs font-medium text-white/60 mb-1.5">
            Nombre
          </label>
          <input
            id="course-name"
            type="text"
            placeholder="Lógica y Programación"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            className={inputClass('name')}
          />
          {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="course-desc" className="block text-xs font-medium text-white/60 mb-1.5">
          Descripción
        </label>
        <textarea
          id="course-desc"
          rows={3}
          placeholder="Descripción del curso..."
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          className={`${inputClass('description')} resize-none`}
        />
        {errors.description && <p className="mt-1 text-xs text-red-400">{errors.description}</p>}
      </div>

      {/* Semester + Category row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="course-semester" className="block text-xs font-medium text-white/60 mb-1.5">
            Semestre
          </label>
          <select
            id="course-semester"
            value={formData.semesterId}
            onChange={(e) => updateField('semesterId', e.target.value)}
            disabled={isEdit}
            className={`${selectClass('semesterId')} ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="">Seleccionar…</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} {s.isActive ? '(activo)' : ''}
              </option>
            ))}
          </select>
          {errors.semesterId && <p className="mt-1 text-xs text-red-400">{errors.semesterId}</p>}
        </div>
        <div>
          <label htmlFor="course-category" className="block text-xs font-medium text-white/60 mb-1.5">
            Categoría
          </label>
          <select
            id="course-category"
            value={formData.category}
            onChange={(e) => updateField('category', e.target.value as Course['category'])}
            className={selectClass('category')}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Schedule */}
      <fieldset>
        <legend className="text-xs font-medium text-white/60 mb-2">
          Horarios
        </legend>
        {errors.schedule && <p className="mb-2 text-xs text-red-400">{errors.schedule}</p>}
        <div className="space-y-3">
          {formData.schedule.map((slot, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_0.6fr_0.6fr_0.8fr_0.8fr_auto] gap-2 items-end">
              <div>
                {idx === 0 && <span className="block text-[10px] text-white/40 mb-1">Día</span>}
                <select
                  value={slot.dayOfWeek}
                  onChange={(e) => updateSlot(idx, 'dayOfWeek', e.target.value)}
                  aria-label="Día de la semana"
                  className={selectClass('')}
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                {idx === 0 && <span className="block text-[10px] text-white/40 mb-1">Inicio</span>}
                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => updateSlot(idx, 'startTime', e.target.value)}
                  aria-label="Hora de inicio"
                  className={inputClass('')}
                />
              </div>
              <div>
                {idx === 0 && <span className="block text-[10px] text-white/40 mb-1">Fin</span>}
                <input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => updateSlot(idx, 'endTime', e.target.value)}
                  aria-label="Hora de fin"
                  className={inputClass('')}
                />
              </div>
              <div>
                {idx === 0 && <span className="block text-[10px] text-white/40 mb-1">Salón</span>}
                <input
                  type="text"
                  placeholder="Lab 301"
                  value={slot.room ?? ''}
                  onChange={(e) => updateSlot(idx, 'room', e.target.value)}
                  aria-label="Salón"
                  className={inputClass('')}
                />
              </div>
              <div>
                {idx === 0 && <span className="block text-[10px] text-white/40 mb-1">Modalidad</span>}
                <select
                  value={slot.modality}
                  onChange={(e) => updateSlot(idx, 'modality', e.target.value)}
                  aria-label="Modalidad"
                  className={selectClass('')}
                >
                  {MODALITIES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                {idx === 0 && <span className="block text-[10px] text-transparent mb-1">X</span>}
                <button
                  type="button"
                  onClick={() => removeSlot(idx)}
                  disabled={formData.schedule.length <= 1}
                  aria-label="Eliminar horario"
                  className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 
                             disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addSlot}
          className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
        >
          + Agregar horario
        </button>
      </fieldset>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" size="sm" loading={loading}>
          {isEdit ? 'Guardar cambios' : 'Crear curso'}
        </Button>
      </div>
    </form>
  );
}
