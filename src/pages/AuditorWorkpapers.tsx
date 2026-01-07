import { Check, Save, Search, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import RPMRegistrationComponent from '../components/assignment/RPMRegistration';
import { supabase } from '../lib/supabaseClient';

// --- Interfaces ---

interface AuditMaster {
  id: string;
  branch_name: string;
  region: string;
  audit_type: 'regular' | 'fraud' | 'special';
  audit_start_date: string;
  audit_end_date: string;
  audit_period_start?: string;
  audit_period_end?: string;
  leader?: string;
  team?: string;
  rating?: 'high' | 'medium' | 'low';
  
  // Regular Audit Fields
  dapa_reg?: boolean;
  revised_dapa_reg?: boolean;
  dapa_supporting_data_reg?: boolean;
  assignment_letter_reg?: boolean;
  entrance_agenda_reg?: boolean;
  audit_wp_reg?: boolean;
  exit_meeting_minutes_reg?: boolean;
  exit_attendance_list_reg?: boolean;
  audit_result_letter_reg?: boolean;
  rta_reg?: boolean;
  monitoring_reg?: string;
  comment_reg?: string;

  // Special (Fraud) Audit Fields
  data_prep?: boolean;
  assignment_letter_fr?: boolean;
  audit_wp_fr?: boolean;
  audit_report_fr?: boolean;
  detailed_findings_fr?: boolean;
  comment_fr?: string;
}

interface Auditor {
  id: string;
  name: string;
  auditor_id?: string;
}

// --- Components ---

const CheckboxCell = ({ 
  checked, 
  onChange 
}: { 
  checked?: boolean; 
  onChange: (checked: boolean) => void;
}) => {
  return (
    <div 
      className={`flex items-center justify-center w-8 h-8 rounded cursor-pointer transition-colors ${
        checked ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
      }`}
      onClick={() => onChange(!checked)}
    >
      {checked ? <Check size={18} /> : <X size={18} />}
    </div>
  );
};

const getInitialsFromName = (name: string, auditors: Auditor[]): string => {
  if (!name) return '-';
  
  const auditor = auditors.find(a => a.name === name);
  if (auditor?.auditor_id) {
    return auditor.auditor_id;
  }
  
  const nameParts = name.trim().split(/\s+/);
  if (nameParts.length === 1) {
    return nameParts[0].substring(0, 3).toUpperCase();
  }
  return nameParts.map(part => part[0]).join('').toUpperCase();
};

const formatAuditPeriod = (audit: AuditMaster): string => {
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  if (audit.audit_period_start && audit.audit_period_end) {
    const formatMonthYear = (dateStr: string) => {
      const date = new Date(dateStr);
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      return `${month}, ${year}`;
    };
    return `${formatMonthYear(audit.audit_period_start)} s.d. ${formatMonthYear(audit.audit_period_end)}`;
  }
  
  if (audit.audit_start_date && audit.audit_end_date) {
    const formatMonthYear = (dateStr: string) => {
      const date = new Date(dateStr);
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      return `${month}, ${year}`;
    };
    return `${formatMonthYear(audit.audit_start_date)} s.d. ${formatMonthYear(audit.audit_end_date)}`;
  }
  
  return '-';
};

const AuditorWorkpapers: React.FC = () => {
  // --- State ---
  const [audits, setAudits] = useState<AuditMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'regular' | 'special' | 'rpm'>('regular');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  // Filter Options
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  // Auditors for initials mapping
  const [auditors, setAuditors] = useState<Auditor[]>([]);

  // Tracking Changes
  const [modifiedRows, setModifiedRows] = useState<Record<string, Partial<AuditMaster>>>({});

  // --- Effects ---

  useEffect(() => {
    fetchInitialData();
    fetchAuditors();
  }, []);

  // --- Data Fetching ---

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      const { data: auditData, error: auditError } = await supabase
        .from('audit_master')
        .select('*')
        .order('branch_name');
      
      if (auditError) throw auditError;
      
      if (auditData) {
        setAudits(auditData);
        
        const regions = Array.from(new Set(auditData.map(a => a.region).filter(Boolean))).sort();
        const years = Array.from(new Set(auditData.flatMap(a => [
          new Date(a.audit_start_date).getFullYear(),
          new Date(a.audit_end_date).getFullYear()
        ]))).sort((a, b) => b - a).map(String);
        
        setAvailableRegions(regions);
        setAvailableYears(years);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data audit');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditors = async () => {
    try {
      const { data, error } = await supabase
        .from('auditors')
        .select('id, name, auditor_id')
        .order('name');
      
      if (error) throw error;
      setAuditors(data || []);
    } catch (error) {
      console.error('Error fetching auditors:', error);
    }
  };

  // --- Handlers ---

  const handleCheckboxChange = (auditId: string, field: keyof AuditMaster, value: boolean) => {
    setAudits(prev => prev.map(audit => 
      audit.id === auditId ? { ...audit, [field]: value } : audit
    ));
    setModifiedRows(prev => ({
      ...prev,
      [auditId]: { ...(prev[auditId] || {}), [field]: value }
    }));
  };

  const handleTextChange = (auditId: string, field: keyof AuditMaster, value: string) => {
    setAudits(prev => prev.map(audit => 
      audit.id === auditId ? { ...audit, [field]: value } : audit
    ));
    setModifiedRows(prev => ({
      ...prev,
      [auditId]: { ...(prev[auditId] || {}), [field]: value }
    }));
  };

  const handleSaveChanges = async () => {
    const modifiedIds = Object.keys(modifiedRows);
    if (modifiedIds.length === 0) {
      toast('Tidak ada perubahan untuk disimpan');
      return;
    }
    
    try {
      for (const id of modifiedIds) {
        const updates = modifiedRows[id];
        const { error } = await supabase
          .from('audit_master')
          .update(updates)
          .eq('id', id);
        
        if (error) throw error;
      }
      
      toast.success(`${modifiedIds.length} baris berhasil disimpan`);
      setModifiedRows({});
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Gagal menyimpan perubahan');
    }
  };

  // --- Filtered Data ---

  const filteredAudits = audits.filter(audit => {
    if (activeTab === 'regular' && audit.audit_type !== 'regular') return false;
    if (activeTab === 'special' && audit.audit_type !== 'fraud' && audit.audit_type !== 'special') return false;
    
    if (searchTerm && !audit.branch_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedRegion && audit.region !== selectedRegion) return false;
    if (selectedYear) {
      const startYear = new Date(audit.audit_start_date).getFullYear().toString();
      const endYear = new Date(audit.audit_end_date).getFullYear().toString();
      if (startYear !== selectedYear && endYear !== selectedYear) return false;
    }
    return true;
  });

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Kertas Kerja Auditor</h1>
            <p className="text-sm text-gray-500 mt-1">Kelola kertas kerja audit reguler dan khusus. Setelah checklist jangan lupa klik tombol simpan, untuk menyimpan data yang sudah di checklist.</p>
          </div>

          {/* Tabs */}
          <div className="inline-flex items-center bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('regular')}
              className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'regular' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Audit Reguler
            </button>
            <button
              onClick={() => setActiveTab('special')}
              className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'special' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Audit Khusus
            </button>
            <button
              onClick={() => setActiveTab('rpm')}
              className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'rpm' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Register RPM
            </button>
          </div>
        </div>

        {/* Action Buttons - only show for audit tabs */}
        {activeTab !== 'rpm' && (
          <div className="flex gap-2 flex-wrap md:justify-end">
            <button
              onClick={handleSaveChanges}
              disabled={Object.keys(modifiedRows).length === 0}
              className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2 text-white rounded transition-colors text-sm font-medium ${
                Object.keys(modifiedRows).length > 0 
                  ? 'bg-indigo-600 hover:bg-indigo-700' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              <Save size={18} className="mr-2" />
              <span>Simpan</span>
            </button>
          </div>
        )}
      </div>

      {/* RPM Registration Tab Content */}
      {activeTab === 'rpm' ? (
        <RPMRegistrationComponent />

      ) : (
        <>
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex flex-col md:flex-row flex-wrap gap-4 items-stretch md:items-center">
          <div className="flex-1 flex flex-col md:flex-row gap-4">
            <div className="flex gap-2">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Semua Region</option>
                {availableRegions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Semua Tahun</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Cari cabang..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 w-full border rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-4">
        {filteredAudits.length === 0 ? (
           <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
             Tidak ada audit yang sesuai dengan filter Anda.
           </div>
        ) : (
          filteredAudits.map((audit) => (
            <div key={audit.id} className="bg-white p-4 rounded-lg shadow border border-gray-100 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900">{audit.branch_name}</h3>
                  <div className="text-xs text-gray-500 mt-0.5">{audit.region}</div>
                </div>
              </div>

              <div className="text-sm space-y-3">
                 <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                    <div>
                      <span className="block text-gray-400 font-medium">Periode</span>
                      {activeTab === 'regular' ? formatAuditPeriod(audit) : new Date(audit.audit_start_date).toLocaleDateString()}
                    </div>
                    <div>
                       <span className="block text-gray-400 font-medium">Tim</span>
                       <span className="truncate block" title={audit.team}>{audit.leader ? getInitialsFromName(audit.leader, auditors) : '-'}</span>
                    </div>
                 </div>

                 <details className="group border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <summary className="bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 flex justify-between items-center select-none">
                       <span>Checklist Dokumen</span>
                       <span className="text-gray-400 group-open:rotate-180 transition-transform duration-200">▼</span>
                    </summary>
                    <div className="p-3 bg-gray-50 border-t border-gray-200 grid grid-cols-2 gap-3">
                       {activeTab === 'regular' && (
                          <>
                            <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.dapa_reg} onChange={(v) => handleCheckboxChange(audit.id, 'dapa_reg', v)} /> DAPA</label>
                            <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.revised_dapa_reg} onChange={(v) => handleCheckboxChange(audit.id, 'revised_dapa_reg', v)} /> DAPA Perubahan</label>
                            <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.dapa_supporting_data_reg} onChange={(v) => handleCheckboxChange(audit.id, 'dapa_supporting_data_reg', v)} /> Data Pendukung</label>
                            <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.assignment_letter_reg} onChange={(v) => handleCheckboxChange(audit.id, 'assignment_letter_reg', v)} /> Surat Tugas</label>
                            <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.entrance_agenda_reg} onChange={(v) => handleCheckboxChange(audit.id, 'entrance_agenda_reg', v)} /> Ent. Agenda</label>
                            <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.audit_wp_reg} onChange={(v) => handleCheckboxChange(audit.id, 'audit_wp_reg', v)} /> Audit WP</label>
                            <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.exit_meeting_minutes_reg} onChange={(v) => handleCheckboxChange(audit.id, 'exit_meeting_minutes_reg', v)} /> Exit Mins</label>
                            <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.exit_attendance_list_reg} onChange={(v) => handleCheckboxChange(audit.id, 'exit_attendance_list_reg', v)} /> Exit Attd.</label>
                            <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.audit_result_letter_reg} onChange={(v) => handleCheckboxChange(audit.id, 'audit_result_letter_reg', v)} /> Res. Letter</label>
                            <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.rta_reg} onChange={(v) => handleCheckboxChange(audit.id, 'rta_reg', v)} /> RTA</label>
                          </>
                       )}
                       {activeTab === 'special' && (
                          <>
                            <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.data_prep} onChange={(v) => handleCheckboxChange(audit.id, 'data_prep', v)} /> Data Prep</label>
                            <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.assignment_letter_fr} onChange={(v) => handleCheckboxChange(audit.id, 'assignment_letter_fr', v)} /> Surat Tugas</label>
                            <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.audit_wp_fr} onChange={(v) => handleCheckboxChange(audit.id, 'audit_wp_fr', v)} /> Audit WP</label>
                            <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.audit_report_fr} onChange={(v) => handleCheckboxChange(audit.id, 'audit_report_fr', v)} /> Laporan</label>
                            <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.detailed_findings_fr} onChange={(v) => handleCheckboxChange(audit.id, 'detailed_findings_fr', v)} /> Temuan</label>
                          </>
                       )}
                    </div>
                 </details>
                 
                 <div className="space-y-3">
                    {activeTab === 'regular' && (
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">Status Monitoring</label>
                        <select
                           value={audit.monitoring_reg || ''}
                           onChange={(e) => handleTextChange(audit.id, 'monitoring_reg', e.target.value)}
                           className={`w-full text-sm border rounded-lg p-2.5 transition-colors ${
                             audit.monitoring_reg === 'Memadai' ? 'text-green-700 border-green-200 bg-green-50' :
                             audit.monitoring_reg === 'Tidak Memadai' ? 'text-red-700 border-red-200 bg-red-50' : 
                             'border-gray-200 bg-white'
                           }`}
                         >
                           <option value="">- Pilih Status -</option>
                           <option value="Memadai">Memadai</option>
                           <option value="Tidak Memadai">Tidak Memadai</option>
                         </select>
                      </div>
                    )}
                    <div>
                       <label className="text-xs font-medium text-gray-700 block mb-1">Komentar QA</label>
                       <div className="relative">
                         <input
                           type="text"
                           value={(activeTab === 'regular' ? audit.comment_reg : audit.comment_fr) || ''}
                           onChange={(e) => handleTextChange(audit.id, activeTab === 'regular' ? 'comment_reg' : 'comment_fr', e.target.value)}
                           className="w-full text-sm border border-gray-200 rounded-lg p-2.5 pl-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                           placeholder={activeTab === 'regular' ? "Tambahkan komentar review..." : "Tambahkan komentar..."}
                         />
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:flex flex-1 bg-white rounded-lg shadow overflow-hidden flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 sticky left-0 bg-gray-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Informasi Cabang</th>
                {activeTab === 'regular' && (
                  <>
                    <th className="px-2 py-3 text-center min-w-[80px]">DAPA</th>
                    <th className="px-2 py-3 text-center min-w-[80px]">DAPA Perubahan</th>
                    <th className="px-2 py-3 text-center min-w-[80px]">Data Pendukung</th>
                    <th className="px-2 py-3 text-center min-w-[80px]">Surat Tugas</th>
                    <th className="px-2 py-3 text-center min-w-[80px]">Ent. Agenda</th>
                    <th className="px-2 py-3 text-center min-w-[80px]">KK Audit</th>
                    <th className="px-2 py-3 text-center min-w-[80px]">Exit Agenda</th>
                    <th className="px-2 py-3 text-center min-w-[80px]">Exit Attendance</th>
                    <th className="px-2 py-3 text-center min-w-[80px]">SHA</th>
                    <th className="px-2 py-3 text-center min-w-[80px]">RTA</th>
                    <th className="px-2 py-3 text-center min-w-[120px]">Monitoring</th>
                    <th className="px-2 py-3 min-w-[200px]">Komentar</th>
                  </>
                )}
                {activeTab === 'special' && (
                  <>
                    <th className="px-2 py-3 text-center min-w-[80px]">Data Persiapan</th>
                    <th className="px-2 py-3 text-center min-w-[80px]">Surat Tugas</th>
                    <th className="px-2 py-3 text-center min-w-[80px]">KK Audit</th>
                    <th className="px-2 py-3 text-center min-w-[80px]">LHA</th>
                    <th className="px-2 py-3 text-center min-w-[80px]">SHA</th>
                    <th className="px-2 py-3 min-w-[200px]">Komentar</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAudits.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'regular' ? 13 : 7} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada audit yang sesuai dengan filter Anda.
                  </td>
                </tr>
              ) : (
                filteredAudits.map((audit) => (
                  <tr key={audit.id} className={`hover:bg-gray-50 transition-colors ${modifiedRows[audit.id] ? 'bg-yellow-50' : ''}`}>
                    <td className="px-4 py-3 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <div className="min-w-[200px]">
                        <div className="font-semibold text-gray-900">{audit.branch_name}</div>
                        <div className="text-xs text-gray-500">{audit.region}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {activeTab === 'regular' ? formatAuditPeriod(audit) : `${new Date(audit.audit_start_date).toLocaleDateString()} - ${new Date(audit.audit_end_date).toLocaleDateString()}`}
                        </div>
                        <div className="text-xs text-indigo-600 font-medium mt-0.5">
                          {audit.leader ? getInitialsFromName(audit.leader, auditors) : '-'}
                        </div>
                      </div>
                    </td>
                    
                    {activeTab === 'regular' && (
                      <>
                        <td className="px-2 py-3 text-center"><CheckboxCell checked={audit.dapa_reg} onChange={(v) => handleCheckboxChange(audit.id, 'dapa_reg', v)} /></td>
                        <td className="px-2 py-3 text-center"><CheckboxCell checked={audit.revised_dapa_reg} onChange={(v) => handleCheckboxChange(audit.id, 'revised_dapa_reg', v)} /></td>
                        <td className="px-2 py-3 text-center"><CheckboxCell checked={audit.dapa_supporting_data_reg} onChange={(v) => handleCheckboxChange(audit.id, 'dapa_supporting_data_reg', v)} /></td>
                        <td className="px-2 py-3 text-center"><CheckboxCell checked={audit.assignment_letter_reg} onChange={(v) => handleCheckboxChange(audit.id, 'assignment_letter_reg', v)} /></td>
                        <td className="px-2 py-3 text-center"><CheckboxCell checked={audit.entrance_agenda_reg} onChange={(v) => handleCheckboxChange(audit.id, 'entrance_agenda_reg', v)} /></td>
                        <td className="px-2 py-3 text-center"><CheckboxCell checked={audit.audit_wp_reg} onChange={(v) => handleCheckboxChange(audit.id, 'audit_wp_reg', v)} /></td>
                        <td className="px-2 py-3 text-center"><CheckboxCell checked={audit.exit_meeting_minutes_reg} onChange={(v) => handleCheckboxChange(audit.id, 'exit_meeting_minutes_reg', v)} /></td>
                        <td className="px-2 py-3 text-center"><CheckboxCell checked={audit.exit_attendance_list_reg} onChange={(v) => handleCheckboxChange(audit.id, 'exit_attendance_list_reg', v)} /></td>
                        <td className="px-2 py-3 text-center"><CheckboxCell checked={audit.audit_result_letter_reg} onChange={(v) => handleCheckboxChange(audit.id, 'audit_result_letter_reg', v)} /></td>
                        <td className="px-2 py-3 text-center"><CheckboxCell checked={audit.rta_reg} onChange={(v) => handleCheckboxChange(audit.id, 'rta_reg', v)} /></td>
                        <td className="px-2 py-3">
                          <select
                            value={audit.monitoring_reg || ''}
                            onChange={(e) => handleTextChange(audit.id, 'monitoring_reg', e.target.value)}
                            className={`w-full text-xs border rounded p-1.5 ${
                              audit.monitoring_reg === 'Memadai' ? 'text-green-700 border-green-200 bg-green-50' :
                              audit.monitoring_reg === 'Tidak Memadai' ? 'text-red-700 border-red-200 bg-red-50' : ''
                            }`}
                          >
                            <option value="">-</option>
                            <option value="Memadai">Memadai</option>
                            <option value="Tidak Memadai">Tidak Memadai</option>
                          </select>
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            value={audit.comment_reg || ''}
                            onChange={(e) => handleTextChange(audit.id, 'comment_reg', e.target.value)}
                            className="w-full text-xs border rounded p-1.5"
                            placeholder="Komentar..."
                          />
                        </td>
                      </>
                    )}
                    
                    {activeTab === 'special' && (
                      <>
                        <td className="px-2 py-3 text-center"><CheckboxCell checked={audit.data_prep} onChange={(v) => handleCheckboxChange(audit.id, 'data_prep', v)} /></td>
                        <td className="px-2 py-3 text-center"><CheckboxCell checked={audit.assignment_letter_fr} onChange={(v) => handleCheckboxChange(audit.id, 'assignment_letter_fr', v)} /></td>
                        <td className="px-2 py-3 text-center"><CheckboxCell checked={audit.audit_wp_fr} onChange={(v) => handleCheckboxChange(audit.id, 'audit_wp_fr', v)} /></td>
                        <td className="px-2 py-3 text-center"><CheckboxCell checked={audit.audit_report_fr} onChange={(v) => handleCheckboxChange(audit.id, 'audit_report_fr', v)} /></td>
                        <td className="px-2 py-3 text-center"><CheckboxCell checked={audit.detailed_findings_fr} onChange={(v) => handleCheckboxChange(audit.id, 'detailed_findings_fr', v)} /></td>
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            value={audit.comment_fr || ''}
                            onChange={(e) => handleTextChange(audit.id, 'comment_fr', e.target.value)}
                            className="w-full text-xs border rounded p-1.5"
                            placeholder="Komentar..."
                          />
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default AuditorWorkpapers;