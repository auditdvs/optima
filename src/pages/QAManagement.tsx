import { Check, Download, Plus, Save, Search, Trash2, Upload, X } from 'lucide-react';
import Papa from 'papaparse';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { MatriksData, MatriksTable } from '../components/qa-management/MatriksSection';
import { RPMLetter, RPMLetterTable } from '../components/qa-management/RPMLetterTable';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { supabase } from '../lib/supabaseClient';

// --- Interfaces ---

interface AuditMaster {
  id: string;
  branch_name: string;
  region: string;
  audit_type: 'regular' | 'fraud';
  audit_start_date: string;
  audit_end_date: string;
  audit_period_start?: string; // MM,YYYY format
  audit_period_end?: string;   // MM,YYYY format
  leader?: string;
  team?: string;
  rating?: 'high' | 'medium' | 'low'; // Existing rating (Monitoring Rating)
  rating_by_qa?: 'high' | 'medium' | 'low'; // New field: Rating by QA
  
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

const getRomanNumeral = (month: number): string => {
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return romanNumerals[month];
};

const generateLetterNumber = (letters: RPMLetter[]): string => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const month = getRomanNumeral(currentDate.getMonth());
  
  // Count only letters from the current year by extracting year from letter_number
  // Format: 001/KMD-AUDIT/QA/I/2026 - year is the last part
  const lettersThisYear = letters.filter(letter => {
    if (!letter.letter_number) return false;
    const parts = letter.letter_number.split('/');
    const letterYear = parseInt(parts[parts.length - 1], 10);
    return letterYear === currentYear;
  });
  
  const number = String(lettersThisYear.length + 1).padStart(3, '0');
  return `${number}/KMD-AUDIT/QA/${month}/${currentYear}`;
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
  const [activeTab, setActiveTab] = useState<'regular' | 'special' | 'rating' | 'rpm_letter' | 'matriks'>('regular');
  
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

  // RPM Letter State
  const [rpmLetters, setRpmLetters] = useState<RPMLetter[]>([]);
  const [rpmLoading, setRpmLoading] = useState(false);
  const [showAddLetterModal, setShowAddLetterModal] = useState(false);
  const [showEditLetterModal, setShowEditLetterModal] = useState(false);
  const [editingLetter, setEditingLetter] = useState<RPMLetter | null>(null);
  const [newLetter, setNewLetter] = useState<Partial<RPMLetter>>({
    region: '',
    branch_or_region_ho: '',
    subject: '',
    status: 'Inadequate',
    letter_date: new Date().toISOString().split('T')[0]
  });

  // --- Effects ---

  useEffect(() => {
    fetchInitialData();
    fetchAuditors();
  }, []);

