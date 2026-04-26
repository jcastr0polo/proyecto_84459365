'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import DatePicker from '@/components/ui/DatePicker';
import type { Semester } from '@/lib/types';

interface SemesterFormProps {
  /** If provided, the form is in edit mode */
  semester?: Semester;
  onSubmit: (data: SemesterFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface SemesterFormData {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export default function SemesterForm({ semester, onSubmit, onCancel, loading = false }: SemesterFormProps) {
  const isEdit = !!semester;

  const [formData, setFormData] = useState<SemesterFormData>({
    id: semester?.id ?? '',
    label: semester?.label ?? '',
    startDate: semester?.startDate ?? '',
    endDate: semester?.endDate ?? '',
    isActive: semester?.isActive ?? false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!isEdit && !/^\d{4}(01|02)$/.test(formData.id)) {
      e.id = 'Formato: YYYYSS (ej: 202601)';
    }
    if (!formData.label.trim()) e.label = 'La etiqueta es requerida';
    if (!formData.startDate) e.startDate = 'Fecha de inicio requerida';
    if (!formData.endDate) e.endDate = 'Fecha de fin requerida';
    if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
      e.endDate = 'Debe ser posterior a la fecha de inicio';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
  }

  function update(field: keyof SemesterFormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  const inputClass = (field: string) =>
    `w-full px-3 py-2 rounded-lg border bg-foreground/[0.04] text-foreground text-sm
     placeholder:text-subtle outline-none transition-colors
     focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25
     ${errors[field] ? 'border-red-500/50' : 'border-foreground/10'}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ID — solo en creación */}
      {!isEdit && (
        <div>
          <label htmlFor="sem-id" className="block text-xs font-medium text-muted mb-1.5">
            ID del Semestre
          </label>
          <input
            id="sem-id"
            type="text"
            maxLength={6}
            placeholder="202601"
            value={formData.id}
            onChange={(e) => update('id', e.target.value)}
            className={inputClass('id')}
          />
          {errors.id && <p className="mt-1 text-xs text-red-400">{errors.id}</p>}
        </div>
      )}

      {/* Label */}
      <div>
        <label htmlFor="sem-label" className="block text-xs font-medium text-muted mb-1.5">
          Etiqueta
        </label>
        <input
          id="sem-label"
          type="text"
          placeholder="2026 - Primer Semestre"
          value={formData.label}
          onChange={(e) => update('label', e.target.value)}
          className={inputClass('label')}
        />
        {errors.label && <p className="mt-1 text-xs text-red-400">{errors.label}</p>}
      </div>

      {/* Dates row */}
      <div className="grid grid-cols-2 gap-3">
        <DatePicker
          id="sem-start"
          label="Fecha inicio"
          value={formData.startDate}
          onChange={(v) => update('startDate', v)}
          error={errors.startDate}
        />
        <DatePicker
          id="sem-end"
          label="Fecha fin"
          value={formData.endDate}
          onChange={(v) => update('endDate', v)}
          min={formData.startDate}
          error={errors.endDate}
        />
      </div>

      {/* Active toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none group">
        <div className="relative">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => update('isActive', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 rounded-full bg-foreground/10 peer-checked:bg-cyan-500/60 transition-colors" />
          <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-foreground/60 peer-checked:translate-x-4 peer-checked:bg-white transition-all" />
        </div>
        <span className="text-sm text-muted group-hover:text-foreground/90 transition-colors">
          Semestre activo
        </span>
      </label>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" size="sm" loading={loading}>
          {isEdit ? 'Guardar cambios' : 'Crear semestre'}
        </Button>
      </div>
    </form>
  );
}
