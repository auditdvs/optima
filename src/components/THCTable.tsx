
import { ArrowDown, ArrowUp, ArrowUpDown, RefreshCw, Save, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';

interface DVSTask {
  code: number;
  name: string;
  region: string;
  pic: string;
  mdis: number;
  jan: boolean;
  feb: boolean;
  mar: boolean;
  apr: boolean;
  may: boolean;
  jun: boolean;
  jul: boolean;
  aug: boolean;
  sep: boolean;
  okt: boolean;
  nov: boolean;
  dec: boolean;
}

type SortDirection = 'asc' | 'desc';
interface SortConfig {
  key: keyof DVSTask;
  direction: SortDirection;
}

export default function THCTable() {
  const [tasks, setTasks] = useState<DVSTask[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New states for batch saving
  const [pendingChanges, setPendingChanges] = useState<Record<number, Partial<DVSTask>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Filter & Sort States
  const [filters, setFilters] = useState({
    pic: '',
    mdis: '',
    code: '',
    region: '',
    name: ''
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'region', direction: 'asc' });

  const months = [
    { key: 'jan', label: 'Jan' },
    { key: 'feb', label: 'Feb' },
    { key: 'mar', label: 'Mar' },
    { key: 'apr', label: 'Apr' },
    { key: 'may', label: 'Mei' },
    { key: 'jun', label: 'Jun' },
    { key: 'jul', label: 'Jul' },
    { key: 'aug', label: 'Agu' },
    { key: 'sep', label: 'Sep' },
    { key: 'okt', label: 'Okt' },
    { key: 'nov', label: 'Nov' },
    { key: 'dec', label: 'Des' },
  ];

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dvs_task')
        .select('*')
        .neq('region', 'HO')
        .not('name', 'ilike', '%Regional%')
        // We'll handle sorting client-side to support dynamic multi-column sorting features if needed,
        // but initial fetch can still be sorted.
        .order('region', { ascending: true })
        .order('code', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
      setPendingChanges({}); // Reset pending changes on refresh
    } catch (error) {
      console.error('Error fetching DVS tasks:', error);
      toast.error('Gagal mengambil data THC Task');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (taskCode: number, monthKey: string, currentValue: boolean) => {
    const newValue = !currentValue;

    // 1. Update UI state immediately
    setTasks(prevTasks => prevTasks.map(task => 
      task.code === taskCode 
        ? { ...task, [monthKey]: newValue }
        : task
    ));

    // 2. Track changes in pendingChanges
    setPendingChanges(prev => {
      const taskChanges = prev[taskCode] || {};
      return {
        ...prev,
        [taskCode]: { ...taskChanges, [monthKey]: newValue }
      };
    });
  };

  const handleSave = async () => {
    const changesCount = Object.keys(pendingChanges).length;
    if (changesCount === 0) return;

    setIsSaving(true);
    const toastId = toast.loading('Saving changes...');

    try {
      // Create an array of update promises
      const updatePromises = Object.entries(pendingChanges).map(([code, changes]) => {
        return supabase
          .from('dvs_task')
          .update(changes)
          .eq('code', code);
      });

      const results = await Promise.all(updatePromises);
      
      // Check for any errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('Errors saving some tasks:', errors);
        throw new Error('Some updates failed');
      }

      toast.success('All changes saved successfully', { id: toastId });
      setPendingChanges({});
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes. Please try again.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (Object.keys(pendingChanges).length > 0) {
      setIsCancelModalOpen(true);
    } else {
      fetchTasks();
    }
  };

  const confirmDiscard = () => {
    fetchTasks(); // Re-fetch to reset state
    setIsCancelModalOpen(false);
  };

  // --- Filter & Sort Logic ---

  const handleSort = (key: keyof DVSTask) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Get unique values for dropdowns
  const uniqueRegions = useMemo(() => Array.from(new Set(tasks.map(t => t.region))).filter(Boolean).sort(), [tasks]);
  const uniquePics = useMemo(() => Array.from(new Set(tasks.map(t => t.pic))).filter(Boolean).sort(), [tasks]);
  
  const processedTasks = useMemo(() => {
    let result = [...tasks];

    // 1. Filter
    if (filters.pic) result = result.filter(t => t.pic === filters.pic);
    if (filters.region) result = result.filter(t => t.region === filters.region);
    if (filters.mdis) result = result.filter(t => t.mdis?.toString().includes(filters.mdis));
    if (filters.code) result = result.filter(t => t.code?.toString().includes(filters.code));
    if (filters.name) result = result.filter(t => t.name.toLowerCase().includes(filters.name.toLowerCase()));

    // 2. Sort
    result.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;
      
      // Handle nulls always at bottom or top? Let's say standard sort
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [tasks, filters, sortConfig]);

  const hasUnsavedChanges = Object.keys(pendingChanges).length > 0;

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading THC Tasks...</div>
      </div>
    );
  }

  // Helper for rendering sort icon
  const SortIcon = ({ columnKey }: { columnKey: keyof DVSTask }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-gray-400 opacity-50" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="text-indigo-600" />
      : <ArrowDown size={14} className="text-indigo-600" />;
  };

  return (
    <>
    <div className="rounded-md border shadow-sm bg-white">
      <div className="p-4 border-b flex justify-between items-center flex-wrap gap-4">
        <div>
           <h3 className="text-lg font-semibold text-gray-900">THC Task Tracker</h3>
           <p className="text-sm text-gray-500 mt-1">
             Checklist THC task per cabang per bulan.
           </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Action Buttons */}
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 mr-2 animate-fadeIn">
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                {Object.keys(pendingChanges).length} unsaved rows
              </span>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-sm font-medium rounded-md border hover:bg-gray-50 disabled:opacity-50 transition-colors"
                title="Discard changes"
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          )}

          {!hasUnsavedChanges && (
            <button 
              onClick={() => fetchTasks()}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50 border-b sticky top-0 z-10">
            <tr>
              {/* PIC Column */}
              <th className="px-2 py-3 text-left border uppercase tracking-wider w-16 align-top">
                <div className="flex flex-col gap-2">
                  <div 
                    className="flex items-center justify-between cursor-pointer group"
                    onClick={() => handleSort('pic')}
                  >
                    <span className="font-bold text-gray-700 text-xs">PIC</span>
                    <SortIcon columnKey="pic" />
                  </div>
                  <select
                    value={filters.pic}
                    onChange={(e) => handleFilterChange('pic', e.target.value)}
                    className="w-full text-xs border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 py-1 px-1 h-7 bg-white"
                  >
                    <option value="">All</option>
                    {uniquePics.map(pic => (
                      <option key={pic} value={pic}>{pic}</option>
                    ))}
                  </select>
                </div>
              </th>

              {/* MDIS Column */}
              <th className="px-2 py-3 text-left border uppercase tracking-wider w-16 align-top">
                <div className="flex flex-col gap-2">
                  <div 
                    className="flex items-center justify-between cursor-pointer group"
                    onClick={() => handleSort('mdis')}
                  >
                    <span className="font-bold text-gray-700 text-xs">MDIS</span>
                    <SortIcon columnKey="mdis" />
                  </div>
                  <input 
                    type="text"
                    value={filters.mdis}
                    onChange={(e) => handleFilterChange('mdis', e.target.value)}
                    className="w-full text-xs border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 py-1 px-2 h-7"
                    placeholder="Filter"
                  />
                </div>
              </th>

              {/* REGIONAL Column */}
              <th className="px-2 py-3 text-left border uppercase tracking-wider w-24 align-top">
                <div className="flex flex-col gap-2">
                  <div 
                    className="flex items-center justify-between cursor-pointer group"
                    onClick={() => handleSort('region')}
                  >
                    <span className="font-bold text-gray-700 text-xs">Reg</span>
                    <SortIcon columnKey="region" />
                  </div>
                  <select
                    value={filters.region}
                    onChange={(e) => handleFilterChange('region', e.target.value)}
                    className="w-full text-xs border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 py-1 px-1 h-7 bg-white"
                  >
                    <option value="">All</option>
                    {uniqueRegions.map(reg => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                </div>
              </th>

              {/* CODE Column */}
              <th className="px-2 py-3 text-left border uppercase tracking-wider w-20 align-top">
                <div className="flex flex-col gap-2">
                  <div 
                    className="flex items-center justify-between cursor-pointer group"
                    onClick={() => handleSort('code')}
                  >
                    <span className="font-bold text-gray-700 text-xs">Code</span>
                    <SortIcon columnKey="code" />
                  </div>
                  <input 
                    type="text"
                    value={filters.code}
                    onChange={(e) => handleFilterChange('code', e.target.value)}
                    className="w-full text-xs border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 py-1 px-2 h-7"
                    placeholder="Filter"
                  />
                </div>
              </th>

              {/* CABANG Column */}
              <th className="px-2 py-3 text-left border uppercase tracking-wider align-top bg-white">
                <div className="flex flex-col gap-2">
                  <div 
                    className="flex items-center justify-between cursor-pointer group"
                    onClick={() => handleSort('name')}
                  >
                    <span className="font-bold text-gray-700 text-xs">Cabang</span>
                    <SortIcon columnKey="name" />
                  </div>
                  <input 
                    type="text"
                    value={filters.name}
                    onChange={(e) => handleFilterChange('name', e.target.value)}
                    className="w-full text-xs border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 py-1 px-2 h-7"
                    placeholder="Search Branch..."
                  />
                </div>
              </th>

              {/* Months Columns */}
              {months.map((month) => (
                <th key={month.key} className="px-2 py-3 text-center font-bold text-gray-700 border uppercase tracking-wider text-xs w-16">
                  {month.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {processedTasks.length > 0 ? (
              processedTasks.map((task, index) => (
                <tr 
                  key={task.code} 
                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                >
                  <td className="px-4 py-2 font-medium text-gray-900 border text-center">{task.pic || '-'}</td>
                  <td className="px-4 py-2 text-gray-700 border text-center">{task.mdis ?? '-'}</td>
                  <td className="px-4 py-2 text-gray-700 border text-center font-semibold">
                    {task.region}
                  </td>
                  <td className="px-4 py-2 text-gray-700 border text-center">{String(task.code).padStart(3, '0')}</td>
                  <td className="px-4 py-2 text-gray-700 border">{task.name}</td>
                  {months.map((month) => (
                    <td key={month.key} className="px-2 py-2 text-center border">
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={!!task[month.key as keyof DVSTask]}
                          onChange={() => handleCheckboxChange(task.code, month.key, !!task[month.key as keyof DVSTask])}
                          className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            ) : (
             <tr>
               <td colSpan={17} className="px-6 py-8 text-center text-sm text-gray-500">
                 {tasks.length === 0 ? (
                   <div className="flex flex-col items-center gap-2">
                     <p>Tidak ada data THC Task.</p>
                     <p className="text-xs text-gray-400">Jika data ada di database, pastikan kebijakan RLS (Row Level Security) sudah diatur untuk mengizinkan akses READ (SELECT).</p>
                   </div>
                 ) : (
                   <p>No tasks found for the selected region.</p>
                 )}
               </td>
             </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* Cancel Confirmation Modal */}
    {isCancelModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-fadeIn scale-100">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Discard Changes?</h3>
            <p className="text-gray-600 mb-6">
              You have {Object.keys(pendingChanges).length} unsaved changes. Are you sure you want to discard them? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
              >
                Keep Editing
              </button>
              <button
                onClick={confirmDiscard}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md font-medium transition-colors"
              >
                Yes, Discard
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
