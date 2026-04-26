'use client';

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Info } from 'lucide-react';
import Button from '@/components/ui/Button';

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
}

const variantConfig: Record<ConfirmVariant, {
  icon: React.ReactNode;
  iconBg: string;
  confirmVariant: 'danger' | 'primary';
}> = {
  danger: {
    icon: <Trash2 className="w-5 h-5 text-red-400" />,
    iconBg: 'bg-red-500/10',
    confirmVariant: 'danger',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    iconBg: 'bg-amber-500/10',
    confirmVariant: 'danger',
  },
  info: {
    icon: <Info className="w-5 h-5 text-cyan-400" />,
    iconBg: 'bg-cyan-500/10',
    confirmVariant: 'primary',
  },
};

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  const config = variantConfig[variant];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    },
    [onClose, loading]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-base/70 backdrop-blur-sm"
            onClick={() => !loading && onClose()}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            className="relative w-full max-w-sm rounded-2xl border border-foreground/[0.08] bg-base shadow-2xl"
          >
            <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center">
              {/* Icon */}
              <div className={`w-12 h-12 rounded-full ${config.iconBg} flex items-center justify-center mb-4`}>
                {config.icon}
              </div>

              <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{message}</p>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 flex items-center gap-3 justify-end border-t border-foreground/[0.06] mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={loading}
              >
                {cancelLabel}
              </Button>
              <Button
                variant={config.confirmVariant}
                size="sm"
                onClick={onConfirm}
                loading={loading}
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
