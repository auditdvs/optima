import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from '@tanstack/react-table';
import { saveAs } from 'file-saver';
import { ArrowUpDown, Download, MessageSquare, Plus, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import { CustomCheckbox } from './CustomCheckbox';

interface Branch {
  id: string;
  code: string;
  name: string;
  region: string;
}

interface Auditor {
  id: string;
  auditor_id: string;
  name: string;
}

interface AuditData {
  id?: string;
  no: number;
  branchName: string;
  region: string;
  auditPeriodStart: string;
  auditPeriodEnd: string;
  pic: string;
  dapa: boolean;
  revisedDapa: boolean;
  dapaSupportingData: boolean;
  assignmentLetter: boolean;
  entranceAgenda: boolean;
  entranceAttendance: boolean;
  auditWorkingPapers: boolean;
  exitMeetingMinutes: boolean;
  exitAttendanceList: boolean;
  auditResultLetter: boolean;
  rta: boolean;
  monitoring: 'Adequate' | 'Inadequate' | '';
  comment?: string;
}

interface AuditTableProps {
  data: AuditData[];
  onDataChange: (newData: AuditData[]) => void;
}

interface AddBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (branchData: { 
    region: string; 
    code: string; 
    name: string;
    auditPeriodStart?: string;
    auditPeriodEnd?: string;
    pics: string[];
  }) => void;
  branches: Branch[];
  auditors: Auditor[];
}

