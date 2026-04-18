'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';

interface EnrollFormProps {
  onSubmit: (data: EnrollFormData) => Promise<void>;
  loading?: boolean;
}

export interface EnrollFormData {
  firstName: string;
  lastName: string;
  email: string;
  documentNumber: string;
  phone: string;
}

/**
 * EnrollForm — Formulario de inscripción individual de un estudiante
 * Validación client-side en tiempo real con mensajes inline
 */
export default function EnrollForm({ onSubmit, loading = false }: EnrollFormProps) {
  const [form, setForm] = useState<EnrollFormData>({
    firstName: '',
    lastName: '',
    email: '',
    documentNumber: '',
    phone: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function validate(data: EnrollFormData): Record<string, string> {
    const e: Record<string, string> = {};
    if (!data.firstName.trim()) e.firstName = 'El nombre es requerido';
    if (!data.lastName.trim()) e.lastName = 'El apellido es requerido';
    if (!data.email.trim()) {
      e.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      e.email = 'Formato de email inválido';
    }
    if (!data.documentNumber.trim()) {
      e.documentNumber = 'El documento es requerido';
    } else if (!/^\d+$/.test(data.documentNumber)) {
      e.documentNumber = 'Solo se permiten números';
    } else if (data.documentNumber.length < 5) {
      e.documentNumber = 'Mínimo 5 dígitos';
    }
    return e;
  }

  function update(field: keyof EnrollFormData, value: string) {
    const next = { ...form, [field]: value };
    setForm(next);
    if (touched[field]) {
      const v = validate(next);
      setErrors((prev) => {
        const updated = { ...prev };
        if (v[field]) updated[field] = v[field];
        else delete updated[field];
        return updated;
      });
    }
  }

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const v = validate(form);
    if (v[field]) {
      setErrors((prev) => ({ ...prev, [field]: v[field] }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate(form);
    setTouched({ firstName: true, lastName: true, email: true, documentNumber: true, phone: true });
    if (Object.keys(v).length > 0) {
      setErrors(v);
      return;
    }
    await onSubmit(form);
  }

  function reset() {
    setForm({ firstName: '', lastName: '', email: '', documentNumber: '', phone: '' });
    setErrors({});
    setTouched({});
  }

  const inputClass = (field: string) =>
    `w-full px-3 py-2.5 rounded-lg border bg-foreground/[0.04] text-foreground text-sm
     placeholder:text-faint outline-none transition-colors
     focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25
     ${errors[field] && touched[field] ? 'border-red-500/50' : 'border-foreground/10'}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          id="enroll-first"
          label="Nombre"
          required
          error={touched.firstName ? errors.firstName : undefined}
        >
          <input
            id="enroll-first"
            type="text"
            placeholder="Juan"
            value={form.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            onBlur={() => handleBlur('firstName')}
            className={inputClass('firstName')}
          />
        </Field>
        <Field
          id="enroll-last"
          label="Apellido"
          required
          error={touched.lastName ? errors.lastName : undefined}
        >
          <input
            id="enroll-last"
            type="text"
            placeholder="Pérez"
            value={form.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            onBlur={() => handleBlur('lastName')}
            className={inputClass('lastName')}
          />
        </Field>
      </div>

      {/* Email */}
      <Field
        id="enroll-email"
        label="Email"
        required
        error={touched.email ? errors.email : undefined}
      >
        <input
          id="enroll-email"
          type="email"
          placeholder="juan.perez@universidad.edu.co"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          className={inputClass('email')}
        />
      </Field>

      {/* Doc + Phone row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          id="enroll-doc"
          label="Número de Documento"
          required
          error={touched.documentNumber ? errors.documentNumber : undefined}
          hint="Se usará como contraseña inicial"
        >
          <input
            id="enroll-doc"
            type="text"
            inputMode="numeric"
            placeholder="1234567890"
            value={form.documentNumber}
            onChange={(e) => update('documentNumber', e.target.value)}
            onBlur={() => handleBlur('documentNumber')}
            className={inputClass('documentNumber')}
          />
        </Field>
        <Field id="enroll-phone" label="Teléfono" hint="Opcional">
          <input
            id="enroll-phone"
            type="tel"
            placeholder="3001234567"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            className={inputClass('phone')}
          />
        </Field>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" variant="primary" size="md" loading={loading}>
          Inscribir Estudiante
        </Button>
        <Button type="button" variant="ghost" size="md" onClick={reset}>
          Limpiar
        </Button>
      </div>
    </form>
  );
}

/** Reusable form field wrapper */
function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-muted mb-1.5">
        {label}
        {required && <span className="text-red-400/70 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {!error && hint && <p className="mt-1 text-[11px] text-faint">{hint}</p>}
    </div>
  );
}
