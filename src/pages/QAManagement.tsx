import { Edit2, RefreshCw, UserPlus } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AuditFraudTable } from '../components/AuditFraudTable';
import AuditTable from '../components/AuditTable';
import { LoadingAnimation } from '../components/LoadingAnimation';
import { MatriksSection } from '../components/MatriksSection';
import { RegularAuditRecap } from '../components/RegularAuditRecap';
import { RPMLetterTable } from '../components/RPMLetterTable';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import '../styles/radioButtons.css';

interface Auditor {
  id: string;
  name: string;
  auditor_id: string;
  created_at: string;
}

interface AddAuditorForm {
  name: string;
  auditor_id: string;
  regional: string;
  semester: 'Odd' | 'Even';
  year: number;
}

interface AddAuditorModalProps {
  handleAddAuditor: (e: React.FormEvent, formData: AddAuditorForm) => void;
  setShowAddModal: (show: boolean) => void;
  loading: boolean;
}

interface Assignment {
  id: string;
  auditor_id: string;
  regional: string;
  semester: 'Odd' | 'Even';
  year: number;
  created_at: string;
}

interface AuditorWithAssignments extends Auditor {
  assignments: Assignment[];
}

// Add these interfaces to help with typing
interface Branch {
  id: string;
  name: string;
  region: string;
  // other branch fields as needed
}

// Update the audit data interface to reference a branch
interface AuditEntry {
  no: string;
  region: string;
  branchId: string;
  branchName: string;
  priorityNo: string; // Add this field for the priority number from audit_schedule
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
  cashCount: boolean;
  auditReporting: boolean;
  exitMeetingMinutes: boolean;
  exitAttendanceList: boolean;
  auditResultLetter: boolean;
  rta: boolean;
  monitoring: 'Adequate' | 'Inadequate';
  comment: string;
}

