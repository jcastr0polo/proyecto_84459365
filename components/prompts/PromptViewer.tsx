'use client';

import React, { useState, useCallback } from 'react';
import { Bot, ClipboardCopy } from 'lucide-react';
import MarkdownRenderer from '@/components/activities/MarkdownRenderer';
import { useToast } from '@/components/ui/Toast';

interface PromptViewerProps {
  title: string;
  content: string;
  version: number;
  tags: string[];
  courseName?: string;
  isFullscreenInitial?: boolean;
}

/**
 * PromptViewer — Read-only prompt display with copy + fullscreen
 * - Markdown rendering with syntax highlighting
 * - One-click copy to clipboard
 * - Fullscreen mode for long prompts
 */
export default function PromptViewer({
  title,
  content,
  version,
  tags,
  courseName,
  isFullscreenInitial = false,
}: PromptViewerProps) {
  const { toast } = useToast();
  const [fullscreen, setFullscreen] = useState(isFullscreenInitial);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast('Prompt copiado al portapapeles', 'success');
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast('Prompt copiado al portapapeles', 'success');
    }
  }, [content, toast]);

  const viewer = (
    <div className={fullscreen ? 'fixed inset-0 z-50 bg-base overflow-y-auto' : ''}>
      {/* Header */}
      <div className={`${fullscreen ? 'sticky top-0 z-10 bg-base/95 backdrop-blur-sm border-b border-foreground/[0.06]' : ''} py-3 px-4`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-foreground/90 truncate">{title}</h3>
              <span className="text-[10px] text-subtle bg-foreground/[0.04] px-1.5 py-0.5 rounded flex-shrink-0">
                v{version}
              </span>
            </div>
            {courseName && (
              <p className="text-[10px] text-subtle mt-0.5 ml-7">{courseName}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 transition-colors cursor-pointer"
            >
              <ClipboardCopy className="w-3.5 h-3.5" /> Copiar Prompt
            </button>
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-1.5 rounded-lg border border-foreground/10 text-muted hover:text-foreground/80 hover:border-foreground/20 transition-colors cursor-pointer"
              title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {fullscreen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 ml-7">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] text-cyan-400/60 bg-cyan-500/10 px-1.5 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Markdown body */}
      <div className={`${fullscreen ? 'max-w-4xl mx-auto px-6 py-6' : 'px-4 py-3'}`}>
        <div className="rounded-lg bg-foreground/[0.02] border border-foreground/[0.06] p-4">
          <MarkdownRenderer content={content} />
        </div>
      </div>
    </div>
  );

  return viewer;
}
