'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

/**
 * MarkdownViewer — Renderiza contenido Markdown con estilos
 */
export default function MarkdownViewer({ content, className = '' }: MarkdownViewerProps) {
  return (
    <div className={`prose prose-invert prose-sm max-w-none
      prose-headings:text-foreground prose-headings:font-semibold
      prose-h1:text-lg prose-h1:border-b prose-h1:border-foreground/10 prose-h1:pb-2 prose-h1:mb-4
      prose-h2:text-base prose-h2:mt-6 prose-h2:mb-3
      prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-2
      prose-p:text-muted prose-p:text-sm prose-p:leading-relaxed
      prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
      prose-strong:text-foreground/90
      prose-code:text-cyan-300 prose-code:bg-foreground/[0.08] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-foreground/[0.06] prose-pre:border prose-pre:border-foreground/[0.08] prose-pre:rounded-lg
      prose-ul:text-muted prose-ul:text-sm
      prose-ol:text-muted prose-ol:text-sm
      prose-li:text-muted
      prose-blockquote:border-cyan-500/30 prose-blockquote:text-subtle prose-blockquote:text-sm
      prose-hr:border-foreground/10
      prose-table:text-sm
      prose-th:text-foreground/80 prose-th:border-foreground/10
      prose-td:text-muted prose-td:border-foreground/10
      ${className}`}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
