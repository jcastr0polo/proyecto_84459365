'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Paperclip,
  Download,
  Loader2,
  Cpu,
  User,
} from 'lucide-react';

/* ─── Types ─── */
interface ChatFile {
  fileName: string;
  storedName: string;
  size: number;
  url: string;
}

interface ServerMsg {
  id: number;
  user: string;
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

const COLORS = [
  'text-cyan-400', 'text-emerald-400', 'text-purple-400',
  'text-amber-400', 'text-pink-400', 'text-blue-400', 'text-rose-400',
];
function userColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

/* ─── Component ─── */
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [nameSet, setNameSet] = useState(false);
  const [messages, setMessages] = useState<ServerMsg[]>([]);
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const lastIdRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollDown = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }, []);

  /* ── Polling ── */
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/messages?after=${lastIdRef.current}`);
      if (!res.ok) return;
      const data = await res.json();
      const newMsgs: ServerMsg[] = data.messages;
      if (newMsgs.length > 0) {
        lastIdRef.current = newMsgs[newMsgs.length - 1].id;
        setMessages((prev) => [...prev, ...newMsgs]);
      }
    } catch { /* ignore network hiccups */ }
  }, []);

  useEffect(() => {
    if (open && nameSet) {
      fetchMessages();
      pollRef.current = setInterval(fetchMessages, 2000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [open, nameSet, fetchMessages]);

  useEffect(() => { if (open) scrollDown(); }, [messages, open, scrollDown]);

  /* ── Send text ── */
  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setInput('');
    setSending(true);
    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: username, text: trimmed }),
      });
      await fetchMessages();
    } catch { /* ignore */ }
    setSending(false);
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
        alert(data.error || 'Error al subir');
        return;
      }
      // Post message with file
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: username,
          text: `📎 ${data.fileName}`,
          file: data,
        }),
      });
      await fetchMessages();
    } catch { /* ignore */ }
    setUploading(false);
  }

  /* ── Confirm username ── */
  function confirmName() {
    const trimmed = username.trim();
    if (!trimmed) return;
    setUsername(trimmed);
    setNameSet(true);
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
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[540px] max-h-[calc(100vh-4rem)] rounded-2xl border border-foreground/[0.08] bg-base shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/[0.08] bg-foreground/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">NEXUS Chat</p>
                  <p className="text-[10px] text-subtle">
                    {nameSet ? `Conectado como ${username}` : 'Chat grupal · Archivos compartidos'}
                  </p>
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

            {!nameSet ? (
              /* ── Name prompt ── */
              <div className="flex-1 flex flex-col items-center justify-center px-8 gap-5">
                <div className="w-16 h-16 rounded-2xl bg-foreground/[0.04] border border-foreground/[0.08] flex items-center justify-center">
                  <User className="w-8 h-8 text-subtle" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">¿Cómo te llamas?</p>
                  <p className="text-xs text-subtle mt-1">Tu nombre será visible para los demás participantes.</p>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmName(); }}
                  placeholder="Tu nombre..."
                  maxLength={30}
                  className="w-full px-4 py-2.5 rounded-xl border border-foreground/[0.08] bg-foreground/[0.04] text-foreground text-sm placeholder-faint focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/30 transition-all text-center"
                  autoFocus
                />
                <button
                  onClick={confirmName}
                  disabled={!username.trim()}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-30"
                >
                  Entrar al chat
                </button>
              </div>
            ) : (
              <>
                {/* ── Messages ── */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-center text-xs text-faint mt-10">
                      No hay mensajes aún. ¡Sé el primero en escribir!
                    </p>
                  )}
                  {messages.map((msg) => {
                    const isMe = msg.user === username;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                            isMe
                              ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white rounded-br-md'
                              : 'bg-foreground/[0.05] text-foreground rounded-bl-md'
                          }`}
                        >
                          {!isMe && (
                            <p className={`text-[11px] font-semibold mb-0.5 ${userColor(msg.user)}`}>
                              {msg.user}
                            </p>
                          )}
                          <p>{msg.text}</p>
                          {msg.file && (
                            <a
                              href={msg.file.url}
                              download={msg.file.fileName}
                              className={`mt-2 flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                                isMe
                                  ? 'bg-white/20 hover:bg-white/30 text-white'
                                  : 'bg-foreground/[0.06] hover:bg-foreground/[0.1] text-muted'
                              }`}
                            >
                              <Download className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{msg.file.fileName}</span>
                              <span className="shrink-0 text-[10px] opacity-70">{formatSize(msg.file.size)}</span>
                            </a>
                          )}
                          <p className={`text-[10px] mt-1 ${isMe ? 'text-white/50' : 'text-faint'}`}>{msg.time}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* ── Input ── */}
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
                      maxLength={1000}
                      className="flex-1 px-3 py-2 rounded-xl border border-foreground/[0.08] bg-foreground/[0.04] text-foreground text-sm placeholder-faint focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || sending}
                      className="p-2 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-30 disabled:shadow-none"
                      title="Enviar"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
