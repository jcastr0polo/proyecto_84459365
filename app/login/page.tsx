'use client';

/**
 * /login — Página de inicio de sesión
 * 
 * Fase 6 (backend) + Fase 23 (diseño visual)
 * 
 * Flujo (CU-01):
 * 1. Usuario ingresa email + contraseña
 * 2. Si mustChangePassword → redirige a /change-password
 * 3. Si role admin → redirige a /admin
 * 4. Si role student → redirige a /student
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        return;
      }

      if (data.mustChangePassword) {
        router.push('/change-password');
      } else if (data.user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/student');
      }
    } catch {
      setError('Error de conexión. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-bg-secondary)] p-8 shadow-[var(--shadow-lg)]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-accent-bg)] border border-[var(--color-accent-border)] mb-4">
              <span className="text-2xl">🎓</span>
            </div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
              Plataforma Académica
            </h1>
            <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
              Iniciar Sesión
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                placeholder="tu-email@universidad.edu.co"
                className="w-full px-4 py-3 rounded-xl
                           border border-[var(--color-surface-border)] bg-[var(--color-surface)]
                           text-[var(--color-text-primary)] text-sm
                           placeholder-[var(--color-text-quaternary)]
                           focus:outline-none focus:border-[var(--color-accent-border)] focus:ring-1 focus:ring-[var(--color-accent-border)]
                           transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl
                             border border-[var(--color-surface-border)] bg-[var(--color-surface)]
                             text-[var(--color-text-primary)] text-sm
                             placeholder-[var(--color-text-quaternary)]
                             focus:outline-none focus:border-[var(--color-accent-border)] focus:ring-1 focus:ring-[var(--color-accent-border)]
                             transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-quaternary)] hover:text-[var(--color-text-tertiary)] transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPw ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-[var(--color-error-bg)] border border-[var(--color-error-border)] p-3.5">
                <p className="text-sm text-[var(--color-error)]">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]
                         disabled:bg-[var(--color-surface)] disabled:text-[var(--color-text-quaternary)]
                         text-white text-sm font-semibold
                         transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  Ingresando...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center mt-6 text-[10px] text-[var(--color-text-quaternary)]">
            Fullstack TypeScript + Next.js + Vercel
          </p>
        </div>
      </motion.div>
    </div>
  );
}
