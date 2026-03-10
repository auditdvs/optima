import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, CheckCircle2, Loader2, Palette, Plus, Rocket, Tag, Wrench, X } from 'lucide-react';
import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface ChangelogItem {
  id: string;
  release_date: string;
  icon: string;
  title: string;
  description: string;
  created_at: string;
}

export default function Changelog() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Format YYYY-MM-DD for input date default
  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    release_date: today,
    icon: 'Wrench',
    title: '',
    description: '',
  });

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['system_changelog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_changelog')
        .select('*')
        .order('release_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ChangelogItem[];
    }
  });

  const addLogMutation = useMutation({
    mutationFn: async (newLog: Omit<ChangelogItem, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('system_changelog')
        .insert([newLog])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system_changelog'] });
      toast.success('Changelog baru berhasil ditambahkan!');
      setIsModalOpen(false);
      setFormData({ ...formData, title: '', description: '', release_date: today });
    },
    onError: (error) => {
      console.error(error);
      toast.error('Gagal menambahkan changelog.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.release_date) {
      toast.error('Mohon lengkapi semua data!');
      return;
    }
    
    addLogMutation.mutate(formData);
  };

  // Grouping logic for rendering per month
  const groupedLogs = logsData?.reduce((acc: any, curr) => {
    const dateObj = new Date(curr.release_date);
    const monthYear = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    
    if (!acc[monthYear]) {
      acc[monthYear] = {
        period: monthYear,
        icon: curr.icon, 
        items: []
      };
    }
    acc[monthYear].items.push(curr);
    return acc;
  }, {});

  const renderGroups = groupedLogs ? Object.values(groupedLogs) : [];

  const getIcon = (iconName: string, className: string) => {
    switch(iconName) {
      case 'Wrench': return <Wrench className={className} />;
      case 'Palette': return <Palette className={className} />;
      case 'Rocket': return <Rocket className={className} />;
      case 'Tag': return <Tag className={className} />;
      default: return <CheckCircle2 className={className} />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
      <Toaster position="top-right" />
      
      <div className="p-6 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Sistem Changelog
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Rekap daftar perubahan dan rilis fitur sistem secara real-time.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Changelog Baru
        </button>
      </div>
      
      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="ml-2 text-sm text-gray-500">Memuat changelog database...</span>
          </div>
        ) : (
          <div className="space-y-8">
            {renderGroups.map((log: any, idx) => (
              <div key={idx} className="relative">
                {idx !== renderGroups.length - 1 && (
                  <div className="absolute left-[11px] top-8 bottom-[-32px] w-[2px] bg-gray-100" />
                )}
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-white rounded-full p-1 ring-4 ring-white z-10 shadow-sm border border-gray-100">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                  </div>
                  <h3 className="text-md font-bold text-gray-800">{log.period}</h3>
                </div>
                
                <div className="ml-10 space-y-4">
                  {log.items.map((item: ChangelogItem, itemIdx: number) => {
                    const itemDate = new Date(item.release_date).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    }).replace(/\//g, '-');

                    return (
                      <div key={itemIdx} className="bg-gray-50 rounded-lg p-4 border border-gray-100/50 hover:border-indigo-100 transition-colors flex flex-col md:flex-row gap-4 items-start">
                        {/* Date Badge */}
                        <div className="flex-shrink-0 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 whitespace-nowrap shadow-sm mt-0.5">
                          {itemDate}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1">
                          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-1">
                            {getIcon(item.icon, "w-4 h-4 text-emerald-500 flex-shrink-0")}
                            {item.title}
                          </h4>
                          <p className="text-sm text-gray-600 leading-relaxed max-w-3xl">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {renderGroups.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-10">Belum ada data changelog di database.</p>
            )}
          </div>
        )}
      </div>

      {/* Modal Add Changelog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Tambah Changelog System</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Rilis</label>
                  <input
                    type="date"
                    required
                    value={formData.release_date}
                    onChange={(e) => setFormData({...formData, release_date: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ikon Grup</label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({...formData, icon: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Wrench">Wrench (Perbaikan)</option>
                    <option value="Palette">Palette (Desain & UI)</option>
                    <option value="Rocket">Rocket (Rilis Fitur)</option>
                    <option value="Tag">Tag (Lainnya)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul Perbaikan/Fitur</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Misal: Penyesuaian Modal Login..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi & Catatan Rilis</label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Ceritakan teknis singkat yang diperbarui disini..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={addLogMutation.isPending}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addLogMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center justify-center min-w-[120px]"
                >
                  {addLogMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Simpan Log'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
