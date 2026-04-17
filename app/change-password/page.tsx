'use client';

/**
 * /change-password — Página de cambio de contraseña
 * 
 * Fase 6 (backend) + Fase 21 (diseño visual)
 * 
 * Flujo (CU-12):
 * 1. Se muestra al primer login (mustChangePassword: true) o acceso directo
 * 2. Usuario ingresa contraseña actual + nueva + confirmación
 * 3. Indicador de fortaleza + reglas visibles
 * 4. Al éxito redirige al dashboard según rol
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface UserData {
  role: 'admin' | 'student';
}

/* ─── Password strength calculator ─── */
function getPasswordStrength(pw: string): { score: number; label: string; color: string; bgColor: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: 'Débil', color: 'text-red-400', bgColor: 'bg-red-500' };
  if (score === 2) return { score, label: 'Regular', color: 'text-amber-400', bgColor: 'bg-amber-500' };
  if (score === 3) return { score, label: 'Buena', color: 'text-yellow-400', bgColor: 'bg-yellow-500' };
  if (score === 4) return { score, label: 'Fuerte', color: 'text-emerald-400', bgColor: 'bg-emerald-500' };
  return { score, label: 'Muy fuerte', color: 'text-cyan-400', bgColor: 'bg-cyan-500' };
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  // Password rules validation
  const rules = useMemo(() => [
    { label: 'Mínimo 8 caracteres', pass: newPassword.length >= 8 },
    { label: 'Al menos una mayúscula', pass: /[A-Z]/.test(newPassword) },
    { label: 'Al menos un número', pass: /[0-9]/.test(newPassword) },
    { label: 'Las contraseñas coinciden', pass: newPassword.length > 0 && newPassword === confirmPassword },
  ], [newPassword, confirmPassword]);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json() as { user: UserData };
          setUserRole(data.user.role);
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      }
    }
    fetchUser();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al cambiar la contraseña');
        return;
      }

      setSuccess(true);

      setTimeout(() => {
        if (userRole === 'admin') {
          router.push('/admin');
        } else {
          router.push('/student');
        }
      }, 1500);
    } catch {
      setError('Error de conexión. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] p-8 shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
              Cambiar Contraseña
            </h1>
            <p className="text-sm text-white/40 mt-1">
              Por seguridad, actualiza tu contraseña
            </p>
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-6 text-center"
            >
              <div className="text-3xl mb-2">✅</div>
              <p className="text-sm font-medium text-emerald-400">
                Contraseña actualizada correctamente
              </p>
              <p className="text-xs text-white/30 mt-1">Redirigiendo...</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Current password */}
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-white/60 mb-2">
                  Contraseña actual
                </label>
                <div className="relative">
                  <input
                    id="currentPassword"
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoFocus
                    autoComplete="current-password"
                    className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03]
                               text-white text-sm placeholder-white/20
                               focus:outline-none focus:border-cyan-500/30 focus:ring-1 focus:ring-cyan-500/20
                               transition-all"
                    placeholder="Ingresa tu contraseña actual"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showCurrentPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showCurrentPw ? (
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

              {/* New password */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-white/60 mb-2">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03]
                               text-white text-sm placeholder-white/20
                               focus:outline-none focus:border-cyan-500/30 focus:ring-1 focus:ring-cyan-500/20
                               transition-all"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showNewPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showNewPw ? (
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

                {/* Strength indicator */}
                {newPassword.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-white/30">Fortaleza</span>
                      <span className={`text-[11px] font-medium ${strength.color}`}>{strength.label}</span>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((seg) => (
                        <div
                          key={seg}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            seg <= strength.score ? strength.bgColor : 'bg-white/[0.06]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/60 mb-2">
                  Confirmar nueva contraseña
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={`w-full px-4 py-3 rounded-xl border bg-white/[0.03]
                             text-white text-sm placeholder-white/20
                             focus:outline-none focus:ring-1 transition-all
                             ${confirmPassword.length > 0 && newPassword !== confirmPassword
                               ? 'border-red-500/30 focus:border-red-500/30 focus:ring-red-500/20'
                               : confirmPassword.length > 0 && newPassword === confirmPassword
                                 ? 'border-emerald-500/30 focus:border-emerald-500/30 focus:ring-emerald-500/20'
                                 : 'border-white/[0.08] focus:border-cyan-500/30 focus:ring-cyan-500/20'
                             }`}
                  placeholder="Repite la nueva contraseña"
                />
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <p className="text-[11px] text-red-400 mt-1.5">Las contraseñas no coinciden</p>
                )}
              </div>

              {/* Password rules */}
              {newPassword.length > 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                  <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">Requisitos</p>
                  <div className="space-y-1.5">
                    {rules.map((rule, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className={`text-xs transition-colors ${rule.pass ? 'text-emerald-400' : 'text-white/20'}`}>
                          {rule.pass ? '✓' : '○'}
                        </span>
                        <span className={`text-xs transition-colors ${rule.pass ? 'text-white/50' : 'text-white/25'}`}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3.5">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-white/[0.06]
                           disabled:text-white/20 text-white text-sm font-semibold
                           transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    Actualizando...
                  </span>
                ) : (
                  'Cambiar Contraseña'
                )}
              </button>

              {/* Back link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="text-xs text-white/30 hover:text-white/50 transition-colors cursor-pointer"
                >
                  ← Volver
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
