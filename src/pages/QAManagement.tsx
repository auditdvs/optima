import { RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';
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

// Remove auditor-related interfaces since we're removing the auditors tab

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

const QAManagement: React.FC = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [auditSchedules, setAuditSchedules] = useState<{ branch_name: string; region: string; no: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRegularTable, setLoadingRegularTable] = useState(false);
  const [loadingFraudTable, setLoadingFraudTable] = useState(false);
  const [loadingRecapTable, setLoadingRecapTable] = useState(false);
  const [loadingRPMTable, setLoadingRPMTable] = useState(false);
  const [activeTab, setActiveTab] = useState<'excel' | 'fraud' | 'recap' | 'rpm' | 'matriks'>('excel');
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
  // Add state for hide completed audits checkbox
  const [hideCompletedAudits, setHideCompletedAudits] = useState(false);

  useEffect(() => {
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

  const handleRowChange = (idx: number, updatedRow: AuditEntry) => {
    const newData = [...auditData];
    newData[idx] = updatedRow;
    setAuditData(newData);
  };

  // Function to check if an audit is completed
  // All fields should be true except revisedDapa which we ignore (can be true or false)
  // Special rule: if monitoring is empty/null, audit is NOT completed even if other fields are true
  const isAuditCompleted = (audit: any) => {
    const branchName = audit.branch || audit.branchName;
    
    // Check if ALL required fields are explicitly true (not null, undefined, or false)
    // Using the correct camelCase field names from the interface
    const requiredFields = [
      'dapa',
      'dapaSupportingData', 
      'assignmentLetter',
      'entranceAgenda',
      'entranceAttendance', 
      'auditWorkingPapers',
      'exitMeetingMinutes',
      'exitAttendanceList',
      'auditResultLetter',
      'rta'
    ];
    
    console.log(`===== CHECKING COMPLETION FOR: ${branchName} =====`);
    console.log('Raw audit data:', audit);
    
    // Special check for monitoring field first
    const monitoringValue = audit.monitoring;
    const isMonitoringEmpty = !monitoringValue || monitoringValue === '' || monitoringValue === null || monitoringValue === undefined;
    
    if (isMonitoringEmpty) {
      console.log(`monitoring: ${monitoringValue} (✗ MONITORING IS EMPTY - AUDIT NOT COMPLETED)`);
      console.log('RESULT: MONITORING IS EMPTY -> KEEP THIS AUDIT');
      console.log('==========================================');
      return false;
    }
    
    console.log(`monitoring: ${monitoringValue} (✓ MONITORING HAS VALUE)`);
    
    // Check each required field individually and log detailed info
    let completedCount = 0;
    let totalFields = requiredFields.length;
    
    for (const field of requiredFields) {
      const value = audit[field];
      const isFieldComplete = value === true;
      
      if (isFieldComplete) {
        completedCount++;
      }
      
      console.log(`${field}: ${value} (${isFieldComplete ? '✓ COMPLETED' : '✗ NOT COMPLETED'})`);
    }
    
    // Ignore cash_count and audit_reporting if they're undefined (they don't exist in the table)
    if (audit.cashCount !== undefined) {
      console.log(`cashCount: ${audit.cashCount} (ignored - not in table)`);
    }
    if (audit.auditReporting !== undefined) {
      console.log(`auditReporting: ${audit.auditReporting} (ignored - not in table)`);
    }
    
    // Note: revisedDapa is completely ignored (treated as always true)
    console.log(`revisedDapa: ${audit.revisedDapa} (✓ IGNORED - ALWAYS TREATED AS TRUE)`);
    
    const isCompleted = completedCount === totalFields;
    console.log(`RESULT: ${completedCount}/${totalFields} fields completed + monitoring OK -> ${isCompleted ? '🔥 HIDE THIS AUDIT' : '👀 KEEP THIS AUDIT'}`);
    console.log('==========================================');
    
    return isCompleted;
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
    console.log('🔍 getNumberedAuditData called, hideCompletedAudits:', hideCompletedAudits);
    console.log('🔍 Total audit data before filtering:', auditData.length);
    
    // Apply filter for completed audits if enabled
    let dataToProcess = auditData;
    if (hideCompletedAudits) {
      console.log('🔍 Applying completed audit filter...');
      dataToProcess = auditData.filter(audit => !isAuditCompleted(audit));
      console.log('🔍 Data after filtering:', dataToProcess.length, 'remaining');
    }
    
    // Sort auditData by region dari audit_schedule
    const sortedData = [...dataToProcess].sort((a, b) => {
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

  const switchTab = (tab: 'excel' | 'fraud' | 'recap' | 'rpm' | 'matriks') => {
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
        // No loading state for matriks since it renders directly
        break;
    }
  };

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

  // Fungsi untuk refresh semua data
  const refreshAllData = async () => {
    setRefreshing(true);
    toast.loading('Refreshing data...', { id: 'refresh-toast' });
    
    try {
      // Refresh semua data yang diperlukan
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
    const tabs = ['excel', 'fraud', 'recap', 'rpm', 'matriks'];
    const index = tabs.indexOf(activeTab);
    return `${(index * 100) / tabs.length}%`;
  };

  const getSelectionWidth = () => {
    const tabs = ['excel', 'fraud', 'recap', 'rpm', 'matriks'];
    return `${100 / tabs.length}%`;
  };

  if (loading && branches.length === 0) {
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
          <div className="relative flex w-[500px] overflow-hidden rounded-[10px] border border-[#35343439] bg-white text-black">
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
        <p className="text-sm text-gray-500 mt-1">Manage audit schedules and quality assurance processes</p>
      </div>

      {activeTab === 'excel' ? (
        <Card>
          <CardContent className="p-6">
            {/* Filter region and hide completed audits */}
            <div className="mb-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
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
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hideCompletedAudits"
                  checked={hideCompletedAudits}
                  onChange={(e) => setHideCompletedAudits(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="hideCompletedAudits" className="font-medium text-gray-700">
                  Hide completed audits
                </label>
              </div>
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
            </div>
            {/* Hapus LoadingAnimation di sini, langsung render MatriksSection */}
            <MatriksSection data={auditData} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default QAManagement;