const AddAuditorModal: React.FC<AddAuditorModalProps> = ({
  handleAddAuditor,
  setShowAddModal,
  loading,
}) => {
  const [localFormData, setLocalFormData] = useState<AddAuditorForm>({
    name: '',
    auditor_id: '',
    regional: '',
    semester: 'Odd',
    year: new Date().getFullYear(),
  });

  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddAuditor(e, localFormData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Add New Auditor</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              ref={nameInputRef}
              type="text"
              value={localFormData.name}
              onChange={(e) => setLocalFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Auditor ID</label>
            <input
              type="text"
              value={localFormData.auditor_id}
              onChange={(e) => setLocalFormData(prev => ({ ...prev, auditor_id: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Regional</label>
            <input
              type="text"
              value={localFormData.regional}
              onChange={(e) => setLocalFormData(prev => ({ ...prev, regional: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Semester</label>
              <select
                value={localFormData.semester}
                onChange={(e) => setLocalFormData(prev => ({ ...prev, semester: e.target.value as 'Odd' | 'Even' }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="Odd">Odd</option>
                <option value="Even">Even</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Year</label>
              <input
                type="number"
                value={localFormData.year}
                onChange={(e) => setLocalFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Auditor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const QAManagement: React.FC = () => {
  const { user } = useAuth();
  const [auditors, setAuditors] = useState<AuditorWithAssignments[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [auditSchedules, setAuditSchedules] = useState<{ branch_name: string; region: string; no: string }[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedAuditor, setSelectedAuditor] = useState<AuditorWithAssignments | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRegularTable, setLoadingRegularTable] = useState(false);
  const [loadingFraudTable, setLoadingFraudTable] = useState(false);
  const [loadingRecapTable, setLoadingRecapTable] = useState(false);
  const [loadingRPMTable, setLoadingRPMTable] = useState(false);
  const [loadingMatriksTable, setLoadingMatriksTable] = useState(false);
  const [activeTab, setActiveTab] = useState<'auditors' | 'excel' | 'fraud' | 'recap' | 'rpm' | 'matriks'>('auditors');
  const [formData, setFormData] = useState<AddAuditorForm>({
    name: '',
    auditor_id: '',
    regional: '',
    semester: 'Odd',
    year: new Date().getFullYear(),
  });
  const [auditData, setAuditData] = useState([
    {
      no: '',
      region: '',
      branchId: '',
      branchName: '',
      priorityNo: '',
      auditPeriodStart: '',
      auditPeriodEnd: '',
      pic: '',
      dapa: null,
      revisedDapa: null,
      dapaSupportingData: null,
      assignmentLetter: null,
      entranceAgenda: null,
      entranceAttendance: null,
      auditWorkingPapers: null,
      cashCount: null,
      auditReporting: null,
      exitMeetingMinutes: null,
      exitAttendanceList: null,
      auditResultLetter: null,
      rta: null,
      monitoring: 'Adequate' as 'Adequate' | 'Inadequate',
      comment: '',
    },
  ]);
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [auditRegular, setAuditRegular] = useState<{ branch_name: string; audit_period: string }[]>([]);
  // Tambahkan state untuk refresh loading
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAuditors();
    fetchBranches();
    fetchAuditRegular();
  }, []);

  useEffect(() => {
    // fetchAuditSchedules setelah auditRegular terisi
    if (auditRegular.length > 0) {
      fetchAuditSchedules();
    }
    // eslint-disable-next-line
  }, [auditRegular]);

  const fetchAuditors = async () => {
    try {
      setLoading(true);
      console.log("Fetching auditors data...");
      
      const { data: auditorsData, error: auditorsError } = await supabase
        .from('auditors')
        .select('*')
        .order('name');

      if (auditorsError) {
        console.error("Error fetching auditors:", auditorsError);
        throw auditorsError;
      }
      
      console.log("Auditors data received:", auditorsData);

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('auditor_assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (assignmentsError) {
        console.error("Error fetching assignments:", assignmentsError);
        throw assignmentsError;
      }
      
      console.log("Assignments data received:", assignmentsData);

      const auditorsWithAssignments = auditorsData.map(auditor => ({
        ...auditor,
        assignments: assignmentsData.filter(assignment => assignment.auditor_id === auditor.id),
      }));

      setAuditors(auditorsWithAssignments);
      console.log("Processed data:", auditorsWithAssignments);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch auditors data');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name');

      if (error) {
        console.error("Error fetching branches:", error);
        throw error;
      }

      setBranches(data || []);
      console.log("Branches data received:", data);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Failed to fetch branches data');
    }
  };

  const fetchAuditRegular = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_regular')
        .select('branch_name, audit_period_start, audit_period_end');
      if (error) throw error;
      setAuditRegular(data || []);
    } catch (error) {
      console.error('Error fetching audit_regular:', error);
      toast.error('Failed to fetch audit_regular');
    }
  };

  const fetchAuditSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_schedule')
        .select('branch_name, region, no');
      if (error) throw error;

      // Mapping period & status dari audit_regular
      const schedulesWithPeriod = (data || []).map(item => {
        const reg = auditRegular.find(
          r => r.branch_name.trim().toLowerCase() === item.branch_name.trim().toLowerCase()
        );
        const periodStart = reg?.audit_period_start || '';
        const periodEnd = reg?.audit_period_end || '';
        const period = periodStart && periodEnd
          ? `${periodStart} - ${periodEnd}`
          : '-';
        const status = periodStart && periodEnd ? 'Audited' : 'Unaudited';
        return {
          ...item,
          period,
          status,
        };
      });

      setAuditSchedules(schedulesWithPeriod);
      console.log('Fetched audit schedules:', schedulesWithPeriod);
    } catch (error) {
      console.error('Error fetching audit schedules:', error);
      toast.error('Failed to fetch audit schedule');
    }
  };

  const handleAddAuditor = async (e: React.FormEvent, formData: AddAuditorForm) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) throw new Error('No authenticated user');

      const { data: auditor, error: auditorError } = await supabase
        .from('auditors')
        .insert([{ name: formData.name, auditor_id: formData.auditor_id, created_by: user.id }])
        .select()
        .maybeSingle();

      if (auditorError) throw new Error(auditorError.message);

      if (!auditor) throw new Error('Failed to create auditor');

      const { error: assignmentError } = await supabase
        .from('auditor_assignments')
        .insert([
          {
            auditor_id: auditor.id,
            regional: formData.regional,
            semester: formData.semester,
            year: formData.year,
            created_by: user.id,
          },
        ]);

      if (assignmentError) {
        await supabase.from('auditors').delete().eq('id', auditor.id);
        throw new Error(assignmentError.message);
      }

      toast.success('Auditor added successfully');
      setShowAddModal(false);
      await fetchAuditors();
    } catch (error) {
      console.error('Error adding auditor:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add auditor');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAuditor || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('auditor_assignments')
        .insert([
          {
            auditor_id: selectedAuditor.id,
            regional: formData.regional,
            semester: formData.semester,
            year: formData.year,
            created_by: user.id,
          },
        ]);

      if (error) throw new Error(error.message);

      toast.success('Assignment updated successfully');
      setShowAssignmentModal(false);
      setSelectedAuditor(null);
      await fetchAuditors();
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleRowChange = (idx: number, updatedRow: AuditEntry) => {
    const newData = [...auditData];
    newData[idx] = updatedRow;
    setAuditData(newData);
  };

  const findMatchingBranch = (branchName: string) => {
    if (!branchName) return null;
    
    // Normalize input
    const normalizedInput = branchName.trim().toLowerCase();
    
    // Coba pencocokan langsung
    let match = auditSchedules.find(
      s => s.branch_name.trim().toLowerCase() === normalizedInput
    );
    
    // Jika tidak ketemu, coba pencocokan dengan menghapus karakter khusus
    if (!match) {
      const simplifiedInput = normalizedInput.replace(/[^a-z0-9]/g, '');
      match = auditSchedules.find(
        s => s.branch_name.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === simplifiedInput
      );
    }
    
    return match;
  };

  const getRegionFromSchedule = (branchName: string) => {
    if (!branchName) return '';
    
    const match = findMatchingBranch(branchName);
    if (!match) {
      console.warn(`Branch not found in audit_schedule: "${branchName}"`);
      return '';
    }
    
    return match.region;
  };

  const getNumberedAuditData = () => {
    // Sort auditData by region dari audit_schedule
    const sortedData = [...auditData].sort((a, b) => {
      const regionA = getRegionFromSchedule(a.branchName) || '';
      const regionB = getRegionFromSchedule(b.branchName) || '';
      
      // Jika region sama, sort berdasarkan nama cabang
      if (regionA === regionB) {
        return a.branchName.localeCompare(b.branchName);
      }
      
      return regionA.localeCompare(regionB);
    });

    // Counter untuk setiap region
    const regionCounters: Record<string, number> = {};

    return sortedData.map(entry => {
      // Ambil region dari audit_schedule
      const match = findMatchingBranch(entry.branchName);
      const region = match ? match.region : 'Unassigned';
      const priorityNo = match ? match.no : ''; // Ambil no dari audit_schedule

      // Inisialisasi counter jika belum ada
      if (!regionCounters[region]) {
        regionCounters[region] = 1;
      }

      // Ambil nomor sekarang, lalu increment
      const no = regionCounters[region];
      regionCounters[region] += 1;

      return {
        ...entry,
        region,
        no: no.toString(),
        priorityNo: priorityNo, // Ganti overallNo menjadi priorityNo
      };
    });
  };

  const switchTab = (tab: 'auditors' | 'excel' | 'fraud' | 'recap' | 'rpm' | 'matriks') => {
    setActiveTab(tab);
    
    // Set appropriate loading state based on selected tab
    switch(tab) {
      case 'excel':
        setLoadingRegularTable(true);
        setTimeout(() => setLoadingRegularTable(false), 800); // Simulate loading delay
        break;
      case 'fraud':
        setLoadingFraudTable(true);
        setTimeout(() => setLoadingFraudTable(false), 800);
        break;
      case 'recap':
        setLoadingRecapTable(true);
        setTimeout(() => setLoadingRecapTable(false), 800);
        break;
      case 'rpm':
        setLoadingRPMTable(true);
        setTimeout(() => setLoadingRPMTable(false), 800);
        break;
      case 'matriks':
        setLoadingMatriksTable(true);
        setTimeout(() => setLoadingMatriksTable(false), 800);
        break;
    }
  };

  const UpdateAssignmentModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Update Assignment</h2>
        <form onSubmit={handleUpdateAssignment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Regional</label>
            <input
              type="text"
              value={formData.regional}
              onChange={(e) => setFormData(prev => ({ ...prev, regional: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Semester</label>
              <select
                value={formData.semester}
                onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value as 'Odd' | 'Even' }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="Odd">Odd</option>
                <option value="Even">Even</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowAssignmentModal(false);
                setSelectedAuditor(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Dapatkan daftar region unik dari auditSchedules
  const uniqueRegions = Array.from(
    new Set(auditSchedules.map(item => item.region).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  // Filter auditSchedules sesuai region yang dipilih
  const filteredAuditSchedules = regionFilter
    ? auditSchedules.filter(item => item.region === regionFilter)
    : auditSchedules;

  // Fungsi untuk membagi data menjadi 2 kolom (gunakan filteredAuditSchedules)
  const getAuditScheduleRows = () => {
    const rows = [];
    for (let i = 0; i < filteredAuditSchedules.length; i += 2) {
      const left = filteredAuditSchedules[i];
      const right = filteredAuditSchedules[i + 1];
      rows.push([left, right]);
    }
    return rows;
  };

  const filteredData = React.useMemo(() => {
    if (!regionFilter) return auditData;
    return auditData.filter(item => item.region === regionFilter);
  }, [auditData, regionFilter]);

  // Fungsi untuk refresh semua data
  const refreshAllData = async () => {
    setRefreshing(true);
    toast.loading('Refreshing data...', { id: 'refresh-toast' });
    
    try {
      // Refresh semua data yang diperlukan
      await fetchAuditors();
      await fetchBranches();
      await fetchAuditRegular();
      // Schedule akan di-fetch otomatis karena ada dependency ke auditRegular
      
      toast.success('Data refreshed successfully', { id: 'refresh-toast' });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data', { id: 'refresh-toast' });
    } finally {
      setRefreshing(false);
    }
  };

  // Add a function to get the selection indicator position
  const getSelectionPosition = () => {
    const tabs = ['auditors', 'excel', 'fraud', 'recap', 'rpm', 'matriks'];
    const index = tabs.indexOf(activeTab);
    return `${(index * 100) / tabs.length}%`;
  };

  const getSelectionWidth = () => {
    const tabs = ['auditors', 'excel', 'fraud', 'recap', 'rpm', 'matriks'];
    return `${100 / tabs.length}%`;
  };

  if (loading && auditors.length === 0) {
    return <LoadingAnimation />;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Quality Assurance Management</h1>
            <button 
              onClick={refreshAllData}
              disabled={refreshing}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all"
              title="Refresh all data"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* New Radio Buttons Style */}
          <div className="relative flex w-[600px] overflow-hidden rounded-[10px] border border-[#35343439] bg-white text-black">
            <label className="flex w-full cursor-pointer items-center justify-center p-2 font-semibold tracking-tight text-sm peer-checked:text-white transition-colors relative z-10">
              <input 
                type="radio" 
                name="qaTab" 
                value="auditors"
                checked={activeTab === 'auditors'} 
                onChange={() => switchTab('auditors')}
                className="hidden peer"
              />
              <span className={activeTab === 'auditors' ? 'text-white' : 'text-black'}>Auditors</span>
            </label>
            
            <label className="flex w-full cursor-pointer items-center justify-center p-2 font-semibold tracking-tight text-sm peer-checked:text-white transition-colors relative z-10">
              <input 
                type="radio" 
                name="qaTab" 
                value="excel"
                checked={activeTab === 'excel'} 
                onChange={() => switchTab('excel')}
                className="hidden peer"
              />
              <span className={activeTab === 'excel' ? 'text-white' : 'text-black'}>Regular</span>
            </label>
            
            <label className="flex w-full cursor-pointer items-center justify-center p-2 font-semibold tracking-tight text-sm peer-checked:text-white transition-colors relative z-10">
              <input 
                type="radio" 
                name="qaTab" 
                value="fraud"
                checked={activeTab === 'fraud'} 
                onChange={() => switchTab('fraud')}
                className="hidden peer"
              />
              <span className={activeTab === 'fraud' ? 'text-white' : 'text-black'}>Special</span>
            </label>
            
            <label className="flex w-full cursor-pointer items-center justify-center p-2 font-semibold tracking-tight text-sm peer-checked:text-white transition-colors relative z-10">
              <input 
                type="radio" 
                name="qaTab" 
                value="recap"
                checked={activeTab === 'recap'} 
                onChange={() => switchTab('recap')}
                className="hidden peer"
              />
              <span className={activeTab === 'recap' ? 'text-white' : 'text-black'}>Rating</span>
            </label>
            
            <label className="flex w-full cursor-pointer items-center justify-center p-2 font-semibold tracking-tight text-sm peer-checked:text-white transition-colors relative z-10">
              <input 
                type="radio" 
                name="qaTab" 
                value="rpm"
                checked={activeTab === 'rpm'} 
                onChange={() => switchTab('rpm')}
                className="hidden peer"
              />
              <span className={activeTab === 'rpm' ? 'text-white' : 'text-black'}>RPM Letter</span>
            </label>
            
            <label className="flex w-full cursor-pointer items-center justify-center p-2 font-semibold tracking-tight text-sm peer-checked:text-white transition-colors relative z-10">
              <input 
                type="radio" 
                name="qaTab" 
                value="matriks"
                checked={activeTab === 'matriks'} 
                onChange={() => switchTab('matriks')}
                className="hidden peer"
              />
              <span className={activeTab === 'matriks' ? 'text-white' : 'text-black'}>Matriks</span>
            </label>
            
            <span 
              className="absolute top-0 h-full bg-indigo-600 transition-all duration-300 z-0" 
              style={{
                left: getSelectionPosition(),
                width: getSelectionWidth()
              }}
            />
          </div>
        </div>
        
        {/* Description text moved below the header */}
        <p className="text-sm text-gray-500 mt-1">Manage auditors and their regional assignments</p>
      </div>

      {activeTab === 'auditors' ? (
        <>
          <div className="mb-4">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
              disabled={loading}
            >
              <UserPlus className="h-5 w-5" />
              Add Auditor
            </button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full align-middle">
                  <div className="overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Auditor ID</TableHead>
                          <TableHead>Current Regional</TableHead>
                          <TableHead>Assignment History</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditors.map((auditor) => (
                          <TableRow key={auditor.id}>
                            <TableCell>{auditor.name}</TableCell>
                            <TableCell>{auditor.auditor_id}</TableCell>
                            <TableCell>{auditor.assignments[0]?.regional || '-'}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {auditor.assignments.map((assignment) => (
                                  <div key={assignment.id} className="text-sm">
                                    <span className="font-medium">{assignment.regional}</span>
                                    <span className="text-gray-500">
                                      {' '}
                                      - {assignment.semester} Semester {assignment.year}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => {
                                    setSelectedAuditor(auditor);
                                    setFormData({
                                      ...formData,
                                      regional: auditor.assignments[0]?.regional || '',
                                      semester: 'Odd',
                                      year: new Date().getFullYear(),
                                    });
                                    setShowAssignmentModal(true);
                                  }}
                                  className="text-indigo-600 hover:text-indigo-900"
                                  title="Update assignment"
                                  disabled={loading}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : activeTab === 'excel' ? (
        <Card>
          <CardContent className="p-6">
            {/* Filter region */}
            <div className="mb-4 flex items-center gap-2">
              <label className="font-medium">Filter by Region:</label>
              <select
                value={regionFilter}
                onChange={e => setRegionFilter(e.target.value)}
                className="border rounded px-2 py-1"
              >
                <option value="">All Regions</option>
                {uniqueRegions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
            {/* Audit Schedule 2 kolom */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Audit Schedule</h2>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>No</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getAuditScheduleRows().map(([left, right], idx) => (
                      <TableRow key={idx}>
                        {/* Kolom kiri */}
                        <TableCell>{left?.no || ''}</TableCell>
                        <TableCell>{left?.branch_name || ''}</TableCell>
                        <TableCell>{left?.period || '-'}</TableCell>
                        <TableCell>
                          <span className={left?.status === 'Audited' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {left?.status || '-'}
                          </span>
                        </TableCell>
                        {/* Kolom kanan */}
                        <TableCell>{right?.no || ''}</TableCell>
                        <TableCell>{right?.branch_name || ''}</TableCell>
                        <TableCell>{right?.period || '-'}</TableCell>
                        <TableCell>
                          <span className={right?.status === 'Audited' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {right?.status || '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                {loadingRegularTable ? (
                  <LoadingAnimation />
                ) : (
                  <AuditTable
                    data={getNumberedAuditData()}
                    onDataChange={(newData) => {
                      console.log("Data yang akan diupdate:", newData);
                      const dataWithoutNumbers = newData.map(({ no, region, priorityNo, ...rest }) => ({
                        ...rest,
                        no: '',
                        region: '',
                        // Remove priorityNo from the saved data
                      }));
                      setAuditData(dataWithoutNumbers);
                    }}
                    renderRow={(row, idx) => (
                      <div className="flex items-center gap-4">
                        <span className="font-medium w-8">{row.no}</span>
                        <span className="font-medium w-8 text-blue-600">{row.priorityNo}</span>
                        <div className="flex-1">
                          <select
                            value={row.branchId || ''}
                            onChange={(e) => {
                              const branchId = e.target.value;
                              const selectedBranch = branches.find(b => b.id === branchId);
                              const branchName = selectedBranch ? selectedBranch.name : '';
                              const match = findMatchingBranch(branchName);
                              const priorityNo = match ? match.no : '';
                              handleRowChange(idx, { 
                                ...row, 
                                branchId: branchId,
                                branchName: branchName,
                                priorityNo: priorityNo, // Add priorityNo when changing branch
                              });
                            }}
                            className="border rounded px-2 py-1 w-full"
                          >
                            <option value="">Select Branch</option>
                            {branches.map(branch => (
                              <option key={branch.id} value={branch.id}>
                                {branch.name} ({branch.region})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                    regionFilter={regionFilter}
                    setRegionFilter={setRegionFilter}
                  />
                )}
              </div>
            </div>

          </CardContent>
        </Card>
      ) : activeTab === 'fraud' ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Audit Special Data</h2>
            </div>
            {loadingFraudTable ? (
              <LoadingAnimation />
            ) : (
              <AuditFraudTable data={auditData} />
            )}
          </CardContent>
        </Card>
      ) : activeTab === 'recap' ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Audit Recap</h2>
            </div>
            {loadingRecapTable ? (
              <LoadingAnimation />
            ) : (
              <RegularAuditRecap data={auditData} />
            )}
          </CardContent>
        </Card>
      ) : activeTab === 'rpm' ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">RPM Letter</h2>
            </div>
            {loadingRPMTable ? (
              <LoadingAnimation />
            ) : (
              <RPMLetterTable data={auditData} />
            )}
          </CardContent>
        </Card>
      ) : activeTab === 'matriks' ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Matriks</h2>
            </div>
            {loadingMatriksTable ? (
              <LoadingAnimation />
            ) : (
              <MatriksSection data={auditData} />
            )}
          </CardContent>
        </Card>
      ) : null}

      {showAddModal && (
        <AddAuditorModal
          handleAddAuditor={handleAddAuditor}
          setShowAddModal={setShowAddModal}
          loading={loading}
        />
      )}

      {showAssignmentModal && selectedAuditor && (
        <UpdateAssignmentModal />
      )}
    </div>
  );
};

export default QAManagement;