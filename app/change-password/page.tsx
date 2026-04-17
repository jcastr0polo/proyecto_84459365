'use client';

/**
 * /change-password — Página de cambio de contraseña
 * 
 * Fase 6 — Autenticación y Sesiones
 * UI funcional básica — el diseño se pulirá en fases de frontend
 * 
 * Flujo (CU-12):
 * 1. Se muestra al primer login (mustChangePassword: true) o acceso directo
 * 2. Usuario ingresa contraseña actual + nueva + confirmación
 * 3. Al éxito redirige al dashboard según rol
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserData {
  role: 'admin' | 'student';
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

  // Obtener rol del usuario para redirección
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json() as { user: UserData };
          setUserRole(data.user.role);
        } else {
          // No autenticado → ir al login
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

    // Validación client-side
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

      // Redirigir al dashboard después de 1.5 segundos
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2rem',
        border: '1px solid #333',
        borderRadius: '12px',
        background: '#111',
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: '0.5rem',
        }}>
          🔒 Cambiar Contraseña
        </h1>
        <p style={{
          textAlign: 'center',
          color: '#888',
          marginBottom: '2rem',
          fontSize: '0.875rem',
        }}>
          Por seguridad, actualiza tu contraseña
        </p>

        {success ? (
          <div style={{
            padding: '1rem',
            borderRadius: '8px',
            background: '#0b3d0b',
            border: '1px solid #1a6b1a',
            color: '#4ade80',
            textAlign: 'center',
          }}>
            ✅ Contraseña actualizada correctamente. Redirigiendo...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="currentPassword" style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                color: '#ccc',
              }}>
                Contraseña actual
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoFocus
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #333',
                  background: '#222',
                  color: '#fff',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="newPassword" style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                color: '#ccc',
              }}>
                Nueva contraseña (mín. 8 caracteres)
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #333',
                  background: '#222',
                  color: '#fff',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="confirmPassword" style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                color: '#ccc',
              }}>
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
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #333',
                  background: '#222',
                  color: '#fff',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: '0.75rem',
                marginBottom: '1rem',
                borderRadius: '8px',
                background: '#3b1111',
                border: '1px solid #6b2222',
                color: '#ff6b6b',
                fontSize: '0.8125rem',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: 'none',
                background: loading ? '#444' : '#06b6d4',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
