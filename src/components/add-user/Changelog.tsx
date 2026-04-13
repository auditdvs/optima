import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, CheckCircle2, FileText, Loader2, Palette, Plus, Rocket, Tag, Wrench, X } from 'lucide-react';
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

  const getIcon = (iconName: string, className: string) => {
    switch(iconName) {
      case 'Wrench': return <Wrench className={className} />;
      case 'Palette': return <Palette className={className} />;
      case 'Rocket': return <Rocket className={className} />;
      case 'Tag': return <Tag className={className} />;
      default: return <CheckCircle2 className={className} />;
    }
  };

  const getLabel = (iconName: string) => {
    switch(iconName) {
      case 'Wrench': return 'Fixes';
      case 'Palette': return 'Design';
      case 'Rocket': return 'Feature';
      case 'Tag': return 'Misc';
      default: return 'Update';
    }
  };

  const getLabelColor = (iconName: string) => {
    switch(iconName) {
      case 'Wrench': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'Palette': return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'Rocket': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'Tag': return 'text-gray-700 bg-gray-50 border-gray-200';
      default: return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
      <Toaster position="top-right" />
      
      <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 tracking-tight">
            <Tag className="w-5 h-5 text-gray-400" />
            Releases
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            System changelog, updates, and feature rollouts.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#2da44e] hover:bg-[#2c974b] text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm border border-[rgba(27,31,36,0.15)]"
        >
          Draft a new release
        </button>
      </div>
      
      <div className="p-0 bg-white">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-3 text-sm font-medium text-gray-500">Loading releases...</span>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto py-8">
            <div className="px-6 space-y-12">
              {logsData && logsData.map((item: ChangelogItem, idx: number) => {
                const itemDateObj = new Date(item.release_date);
                const formattedDate = itemDateObj.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                
                const isLatest = idx === 0;

                return (
                  <div key={item.id} className="relative flex flex-col md:flex-row gap-6">
                    {/* Timeline connecting line (hidden on mobile) */}
                    {idx !== logsData.length - 1 && (
                      <div className="hidden md:block absolute left-[140px] top-8 bottom-[-48px] w-[2px] bg-gray-200 z-0" />
                    )}

                    {/* Left Column: Date & Badge */}
                    <div className="md:w-[130px] shrink-0 pt-1 relative z-10 flex flex-col md:items-end gap-2 text-left md:text-right">
                      <div className="bg-white py-1 pr-2">
                        <span className="text-sm font-medium text-gray-500 whitespace-nowrap">
                          {formattedDate}
                        </span>
                      </div>
                      {isLatest && (
                        <div className="bg-white py-1 pr-2">
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-600/20">
                            Latest
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Content Box */}
                    <div className="flex-1 min-w-0 relative z-10">
                      <div className="bg-white border rounded-lg overflow-hidden border-gray-200 shadow-sm transition-shadow hover:shadow-md">
                        
                        {/* Box Header */}
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-md ${getLabelColor(item.icon)} shadow-sm bg-white`}>
                               {getIcon(item.icon, "w-4 h-4")}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                              {item.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getLabelColor(item.icon)}`}>
                              {getLabel(item.icon)}
                            </span>
                          </div>
                        </div>

                        {/* Box Body */}
                        <div className="px-6 py-6 prose prose-sm prose-gray max-w-none text-[#24292f] whitespace-pre-wrap leading-[1.6]">
                          {item.description}
                        </div>
                        
                        {/* Box Footer */}
                        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-300">
                             <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" className="w-[12px] h-[12px] opacity-60" alt="avatar" />
                          </div>
                          <span className="text-xs text-gray-500 font-medium">
                            <span className="font-semibold text-gray-700">optima-system</span> released this update
                          </span>
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}
              
              {(!logsData || logsData.length === 0) && (
                <div className="text-center py-24 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No releases found</h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">There are no changelog entries documented yet. Draft a new release to get started.</p>
                </div>
              )}
            </div>
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
