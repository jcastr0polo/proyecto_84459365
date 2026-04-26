'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileJson, FileSpreadsheet, AlertTriangle, CheckCircle2, Copy } from 'lucide-react';
import Button from '@/components/ui/Button';
import type { QuestionData, QuestionOptionData } from './QuestionEditor';

interface QuestionImporterProps {
  onImport: (questions: QuestionData[]) => void;
  onClose: () => void;
}

const JSON_EXAMPLE = `[
  {
    "text": "¿Cuál es la capital de Colombia?",
    "type": "single",
    "points": 1,
    "options": [
      { "text": "Bogotá", "weight": 100 },
      { "text": "Medellín", "weight": 0 },
      { "text": "Cali", "weight": 0 },
      { "text": "Barranquilla", "weight": 0 }
    ]
  },
  {
    "text": "Selecciona las ventajas de TypeScript",
    "type": "weighted",
    "points": 2,
    "options": [
      { "text": "Tipado estático", "weight": 50 },
      { "text": "Autocompletado IDE", "weight": 50 },
      { "text": "Es más rápido en runtime", "weight": 0 }
    ]
  }
]`;

const CSV_EXAMPLE = `pregunta;tipo;puntos;opcion1;peso1;opcion2;peso2;opcion3;peso3;opcion4;peso4
¿Cuál es la capital de Colombia?;single;1;Bogotá;100;Medellín;0;Cali;0;Barranquilla;0
Selecciona las ventajas de TypeScript;weighted;2;Tipado estático;50;Autocompletado IDE;50;Es más rápido en runtime;0;`;

type ImportMode = 'json' | 'csv';

interface ParseResult {
  questions: QuestionData[];
  errors: string[];
}

function validateQuestion(q: unknown, idx: number): { question?: QuestionData; error?: string } {
  if (!q || typeof q !== 'object') return { error: `Pregunta ${idx + 1}: formato inválido` };
  const obj = q as Record<string, unknown>;

  if (!obj.text || typeof obj.text !== 'string' || !obj.text.trim()) {
    return { error: `Pregunta ${idx + 1}: falta el texto` };
  }

  const type = obj.type === 'weighted' ? 'weighted' : 'single';
  const points = typeof obj.points === 'number' && obj.points > 0 ? obj.points : 1;

  if (!Array.isArray(obj.options) || obj.options.length < 2) {
    return { error: `Pregunta ${idx + 1}: necesita al menos 2 opciones` };
  }

  const options: QuestionOptionData[] = [];
  for (let i = 0; i < obj.options.length; i++) {
    const opt = obj.options[i] as Record<string, unknown>;
    if (!opt || typeof opt.text !== 'string' || !opt.text.trim()) {
      return { error: `Pregunta ${idx + 1}, opción ${i + 1}: falta el texto` };
    }
    const weight = typeof opt.weight === 'number' ? Math.max(0, Math.min(100, opt.weight)) : 0;
    options.push({ text: opt.text.trim(), weight });
  }

  if (type === 'single') {
    const correctCount = options.filter((o) => o.weight === 100).length;
    if (correctCount === 0) {
      return { error: `Pregunta ${idx + 1}: respuesta única sin opción correcta (weight=100)` };
    }
  }

  return {
    question: { text: (obj.text as string).trim(), type, points, options },
  };
}

function parseJSON(raw: string): ParseResult {
  const errors: string[] = [];
  const questions: QuestionData[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { questions: [], errors: [`JSON inválido: ${(e as Error).message}`] };
  }

  if (!Array.isArray(parsed)) {
    return { questions: [], errors: ['El JSON debe ser un array de preguntas'] };
  }

  for (let i = 0; i < parsed.length; i++) {
    const result = validateQuestion(parsed[i], i);
    if (result.error) errors.push(result.error);
    if (result.question) questions.push(result.question);
  }

  return { questions, errors };
}

function parseCSV(raw: string): ParseResult {
  const errors: string[] = [];
  const questions: QuestionData[] = [];

  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return { questions: [], errors: ['El CSV necesita al menos un encabezado y una fila'] };
  }

  // Detect separator: ; or , or \t
  const header = lines[0];
  const sep = header.includes(';') ? ';' : header.includes('\t') ? '\t' : ',';

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map((c) => c.trim());
    if (cols.length < 5) {
      errors.push(`Fila ${i + 1}: muy pocas columnas (mínimo: pregunta, tipo, puntos, opción1, peso1)`);
      continue;
    }

    const text = cols[0];
    const type = cols[1] === 'weighted' ? 'weighted' : 'single';
    const points = parseFloat(cols[2]) || 1;

    if (!text) {
      errors.push(`Fila ${i + 1}: falta el texto de la pregunta`);
      continue;
    }

    const options: QuestionOptionData[] = [];
    for (let j = 3; j < cols.length; j += 2) {
      const optText = cols[j];
      const optWeight = parseInt(cols[j + 1]) || 0;
      if (optText) {
        options.push({ text: optText, weight: Math.max(0, Math.min(100, optWeight)) });
      }
    }

    if (options.length < 2) {
      errors.push(`Fila ${i + 1}: necesita al menos 2 opciones`);
      continue;
    }

    if (type === 'single' && !options.some((o) => o.weight === 100)) {
      errors.push(`Fila ${i + 1}: respuesta única sin opción correcta (peso=100)`);
      continue;
    }

    questions.push({ text, type, points, options });
  }

  return { questions, errors };
}

