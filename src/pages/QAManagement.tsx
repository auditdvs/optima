import { ArrowDown, ArrowUp, ArrowUpDown, Check, Download, Eye, Save, Search, Trash2, Upload, X } from 'lucide-react';
// @ts-ignore
import Papa from 'papaparse';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { MatriksData, MatriksTable } from '../components/qa-management/MatriksSection';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
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

interface ApprovedDocument {
  id: string;
  type: 'Surat Tugas' | 'Addendum';
  letter_number: string;
  branch_name: string;
  region: string;
  date: string;
  status: string;
  raw_data: any;
  qa_check?: boolean;
  created_by_name?: string;
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
  
  // Find auditor by name
  const auditor = auditors.find(a => a.name === name);
  if (auditor?.auditor_id) {
    return auditor.auditor_id;
  }
  
  // Fallback: create initials from name
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
  
  // Use audit_period_start and audit_period_end if available
  if (audit.audit_period_start && audit.audit_period_end) {
    const formatMonthYear = (dateStr: string) => {
      const date = new Date(dateStr);
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      return `${month}, ${year}`;
    };
    return `${formatMonthYear(audit.audit_period_start)} s.d. ${formatMonthYear(audit.audit_period_end)}`;
  }
  
  // Fallback to audit_start_date and audit_end_date
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

const QAManagement: React.FC = () => {
  // --- State ---
  const [audits, setAudits] = useState<AuditMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'regular' | 'special' | 'approved_docs' | 'matriks'>('approved_docs');
  
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

  // Matriks State
  const [matriksData, setMatriksData] = useState<MatriksData[]>([]);
  const [matriksLoading, setMatriksLoading] = useState(false);
  const [matriksLastUpdated, setMatriksLastUpdated] = useState<string | null>(null);
  const [matriksUploading, setMatriksUploading] = useState(false);
  const [matriksDeleting, setMatriksDeleting] = useState(false);
  const [showConfirmDeleteMatriks, setShowConfirmDeleteMatriks] = useState(false);

  // Approved Docs State
  const [approvedDocs, setApprovedDocs] = useState<ApprovedDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ApprovedDocument | null>(null);
  const [showDocDetailModal, setShowDocDetailModal] = useState(false);
  
  // Approved Docs Filters & Sort
  const [docTypeFilter, setDocTypeFilter] = useState<string>('All');
  const [docCreatedByFilter, setDocCreatedByFilter] = useState<string>('All');
  const [docSortOrder, setDocSortOrder] = useState<'asc' | 'desc' | null>('asc'); // Default start with ASC (smallest first)

  // --- Effects ---

  useEffect(() => {
    fetchInitialData();
    fetchAuditors();
  }, []);

  useEffect(() => {
    if (activeTab === 'matriks') {
      fetchMatriksData();
    } else if (activeTab === 'approved_docs') {
      fetchApprovedDocs();
    }
  }, [activeTab]);

  // --- Data Fetching ---

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch Audits
      const { data: auditData, error: auditError } = await supabase
        .from('audit_master')
        .select('*')
        .order('branch_name'); // Or priority if available
      
      if (auditError) throw auditError;
      
      if (auditData) {
        setAudits(auditData);
        
        // Extract Regions and Years
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
      toast.error('Failed to load audit data');
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

  const fetchMatriksData = async () => {
    try {
      setMatriksLoading(true);
      const { data, error } = await supabase
        .from('matriks')
        .select('*')
        .order('id');

      if (error) {
        console.error('Error fetching matriks data:', error);
        toast.error('Failed to fetch matriks data');
        return;
      }

      setMatriksData(data || []);

      if (data && data.length > 0) {
        const sorted = [...data].sort((a, b) =>
          new Date(b.last_updated || 0).getTime() - new Date(a.last_updated || 0).getTime()
        );
        setMatriksLastUpdated(sorted[0].last_updated || null);
      } else {
        setMatriksLastUpdated(null);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch matriks data');
    } finally {
      setMatriksLoading(false);
    }
  };

  const fetchApprovedDocs = async () => {
    try {
      setDocsLoading(true);
      
      // Fetch Letters
      const { data: letters, error: letterError } = await supabase
        .from('letter')
        .select('*')
        .in('status', ['approved', 'pending'])
        .order('id', { ascending: false });
        
      if (letterError) throw letterError;

      // Fetch Addendums
      const { data: addendums, error: addendumError } = await supabase
        .from('addendum')
        .select('*')
        .in('status', ['approved', 'pending'])
        .order('id', { ascending: false });

      if (addendumError) throw addendumError;

      // Fetch creator names
      const userIds = new Set<string>();
      letters?.forEach(l => l.created_by && userIds.add(l.created_by));
      addendums?.forEach(a => a.created_by && userIds.add(a.created_by));
      
      const profileMap = new Map<string, string>();
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(userIds));
          
        profiles?.forEach(p => profileMap.set(p.id, p.full_name));
      }

      const merged: ApprovedDocument[] = [
        ...(letters || []).map(l => ({
          id: l.id,
          type: 'Surat Tugas' as const,
          letter_number: l.assigment_letter,
          branch_name: l.branch_name,
          region: l.region,
          date: l.tanggal_input || l.created_at || new Date().toISOString(),
          status: l.status,
          raw_data: l,
          qa_check: l.qa_check,
          created_by_name: l.created_by ? profileMap.get(l.created_by) || '-' : '-'
        })),
        ...(addendums || []).map(a => ({
          id: a.id,
          type: 'Addendum' as const,
          letter_number: a.assigment_letter,
          branch_name: a.branch_name,
          region: a.region,
          date: a.tanggal_input || a.created_at || new Date().toISOString(),
          status: a.status,
          raw_data: a,
          qa_check: a.qa_check,
          created_by_name: a.created_by ? profileMap.get(a.created_by) || '-' : '-'
        }))
      ];
      
      // Sort by date desc (newest first)
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setApprovedDocs(merged);
    } catch (error) {
      console.error('Error fetching docs:', error);
      toast.error('Failed to fetch documents');
    } finally {
      setDocsLoading(false);
    }
  };

  // --- Handlers ---

  const handleCheckboxChange = (id: string, field: keyof AuditMaster, value: boolean) => {
    setAudits(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
    setModifiedRows(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleTextChange = (id: string, field: keyof AuditMaster, value: any) => {
    setAudits(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
    setModifiedRows(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleSaveChanges = async () => {
    const rowIds = Object.keys(modifiedRows);
    if (rowIds.length === 0) {
      toast('No changes to save');
      return;
    }

    try {
      setLoading(true);
      const updatePromises = rowIds.map(id => {
        return supabase
          .from('audit_master')
          .update(modifiedRows[id])
          .eq('id', id);
      });

      await Promise.all(updatePromises);
      setModifiedRows({});
      toast.success('Changes saved successfully');
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleQACheck = async (doc: ApprovedDocument) => {
     const newStatus = !doc.qa_check;
     const table = doc.type === 'Surat Tugas' ? 'letter' : 'addendum';
     
     // Optimistic update
     setApprovedDocs(prev => prev.map(d => d.id === doc.id && d.type === doc.type ? { ...d, qa_check: newStatus } : d));
     
     try {
       const { error } = await supabase
         .from(table)
         .update({ qa_check: newStatus })
         .eq('id', doc.id);
         
       if (error) throw error;
       toast.success('Checklist updated');
     } catch (err) {
       console.error(err);
       toast.error('Failed to update checklist');
       // Revert
       setApprovedDocs(prev => prev.map(d => d.id === doc.id && d.type === doc.type ? { ...d, qa_check: !newStatus } : d));
     }
  };

  const handleExport = () => {
    if (activeTab === 'approved_docs') {
      // Handle approved docs export if needed, or simple disabled for now
      toast.success('Export available via view detail');
      return;
    }

    const dataToExport = filteredAudits.map(a => {
      const base = {
        Branch: a.branch_name,
        Region: a.region,
        'Start Date': a.audit_start_date,
        'End Date': a.audit_end_date,
        Leader: a.leader,
        Team: a.team,
        Type: a.audit_type,
        Rating: a.rating
      };

      if (activeTab === 'regular') {
        return {
          ...base,
          'DAPA': a.dapa_reg ? 'Yes' : 'No',
          'Revised DAPA': a.revised_dapa_reg ? 'Yes' : 'No',
          'Supporting Data': a.dapa_supporting_data_reg ? 'Yes' : 'No',
          'Assignment Letter': a.assignment_letter_reg ? 'Yes' : 'No',
          'Entrance Agenda': a.entrance_agenda_reg ? 'Yes' : 'No',
          'Audit WP': a.audit_wp_reg ? 'Yes' : 'No',
          'Exit Minutes': a.exit_meeting_minutes_reg ? 'Yes' : 'No',
          'Exit Attendance': a.exit_attendance_list_reg ? 'Yes' : 'No',
          'Result Letter': a.audit_result_letter_reg ? 'Yes' : 'No',
          'RTA': a.rta_reg ? 'Yes' : 'No',
          'Monitoring': a.monitoring_reg,
          'Comment': a.comment_reg
        };
      } else if (activeTab === 'special') {
        return {
          ...base,
          'Data Prep': a.data_prep ? 'Yes' : 'No',
          'Assignment Letter': a.assignment_letter_fr ? 'Yes' : 'No',
          'Audit WP': a.audit_wp_fr ? 'Yes' : 'No',
          'Audit Report': a.audit_report_fr ? 'Yes' : 'No',
          'Detailed Findings': a.detailed_findings_fr ? 'Yes' : 'No',
          'Comment': a.comment_fr
        };
      } else {
        return base;
      }
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab.toUpperCase().replace('_', ' '));
    XLSX.writeFile(wb, `QA_Management_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- Matriks Handlers ---

  const handleMatriksFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setMatriksUploading(true);
    toast.loading('Uploading CSV file...', { id: 'upload-toast' });

    try {
      const { data: existingData, error: fetchError } = await supabase
        .from('matriks')
        .select('*');
      if (fetchError) throw fetchError;

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: any) => {
          const csvData = results.data as any[];
          const mappedData = csvData.map((row) => ({
            kc_kr_kp: row.kc_kr_kp || row['kc_kr_kp'] || '',
            judul_temuan: row.judul_temuan || row['judul_temuan'] || '',
            kode_risk_issue: row.kode_risk_issue || row['kode_risk_issue'] || '',
            judul_risk_issue: row.judul_risk_issue || row['judul_risk_issue'] || '',
            kategori: row.kategori || row['kategori'] || '',
            penyebab: row.penyebab || row['penyebab'] || '',
            dampak: row.dampak || row['dampak'] || '',
            kelemahan: row.kelemahan || row['kelemahan'] || '',
            rekomendasi: row.rekomendasi || row['rekomendasi'] || '',
            poin: row.poin ? parseInt(row.poin) : null,
            perbaikan_temuan: row.perbaikan_temuan || row['perbaikan_temuan'] || '',
            jatuh_tempo: row.jatuh_tempo || row['jatuh_tempo'] || '',
            last_updated: new Date().toISOString(),
          }));

          if (mappedData.length === 0) {
            throw new Error('No valid data rows found in CSV');
          }

          const isSameRow = (a: any, b: any) =>
            a.kc_kr_kp === b.kc_kr_kp &&
            a.judul_temuan === b.judul_temuan &&
            a.kode_risk_issue === b.kode_risk_issue &&
            a.judul_risk_issue === b.judul_risk_issue &&
            a.kategori === b.kategori &&
            a.penyebab === b.penyebab &&
            a.dampak === b.dampak &&
            a.kelemahan === b.kelemahan &&
            a.rekomendasi === b.rekomendasi &&
            (a.poin ?? null) === (b.poin ?? null) &&
            a.perbaikan_temuan === b.perbaikan_temuan &&
            a.jatuh_tempo === b.jatuh_tempo;

          const filteredData = mappedData.filter((row) => {
            return !existingData?.some((exist: any) => isSameRow(row, exist));
          });

          if (filteredData.length === 0) {
            toast.success('No new data to upload (all rows are duplicates)', { id: 'upload-toast' });
            setMatriksUploading(false);
            event.target.value = '';
            return;
          }

          const batchSize = 100;
          for (let i = 0; i < filteredData.length; i += batchSize) {
            const batch = filteredData.slice(i, i + batchSize);
            const { error: insertError } = await supabase
              .from('matriks')
              .insert(batch);
            if (insertError) throw insertError;
          }

          toast.success(`Successfully uploaded ${filteredData.length} new records`, { id: 'upload-toast' });
          await fetchMatriksData();
        },
        error: (error: any) => {
          toast.error(`Failed to parse CSV: ${error.message}`, { id: 'upload-toast' });
        },
      });
    } catch (error: any) {
      console.error('Error uploading CSV:', error);
      toast.error(`Failed to upload CSV file: ${error.message}`, { id: 'upload-toast' });
    } finally {
      setMatriksUploading(false);
      event.target.value = '';
    }
  };

  const handleRemoveAllMatriksData = async () => {
    setShowConfirmDeleteMatriks(false);
    setMatriksDeleting(true);
    toast.loading('Removing all data...', { id: 'delete-toast' });

    try {
      const { error } = await supabase
        .from('matriks')
        .delete()
        .neq('id', 0);

      if (error) throw error;

      toast.success('All data removed successfully', { id: 'delete-toast' });
      setMatriksData([]);
    } catch (error) {
      console.error('Error removing data:', error);
      toast.error('Failed to remove data', { id: 'delete-toast' });
    } finally {
      setMatriksDeleting(false);
    }
  };



  // --- Filtering ---

  const filteredAudits = audits.filter(a => {
    // Filter by Tab Type logic
    // Regular and Special tabs filter by audit_type
    if (activeTab === 'regular' && a.audit_type !== 'regular') return false;
    if (activeTab === 'special' && a.audit_type !== 'fraud') return false;
    
    // Search
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = a.branch_name.toLowerCase().includes(searchLower);

    // Region
    const matchesRegion = !selectedRegion || a.region === selectedRegion;

    // Year
    const startYear = new Date(a.audit_start_date).getFullYear().toString();
    const endYear = new Date(a.audit_end_date).getFullYear().toString();
    const matchesYear = !selectedYear || startYear === selectedYear || endYear === selectedYear;

    return matchesSearch && matchesRegion && matchesYear;
  });

  // --- Filtering (Docs) ---
  
  const uniqueCreators = Array.from(new Set(approvedDocs.map(d => d.created_by_name).filter(Boolean))).sort();

  const filteredDocs = approvedDocs.filter(doc => {
    const matchType = docTypeFilter === 'All' || doc.type === docTypeFilter;
    const matchCreator = docCreatedByFilter === 'All' || doc.created_by_name === docCreatedByFilter;
    return matchType && matchCreator;
  }).sort((a, b) => {
    if (docSortOrder === 'asc') {
      return a.letter_number.localeCompare(b.letter_number);
    } else if (docSortOrder === 'desc') {
      return b.letter_number.localeCompare(a.letter_number);
    }
    return 0;
  });

  const toggleSort = () => {
    if (docSortOrder === null) setDocSortOrder('asc');
    else if (docSortOrder === 'asc') setDocSortOrder('desc');
    else setDocSortOrder(null);
  };

  // --- Render ---

  return (
    <div className="flex flex-col h-full space-y-4 p-4 md:p-6 pb-20 md:pb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">QA Management</h1>
          {activeTab === 'matriks' && matriksLastUpdated && (
             <p className="text-xs text-gray-500 mt-1">
               Last updated: {new Date(matriksLastUpdated).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
             </p>
          )}
        </div>
        
        <div className="flex flex-col gap-3 w-full md:w-auto">
          {/* Unified Tabs - Scrollable on mobile */}
          <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto scrollbar-hide w-full md:w-auto">

            <button
              onClick={() => setActiveTab('approved_docs')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'approved_docs' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Surat Tugas & Addendum
            </button>
            <button
              onClick={() => setActiveTab('matriks')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'matriks' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Matriks
            </button>
          </div>

          {/* Action Buttons based on Active Tab */}
          <div className="flex gap-2 flex-wrap md:justify-end">
            {activeTab === 'matriks' ? (
              <>
                {matriksData.length > 0 && (
                  <Button
                    onClick={() => setShowConfirmDeleteMatriks(true)}
                    disabled={matriksDeleting || matriksUploading}
                    variant="destructive"
                    size="sm"
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 h-10"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="md:hidden lg:inline">Remove All</span>
                  </Button>
                )}
                <label className="flex-1 md:flex-none cursor-pointer bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2 h-10 text-sm font-medium">
                  <Upload className="h-4 w-4" />
                  {matriksUploading ? 'Uploading...' : 'Upload CSV'}
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleMatriksFileUpload}
                    disabled={matriksUploading || matriksDeleting}
                    className="hidden"
                  />
                </label>
              </>
            ) : activeTab === 'approved_docs' ? (
              <></>
            ) : (
              <>
                <button
                  onClick={handleExport}
                  className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Download size={18} className="mr-2" />
                  <span className="hidden sm:inline">Download Report</span>
                  <span className="sm:hidden">Report</span>
                </button>
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
                  <span>Save</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'approved_docs' ? (
        <div className="flex-1 bg-white rounded-lg shadow overflow-hidden flex flex-col">
          {/* Filters Toolbar */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Type Filter */}
              <div className="flex items-center gap-2">
                 <label className="text-sm font-medium text-gray-600">Type:</label>
                 <select 
                    value={docTypeFilter} 
                    onChange={(e) => setDocTypeFilter(e.target.value)}
                    className="bg-white border text-sm rounded-md px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                 >
                    <option value="All">All Types</option>
                    <option value="Surat Tugas">Surat Tugas</option>
                    <option value="Addendum">Addendum</option>
                 </select>
              </div>

               {/* Created By Filter */}
               <div className="flex items-center gap-2">
                 <label className="text-sm font-medium text-gray-600">Created By:</label>
                 <select 
                    value={docCreatedByFilter} 
                    onChange={(e) => setDocCreatedByFilter(e.target.value)}
                    className="bg-white border text-sm rounded-md px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                 >
                    <option value="All">All Users</option>
                    {uniqueCreators.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                 </select>
              </div>
            </div>
            
             <div className="text-xs text-gray-500">
                Showing {filteredDocs.length} documents
             </div>
          </div>

          {docsLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
             <div className="overflow-auto flex-1">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Type</th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group select-none"
                        onClick={toggleSort}
                      >
                        <div className="flex items-center gap-2">
                          Nomor Surat
                          {docSortOrder === 'asc' ? <ArrowUp size={14} className="text-indigo-600" /> : 
                           docSortOrder === 'desc' ? <ArrowDown size={14} className="text-indigo-600" /> : 
                           <ArrowUpDown size={14} className="text-gray-400 group-hover:text-gray-600" />}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch Details</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created By</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">QA Check</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDocs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                         No documents found matching the criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredDocs.map((doc, idx) => (
                         <tr key={`${doc.type}-${doc.id}`} className="hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-none">
                           <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400">{idx + 1}</td>
                           <td className="px-4 py-3 whitespace-nowrap text-xs">
                             <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                               doc.type === 'Surat Tugas' 
                                 ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                 : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                             }`}>
                               {doc.type === 'Surat Tugas' ? 'SURAT TUGAS' : 'ADDENDUM'}
                             </span>
                           </td>
                           <td className="px-4 py-3 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors">
                              {doc.letter_number}
                           </td>
                           <td className="px-4 py-3 whitespace-nowrap">
                             <div className="flex flex-col">
                               <span className="text-sm font-semibold text-gray-800">{doc.branch_name}</span>
                               <span className="text-[10px] text-gray-400 uppercase tracking-wide">{doc.region}</span>
                             </div>
                           </td>
                           <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                             {new Date(doc.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                           </td>
                           <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                             {(doc.created_by_name?.length || 0) > 20 ? `${doc.created_by_name?.substring(0, 20)}...` : (doc.created_by_name || '-')}
                           </td>
                           <td className="px-4 py-3 whitespace-nowrap text-center">
                             <span className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-bold uppercase rounded-full border ${
                               doc.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                               doc.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                               doc.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                               'bg-gray-100 text-gray-600 border-gray-200'
                             }`}>
                               {doc.status}
                             </span>
                           </td>
                           <td className="px-4 py-3 whitespace-nowrap text-center">
                              <button 
                                onClick={() => handleToggleQACheck(doc)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all shadow-sm ${
                                  doc.qa_check 
                                    ? 'bg-green-600 text-white hover:bg-green-700 hover:shadow-md' 
                                    : 'bg-white border text-gray-300 hover:border-indigo-300 hover:text-indigo-300'
                                }`}
                                title={doc.qa_check ? "Checked by QA" : "Mark as Checked"}
                              >
                                <Check size={16} strokeWidth={3} />
                              </button>
                           </td>
                           <td className="px-4 py-3 whitespace-nowrap text-center">
                              <button
                                onClick={() => {
                                  setSelectedDoc(doc);
                                  setShowDocDetailModal(true);
                                }}
                                className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-all"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                           </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
             </div>
          )}
        </div>
      ) : activeTab === 'matriks' ? (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow overflow-hidden">
          <MatriksTable data={matriksData} loading={matriksLoading} />
        </div>
      ) : (
        <>
          {/* Filters (Regular/Special/Rating) */}
          <div className="bg-white p-4 rounded-lg shadow space-y-4">
            <div className="flex flex-col md:flex-row flex-wrap gap-4 items-stretch md:items-center">
              <div className="flex-1 flex flex-col md:flex-row gap-4">
                <div className="flex gap-2">
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Regions</option>
                    {availableRegions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Years</option>
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search branch..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 w-full border rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Cards View (Visible ONLY on mobile) */}
          <div className="md:hidden space-y-4">
            {filteredAudits.length === 0 ? (
               <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                 No audits found matching your filters.
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

                  {/* Body Content based on Tab */}
                  <div className="text-sm space-y-3">
                     {/* Info umum */}
                     <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                        <div>
                          <span className="block text-gray-400 font-medium">Period</span>
                          {activeTab === 'regular' ? formatAuditPeriod(audit) : new Date(audit.audit_start_date).toLocaleDateString()}
                        </div>
                        <div>
                           <span className="block text-gray-400 font-medium">Team</span>
                           <span className="truncate block" title={audit.team}>{audit.leader ? getInitialsFromName(audit.leader, auditors) : '-'}</span>
                        </div>
                     </div>

                     {/* Checklist Accordion for Regular/Special */}
                     {(activeTab === 'regular' || activeTab === 'special') && (
                       <details className="group border border-gray-200 rounded-lg overflow-hidden bg-white">
                          <summary className="bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 flex justify-between items-center select-none">
                             <span>Documents Checklist</span>
                             <span className="text-gray-400 group-open:rotate-180 transition-transform duration-200">▼</span>
                          </summary>
                          <div className="p-3 bg-gray-50 border-t border-gray-200 grid grid-cols-2 gap-3">
                             {activeTab === 'regular' && (
                                <>
                                  <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.dapa_reg} onChange={(v) => handleCheckboxChange(audit.id, 'dapa_reg', v)} /> DAPA</label>
                                  <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.revised_dapa_reg} onChange={(v) => handleCheckboxChange(audit.id, 'revised_dapa_reg', v)} /> Rev. DAPA</label>
                                  <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.dapa_supporting_data_reg} onChange={(v) => handleCheckboxChange(audit.id, 'dapa_supporting_data_reg', v)} /> Supp. Data</label>
                                  <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.assignment_letter_reg} onChange={(v) => handleCheckboxChange(audit.id, 'assignment_letter_reg', v)} /> Assign. Ltr</label>
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
                                  <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.assignment_letter_fr} onChange={(v) => handleCheckboxChange(audit.id, 'assignment_letter_fr', v)} /> Assign. Ltr</label>
                                  <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.audit_wp_fr} onChange={(v) => handleCheckboxChange(audit.id, 'audit_wp_fr', v)} /> Audit WP</label>
                                  <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.audit_report_fr} onChange={(v) => handleCheckboxChange(audit.id, 'audit_report_fr', v)} /> Report</label>
                                  <label className="flex items-center gap-2 text-xs text-gray-700"><CheckboxCell checked={audit.detailed_findings_fr} onChange={(v) => handleCheckboxChange(audit.id, 'detailed_findings_fr', v)} /> Findings</label>
                                </>
                             )}
                          </div>
                       </details>
                     )}
                     
                     {/* Inputs Section */}
                     {(activeTab === 'regular' || activeTab === 'special') && (
                        <div className="space-y-3">
                           {activeTab === 'regular' && (
                             <div>
                               <label className="text-xs font-medium text-gray-700 block mb-1">Monitoring Status</label>
                               <select
                                  value={audit.monitoring_reg || ''}
                                  onChange={(e) => handleTextChange(audit.id, 'monitoring_reg', e.target.value)}
                                  className={`w-full text-sm border rounded-lg p-2.5 transition-colors ${
                                    audit.monitoring_reg === 'Memadai' ? 'text-green-700 border-green-200 bg-green-50' :
                                    audit.monitoring_reg === 'Tidak Memadai' ? 'text-red-700 border-red-200 bg-red-50' : 
                                    'border-gray-200 bg-white'
                                  }`}
                                >
                                  <option value="">- Select Status -</option>
                                  <option value="Memadai">Memadai</option>
                                  <option value="Tidak Memadai">Tidak Memadai</option>
                                </select>
                             </div>
                           )}
                           <div>
                              <label className="text-xs font-medium text-gray-700 block mb-1">QA Comment</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={(activeTab === 'regular' ? audit.comment_reg : audit.comment_fr) || ''}
                                  onChange={(e) => handleTextChange(audit.id, activeTab === 'regular' ? 'comment_reg' : 'comment_fr', e.target.value)}
                                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 pl-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                  placeholder={activeTab === 'regular' ? "Add comment on review..." : "Add comment..."}
                                />
                              </div>
                           </div>
                        </div>
                     )}

                     {/* Rating Tab Inputs */}

                  </div>
                </div>
              ))
            )}
          </div>

          {/* Main Table (Visible ONLY on desktop) */}
          <div className="hidden md:flex flex-1 bg-white rounded-lg shadow overflow-hidden flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 sticky left-0 bg-gray-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Branch Info</th>
                    {activeTab === 'regular' && (
                      <>
                        <th className="px-2 py-3 text-center min-w-[80px]">DAPA</th>
                        <th className="px-2 py-3 text-center min-w-[80px]">Rev. DAPA</th>
                        <th className="px-2 py-3 text-center min-w-[80px]">Supp. Data</th>
                        <th className="px-2 py-3 text-center min-w-[80px]">Assign. Letter</th>
                        <th className="px-2 py-3 text-center min-w-[80px]">Ent. Agenda</th>
                        <th className="px-2 py-3 text-center min-w-[80px]">Audit WP</th>
                        <th className="px-2 py-3 text-center min-w-[80px]">Exit Mins</th>
                        <th className="px-2 py-3 text-center min-w-[80px]">Exit Attd.</th>
                        <th className="px-2 py-3 text-center min-w-[80px]">Res. Letter</th>
                        <th className="px-2 py-3 text-center min-w-[80px]">RTA</th>
                        <th className="px-4 py-3 min-w-[150px]">Monitoring</th>
                        <th className="px-4 py-3 min-w-[200px]">Comment</th>
                      </>
                    )}
                    {activeTab === 'special' && (
                      <>
                        <th className="px-2 py-3 text-center min-w-[80px]">Data Prep</th>
                        <th className="px-2 py-3 text-center min-w-[80px]">Assign. Letter</th>
                        <th className="px-2 py-3 text-center min-w-[80px]">Audit WP</th>
                        <th className="px-2 py-3 text-center min-w-[80px]">Audit Report</th>
                        <th className="px-2 py-3 text-center min-w-[80px]">Det. Findings</th>
                        <th className="px-4 py-3 min-w-[200px]">Comment</th>
                      </>
                    )}

                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAudits.map((audit) => (
                    <tr key={audit.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 sticky left-0 bg-white z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="font-medium text-gray-900">{audit.branch_name}</div>
                        {activeTab === 'regular' || activeTab === 'special' ? (
                          <>
                            <div className="text-xs text-gray-500 mt-1">
                              {activeTab === 'regular' ? formatAuditPeriod(audit) : 
                               `${new Date(audit.audit_start_date).toLocaleDateString('id-ID')} - ${new Date(audit.audit_end_date).toLocaleDateString('id-ID')}`}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {audit.leader ? getInitialsFromName(audit.leader, auditors) : '-'}
                              {audit.team && `, ${audit.team.split(',').map(member => getInitialsFromName(member.trim(), auditors)).join(', ')}`}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-xs text-gray-500">{audit.region}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(audit.audit_start_date).toLocaleDateString()}
                            </div>
                          </>
                        )}
                      </td>
                      
                      {activeTab === 'regular' && (
                        <>
                          <td className="px-2 py-3 text-center"><div className="flex justify-center"><CheckboxCell checked={audit.dapa_reg} onChange={(v) => handleCheckboxChange(audit.id, 'dapa_reg', v)} /></div></td>
                          <td className="px-2 py-3 text-center"><div className="flex justify-center"><CheckboxCell checked={audit.revised_dapa_reg} onChange={(v) => handleCheckboxChange(audit.id, 'revised_dapa_reg', v)} /></div></td>
                          <td className="px-2 py-3 text-center"><div className="flex justify-center"><CheckboxCell checked={audit.dapa_supporting_data_reg} onChange={(v) => handleCheckboxChange(audit.id, 'dapa_supporting_data_reg', v)} /></div></td>
                          <td className="px-2 py-3 text-center"><div className="flex justify-center"><CheckboxCell checked={audit.assignment_letter_reg} onChange={(v) => handleCheckboxChange(audit.id, 'assignment_letter_reg', v)} /></div></td>
                          <td className="px-2 py-3 text-center"><div className="flex justify-center"><CheckboxCell checked={audit.entrance_agenda_reg} onChange={(v) => handleCheckboxChange(audit.id, 'entrance_agenda_reg', v)} /></div></td>
                          <td className="px-2 py-3 text-center"><div className="flex justify-center"><CheckboxCell checked={audit.audit_wp_reg} onChange={(v) => handleCheckboxChange(audit.id, 'audit_wp_reg', v)} /></div></td>
                          <td className="px-2 py-3 text-center"><div className="flex justify-center"><CheckboxCell checked={audit.exit_meeting_minutes_reg} onChange={(v) => handleCheckboxChange(audit.id, 'exit_meeting_minutes_reg', v)} /></div></td>
                          <td className="px-2 py-3 text-center"><div className="flex justify-center"><CheckboxCell checked={audit.exit_attendance_list_reg} onChange={(v) => handleCheckboxChange(audit.id, 'exit_attendance_list_reg', v)} /></div></td>
                          <td className="px-2 py-3 text-center"><div className="flex justify-center"><CheckboxCell checked={audit.audit_result_letter_reg} onChange={(v) => handleCheckboxChange(audit.id, 'audit_result_letter_reg', v)} /></div></td>
                          <td className="px-2 py-3 text-center"><div className="flex justify-center"><CheckboxCell checked={audit.rta_reg} onChange={(v) => handleCheckboxChange(audit.id, 'rta_reg', v)} /></div></td>
                          <td className="px-4 py-3">
                            <select
                              value={audit.monitoring_reg || ''}
                              onChange={(e) => handleTextChange(audit.id, 'monitoring_reg', e.target.value)}
                              className={`w-full text-xs border rounded p-1 ${
                                audit.monitoring_reg === 'Memadai' ? 'text-green-600 border-green-200 bg-green-50' :
                                audit.monitoring_reg === 'Tidak Memadai' ? 'text-red-600 border-red-200 bg-red-50' : ''
                              }`}
                            >
                              <option value="">- Select -</option>
                              <option value="Memadai">Memadai</option>
                              <option value="Tidak Memadai">Tidak Memadai</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={audit.comment_reg || ''}
                              onChange={(e) => handleTextChange(audit.id, 'comment_reg', e.target.value)}
                              className="w-full text-xs border rounded p-1 focus:ring-1 focus:ring-indigo-500"
                              placeholder="Add comment..."
                            />
                          </td>
                        </>
                      )}
                      {activeTab === 'special' && (
                        <>
                          <td className="px-2 py-3 text-center"><div className="flex justify-center"><CheckboxCell checked={audit.data_prep} onChange={(v) => handleCheckboxChange(audit.id, 'data_prep', v)} /></div></td>
                          <td className="px-2 py-3 text-center"><div className="flex justify-center"><CheckboxCell checked={audit.assignment_letter_fr} onChange={(v) => handleCheckboxChange(audit.id, 'assignment_letter_fr', v)} /></div></td>
                          <td className="px-2 py-3 text-center"><div className="flex justify-center"><CheckboxCell checked={audit.audit_wp_fr} onChange={(v) => handleCheckboxChange(audit.id, 'audit_wp_fr', v)} /></div></td>
                          <td className="px-2 py-3 text-center"><div className="flex justify-center"><CheckboxCell checked={audit.audit_report_fr} onChange={(v) => handleCheckboxChange(audit.id, 'audit_report_fr', v)} /></div></td>
                          <td className="px-2 py-3 text-center"><div className="flex justify-center"><CheckboxCell checked={audit.detailed_findings_fr} onChange={(v) => handleCheckboxChange(audit.id, 'detailed_findings_fr', v)} /></div></td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={audit.comment_fr || ''}
                              onChange={(e) => handleTextChange(audit.id, 'comment_fr', e.target.value)}
                              className="w-full text-xs border rounded p-1 focus:ring-1 focus:ring-indigo-500"
                              placeholder="Add comment..."
                            />
                          </td>
                        </>
                      )}

                    </tr>
                  ))}
                  {filteredAudits.length === 0 && (
                    <tr>
                      <td colSpan={15} className="px-4 py-8 text-center text-gray-500">
                        No audits found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Doc Detail Modal */}
      {showDocDetailModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                 <h3 className="text-xl font-bold text-gray-900">
                    Detail {selectedDoc.type}
                 </h3>
                 <button 
                  onClick={() => setShowDocDetailModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                 >
                   <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="p-6 space-y-6">
                 {/* Header Info */}
                 <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4 border border-gray-100">
                    <div>
                       <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nomor Surat</label>
                       <p className="mt-1 text-base font-medium text-gray-900">{selectedDoc.letter_number}</p>
                    </div>
                     <div>
                       <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tanggal</label>
                       <p className="mt-1 text-base font-medium text-gray-900">
                         {new Date(selectedDoc.date).toLocaleDateString('id-ID', { dateStyle: 'full' })}
                       </p>
                    </div>
                    <div>
                       <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Branch</label>
                       <p className="mt-1 text-sm font-medium text-gray-900">{selectedDoc.branch_name}</p>
                    </div>
                    <div>
                       <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Region</label>
                       <p className="mt-1 text-sm font-medium text-gray-900">{selectedDoc.region}</p>
                    </div>
                 </div>

                 {/* Specific Fields based on Type */}
                 <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 border-b pb-2">Informasi Detail</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                       {selectedDoc.type === 'Surat Tugas' ? (
                          <>
                             <div>
                                <label className="block text-sm text-gray-500">Tipe Audit</label>
                                <span className="text-gray-900 font-medium">{selectedDoc.raw_data.audit_type || '-'}</span>
                             </div>
                             <div>
                                <label className="block text-sm text-gray-500">Tim Audit</label>
                                <span className="text-gray-900 font-medium whitespace-pre-wrap">{selectedDoc.raw_data.team ? selectedDoc.raw_data.team.replace(/[[\]"]/g, '') : '-'}</span>
                             </div>
                             <div className="col-span-2">
                                <label className="block text-sm text-gray-500">Periode Audit</label>
                                <span className="text-gray-900 font-medium">
                                   {selectedDoc.raw_data.audit_start_date && new Date(selectedDoc.raw_data.audit_start_date).toLocaleDateString('id-ID')} s.d. {selectedDoc.raw_data.audit_end_date && new Date(selectedDoc.raw_data.audit_end_date).toLocaleDateString('id-ID')}
                                </span>
                             </div>
                          </>
                       ) : (
                          <>
                              <div>
                                <label className="block text-sm text-gray-500">Tipe Addendum</label>
                                <span className="text-gray-900 font-medium">{selectedDoc.raw_data.addendum_type || '-'}</span>
                             </div>
                             <div>
                                <label className="block text-sm text-gray-500">Nomor Surat Asal</label>
                                <span className="text-gray-900 font-medium">{selectedDoc.raw_data.assignment_letter_before || '-'}</span>
                             </div>
                             <div className="col-span-2">
                                <label className="block text-sm text-gray-500">Keterangan</label>
                                <p className="text-gray-900 font-medium bg-gray-50 p-2 rounded mt-1 border border-gray-100">
                                  {selectedDoc.raw_data.keterangan || selectedDoc.raw_data.description || '-'}
                                </p>
                             </div>
                          </>
                       )}
                    </div>
                 </div>
              </div>
              
              <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
                 <Button onClick={() => setShowDocDetailModal(false)}>Close</Button>
              </div>
           </div>
        </div>
      )}

      <Dialog open={showConfirmDeleteMatriks} onOpenChange={setShowConfirmDeleteMatriks}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove All Matriks Data?</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p>Are you sure you want to remove <b>all matriks data</b>? This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDeleteMatriks(false)}
              disabled={matriksDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveAllMatriksData}
              disabled={matriksDeleting}
            >
              {matriksDeleting ? 'Removing...' : 'Yes, Remove All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QAManagement;