// Halaman redirect publik — tidak perlu login
// Dipanggil saat user buka: optima.komida.co.id/s/:slug
// Alur: fetch slug dari tabel → increment click_count → redirect ke destination_url

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function ShortlinkRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const [status, setStatus] = useState<'loading' | 'notfound' | 'error'>('loading');
  const hasRun = useRef(false);

  useEffect(() => {
    if (!slug || hasRun.current) return;
    hasRun.current = true;

    const redirect = async () => {
      try {
        // 1. Cari slug
        const { data, error } = await supabase
          .from('shortlinks')
          .select('id, destination_url, click_count')
          .eq('slug', slug)
          .single();

        if (error || !data) {
          setStatus('notfound');
          return;
        }

        // 2. Increment click_count via RPC (aman, fire & forget)
        supabase.rpc('increment_shortlink_click', { link_slug: slug }).then(() => {});

        // 3. Redirect
        window.location.replace(data.destination_url);

      } catch {
        setStatus('error');
      }
    };

    redirect();
  }, [slug]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md animate-pulse">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm font-medium animate-pulse">Mengalihkan...</p>
      </div>
    );
  }

  if (status === 'notfound') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-2">
          <span className="text-3xl">🔗</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Link tidak ditemukan</h1>
        <p className="text-gray-500 text-sm max-w-xs">
          Shortlink <code className="bg-gray-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono">/s/{slug}</code> tidak tersedia atau sudah dihapus.
        </p>
        <a
          href="/"
          className="mt-4 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Kembali ke Beranda
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3 text-center px-4">
      <h1 className="text-2xl font-bold text-gray-800">Terjadi Kesalahan</h1>
      <p className="text-gray-500 text-sm">Gagal memproses shortlink. Coba lagi nanti.</p>
      <a href="/" className="mt-4 text-indigo-600 text-sm font-medium hover:underline">← Kembali</a>
    </div>
  );
}
