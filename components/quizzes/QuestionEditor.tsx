'use client';

import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';

export interface QuestionOptionData {
  text: string;
  weight: number;
}

export interface QuestionData {
  text: string;
  type: 'single' | 'weighted';
  points: number;
  options: QuestionOptionData[];
}

interface QuestionEditorProps {
  question: QuestionData;
  index: number;
  onChange: (q: QuestionData) => void;
}

export default function QuestionEditor({ question, index, onChange }: QuestionEditorProps) {
  function updateOption(optIdx: number, field: keyof QuestionOptionData, value: string | number) {
    const opts = [...question.options];
    if (field === 'weight') {
      opts[optIdx] = { ...opts[optIdx], weight: value as number };

      // For single type, if setting one to 100, reset others to 0
      if (question.type === 'single' && value === 100) {
        opts.forEach((o, i) => {
          if (i !== optIdx) opts[i] = { ...o, weight: 0 };
        });
      }
    } else {
      opts[optIdx] = { ...opts[optIdx], text: value as string };
    }
    onChange({ ...question, options: opts });
  }

  function addOption() {
    onChange({
      ...question,
      options: [...question.options, { text: '', weight: 0 }],
    });
  }

  function removeOption(optIdx: number) {
    if (question.options.length <= 2) return;
    onChange({
      ...question,
      options: question.options.filter((_, i) => i !== optIdx),
    });
  }

  function setCorrectOption(optIdx: number) {
    if (question.type !== 'single') return;
    const opts = question.options.map((o, i) => ({
      ...o,
      weight: i === optIdx ? 100 : 0,
    }));
    onChange({ ...question, options: opts });
  }

  return (
    <div className="p-4 rounded-xl border border-foreground/[0.08] bg-foreground/[0.02]">
      {/* Question header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex items-center gap-1 text-faint shrink-0 pt-2">
          <GripVertical className="w-4 h-4" />
          <span className="text-xs font-bold">{index + 1}</span>
        </div>

        <div className="flex-1 space-y-3">
          {/* Question text */}
          <textarea
            value={question.text}
            onChange={(e) => onChange({ ...question, text: e.target.value })}
            placeholder="Enunciado de la pregunta..."
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground placeholder:text-faint outline-none focus:border-cyan-500/50 resize-y"
          />

          {/* Type + points row */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={question.type}
              onChange={(e) => {
                const newType = e.target.value as 'single' | 'weighted';
                let opts = question.options;
                if (newType === 'single') {
                  // Reset: first option correct
                  opts = opts.map((o, i) => ({ ...o, weight: i === 0 ? 100 : 0 }));
                }
                onChange({ ...question, type: newType, options: opts });
              }}
              className="px-2 py-1.5 text-xs rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
            >
              <option value="single">Respuesta única</option>
              <option value="weighted">Ponderada</option>
            </select>

            <div className="flex items-center gap-1.5">
              <label className="text-xs text-subtle">Puntos:</label>
              <input
                type="number"
                value={question.points}
                onChange={(e) => onChange({ ...question, points: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
                min={0.1}
                step={0.1}
                className="w-16 px-2 py-1.5 text-xs rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground outline-none focus:border-cyan-500/50 text-center"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="ml-8 space-y-2">
        {question.type === 'weighted' && (
          <p className="text-[10px] text-faint mb-1">
            Asigna peso (0-100) a cada opción. 100 = completamente correcta.
          </p>
        )}

        {question.options.map((opt, optIdx) => (
          <div key={optIdx} className="flex items-center gap-2">
            {question.type === 'single' ? (
              <button
                type="button"
                onClick={() => setCorrectOption(optIdx)}
                className={`w-5 h-5 rounded-full border-2 shrink-0 transition-colors cursor-pointer ${
                  opt.weight === 100
                    ? 'border-emerald-400 bg-emerald-400'
                    : 'border-foreground/20 hover:border-foreground/40'
                }`}
                title={opt.weight === 100 ? 'Respuesta correcta' : 'Marcar como correcta'}
              >
                {opt.weight === 100 && (
                  <svg className="w-3 h-3 text-white mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ) : (
              <input
                type="number"
                value={opt.weight}
                onChange={(e) => updateOption(optIdx, 'weight', Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                min={0}
                max={100}
                className="w-14 px-1.5 py-1.5 text-xs rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground outline-none focus:border-cyan-500/50 text-center shrink-0"
                title="Peso (0-100)"
              />
            )}

            <input
              type="text"
              value={opt.text}
              onChange={(e) => updateOption(optIdx, 'text', e.target.value)}
              placeholder={`Opción ${optIdx + 1}`}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-foreground/10 bg-foreground/[0.04] text-foreground placeholder:text-faint outline-none focus:border-cyan-500/50"
            />

            {question.options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(optIdx)}
                className="p-1.5 text-faint hover:text-red-400 transition-colors cursor-pointer shrink-0"
                title="Eliminar opción"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addOption}
          className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer mt-1"
        >
          <Plus className="w-3.5 h-3.5" /> Agregar opción
        </button>
      </div>
    </div>
  );
}
