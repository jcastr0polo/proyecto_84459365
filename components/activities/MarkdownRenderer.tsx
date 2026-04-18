'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * MarkdownRenderer — Renderizado básico de Markdown a HTML
 * Soporta: headings, bold, italic, code, inline code, links, lists, blockquotes
 * No usa dependencias externas — renderizado ligero lado cliente
 */
export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const html = markdownToHtml(content);

  return (
    <div
      className={`
        prose prose-invert prose-sm max-w-none
        prose-headings:text-foreground/90 prose-headings:font-semibold
        prose-p:text-muted prose-p:leading-relaxed
        prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
        prose-strong:text-muted prose-em:text-muted
        prose-code:text-cyan-300 prose-code:bg-foreground/[0.06] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
        prose-pre:bg-foreground/[0.04] prose-pre:border prose-pre:border-foreground/[0.08] prose-pre:rounded-lg
        prose-blockquote:border-l-cyan-500/40 prose-blockquote:text-muted
        prose-li:text-muted prose-li:marker:text-subtle
        prose-hr:border-foreground/[0.08]
        [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
        ${className}
      `}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Minimal markdown → HTML converter
 * Handles: headings, bold, italic, code blocks, inline code, links, lists, blockquotes, hr, paragraphs
 */
function markdownToHtml(md: string): string {
  let html = md
    // Escape HTML (prevent XSS)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr />');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Unordered lists
  html = html.replace(/^[\s]*[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Ordered lists
  html = html.replace(/^[\s]*\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs — wrap remaining single-line text
  html = html.replace(/^(?!<[a-z/])((?!<).+)$/gm, '<p>$1</p>');

  // Clean empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}
