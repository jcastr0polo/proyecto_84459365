'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Total items (shown as "X de Y") */
  totalItems?: number;
  /** Items per page */
  pageSize?: number;
}

/**
 * Pagination — Compact page navigation
 */
export default function Pagination({ page, totalPages, onPageChange, totalItems, pageSize }: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = pageSize ? (page - 1) * pageSize + 1 : undefined;
  const end = pageSize && totalItems ? Math.min(page * pageSize, totalItems) : undefined;

  return (
    <div className="flex items-center justify-between pt-4">
      {totalItems !== undefined && start !== undefined && end !== undefined ? (
        <p className="text-xs text-subtle">{start}–{end} de {totalItems}</p>
      ) : (
        <p className="text-xs text-subtle">Página {page} de {totalPages}</p>
      )}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-foreground/10 text-muted hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {generatePageNumbers(page, totalPages).map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-1 text-xs text-subtle">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`min-w-[32px] h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                p === page
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'border border-foreground/10 text-muted hover:text-foreground hover:border-foreground/20'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-foreground/10 text-muted hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

/** Helper hook for paginating arrays */
export function usePagination<T>(items: T[], pageSize: number = 10) {
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Reset to page 1 when items change (e.g. filter applied)
  React.useEffect(() => {
    setPage(1);
  }, [items.length]);

  const paginated = items.slice((page - 1) * pageSize, page * pageSize);

  return { page, setPage, totalPages, paginated, totalItems: items.length, pageSize };
}
