import {
  ArrowUp,
  Bot,
  Check,
  ClipboardCopy,
  Loader2,
  MessageSquareText,
  Sparkles,
  User,
  X
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';

// ─── Types ───────────────────────────────────────────────
interface AuditFinding {
  id: number;
  judul_temuan: string | null;
  penyebab: string | null;
  dampak: string | null;
  kelemahan: string | null;
  rekomendasi: string | null;
  matched_fields: string; // comma-separated field names
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  findings?: AuditFinding[];
  timestamp: Date;
  isLoading?: boolean;
  field?: string;
  query?: string;
  duration_ms?: number;
}


const FIELD_CONFIG: { key: keyof Omit<AuditFinding, 'id' | 'matched_fields'>; label: string; color: string; copyColor: string }[] = [
  { key: 'judul_temuan', label: 'Judul Temuan', color: 'border-l-blue-400 bg-blue-50/40', copyColor: 'hover:bg-blue-100 text-blue-600' },
  { key: 'penyebab', label: 'Penyebab', color: 'border-l-amber-400 bg-amber-50/40', copyColor: 'hover:bg-amber-100 text-amber-600' },
  { key: 'dampak', label: 'Dampak', color: 'border-l-red-400 bg-red-50/40', copyColor: 'hover:bg-red-100 text-red-600' },
  { key: 'kelemahan', label: 'Kelemahan', color: 'border-l-purple-400 bg-purple-50/40', copyColor: 'hover:bg-purple-100 text-purple-600' },
  { key: 'rekomendasi', label: 'Rekomendasi', color: 'border-l-green-400 bg-green-50/40', copyColor: 'hover:bg-green-100 text-green-600' },
];

// ─── Component ───────────────────────────────────────────
export default function AuditAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'system',
      content: 'Selamat datang di AI Audit Assistant!\n\nKetik kata kunci temuan audit, dan saya akan menampilkan contoh temuan lengkap (judul - rekomendasi) dari database laporan audit yang sudah terverifikasi QA.\n\nContoh: "galon", "kas", "pembelian", "pinjaman"',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);


  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  // ─── Search function ─────────────────────────────────
  const searchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 3) return;

    const msgId = `user-${Date.now()}`;
    const loadingId = `loading-${Date.now()}`;

    setMessages(prev => [
      ...prev,
      { id: msgId, role: 'user', content: query, timestamp: new Date() },
      { id: loadingId, role: 'assistant', content: '', timestamp: new Date(), isLoading: true },
    ]);

    setIsLoading(true);

    try {
      let findings: AuditFinding[] = [];

      // Try RPC first
      try {
        const { data, error } = await supabase.rpc('search_audit_suggestions', {
          search_query: query.trim(),
          search_field: 'all',
          result_limit: 3,
        });

        if (!error && data && data.length > 0) {
          findings = data.map((row: any) => ({
            id: row.id,
            judul_temuan: row.judul_temuan || null,
            penyebab: row.penyebab || null,
            dampak: row.dampak || null,
            kelemahan: row.kelemahan || null,
            rekomendasi: row.rekomendasi || null,
            matched_fields: row.matched_fields || '',
          }));
        } else {
          throw new Error('RPC empty');
        }
      } catch {
        // Fallback: Direct ILIKE search
        const q = query.trim();

        let supabaseQuery = supabase
          .from('matriks')
          .select('id, judul_temuan, penyebab, dampak, kelemahan, rekomendasi');

          supabaseQuery = supabaseQuery.or(
            `judul_temuan.ilike.%${q}%,penyebab.ilike.%${q}%,dampak.ilike.%${q}%,kelemahan.ilike.%${q}%,rekomendasi.ilike.%${q}%`
          );

        const { data: directData } = await supabaseQuery.limit(3);

        if (directData && directData.length > 0) {
          const qLower = q.toLowerCase();
          findings = directData.map((row: any) => {
            const matched: string[] = [];
            if (row.judul_temuan && row.judul_temuan.toLowerCase().includes(qLower)) matched.push('judul_temuan');
            if (row.penyebab && row.penyebab.toLowerCase().includes(qLower)) matched.push('penyebab');
            if (row.dampak && row.dampak.toLowerCase().includes(qLower)) matched.push('dampak');
            if (row.kelemahan && row.kelemahan.toLowerCase().includes(qLower)) matched.push('kelemahan');
            if (row.rekomendasi && row.rekomendasi.toLowerCase().includes(qLower)) matched.push('rekomendasi');
            return {
              id: row.id,
              judul_temuan: row.judul_temuan || null,
              penyebab: row.penyebab || null,
              dampak: row.dampak || null,
              kelemahan: row.kelemahan || null,
              rekomendasi: row.rekomendasi || null,
              matched_fields: matched.join(','),
            };
          });
        }
      }

      // Update message with results
      setMessages(prev =>
        prev.map(msg =>
          msg.id === loadingId
            ? {
                ...msg,
                isLoading: false,
                content: findings.length > 0
                  ? `Ditemukan ${findings.length} temuan`
                  : 'Tidak ditemukan temuan yang mengandung kata tersebut. Coba kata kunci lain.',
                findings: findings.length > 0 ? findings : undefined,

                query,
              }
            : msg
        )
      );
    } catch (err) {
      console.error('Search error:', err);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === loadingId
            ? { ...msg, isLoading: false, content: 'Terjadi kesalahan. Silakan coba lagi.' }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Handlers ─────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    const query = input.trim();
    if (!query || query.length < 3 || isLoading) return;
    setInput('');
    searchSuggestions(query);
  }, [input, isLoading, searchSuggestions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success('Disalin ke clipboard!', { duration: 1500, style: { fontSize: '13px' } });
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error('Gagal menyalin');
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'system',
        content: 'Chat dibersihkan. Ketik kata kunci untuk mencari temuan audit.',
        timestamp: new Date(),
      },
    ]);
  };

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="-m-6 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200/50">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">AI Audit Assistant</h1>
            <p className="text-xs text-gray-500">Cari temuan lengkap dari 2.500+ laporan audit terverifikasi</p>
          </div>
        </div>
        <button onClick={clearChat} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all" title="Bersihkan chat">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {/* Avatar */}
            {message.role !== 'user' && (
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                message.role === 'system'
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                  : 'bg-gradient-to-br from-indigo-500 to-purple-600'
              } shadow-md`}>
                {message.role === 'system' ? (
                  <MessageSquareText className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
            )}

            {/* Message Bubble */}
            <div
              className={`max-w-[90%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-md shadow-lg shadow-indigo-200/50'
                  : message.role === 'system'
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 text-gray-700 rounded-bl-md'
                  : 'bg-white border border-gray-100 text-gray-700 rounded-bl-md shadow-sm'
              }`}
            >
              {/* Loading */}
              {message.isLoading && (
                <div className="flex items-center gap-2 py-1">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  <span className="text-sm text-gray-500">Mencari temuan...</span>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {/* Text content */}
              {!message.isLoading && message.content && (
                <p className={`text-sm whitespace-pre-wrap leading-relaxed ${message.role === 'user' ? 'text-white' : ''}`}>
                  {message.content}
                </p>
              )}



              {/* ─── Finding Cards ─── */}
              {message.findings && message.findings.length > 0 && (
                <div className="mt-3 space-y-4">
                  {message.findings.map((finding, fIdx) => {
                    const matchedArr = finding.matched_fields ? finding.matched_fields.split(',') : [];

                    return (
                      <div key={`finding-${finding.id}-${fIdx}`} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                        {/* Finding header */}
                        <div className="px-3 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100 flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-700">
                            Temuan #{finding.id}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Match: {matchedArr.map(f => {
                              const cfg = FIELD_CONFIG.find(c => c.key === f);
                              return cfg?.label || f;
                            }).join(', ')}
                          </span>
                        </div>

                        {/* 5 Fields */}
                        <div className="divide-y divide-gray-50">
                          {FIELD_CONFIG.map(({ key, label, color, copyColor }) => {
                            const value = finding[key] as string | null;
                            const isMatched = matchedArr.includes(key);
                            const copyKey = `${finding.id}-${key}`;
                            const isCopied = copiedKey === copyKey;

                            return (
                              <div
                                key={key}
                                className={`px-3 py-2.5 border-l-[3px] ${isMatched ? color : 'border-l-transparent bg-white'} ${!value ? 'opacity-40' : ''}`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[11px] font-semibold ${isMatched ? 'text-gray-800' : 'text-gray-500'}`}>
                                      {label}
                                    </span>
                                    {isMatched && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-bold">
                                        MATCH
                                      </span>
                                    )}
                                  </div>
                                  {value && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); copyToClipboard(value, copyKey); }}
                                      className={`p-1 rounded-md transition-all ${isCopied ? 'bg-green-100 text-green-600' : `bg-gray-50 text-gray-400 ${copyColor}`}`}
                                      title={`Salin ${label}`}
                                    >
                                      {isCopied ? <Check className="w-3 h-3" /> : <ClipboardCopy className="w-3 h-3" />}
                                    </button>
                                  )}
                                </div>
                                <p className={`text-[13px] leading-relaxed ${value ? 'text-gray-700' : 'text-gray-400 italic'}`}>
                                  {value
                                    ? value.length > 300 ? value.slice(0, 300) + '...' : value
                                    : '(tidak ada data)'}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* User avatar */}
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center shadow-md">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 px-4 py-3 bg-white border-t border-gray-100">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik kata kunci temuan audit..."
              rows={1}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 
                focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 focus:bg-white
                text-sm resize-none transition-all placeholder:text-gray-400"
              disabled={isLoading}
            />
            {input.trim().length > 0 && input.trim().length < 3 && (
              <span className="absolute right-3 bottom-3 text-[10px] text-amber-500 font-medium">Min. 3 karakter</span>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={isLoading || input.trim().length < 3}
            className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
              isLoading || input.trim().length < 3
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:shadow-indigo-300/50 hover:scale-[1.02] active:scale-95'
            }`}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUp className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