interface EditBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AuditData) => void;
  data: AuditData;
  branches: Branch[];
  auditors: Auditor[];
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${month}, ${year}`;
  } catch (error) {
    console.error("Error formatting date:", dateStr, error);
    return '-';
  }
};

const AddBranchModal: React.FC<AddBranchModalProps> = ({ isOpen, onClose, onAdd, branches, auditors }) => {
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [selectedPICs, setSelectedPICs] = useState<string[]>([]);

  if (!isOpen) return null;

  const handlePICChange = (auditorName: string) => {
    setSelectedPICs(prev => {
      if (prev.includes(auditorName)) {
        return prev.filter(name => name !== auditorName);
      } else {
        return [...prev, auditorName];
      }
    });
  };

  const handleAdd = () => {
    const branch = branches.find(b => b.id === selectedBranch);
    if (branch) {
      onAdd({
        region: branch.region,
        code: branch.code,
        name: branch.name,
        auditPeriodStart: periodStart,
        auditPeriodEnd: periodEnd,
        pics: selectedPICs
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-semibold mb-4">Add Branch</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Branch</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select a branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
            <input
              type="text"
              value={branches.find(b => b.id === selectedBranch)?.region || ''}
              readOnly
              className="w-full p-2 border rounded bg-gray-50"
            />
            </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Audit Period Start</label>
            <input
              type="month"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Audit Period End</label>
            <input
              type="month"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PIC (Select Auditors)</label>
            <div className="max-h-40 overflow-y-auto border rounded p-2">
              {auditors.map((auditor) => (
                <div key={auditor.id} className="flex items-center mb-1">
                  <input
                    type="checkbox"
                    id={`auditor-${auditor.id}`}
                    checked={selectedPICs.includes(auditor.name)}
                    onChange={() => handlePICChange(auditor.name)}
                    className="mr-2"
                  />
                  <label htmlFor={`auditor-${auditor.id}`}>
                    {auditor.name} ({auditor.auditor_id})
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedBranch || selectedPICs.length === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

const columnHelper = createColumnHelper<AuditData>();

const AuditTable: React.FC<AuditTableProps> = ({ data, onDataChange }) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingData, setEditingData] = useState<AuditData | null>(null);
  const [pendingChanges, setPendingChanges] = useState<{[key: string]: AuditData}>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState<string>('');

  useEffect(() => {
    fetchBranches();
    fetchAuditors();
    fetchAuditData();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data: branchData, error } = await supabase
        .from('branches')
        .select('id, code, name, region')
        .order('name');
      
      if (error) throw error;
      setBranches(branchData || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Failed to fetch branches');
    }
  };

  const fetchAuditors = async () => {
    try {
      const { data: auditorData, error } = await supabase
        .from('auditors')
        .select('id, auditor_id, name')
        .order('name');
      
      if (error) throw error;
      setAuditors(auditorData || []);
    } catch (error) {
      console.error('Error fetching auditors:', error);
      toast.error('Failed to fetch auditors');
    }
  };

  const fetchAuditData = async () => {
    try {
      const { data: auditData, error } = await supabase
        .from('audit_regular')
        .select('*')
        .order('created_at', { ascending: false });
  
      if (error) throw error;
      if (auditData) {
        console.log("Raw data from database:", auditData); 
        const mappedData = auditData.map((item, index) => ({
          id: item.id,
          no: index + 1,
          branchName: item.branch_name,
          region: item.region,
          auditPeriodStart: item.audit_period_start,
          auditPeriodEnd: item.audit_period_end,
          pic: item.pic,
          dapa: item.dapa,
          revisedDapa: item.revised_dapa,
          dapaSupportingData: item.dapa_supporting_data,
          assignmentLetter: item.assignment_letter,
          entranceAgenda: item.entrance_agenda,
          entranceAttendance: item.entrance_attendance,
          auditWorkingPapers: item.audit_working_papers,
          exitMeetingMinutes: item.exit_meeting_minutes,
          exitAttendanceList: item.exit_attendance_list,
          auditResultLetter: item.audit_result_letter,
          rta: item.rta,
          monitoring: item.monitoring,
          comment: item.comment
        }));
        
        console.log("Mapped data for component:", mappedData);
        onDataChange(mappedData);
      }
    } catch (error) {
      console.error('Error fetching audit data:', error);
      toast.error('Failed to fetch audit data');
    }
  };

  const handleDownload = () => {
    try {
      const exportData = data.map(item => ({
        'No': item.no,
        'Branch Name': item.branchName,
        'region': item.region,
        'Audit Period Start': item.auditPeriodStart,
        'Audit Period End': item.auditPeriodEnd,
        'PIC': item.pic,
        'DAPA': item.dapa ? '✓' : '✗',
        'Revised DAPA': item.revisedDapa ? '✓' : '✗',
        'DAPA Supporting Data': item.dapaSupportingData ? '✓' : '✗',
        'Assignment Letter': item.assignmentLetter ? '✓' : '✗',
        'Entrance Agenda': item.entranceAgenda ? '✓' : '✗',
        'Entrance Attendance': item.entranceAttendance ? '✓' : '✗',
        'Audit Working Papers': item.auditWorkingPapers ? '✓' : '✗',
        'Exit Meeting Minutes': item.exitMeetingMinutes ? '✓' : '✗',
        'Exit Attendance List': item.exitAttendanceList ? '✓' : '✗',
        'Audit Result Letter': item.auditResultLetter ? '✓' : '✗',
        'RTA': item.rta ? '✓' : '✗',
        'Monitoring': item.monitoring,
        'Comment': item.comment || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Regular');
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(dataBlob, 'audit_regular_report.xlsx');
      
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  const EditBranchModal: React.FC<EditBranchModalProps> = ({ isOpen, onClose, onSave, data, branches, auditors }) => {
    // IMPROVED date format conversion - handles more formats
    const formatDateForInput = (dateString: string | undefined) => {
      if (!dateString) return '';
      
      // Handle common date formats
      try {
        // First try direct parsing (if already in YYYY-MM format)
        if (/^\d{4}-\d{2}$/.test(dateString)) {
          return dateString;
        }
        
        // Try parsing as full ISO date
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          return `${year}-${month}`;
        }
        
        // Try parsing MM/YYYY or MM-YYYY formats
        const parts = dateString.split(/[\/\-\,\s]+/);
        if (parts.length >= 2) {
          // Try to identify which part is month vs year
          const possibleYear = parts.find(p => p.length === 4 && !isNaN(Number(p)));
          if (possibleYear) {
            // Find a part that looks like a month (1-12)
            const monthPart = parts.find(p => {
              const num = parseInt(p);
              return !isNaN(num) && num >= 1 && num <= 12;
            });
            
            if (monthPart) {
              const month = String(parseInt(monthPart)).padStart(2, '0');
              return `${possibleYear}-${month}`;
            }
          }
        }
        
        // If all else fails, log and return empty
        console.log("Unparseable date format:", dateString);
        return '';
      } catch (error) {
        console.error("Error formatting date for input:", dateString, error);
        return '';
      }
    };

    // Add logging to help diagnose
    console.log("Initial date values:", {
      start: data.auditPeriodStart,
      end: data.auditPeriodEnd
    });
    
    // Initialize state ONCE when the modal opens
    const [branchName, setBranchName] = useState(data.branchName || '');
    const [region, setRegion] = useState(data.region || '');
    const [periodStart, setPeriodStart] = useState(() => formatDateForInput(data.auditPeriodStart));
    const [periodEnd, setPeriodEnd] = useState(() => formatDateForInput(data.auditPeriodEnd));
    const [selectedPICs, setSelectedPICs] = useState<string[]>(data.pic ? data.pic.split(', ') : []);
    
    // Track if this is the first render of the modal
    const [isInitialized, setIsInitialized] = useState(false);
    
    // Only update state when data.id changes (a different record)
    // or when modal first opens - prevents unwanted resets
    useEffect(() => {
      if (isOpen && (!isInitialized || data.id)) {
        console.log("Initializing modal fields", data.id);
        setBranchName(data.branchName || '');
        setRegion(data.region || '');
        
        const formattedStart = formatDateForInput(data.auditPeriodStart);
        const formattedEnd = formatDateForInput(data.auditPeriodEnd);
        
        console.log("Setting date values:", formattedStart, formattedEnd);
        
        setPeriodStart(formattedStart);
        setPeriodEnd(formattedEnd);
        setSelectedPICs(data.pic ? data.pic.split(', ') : []);
        setIsInitialized(true);
      }
    }, [data.id, isOpen]); // Only depend on record ID and modal state
    
    // Reset initialization when modal closes
    useEffect(() => {
      if (!isOpen) {
        setIsInitialized(false);
      }
    }, [isOpen]);
    
    if (!isOpen) return null;
    
    // Log current state values to help debug
    console.log("Current state values:", {
      periodStart,
      periodEnd,
      formatted: {
        start: formatDateForInput(data.auditPeriodStart),
        end: formatDateForInput(data.auditPeriodEnd),
      }
    });
    
    const handlePICChange = (auditorName: string) => {
      setSelectedPICs(prev => {
        if (prev.includes(auditorName)) {
          return prev.filter(name => name !== auditorName);
        } else {
          return [...prev, auditorName];
        }
      });
    };
    
    const handleSave = () => {
      console.log("Saving values:", {
        periodStart,
        periodEnd
      });
      
      const updatedData: AuditData = {
        ...data,
        branchName,
        region,
        auditPeriodStart: periodStart, 
        auditPeriodEnd: periodEnd,
        pic: selectedPICs.join(', ')
      };
      
      onSave(updatedData);
      // Don't reset any values here - let onClose handle it
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96">
          <h2 className="text-xl font-semibold mb-4">Edit Branch</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Audit Period Start</label>
              <input
                type="month"
                value={periodStart}
                onChange={(e) => {
                  console.log("Period start changed:", e.target.value);
                  setPeriodStart(e.target.value);
                }}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Audit Period End</label>
              <input
                type="month"
                value={periodEnd}
                onChange={(e) => {
                  console.log("Period end changed:", e.target.value);
                  setPeriodEnd(e.target.value);
                }}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIC (Select Auditors)</label>
              <div className="max-h-40 overflow-y-auto border rounded p-2">
                {auditors.map((auditor) => (
                  <div key={auditor.id} className="flex items-center mb-1">
                    <input
                      type="checkbox"
                      id={`edit-auditor-${auditor.id}`}
                      checked={selectedPICs.includes(auditor.name)}
                      onChange={() => handlePICChange(auditor.name)}
                      className="mr-2"
                    />
                    <label htmlFor={`edit-auditor-${auditor.id}`}>
                      {auditor.name} ({auditor.auditor_id})
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  const saveAuditData = async (newData: AuditData) => {
    try {
      const dbData = {
        branch_name: newData.branchName,
        region: newData.region,
        audit_period_start: newData.auditPeriodStart,
        audit_period_end: newData.auditPeriodEnd,
        pic: newData.pic,
        dapa: newData.dapa,
        revised_dapa: newData.revisedDapa,
        dapa_supporting_data: newData.dapaSupportingData,
        assignment_letter: newData.assignmentLetter,
        entrance_agenda: newData.entranceAgenda,
        entrance_attendance: newData.entranceAttendance,
        audit_working_papers: newData.auditWorkingPapers,
        exit_meeting_minutes: newData.exitMeetingMinutes,
        exit_attendance_list: newData.exitAttendanceList,
        audit_result_letter: newData.auditResultLetter,
        rta: newData.rta,
        monitoring: newData.monitoring,
        comment: newData.comment,
        updated_at: new Date().toISOString()
      };
  
      if (newData.id) {
        dbData.id = newData.id;
      }
  
      const { error } = await supabase
        .from('audit_regular')
        .upsert(dbData);
  
      if (error) throw error;
      toast.success('Audit data saved successfully');
      fetchAuditData();
    } catch (error) {
      console.error('Error saving audit data:', JSON.stringify(error, null, 2));
      toast.error('Failed to save audit data');
    }
  };

  const deleteAuditData = async (id: string) => {
    try {
      const { error } = await supabase
        .from('audit_regular')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Audit data deleted successfully');
      fetchAuditData();
    } catch (error) {
      console.error('Error deleting audit data:', JSON.stringify(error, null, 2));
      toast.error('Failed to delete audit data');
    }
  };

  const handleAddBranch = async (branchData: { 
    region: string; 
    code: string; 
    name: string;
    auditPeriodStart?: string;
    auditPeriodEnd?: string;
    pics: string[];
  }) => {
    try {
      const newAuditData: Partial<AuditData> = {
        branchName: branchData.name,
        region: branchData.region,
        auditPeriodStart: branchData.auditPeriodStart || '',
        auditPeriodEnd: branchData.auditPeriodEnd || '',
        pic: branchData.pics.join(', '),
        dapa: false,
        revisedDapa: false,
        dapaSupportingData: false,
        assignmentLetter: false,
        entranceAgenda: false,
        entranceAttendance: false,
        auditWorkingPapers: false,
        exitMeetingMinutes: false,
        exitAttendanceList: false,
        auditResultLetter: false,
        rta: false,
        monitoring: ''
      };

      await saveAuditData(newAuditData as AuditData);
      setShowAddBranchModal(false);
    } catch (error) {
      console.error('Error adding branch:', error);
      toast.error('Failed to add branch');
    }
  };

  const handleEdit = (data: AuditData) => {
    setEditingData(data);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedData: AuditData) => {
    try {
      await saveAuditData(updatedData);
      setShowEditModal(false);
      setEditingData(null);
    } catch (error) {
      console.error('Error updating audit:', error);
      toast.error('Failed to update audit');
    }
  };

  const handleSaveAllChanges = async () => {
    try {
      // Create a loading toast that we'll update with the result
      const toastId = toast.loading(`Saving ${Object.keys(pendingChanges).length} changes...`);
      
      for (const id of Object.keys(pendingChanges)) {
        await saveAuditData(pendingChanges[id]);
      }
      
      // Clear pending changes after successful save
      setPendingChanges({});
      
      // Update the toast to show success
      toast.success(`${Object.keys(pendingChanges).length} changes saved successfully`, {
        id: toastId
      });
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save some changes');
    }
  };

  const handleFieldChange = (rowIndex: number, field: keyof AuditData, value: any) => {
    const item = data[rowIndex];
    const newData = [...data];
    newData[rowIndex] = { ...newData[rowIndex], [field]: value };
    onDataChange(newData);
    
    // Store in pending changes
    if (item.id) {
      setPendingChanges(prev => ({
        ...prev,
        [item.id]: { ...newData[rowIndex] }
      }));
    }
  };

  const uniqueRegions = React.useMemo(() => {
    // Extract unique regions and sort them alphabetically
    const regions = Array.from(new Set(data.map(item => item.region)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    return regions;
  }, [data]);

  const filteredData = React.useMemo(() => {
    if (!regionFilter) return data;
    return data.filter(item => item.region === regionFilter);
  }, [data, regionFilter]);

  const columns = [
    columnHelper.accessor('regNo', {
      header: 'No',
      cell: info => info.row.original.no, // Pakai nilai 'no' per region
    }),

    columnHelper.accessor('no', {
      header: 'Overall No',
      cell: info => info.row.index + 1,
    }),

    columnHelper.accessor('branchName', {
      header: ({ column }) => (
        <div className="flex items-center gap-2">
          Branch Name
          <ArrowUpDown 
            className="h-4 w-4 cursor-pointer" 
            onClick={() => column.toggleSorting()}
         />
        </div>
      ),
      cell: info => <div className="truncate max-w-[200px]" title={info.getValue()}>{info.getValue() || '-'}</div>,
      size: 200,
    }),
    columnHelper.accessor('region', {
      header: ({ column }) => (
        <div className="flex items-center gap-2">
          Region
          <ArrowUpDown 
            className="h-4 w-4 cursor-pointer" 
            onClick={() => column.toggleSorting()}
          />
        </div>
      ),
      cell: info => info.getValue() || '-',
      size: 120,
    }),
    columnHelper.accessor(row => [row.auditPeriodStart, row.auditPeriodEnd], {
      id: 'auditPeriod',
      header: 'Audit Period',
      cell: info => {
        const [start, end] = info.getValue();
        const startFormatted = start ? formatDate(start) : '-';
        const endFormatted = end ? formatDate(end) : '-';
        return (
          <div className="flex items-center gap-2">
            {startFormatted} - {endFormatted}
          </div>
        );
      },
      size: 180,
    }),

    columnHelper.accessor('pic', {
      header: 'PIC',
      cell: info => {
        const picNames = info.getValue()?.split(', ') || [];
        return (
          <div className="min-w-[150px]">
            {picNames.map((name, index) => {
              const auditor = auditors.find(a => a.name === name);
              return (
                <div key={index}>
                  {name} {auditor ? `(${auditor.auditor_id})` : ''}
                </div>
              );
            })}
          </div>
        );
      },
    }),
    columnHelper.accessor('dapa', {
      header: 'DAPA',
      cell: info => (
        <CustomCheckbox
          id={`dapa-${info.row.original.id}`}
          checked={info.getValue()}
          onChange={(checked) => {
            handleFieldChange(info.row.index, 'dapa', checked);
          }}
        />
      ),
    }),
    columnHelper.accessor('revisedDapa', {
      header: 'Revised DAPA',
      cell: info => (
        <CustomCheckbox
          id={`revisedDapa-${info.row.original.id}`}
          checked={info.getValue()}
          onChange={(checked) => {
            handleFieldChange(info.row.index, 'revisedDapa', checked);
          }}
        />
      ),
    }),
    columnHelper.accessor('dapaSupportingData', {
      header: 'DAPA Supporting Data',
      cell: info => (
        <CustomCheckbox
          id={`dapaSupportingData-${info.row.original.id}`}
          checked={info.getValue()}
          onChange={(checked) => {
            handleFieldChange(info.row.index, 'dapaSupportingData', checked);
          }}
        />
      ),
    }),
    columnHelper.accessor('assignmentLetter', {
      header: 'Assignment Letter',
      cell: info => (
        <CustomCheckbox
          id={`assignmentLetter-${info.row.original.id}`}
          checked={info.getValue()}
          onChange={(checked) => {
            handleFieldChange(info.row.index, 'assignmentLetter', checked);
          }}
        />
      ),
    }),
    columnHelper.accessor('entranceAgenda', {
      header: 'Entrance Agenda',
      cell: info => (
        <CustomCheckbox
          id={`entranceAgenda-${info.row.original.id}`}
          checked={info.getValue()}
          onChange={(checked) => {
            handleFieldChange(info.row.index, 'entranceAgenda', checked);
          }}
        />
      ),
    }),
    columnHelper.accessor('entranceAttendance', {
      header: 'Entrance Attendance',
      cell: info => (
        <CustomCheckbox
          id={`entranceAttendance-${info.row.original.id}`}
          checked={info.getValue()}
          onChange={(checked) => {
            handleFieldChange(info.row.index, 'entranceAttendance', checked);
          }}
        />
      ),
    }),
    columnHelper.accessor('auditWorkingPapers', {
      header: 'Audit Working Papers',
      cell: info => (
        <CustomCheckbox
          id={`auditWorkingPapers-${info.row.original.id}`}
          checked={info.getValue()}
          onChange={(checked) => {
            handleFieldChange(info.row.index, 'auditWorkingPapers', checked);
          }}
        />
      ),
    }),
    columnHelper.accessor('exitMeetingMinutes', {
      header: 'Exit Meeting Minutes',
      cell: info => (
        <CustomCheckbox
          id={`exitMeetingMinutes-${info.row.original.id}`}
          checked={info.getValue()}
          onChange={(checked) => {
            handleFieldChange(info.row.index, 'exitMeetingMinutes', checked);
          }}
        />
      ),
    }),
    columnHelper.accessor('exitAttendanceList', {
      header: 'Exit Attendance List',
      cell: info => (
        <CustomCheckbox
          id={`exitAttendanceList-${info.row.original.id}`}
          checked={info.getValue()}
          onChange={(checked) => {
            handleFieldChange(info.row.index, 'exitAttendanceList', checked);
          }}
        />
      ),
    }),
    columnHelper.accessor('auditResultLetter', {
      header: 'Audit Result Letter',
      cell: info => (
        <CustomCheckbox
          id={`auditResultLetter-${info.row.original.id}`}
          checked={info.getValue()}
          onChange={(checked) => {
            handleFieldChange(info.row.index, 'auditResultLetter', checked);
          }}
        />
      ),
    }),
    columnHelper.accessor('rta', {
      header: 'RTA',
      cell: info => (
        <CustomCheckbox
          id={`rta-${info.row.original.id}`}
          checked={info.getValue()}
          onChange={(checked) => {
            handleFieldChange(info.row.index, 'rta', checked);
          }}
        />
      ),
    }),
    columnHelper.accessor('monitoring', {
      header: 'Monitoring',
      cell: info => (
        <select
          value={info.getValue()}
          onChange={e => {
            handleFieldChange(info.row.index, 'monitoring', e.target.value as 'Adequate' | 'Inadequate' | '');
          }}
          className="w-full border rounded px-2 py-1"
        >
          <option value="">Select...</option>
          <option value="Adequate">Adequate</option>
          <option value="Inadequate">Inadequate</option>
        </select>
      ),
    }),
    columnHelper.accessor('comment', {
      header: 'Comment',
      cell: info => (
        <div className="relative">
          <button
            onClick={() => {
              const comment = prompt('Enter comment:', info.getValue());
              if (comment !== null) {
                handleFieldChange(info.row.index, 'comment', comment);
              }
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          {info.getValue() && (
            <div className="absolute bottom-full mb-2 left-0 bg-white p-2 rounded shadow-lg border text-sm">
              {info.getValue()}
            </div>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('actions', {
      header: 'Actions',
      cell: info => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(info.row.original)}
            className="text-blue-500 hover:text-blue-700"
            title="Edit row"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => {
              if (info.row.original.id) {
                setDeletingId(info.row.original.id);
                setShowDeleteConfirm(true);
              }
            }}
            className="text-red-500 hover:text-red-700"
            title="Delete row"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              placeholder="Search..."
              className="pl-9 pr-4 py-2 border rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          {/* Region filter moved here */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Region:</label>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="border rounded px-2 py-1.5 min-w-[120px]"
            >
              <option value="">All Regions</option>
              {uniqueRegions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            <Download className="h-4 w-4" />
            Download Report
          </button>
          <button
            onClick={() => setShowAddBranchModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add Branch
          </button>
          <button
            onClick={handleSaveAllChanges}
            disabled={Object.keys(pendingChanges).length === 0}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save All Changes {Object.keys(pendingChanges).length > 0 && `(${Object.keys(pendingChanges).length})`}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50"
                      >
                        {header.isPlaceholder ? null : (
                          <div className="flex items-center gap-2">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-200">
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="bg-white hover:bg-gray-50">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddBranchModal
        isOpen={showAddBranchModal}
        onClose={() => setShowAddBranchModal(false)}
        onAdd={handleAddBranch}
        branches={branches}
        auditors={auditors}
      />

      {showEditModal && editingData && (
        <IsolatedEditModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingData(null);
          }}
          onSave={handleSaveEdit}
          data={editingData}
          branches={branches}
          auditors={auditors}
        />
      )}

      <DeleteConfirmationModal 
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletingId(null);
        }}
        onConfirm={() => {
          if (deletingId) {
            deleteAuditData(deletingId);
            setShowDeleteConfirm(false);
            setDeletingId(null);
          }
        }}
      />
    </div>
  );
};

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-semibold mb-4">Confirm Delete</h2>
        <p className="mb-4">Are you sure you want to delete this audit record? This action cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// Add this component outside the AuditTable component
const IsolatedEditModal: React.FC<EditBranchModalProps> = (props) => {
  const { isOpen, onClose, onSave, data: initialData, branches, auditors } = props;

  // Helper untuk format tanggal
  const formatDateForInput = (dateString: string | undefined | null) => {
    if (!dateString) return '';
    if (/^\d{4}-\d{2}$/.test(dateString)) return dateString;
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    return '';
  };

  // State per field
  const [branchName, setBranchName] = React.useState('');
  const [region, setRegion] = React.useState('');
  const [periodStart, setPeriodStart] = React.useState('');
  const [periodEnd, setPeriodEnd] = React.useState('');
  const [selectedPICs, setSelectedPICs] = React.useState<string[]>([]);

  // Inisialisasi hanya saat modal dibuka ATAU initialData.id berubah
  React.useEffect(() => {
    if (isOpen && initialData) {
      setBranchName(initialData.branchName || '');
      setRegion(initialData.region || '');
      setPeriodStart(formatDateForInput(initialData.auditPeriodStart));
      setPeriodEnd(formatDateForInput(initialData.auditPeriodEnd));
      setSelectedPICs(initialData.pic ? initialData.pic.split(', ') : []);
    }
    // eslint-disable-next-line
  }, [isOpen, initialData?.id]);

  const handlePICChange = (auditorName: string) => {
    setSelectedPICs(prev =>
      prev.includes(auditorName)
        ? prev.filter(name => name !== auditorName)
        : [...prev, auditorName]
    );
  };

  const handleSave = () => {
    const updatedData = {
      ...initialData,
      branchName,
      region,
      auditPeriodStart: periodStart,
      auditPeriodEnd: periodEnd,
      pic: selectedPICs.join(', ')
    };
    onSave(updatedData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-semibold mb-4">Edit Branch</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
            <input
              type="text"
              value={branchName}
              onChange={e => setBranchName(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
            <input
              type="text"
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Audit Period Start</label>
            <input
              type="month"
              value={periodStart}
              onChange={e => setPeriodStart(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Audit Period End</label>
            <input
              type="month"
              value={periodEnd}
              onChange={e => setPeriodEnd(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PIC (Select Auditors)</label>
            <div className="max-h-40 overflow-y-auto border rounded p-2">
              {auditors.map((auditor) => (
                <div key={auditor.id} className="flex items-center mb-1">
                  <input
                    type="checkbox"
                    id={`edit-auditor-${auditor.id}`}
                    checked={selectedPICs.includes(auditor.name)}
                    onChange={() => handlePICChange(auditor.name)}
                    className="mr-2"
                  />
                  <label htmlFor={`edit-auditor-${auditor.id}`}>
                    {auditor.name} ({auditor.auditor_id})
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditTable;