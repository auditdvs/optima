import { Loader2, RotateCcw, Send, Sparkles, Zap } from 'lucide-react';
import { useRef, useState } from 'react';

// ==================== TYPES ====================
interface GrammarMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ==================== CONSTANTS ====================
const GRAMMAR_SYSTEM_PROMPT = `Anda adalah asisten ahli koreksi tata bahasa Bahasa Indonesia untuk laporan audit internal korporat. Tugas Anda:

1. Koreksi teks agar sesuai dengan kaidah Ejaan Yang Disempurnakan (EYD), tata bahasa baku, dan bahasa formal laporan audit internal.
2. Berikan hasil koreksi LANGSUNG (tanpa tanda kutip pembungkus, tanpa blok kode), kemudian berikan penjelasan singkat perubahan dalam 1-3 poin bullet bernomor.
3. Jika teks sudah benar secara tata bahasa, nyatakan bahwa tidak ada koreksi yang diperlukan dan beri apresiasi singkat.
4. Jangan mengubah makna atau substansi temuan audit, hanya koreksi aspek kebahasaan.
5. Perhatikan: istilah audit (seperti "fraud", "workpaper", "sampling", "KPI", "RTL", "Staf Lapang", "FSA", "MSA", "Manajer Cabang", "Asisten Manajer Cabang", "MIS", "MDISMO", "MDIS") boleh dipertahankan dalam bentuk aslinya.

Format respons:
[TEKS TERKOREKSI]

Perubahan:
1. ...
2. ...`;

// ==================== HELPERS ====================
const formatTime = (date: Date) =>
  date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

// ==================== COMPONENT ====================
export default function GrammarCorrection() {
  const [messages, setMessages] = useState<GrammarMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || isLoading) return;

    const userMsg: GrammarMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    scrollToBottom();

    const conversationHistory = updatedMessages.map(m => ({ role: m.role, content: m.content }));

    try {
      const groqKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!groqKey) throw new Error('VITE_GROQ_API_KEY belum dikonfigurasi di file .env');

      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: GRAMMAR_SYSTEM_PROMPT },
            ...conversationHistory,
          ],
          temperature: 0.3,
          max_tokens: 1200,
        }),
      });

      if (!resp.ok) throw new Error(`Groq API error: ${resp.status} ${resp.statusText}`);
      const data = await resp.json();
      const result = data?.choices?.[0]?.message?.content || 'Tidak ada respons dari AI.';

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result,
        timestamp: new Date(),
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ Error: ${err.message}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">

      {/* Topbar */}
      <div className="px-5 py-3 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">Grammar Correction</h1>
            <p className="text-[10px] text-gray-400 mt-0.5">⚡ Groq — Llama 3.3 70B</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Hapus sesi
            </button>
          )}
          <div className="flex items-center gap-1 text-[10px] text-gray-300">
            <Zap className="w-3 h-3 text-amber-400" />
            Tidak disimpan
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mb-4 shadow-sm">
              <Sparkles className="w-7 h-7 text-violet-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-700 mb-2">Siap Membantu Koreksi Teks</h3>
            <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
              Ketik atau tempel teks laporan audit yang ingin dikoreksi. AI akan memperbaiki tata bahasa sesuai EYD dan standar formal laporan audit internal.
            </p>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1 animate-in slide-in-from-bottom-2 duration-300 ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="flex items-center gap-1.5 ml-1">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <span className="text-[11px] text-gray-400 font-medium">Grammar AI</span>
              </div>
            )}

            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-none'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
              }`}
            >
              {msg.content}
            </div>

            <span className="text-[10px] text-gray-300 px-1">
              {formatTime(msg.timestamp)}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex flex-col items-start gap-1 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-1.5 ml-1">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-[11px] text-gray-400 font-medium">Grammar AI</span>
            </div>
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-none flex items-center gap-2 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
              <span className="text-sm text-gray-500">Menganalisis dan mengoreksi teks...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white shrink-0">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ketik atau tempel teks yang ingin dikoreksi... (Enter untuk kirim, Shift+Enter untuk baris baru)"
              rows={3}
              disabled={isLoading}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all outline-none disabled:opacity-50 leading-relaxed"
            />
            <p className="text-[10px] text-gray-300 mt-1.5 ml-1">
              ⚡ Riwayat chat otomatis terhapus saat halaman direfresh
            </p>
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white p-3 rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 mb-6"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
