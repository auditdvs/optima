import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    CheckCircle2,
    Copy,
    ExternalLink,
    Link2,
    Loader2,
    MousePointerClick,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Shortlink {
  id: string;
  slug: string;
  destination_url: string;
  title: string | null;
  click_count: number;
  created_by: string | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getShortUrl(slug: string) {
  return `${window.location.origin}/s/${slug}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/** Generate slug: {auditorId}{ddmmyy} — contoh: DDE270226 */
function generateSlug(auditorId: string): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  return `${auditorId.toUpperCase()}${dd}${mm}${yy}`;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  initial?: Partial<Shortlink>;
  auditorId: string | null;
  onClose: () => void;
  onSave: (data: { slug: string; destination_url: string; title: string }) => Promise<void>;
}

function ShortlinkModal({ initial, auditorId, onClose, onSave }: ModalProps) {
  const isEdit = !!initial?.id;

  // Slug: untuk buat baru = auto-generate, untuk edit = tetap pakai yang lama
  const [slug] = useState<string>(() =>
    isEdit ? (initial?.slug ?? '') : (auditorId ? generateSlug(auditorId) : '')
  );
  const [url, setUrl] = useState(initial?.destination_url ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !url) return;
    setSaving(true);
    try {
      await onSave({ slug, destination_url: url, title });
      onClose();
    } catch {
      // error handled in mutation
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-5 animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>

        <h2 className="text-base font-bold text-gray-900 mb-4">
          {isEdit ? 'Edit Shortlink' : 'Buat Shortlink'}
        </h2>

        {/* Slug chip */}
        <div className="flex items-center gap-2 mb-4 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
          <span className="text-xs text-gray-400">/s/</span>
          <span className="text-sm font-mono font-bold text-indigo-600 tracking-wider">{slug || '—'}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Label (opsional)"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
          />
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Paste URL tujuan"
            required
            autoFocus
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
          />

          <button
            type="submit"
            disabled={saving || !slug || !url}
            className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Menyimpan...' : isEdit ? 'Update' : 'Buat Shortlink'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ShortlinkPage() {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = ['superadmin', 'manager'].includes(userRole?.toLowerCase() ?? '');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Shortlink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [auditorId, setAuditorId] = useState<string | null>(null);

  // ── Fetch auditor_id dari profiles ──
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('auditor_id')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.auditor_id) setAuditorId(data.auditor_id);
      });
  }, [user]);

  // ── Fetch shortlinks ──
  const { data: links = [], isLoading, refetch } = useQuery<Shortlink[]>({
    queryKey: ['shortlinks'],
    queryFn: async () => {
      let query = supabase
        .from('shortlinks')
        .select('*')
        .order('created_at', { ascending: false });

      // User biasa hanya lihat milik sendiri
      if (!isAdmin && user?.email) {
        query = query.eq('created_by', user.email);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Shortlink[];
    },
  });

  // ── Create ──
  const createMutation = useMutation({
    mutationFn: async (payload: { slug: string; destination_url: string; title: string }) => {
      const { data: { user: u } } = await supabase.auth.getUser();
      const { error } = await supabase.from('shortlinks').insert({
        ...payload,
        created_by: u?.email ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shortlinks'] });
      toast.success('Shortlink berhasil dibuat!');
    },
    onError: (e: any) => {
      if (e?.code === '23505') toast.error('Slug sudah digunakan hari ini. Tunggu besok atau hubungi admin.');
      else toast.error('Gagal membuat shortlink.');
    },
  });

  // ── Update ──
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; slug: string; destination_url: string; title: string }) => {
      const { error } = await supabase.from('shortlinks').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shortlinks'] });
      toast.success('Shortlink diperbarui!');
    },
    onError: () => toast.error('Gagal memperbarui shortlink.'),
  });

  // ── Delete ──
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shortlinks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shortlinks'] });
      toast.success('Shortlink dihapus.');
      setDeleteId(null);
    },
    onError: () => toast.error('Gagal menghapus shortlink.'),
  });

  const handleCopy = (link: Shortlink) => {
    navigator.clipboard.writeText(getShortUrl(link.slug));
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSave = async (data: { slug: string; destination_url: string; title: string }) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  // Cek apakah slug hari ini sudah ada
  const todaySlug = auditorId ? generateSlug(auditorId) : null;
  const todaySlugExists = todaySlug ? links.some(l => l.slug === todaySlug) : false;

  return (
    <div className="p-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Link2 className="w-6 h-6 text-indigo-500" />
            Shortlink Manager
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            disabled={todaySlugExists}
            title={todaySlugExists ? 'Sudah membuat shortlink hari ini' : ''}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all shadow-sm ${
              todaySlugExists
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
            }`}
          >
            <Plus className="w-4 h-4" />
            Buat Shortlink
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{links.length}</p>
            <p className="text-xs text-gray-500">Total Link</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <MousePointerClick className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {links.reduce((sum, l) => sum + (l.click_count ?? 0), 0).toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-gray-500">Total Klik</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <p className="text-sm text-gray-500">Memuat shortlinks...</p>
          </div>
        ) : links.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
              <Link2 className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">Belum ada shortlink</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Label</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Link</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">URL Tujuan</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Klik</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Dibuat</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider pr-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {links.map(link => (
                  <tr key={link.id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900 truncate max-w-[180px]">
                        {link.title || <span className="text-gray-400 italic">Tanpa label</span>}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={getShortUrl(link.slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 hover:underline text-xs font-mono truncate max-w-[220px]"
                        >
                          {getShortUrl(link.slug)}
                        </a>
                        <button
                          onClick={() => handleCopy(link)}
                          className="p-1 rounded hover:bg-gray-100 shrink-0 transition-colors"
                          title="Salin URL"
                        >
                          {copiedId === link.id
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <a
                        href={link.destination_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-indigo-600 flex items-center gap-1 transition-colors max-w-xs truncate"
                        title={link.destination_url}
                      >
                        <span className="truncate">{link.destination_url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 font-semibold text-gray-700">
                        <MousePointerClick className="w-3.5 h-3.5 text-emerald-500" />
                        {(link.click_count ?? 0).toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <div>
                        <p className="text-gray-600 text-xs">{formatDate(link.created_at)}</p>
                        {link.created_by && (
                          <p className="text-gray-400 text-xs truncate max-w-[140px]">{link.created_by}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditing(link); setShowModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteId(link.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* Modal */}
      {showModal && (
        <ShortlinkModal
          initial={editing ?? undefined}
          auditorId={auditorId}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Hapus Shortlink?</h3>
                <p className="text-sm text-gray-500">Tindakan ini tidak bisa dibatalkan.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
