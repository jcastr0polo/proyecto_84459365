'use client';

import React from 'react';
import { formatDateShort } from '@/lib/dateUtils';
import { motion } from 'framer-motion';

interface PromptCardProps {
  id: string;
  title: string;
  courseName?: string;
  version: number;
  tags: string[];
  isTemplate: boolean;
  updatedAt: string;
  contentPreview: string;
  onClick?: () => void;
}

/**
 * PromptCard — Card for prompt listings
 * Shows: title, course, version, tags, date, content preview
 */
export default function PromptCard({
  title,
  courseName,
  version,
  tags,
  isTemplate,
  updatedAt,
  contentPreview,
  onClick,
}: PromptCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] p-4 cursor-pointer hover:border-cyan-500/30 hover:bg-foreground/[0.03] transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground/90 truncate group-hover:text-cyan-400 transition-colors">
            {title}
          </h3>
          {courseName && (
            <p className="text-[11px] text-subtle mt-0.5 truncate">{courseName}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] text-subtle bg-foreground/[0.04] px-1.5 py-0.5 rounded">
            v{version}
          </span>
          {isTemplate && (
            <span className="text-[10px] text-violet-400 bg-violet-500/15 px-1.5 py-0.5 rounded border border-violet-500/20">
              Plantilla
            </span>
          )}
        </div>
      </div>

      {/* Content preview */}
      <p className="text-xs text-subtle line-clamp-2 mb-3 leading-relaxed">
        {contentPreview}
      </p>

      {/* Tags + date footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 min-w-0 flex-1">
          {tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-[10px] text-cyan-400/60 bg-cyan-500/10 px-1.5 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
          {tags.length > 4 && (
            <span className="text-[10px] text-faint">+{tags.length - 4}</span>
          )}
        </div>
        <span className="text-[10px] text-faint flex-shrink-0">
          {formatDateShort(updatedAt)}
        </span>
      </div>
    </motion.div>
  );
}