  useEffect(() => {
    if (activeTab === 'matriks') {
      fetchMatriksData();
    } else if (activeTab === 'rpm_letter') {
      fetchRpmLetters();
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

  const fetchRpmLetters = async () => {
    try {
      setRpmLoading(true);
      const { data, error } = await supabase
        .from('rpm_letters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRpmLetters(data || []);
    } catch (error) {
      console.error('Error fetching letters:', error);
      toast.error('Failed to fetch letters');
    } finally {
      setRpmLoading(false);
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

  const handleExport = () => {
    if (activeTab === 'rpm_letter') {
      handleExportRpm();
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
      } else if (activeTab === 'rating') {
        return {
          'Branch Name': a.branch_name,
          'Audit Period': `${a.audit_start_date} - ${a.audit_end_date}`,
          'PIC': `${a.leader || '-'} / ${a.team || '-'}`,
          'Monitoring Rating': a.rating,
          'Rating by QA': a.rating_by_qa
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
        complete: async (results) => {
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
        error: (error) => {
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

  // --- RPM Letter Handlers ---

  const handleAddLetter = async () => {
    try {
      const letterNumber = generateLetterNumber(rpmLetters);
      const dueDate = getDueDate(newLetter.status as RPMLetter['status']);

      const { error } = await supabase
        .from('rpm_letters')
        .insert([{
          ...newLetter,
          letter_number: letterNumber,
          due_date: dueDate
        }]);

      if (error) throw error;

      toast.success('Letter added successfully');
      setShowAddLetterModal(false);
      fetchRpmLetters();
    } catch (error) {
      console.error('Error adding letter:', error);
      toast.error('Failed to add letter');
    }
  };

  const handleUpdateRpmStatus = async (id: string, status: RPMLetter['status']) => {
    const dueDate = getDueDate(status);
    try {
      const { error } = await supabase
        .from('rpm_letters')
        .update({ status, due_date: dueDate })
        .eq('id', id);

      if (error) throw error;
      fetchRpmLetters();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleUpdateRpmDueDate = async (id: string, dueDate: string) => {
    try {
      const { error } = await supabase
        .from('rpm_letters')
        .update({ due_date: dueDate })
        .eq('id', id);

      if (error) throw error;
      fetchRpmLetters();
    } catch (error) {
      console.error('Error updating due date:', error);
      toast.error('Failed to update due date');
    }
  };

  const getDueDate = (status: RPMLetter['status']): string => {
    switch (status) {
      case 'Reminder 1':
      case 'Reminder 2':
        return '';
      case 'Adequate':
        return 'Finished';
      case 'Inadequate':
        return 'Open';
      default:
        return '';
    }
  };

  const handleEditLetter = (letter: RPMLetter) => {
    setEditingLetter(letter);
    setShowEditLetterModal(true);
  };

  const handleUpdateLetter = async () => {
    if (!editingLetter?.id) return;
    
    try {
      const { error } = await supabase
        .from('rpm_letters')
        .update({
          region: editingLetter.region,
          branch_or_region_ho: editingLetter.branch_or_region_ho,
          subject: editingLetter.subject,
          letter_date: editingLetter.letter_date
        })
        .eq('id', editingLetter.id);

      if (error) throw error;

      toast.success('Letter updated successfully');
      setShowEditLetterModal(false);
      setEditingLetter(null);
      fetchRpmLetters();
    } catch (error) {
      console.error('Error updating letter:', error);
      toast.error('Failed to update letter');
    }
  };

  const handleExportRpm = () => {
    try {
      const exportData = rpmLetters.map((letter, index) => ({
        'No': index + 1,
        'Letter Number': letter.letter_number,
        'Letter Date': letter.letter_date,
        'Region': letter.region,
        'Branch/Region/HO': letter.branch_or_region_ho,
        'Subject': letter.subject,
        'Status': letter.status,
        'Due Date': letter.due_date
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'RPM Letters');
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Create download link manually to avoid file-saver dependency if preferred, 
      // but here we use XLSX.writeFile which handles it or we can use file-saver if installed.
      // Since we used XLSX.writeFile above, let's stick to that for consistency if possible, 
      // but XLSX.write returns buffer. Let's use XLSX.writeFile directly.
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, worksheet, 'RPM Letters');
      XLSX.writeFile(wb, 'rpm_letters_report.xlsx');
      
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  // --- Filtering ---

  const filteredAudits = audits.filter(a => {
    // Filter by Tab Type logic
    // Regular and Special tabs filter by audit_type
    if (activeTab === 'regular' && a.audit_type !== 'regular') return false;
    if (activeTab === 'special' && a.audit_type !== 'fraud') return false;
    // Rating tab: Only Regular audits
    if (activeTab === 'rating' && a.audit_type !== 'regular') return false;
    
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
              onClick={() => setActiveTab('regular')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'regular' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Regular
            </button>
            <button
              onClick={() => setActiveTab('special')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'special' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Special
            </button>
             <button
              onClick={() => setActiveTab('rating')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'rating' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Rating
            </button>
            <button
              onClick={() => setActiveTab('rpm_letter')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'rpm_letter' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              RPM Letter
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
            ) : activeTab === 'rpm_letter' ? (
              <>
                <button
                  onClick={handleExport}
                  className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Download size={18} className="mr-2" />
                  <span>Report</span>
                </button>
                <button
                  onClick={() => setShowAddLetterModal(true)}
                  className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  <Plus size={18} className="mr-2" />
                  <span>Add Letter</span>
                </button>
              </>
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
      {activeTab === 'rpm_letter' ? (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow overflow-x-auto">
          <RPMLetterTable 
            data={rpmLetters} 
            onUpdateStatus={handleUpdateRpmStatus} 
            onUpdateDueDate={handleUpdateRpmDueDate}
            onEdit={handleEditLetter}
          />
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
                     {activeTab === 'rating' && (
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          audit.rating === 'high' ? 'bg-red-100 text-red-700' :
                          audit.rating === 'low' ? 'bg-green-100 text-green-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {audit.rating || 'N/A'}
                        </span>
                     )}
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
                     {activeTab === 'rating' && (
                        <div>
                           <label className="text-xs font-medium text-gray-700 block mb-1">Rating by QA</label>
                           <select
                              value={audit.rating_by_qa || ''}
                              onChange={(e) => handleTextChange(audit.id, 'rating_by_qa', e.target.value)}
                              className={`w-full text-sm border rounded-lg p-2.5 font-medium transition-colors ${
                                audit.rating_by_qa === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                                audit.rating_by_qa === 'low' ? 'bg-green-50 text-green-700 border-green-200' :
                                audit.rating_by_qa === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                                'border-gray-200'
                              }`}
                            >
                              <option value="">- Select QA Rating -</option>
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                        </div>
                     )}
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
                    {activeTab === 'rating' && (
                      <>
                        <th className="px-4 py-3 min-w-[150px]">Audit Period</th>
                        <th className="px-4 py-3 min-w-[150px]">PIC</th>
                        <th className="px-4 py-3 text-center min-w-[120px]">Monitoring Rating</th>
                        <th className="px-4 py-3 text-center min-w-[120px]">Rating by QA</th>
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
                      {activeTab === 'rating' && (
                        <>
                          <td className="px-4 py-3 text-xs">
                            {new Date(audit.audit_start_date).toLocaleDateString()} - {new Date(audit.audit_end_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div className="font-medium">{audit.leader || '-'}</div>
                            <div className="text-gray-500">{audit.team || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              audit.rating === 'high' ? 'bg-red-100 text-red-800' :
                              audit.rating === 'low' ? 'bg-green-100 text-green-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {audit.rating || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <select
                              value={audit.rating_by_qa || ''}
                              onChange={(e) => handleTextChange(audit.id, 'rating_by_qa', e.target.value)}
                              className={`text-xs border rounded p-1 font-medium ${
                                audit.rating_by_qa === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                                audit.rating_by_qa === 'low' ? 'bg-green-50 text-green-700 border-green-200' :
                                audit.rating_by_qa === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ''
                              }`}
                            >
                              <option value="">- Select -</option>
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
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

      {/* Modals */}
      {showAddLetterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add New Letter</h2>
            <div className="space-y-4">
              {/* Letter Number Preview */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <label className="block text-xs font-medium text-indigo-600 mb-1">Letter Number (Auto-generated)</label>
                <div className="text-sm font-mono font-semibold text-indigo-800">
                  {generateLetterNumber(rpmLetters)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Region</label>
                <input
                  type="text"
                  value={newLetter.region}
                  onChange={(e) => setNewLetter({ ...newLetter, region: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Branch/Region/HO</label>
                <input
                  type="text"
                  value={newLetter.branch_or_region_ho}
                  onChange={(e) => setNewLetter({ ...newLetter, branch_or_region_ho: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <textarea
                  value={newLetter.subject}
                  onChange={(e) => setNewLetter({ ...newLetter, subject: e.target.value })}
                  maxLength={500}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={newLetter.status}
                  onChange={(e) => setNewLetter({ ...newLetter, status: e.target.value as RPMLetter['status'] })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="Adequate">Adequate</option>
                  <option value="Inadequate">Inadequate</option>
                  <option value="Reminder 1">Reminder 1</option>
                  <option value="Reminder 2">Reminder 2</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowAddLetterModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLetter}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
              >
                Add Letter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Letter Modal */}
      {showEditLetterModal && editingLetter && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Letter</h3>
              <button
                onClick={() => {
                  setShowEditLetterModal(false);
                  setEditingLetter(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Letter Number</label>
                <input
                  type="text"
                  value={editingLetter.letter_number}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Letter Date</label>
                <input
                  type="date"
                  value={editingLetter.letter_date}
                  onChange={(e) => setEditingLetter({ ...editingLetter, letter_date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Region</label>
                <input
                  type="text"
                  value={editingLetter.region}
                  onChange={(e) => setEditingLetter({ ...editingLetter, region: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Branch/Region/HO</label>
                <input
                  type="text"
                  value={editingLetter.branch_or_region_ho}
                  onChange={(e) => setEditingLetter({ ...editingLetter, branch_or_region_ho: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <textarea
                  value={editingLetter.subject}
                  onChange={(e) => setEditingLetter({ ...editingLetter, subject: e.target.value })}
                  maxLength={500}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowEditLetterModal(false);
                  setEditingLetter(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateLetter}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
              >
                Save Changes
              </button>
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