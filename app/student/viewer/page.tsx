'use client';

import EmptyState from '@/components/ui/EmptyState';
import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import MarkdownViewer from '@/components/ui/MarkdownViewer';
import { PageLoader } from '@/components/ui/LoadingSpinner';

export default function StudentDocumentViewerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get('url');
  const name = searchParams.get('name') ?? 'Documento';

  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState('');

  /*
   * La falta de url se resuelve durante el render, no en un efecto.
   * Antes se hacía setError y setLoading dentro del efecto, lo que obliga a
   * un segundo render y, entre medias, muestra un cargando que nunca va a
   * cargar nada. No depende de nada asíncrono: se sabe al primer render.
   */
  const missingUrl = !url;

  useEffect(() => {
    if (!url) return;

    const downloadUrl = url.startsWith('http')
      ? `/api/upload/download?url=${encodeURIComponent(url)}`
      : `/api/upload/${url.replace('uploads/', '')}`;

    fetch(downloadUrl)
      .then(async (res) => {
        if (!res.ok) throw new Error('No se pudo cargar el documento');
        return res.text();
      })
      .then((text) => setContent(text))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [url]);

  const isMarkdown = name.endsWith('.md');

  const downloadUrl = url
    ? url.startsWith('http')
      ? `/api/upload/download?url=${encodeURIComponent(url)}`
      : `/api/upload/${url.replace('uploads/', '')}`
    : '#';

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 border-b border-foreground/10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg text-subtle hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer shrink-0"
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
              <h1 className="text-sm font-medium text-foreground truncate">{name}</h1>
            </div>
          </div>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-subtle
                       hover:text-foreground hover:bg-foreground/5 border border-foreground/10
                       transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Descargar
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading && <PageLoader />}

        {/* El caso "sin documento" se sabe al primer render, así que se
            distingue del error de carga en vez de mezclarlos. */}
        {(missingUrl || error) && (
          <EmptyState
            kind="error"
            title={missingUrl ? 'No se especificó un documento' : 'No se pudo abrir el documento'}
            description={missingUrl
              ? 'El enlace no incluye el archivo que se quiere ver.'
              : error}
            action={
              <button
                onClick={() => router.back()}
                className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer
                           inline-flex items-center min-h-11 px-3"
              >
                Volver
              </button>
            }
          />
        )}

        {content !== null && !loading && (
          isMarkdown ? (
            <MarkdownViewer content={content} className="prose-base prose-p:text-base prose-p:leading-7" />
          ) : (
            <pre className="text-sm text-muted whitespace-pre-wrap font-mono leading-relaxed
                          p-6 rounded-xl bg-foreground/[0.03] border border-foreground/[0.08]">
              {content}
            </pre>
          )
        )}
      </div>
    </div>
  );
}
