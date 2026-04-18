'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Paperclip,
  Download,
  FileText,
  Image as ImageIcon,
  File,
  Loader2,
  Cpu,
} from 'lucide-react';

/* ─── Types ─── */
interface ChatFile {
  fileName: string;
  storedName: string;
  size: number;
  url: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'system';
  text: string;
  file?: ChatFile;
  time: string;
}

/* ─── Helpers ─── */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function now(): string {
  return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return ImageIcon;
  if (['pdf', 'docx', 'pptx', 'xlsx', 'md', 'txt'].includes(ext)) return FileText;
  return File;
}

let msgId = 0;
function nextId() { return `msg-${++msgId}`; }

/* ─── Component ─── */
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId(), role: 'system', text: '¡Hola! Bienvenido a NEXUS. Puedes escribir aquí o compartir archivos. 📎', time: now() },
  ]);
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const scrollDown = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  useEffect(() => { if (open) scrollDown(); }, [messages, open, scrollDown]);

  /* ── Send text ── */
  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'user', text: trimmed, time: now() },
    ]);
    setInput('');

    // Auto-response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'system', text: 'Gracias por tu mensaje. Un docente revisará tu consulta pronto. También puedes adjuntar archivos con el clip 📎.', time: now() },
      ]);
    }, 800);
  }

  /* ── Upload file ── */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/chat/upload', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [...prev, { id: nextId(), role: 'system', text: `Error: ${data.error}`, time: now() }]);
        return;
      }

      const chatFile: ChatFile = data;
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'user', text: `Archivo: ${chatFile.fileName}`, file: chatFile, time: now() },
      ]);

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'system', text: `Archivo "${chatFile.fileName}" recibido (${formatSize(chatFile.size)}). Queda disponible para descarga.`, time: now() },
        ]);
      }, 600);
    } catch {
      setMessages((prev) => [...prev, { id: nextId(), role: 'system', text: 'Error al subir el archivo. Intenta de nuevo.', time: now() }]);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      {/* ── FAB ── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/25 flex items-center justify-center hover:shadow-xl hover:shadow-cyan-500/30 transition-shadow cursor-pointer"
            aria-label="Abrir chat"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-4rem)] rounded-2xl border border-foreground/[0.08] bg-base shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/[0.08] bg-foreground/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">NEXUS Chat</p>
                  <p className="text-[10px] text-subtle">Soporte · Archivos disponibles</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-subtle hover:text-foreground hover:bg-foreground/[0.06] transition-colors cursor-pointer"
                aria-label="Cerrar chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white rounded-br-md'
                        : 'bg-foreground/[0.05] text-foreground rounded-bl-md'
                    }`}
                  >
                    <p>{msg.text}</p>
                    {msg.file && (
                      <a
                        href={msg.file.url}
                        download={msg.file.fileName}
                        className={`mt-2 flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                          msg.role === 'user'
                            ? 'bg-white/20 hover:bg-white/30 text-white'
                            : 'bg-foreground/[0.06] hover:bg-foreground/[0.1] text-muted'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{msg.file.fileName}</span>
                        <span className="shrink-0 text-[10px] opacity-70">{formatSize(msg.file.size)}</span>
                      </a>
                    )}
                    <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/50' : 'text-faint'}`}>{msg.time}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-2.5 border-t border-foreground/[0.08] bg-foreground/[0.02]">
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.md,.txt,.csv,.json,.zip,.html,.css,.js,.ts"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="p-2 rounded-lg text-subtle hover:text-foreground hover:bg-foreground/[0.06] transition-colors cursor-pointer disabled:opacity-40"
                  title="Adjuntar archivo"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-3 py-2 rounded-xl border border-foreground/[0.08] bg-foreground/[0.04] text-foreground text-sm placeholder-faint focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-2 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-30 disabled:shadow-none"
                  title="Enviar"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
