'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Cpu, Eye, EyeOff, ArrowRight, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeProvider';

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
      if (!res.ok) { setError(data.error || 'Error al iniciar sesión'); return; }
      if (data.mustChangePassword) { router.push('/change-password'); }
      else if (data.user.role === 'admin') { router.push('/admin'); }
      else { router.push('/student'); }
    } catch {
      setError('Error de conexión. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base px-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-cyan-500/[0.05] rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-blue-500/[0.04] rounded-full blur-[120px]" />
      </div>

      {/* Back to home */}
      <Link href="/" className="absolute top-4 left-4 flex items-center gap-2 text-sm text-subtle hover:text-muted transition-colors z-10 p-2 rounded-lg hover:bg-foreground/[0.04] min-h-[44px]">
        <ArrowLeft className="w-4 h-4" />
        Inicio
      </Link>

      {/* Theme toggle */}
      <div className="absolute top-5 right-5 z-10">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative w-full max-w-sm z-10"
      >
        <div className="rounded-2xl border border-foreground/[0.08] bg-foreground/[0.03] backdrop-blur-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 mb-5 shadow-lg shadow-cyan-500/20">
              <Cpu className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
              NEXUS
            </h1>
            <p className="text-xs text-subtle mt-1.5 tracking-wide">
              Plataforma Académica
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-[11px] font-medium text-subtle mb-2 uppercase tracking-wider">
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
                className="w-full px-4 py-3 rounded-xl border border-foreground/[0.08] bg-foreground/[0.04] text-foreground text-sm placeholder-faint focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/30 focus:bg-foreground/[0.06] transition-all duration-200"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[11px] font-medium text-subtle mb-2 uppercase tracking-wider">
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
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-foreground/[0.08] bg-foreground/[0.04] text-foreground text-sm placeholder-faint focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/30 focus:bg-foreground/[0.06] transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-faint hover:text-muted transition-colors cursor-pointer p-2 rounded-lg"
                  tabIndex={-1}
                  aria-label={showPw ? 'Ocultar' : 'Mostrar'}
                >
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5 rounded-xl bg-red-500/[0.08] border border-red-500/15 p-3.5"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300/80 leading-relaxed">{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-sm font-bold hover:shadow-lg hover:shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                <>
                  Iniciar Sesión
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-foreground/[0.06]">
            <p className="text-center text-[10px] text-faint">
              NEXUS · Fullstack TypeScript + Next.js + IA
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
