'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DatePickerProps {
  id: string;
  label: string;
  value: string;           // "YYYY-MM-DD"
  onChange: (value: string) => void;
  onBlur?: () => void;
  min?: string;            // "YYYY-MM-DD"
  max?: string;            // "YYYY-MM-DD"
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  includeTime?: boolean;   // kept for API compat
}

const DAYS_ES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function pad(n: number) { return n.toString().padStart(2, '0'); }

function toYMD(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parseYMD(s: string): { year: number; month: number; day: number } | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { year: +m[1], month: +m[2] - 1, day: +m[3] };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOffset(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function formatDisplay(value: string): string {
  const p = parseYMD(value);
  if (!p) return '';
  return `${p.day} ${MONTHS_ES[p.month].substring(0, 3)} ${p.year}`;
}

export default function DatePicker({
  id,
  label,
  value,
  onChange,
  onBlur,
  min,
  max,
  required = false,
  error,
  hint,
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const calRef = useRef<HTMLDivElement>(null);

  const parsed = parseYMD(value);
  const today = new Date();
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());

  useEffect(() => {
    const p = parseYMD(value);
    if (p) { setViewYear(p.year); setViewMonth(p.month); }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, onBlur]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); onBlur?.(); }
    }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open, onBlur]);

  // Auto-position above if not enough space below
  useEffect(() => {
    if (!open || !calRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cal = calRef.current;
    if (window.innerHeight - rect.bottom < 340) {
      cal.style.bottom = '100%';
      cal.style.top = 'auto';
      cal.style.marginBottom = '4px';
    } else {
      cal.style.top = '100%';
      cal.style.bottom = 'auto';
      cal.style.marginTop = '4px';
    }
  }, [open]);

  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) { setViewYear((y) => y - 1); return 11; }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) { setViewYear((y) => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  function selectDay(day: number) {
    onChange(toYMD(viewYear, viewMonth, day));
    setOpen(false);
    onBlur?.();
  }

  function isDayDisabled(day: number): boolean {
    const val = toYMD(viewYear, viewMonth, day);
    if (min && val < min) return true;
    if (max && val > max) return true;
    return false;
  }

  function isSelected(day: number): boolean {
    if (!parsed) return false;
    return parsed.year === viewYear && parsed.month === viewMonth && parsed.day === day;
  }

  function isToday(day: number): boolean {
    return viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate();
  }

  const totalDays = daysInMonth(viewYear, viewMonth);
  const offset = firstDayOffset(viewYear, viewMonth);
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = toYMD(today.getFullYear(), today.getMonth(), today.getDate());
  const todayBlocked = (min && todayStr < min) || (max && todayStr > max);

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="block text-xs font-medium text-muted mb-1.5">
        {label}
        {required && <span className="text-red-400/70 ml-0.5">*</span>}
      </label>

      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={`
          w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border bg-foreground/[0.04]
          text-sm text-left outline-none transition-colors cursor-pointer
          focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500/50' : 'border-foreground/10'}
          ${open ? 'border-cyan-500/50 ring-1 ring-cyan-500/25' : ''}
        `}
      >
        <Calendar className="w-4 h-4 text-subtle flex-shrink-0" />
        <span className={value ? 'text-foreground' : 'text-faint'}>
          {value ? formatDisplay(value) : 'Seleccionar fecha'}
        </span>
      </button>

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {!error && hint && <p className="mt-1 text-[11px] text-faint">{hint}</p>}

      {open && (
        <div
          ref={calRef}
          className="absolute left-0 z-50 w-[280px] rounded-xl border border-foreground/[0.08] bg-base shadow-2xl overflow-hidden"
          style={{ animation: 'fadeSlideIn 0.15s ease-out' }}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-foreground/[0.06]">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-subtle hover:text-foreground hover:bg-foreground/10 transition-colors cursor-pointer"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground">
              {MONTHS_ES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-subtle hover:text-foreground hover:bg-foreground/10 transition-colors cursor-pointer"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-2 pt-2">
            {DAYS_ES.map((d) => (
              <span key={d} className="text-center text-[10px] font-medium text-faint py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5 px-2 pb-2">
            {cells.map((day, i) => {
              if (day === null) return <span key={`e-${i}`} className="w-9 h-9" />;
              const dis = isDayDisabled(day);
              const sel = isSelected(day);
              const tod = isToday(day);
              return (
                <button
                  key={day}
                  type="button"
                  disabled={dis}
                  onClick={() => selectDay(day)}
                  className={`
                    w-9 h-9 rounded-lg text-xs font-medium transition-all cursor-pointer
                    flex items-center justify-center
                    ${sel
                      ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/30'
                      : dis
                        ? 'text-foreground/20 cursor-not-allowed'
                        : 'text-foreground hover:bg-foreground/10'
                    }
                    ${tod && !sel ? 'ring-1 ring-cyan-500/40 text-cyan-400' : ''}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div className="px-3 py-2 border-t border-foreground/[0.06]">
            <button
              type="button"
              onClick={() => {
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
                if (!todayBlocked) onChange(todayStr);
                setOpen(false);
                onBlur?.();
              }}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              Hoy — {today.getDate()} {MONTHS_ES[today.getMonth()].substring(0, 3)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