export default function QuestionImporter({ onImport, onClose }: QuestionImporterProps) {
  const [mode, setMode] = useState<ImportMode>('json');
  const [rawText, setRawText] = useState('');
  const [result, setResult] = useState<ParseResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Auto-detect mode from extension
    if (file.name.endsWith('.csv') || file.name.endsWith('.tsv')) setMode('csv');
    else if (file.name.endsWith('.json')) setMode('json');

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setRawText(content);
      setResult(null);
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  }

  function handleParse() {
    const parsed = mode === 'json' ? parseJSON(rawText) : parseCSV(rawText);
    setResult(parsed);
  }

  function handleConfirmImport() {
    if (result && result.questions.length > 0) {
      onImport(result.questions);
    }
  }

  function copyExample() {
    const text = mode === 'json' ? JSON_EXAMPLE : CSV_EXAMPLE;
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-foreground/[0.04] border border-foreground/[0.06]">
        <button
          type="button"
          onClick={() => { setMode('json'); setResult(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            mode === 'json' ? 'bg-cyan-500/15 text-cyan-400' : 'text-subtle hover:text-muted'
          }`}
        >
          <FileJson className="w-3.5 h-3.5" /> JSON
        </button>
        <button
          type="button"
          onClick={() => { setMode('csv'); setResult(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            mode === 'csv' ? 'bg-cyan-500/15 text-cyan-400' : 'text-subtle hover:text-muted'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
        </button>
      </div>

      {/* File upload */}
      <div>
        <input
          ref={fileRef}
          type="file"
          accept={mode === 'json' ? '.json' : '.csv,.tsv,.txt'}
          onChange={handleFileLoad}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-foreground/10 hover:border-cyan-500/30 text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          Cargar archivo {mode === 'json' ? '.json' : '.csv'}
        </button>
      </div>

      {/* Text area */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-muted">
            {rawText ? 'Contenido cargado' : `O pega el contenido ${mode.toUpperCase()} aquí`}
          </label>
          <button
            type="button"
            onClick={copyExample}
            className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
          >
            <Copy className="w-3 h-3" /> Copiar ejemplo
          </button>
        </div>
        <textarea
          value={rawText}
          onChange={(e) => { setRawText(e.target.value); setResult(null); }}
          placeholder={mode === 'json' ? JSON_EXAMPLE : CSV_EXAMPLE}
          rows={8}
          className="w-full px-3 py-2.5 text-xs font-mono rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground placeholder:text-faint/50 outline-none focus:border-cyan-500/50 resize-y"
        />
      </div>

      {/* Formato reference */}
      <details className="text-xs text-subtle">
        <summary className="cursor-pointer hover:text-muted transition-colors">
          Ver formato esperado
        </summary>
        <div className="mt-2 p-3 rounded-lg bg-foreground/[0.02] border border-foreground/[0.06] space-y-2">
          {mode === 'json' ? (
            <>
              <p><strong>type:</strong> <code className="text-cyan-400">&quot;single&quot;</code> (respuesta única) o <code className="text-cyan-400">&quot;weighted&quot;</code> (ponderada)</p>
              <p><strong>weight:</strong> <code className="text-cyan-400">100</code> = correcta, <code className="text-cyan-400">0</code> = incorrecta</p>
              <p>Para <code>single</code>, exactamente una opción debe tener <code>weight: 100</code></p>
              <p>Para <code>weighted</code>, asigna pesos de 0 a 100 a cada opción</p>
            </>
          ) : (
            <>
              <p><strong>Separador:</strong> punto y coma (<code>;</code>), coma (<code>,</code>) o tab</p>
              <p><strong>Columnas:</strong> pregunta; tipo; puntos; opción1; peso1; opción2; peso2; ...</p>
              <p><strong>tipo:</strong> <code>single</code> o <code>weighted</code></p>
              <p>Mínimo 2 pares opción/peso por pregunta</p>
            </>
          )}
        </div>
      </details>

      {/* Parse button */}
      {!result && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleParse}
          disabled={!rawText.trim()}
          className="w-full"
        >
          Validar preguntas
        </Button>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-500/[0.06] border border-red-500/20">
              <div className="flex items-center gap-1.5 text-xs font-medium text-red-400 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                {result.errors.length} error{result.errors.length !== 1 ? 'es' : ''}
              </div>
              <ul className="space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-[11px] text-red-300">{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Success summary */}
          {result.questions.length > 0 && (
            <div className="p-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {result.questions.length} pregunta{result.questions.length !== 1 ? 's' : ''} válida{result.questions.length !== 1 ? 's' : ''} · {result.questions.reduce((s, q) => s + q.points, 0)} pts total
              </div>
              <ul className="space-y-1">
                {result.questions.map((q, i) => (
                  <li key={i} className="text-[11px] text-emerald-300 flex items-center gap-2">
                    <span className="text-emerald-400/60 font-mono w-4">{i + 1}.</span>
                    <span className="truncate">{q.text}</span>
                    <span className="text-emerald-400/50 shrink-0">
                      {q.options.length} opc · {q.points}pt · {q.type === 'single' ? 'única' : 'pond.'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmImport}
              disabled={result.questions.length === 0}
            >
              Importar {result.questions.length} pregunta{result.questions.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
