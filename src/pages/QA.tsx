import { Plus, Search, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface Auditor {
  id: string;
  full_name: string;
}

interface AuditMaster {
  id: string;
  branch_name: string;
  region: string;
  audit_type: 'regular' | 'fraud';
  audit_start_date: string;
  audit_end_date: string;
  rating?: 'high' | 'medium' | 'low' ;
  inputted_by?: string;
  auditors?: string[]; // Array of strings based on new schema
  leader?: string;
  team?: string;
  fraud_amount?: number; // For display in table if needed, though it's in work_paper_persons
  is_real_fraud?: boolean; // Whether the fraud audit confirmed actual fraud
  has_field_fraud?: boolean; // Whether regular audit found fraud in the field (addendum case)
  // Regular fields
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
  // Fraud fields
  data_prep?: boolean;
  assignment_letter_fr?: boolean;
  audit_wp_fr?: boolean;
  audit_report_fr?: boolean;
  detailed_findings_fr?: boolean;
  comment_fr?: string;
}

interface WorkPaperPerson {
  id?: string;
  audit_master_id: string;
  fraud_staff: string;
  fraud_amount: number;
}

interface Branch {
  id: string;
  name: string;
  region: string; 
}

const QASection: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [auditMasters, setAuditMasters] = useState<AuditMaster[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for Input/Edit Modal
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<AuditMaster | null>(null);
  
  // Form states
  const [rating, setRating] = useState<'high' | 'medium' | 'low'>('medium');
  const [isRealFraud, setIsRealFraud] = useState<boolean>(false);
  const [hasFieldFraud, setHasFieldFraud] = useState<boolean>(false); // For regular audits with fraud findings
  const [fraudPersons, setFraudPersons] = useState<WorkPaperPerson[]>([]);
  
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    fetchBranches();
    fetchAuditors();
    fetchAuditMasters();

    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // Check authentication status and fetch profile
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate('/login');
        return;
      }
      setUser(data.session.user);

      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single();
        
        if (error) {
          console.error('Error fetching profile:', error);
        } else if (profileData) {
          setUserProfile(profileData);
        }
      } catch (err) {
        console.error('Error in profile fetch:', err);
      }
    };
    
    checkAuth();
  }, [navigate]);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, region')
        .order('name');
      
      if (error) throw error;
      if (data) setBranches(data);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Failed to fetch branches');
    }
  };

  const fetchAuditors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      
      if (error) throw error;
      if (data) {
        const filteredAuditors = data.filter(auditor => auditor.full_name && auditor.full_name.trim() !== '');
        setAuditors(filteredAuditors);
      }
    } catch (error) {
      console.error('Error fetching auditors:', error);
      toast.error('Failed to fetch auditors');
    }
  };

  const fetchAuditMasters = async () => {
    try {
      // Fetch audit_master data
      // Note: We might need to join with work_paper_persons to get total fraud amount if needed for display
      // For now, just fetching audit_master
      const { data, error } = await supabase
        .from('audit_master')
        .select('*')
        .order('audit_start_date', { ascending: false });
      
      if (error) throw error;
      if (data) {
        setAuditMasters(data);
      }
    } catch (error) {
      console.error('Error fetching audit masters:', error);
      toast.error('Failed to fetch audit data');
    }
  };

  const fetchFraudPersons = async (auditId: string) => {
    try {
      const { data, error } = await supabase
        .from('work_paper_persons')
        .select('*')
        .eq('audit_master_id', auditId);
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching fraud persons:', error);
      return [];
    }
  };

  const handleOpenInputModal = async (audit: AuditMaster) => {
    setSelectedAudit(audit);
    setRating(audit.rating || 'medium');
    
    if (audit.audit_type === 'fraud') {
      // Set the is_real_fraud checkbox state
      setIsRealFraud(audit.is_real_fraud || false);
      setHasFieldFraud(false); // Reset field fraud for fraud audits
      
      // If is_real_fraud is true, lock rating to high
      if (audit.is_real_fraud) {
        setRating('high');
      }
      
      const persons = await fetchFraudPersons(audit.id);
      if (persons.length > 0) {
        setFraudPersons(persons);
      } else {
        // Initialize with one empty row
        setFraudPersons([{ audit_master_id: audit.id, fraud_staff: '', fraud_amount: 0 }]);
      }
    } else {
      // Regular audit
      setIsRealFraud(false);
      setHasFieldFraud(audit.has_field_fraud || false);
      
      // Fetch fraud persons if has_field_fraud is true
      if (audit.has_field_fraud) {
        const persons = await fetchFraudPersons(audit.id);
        if (persons.length > 0) {
          setFraudPersons(persons);
        } else {
          setFraudPersons([{ audit_master_id: audit.id, fraud_staff: '', fraud_amount: 0 }]);
        }
      } else {
        setFraudPersons([]);
      }
    }
    
    setIsInputModalOpen(true);
  };

  const handleAddFraudPersonRow = () => {
    if (selectedAudit) {
      setFraudPersons([
        ...fraudPersons, 
        { audit_master_id: selectedAudit.id, fraud_staff: '', fraud_amount: 0 }
      ]);
    }
  };

  const handleRemoveFraudPersonRow = (index: number) => {
    const newPersons = [...fraudPersons];
    newPersons.splice(index, 1);
    setFraudPersons(newPersons);
  };

  const handleFraudPersonChange = (index: number, field: keyof WorkPaperPerson, value: any) => {
    const newPersons = [...fraudPersons];
    newPersons[index] = { ...newPersons[index], [field]: value };
    setFraudPersons(newPersons);
  };

  const handleSaveWorkPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAudit) return;

    try {
      setLoading(true);

      // 1. Update audit_master
      const updateData: any = {};

      if (selectedAudit.audit_type === 'regular') {
        updateData.rating = rating;
        updateData.has_field_fraud = hasFieldFraud;
      } 
      
      if (selectedAudit.audit_type === 'fraud') {
         // For fraud audits, also update is_real_fraud
         updateData.is_real_fraud = isRealFraud;
         // If is_real_fraud is true, rating is 'high'; if false, rating is null
         updateData.rating = isRealFraud ? 'high' : null;
      }

      const { error: updateError } = await supabase
        .from('audit_master')
        .update(updateData)
        .eq('id', selectedAudit.id);

      if (updateError) throw updateError;

      // 2. Handle Fraud Persons - for fraud audits with is_real_fraud OR regular audits with has_field_fraud
      const shouldSaveFraudPersons = 
        (selectedAudit.audit_type === 'fraud' && isRealFraud) || 
        (selectedAudit.audit_type === 'regular' && hasFieldFraud);
      
      // Always delete existing fraud persons first
      const { error: deleteError } = await supabase
        .from('work_paper_persons')
        .delete()
        .eq('audit_master_id', selectedAudit.id);
        
      if (deleteError) throw deleteError;

      // Only insert fraud persons if applicable
      if (shouldSaveFraudPersons) {
        // Filter out empty rows
        const validPersons = fraudPersons.filter(p => p.fraud_staff.trim() !== '');
        
        if (validPersons.length > 0) {
          const personsToInsert = validPersons.map(p => ({
            audit_master_id: selectedAudit.id,
            fraud_staff: p.fraud_staff,
            fraud_amount: p.fraud_amount
          }));

          const { error: insertError } = await supabase
            .from('work_paper_persons')
            .insert(personsToInsert);
            
          if (insertError) throw insertError;
        }
      }

      toast.success('Work paper updated successfully');
      setIsInputModalOpen(false);
      fetchAuditMasters(); // Refresh list
    } catch (error: any) {
      console.error('Error saving work paper:', error);
      toast.error(`Failed to save: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter auditMasters
  const filteredAudits = auditMasters.filter(audit => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      audit.branch_name.toLowerCase().includes(searchLower) ||
      (audit.leader && audit.leader.toLowerCase().includes(searchLower)) ||
      (audit.team && audit.team.toLowerCase().includes(searchLower)) ||
      audit.audit_type.toLowerCase().includes(searchLower) ||
      (audit.region && audit.region.toLowerCase().includes(searchLower)) ||
      (audit.auditors && audit.auditors.some(a => a.toLowerCase().includes(searchLower)))
    );

    // Month/Year filter
    let matchesDate = true;
    if (selectedMonth || selectedYear) {
      const startDate = new Date(audit.audit_start_date);
      const endDate = new Date(audit.audit_end_date);
      
      if (selectedYear) {
        const year = parseInt(selectedYear);
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();
        matchesDate = matchesDate && (startYear === year || endYear === year);
      }
      
      if (selectedMonth) {
        const month = parseInt(selectedMonth);
        const startMonth = startDate.getMonth() + 1;
        const endMonth = endDate.getMonth() + 1;
        matchesDate = matchesDate && (startMonth === month || endMonth === month);
      }
    }

    // Region filter
    const matchesRegion = !selectedRegion || audit.region === selectedRegion;

    return matchesSearch && matchesDate && matchesRegion;
  });

  const availableYears = Array.from(new Set(
    auditMasters.flatMap(audit => [
      new Date(audit.audit_start_date).getFullYear(),
      new Date(audit.audit_end_date).getFullYear()
    ])
  )).sort((a, b) => b - a);

  const availableRegions = Array.from(new Set(
    auditMasters.map(audit => audit.region).filter(region => region && region.trim() !== '')
  )).sort();

  const months = [
    { value: '', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };

  if (!branches || branches.length < 1 || !auditors || auditors.length < 1) {
    // return <Loader />; // Can uncomment if you want to block UI until loaded
  }

  return (
    <div className="space-y-2 p-0 mb-2 flex flex-col">
      <h2 className="text-2xl font-bold">Update data input audits</h2>

      {/* Search bar and table container */}
      <div className="rounded-md border shadow-sm">
        {/* Filters */}
        <div className="bg-white p-4 border-b flex justify-between items-center flex-wrap gap-4">
          <h3 className="text-lg font-medium">Audit Tasks</h3>
          <div className="flex items-center space-x-4 flex-wrap">
            <div className="w-32">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="">All Regions</option>
                {availableRegions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            <div className="w-32">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>

            <div className="w-24">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
            </div>

            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search branch, auditors..."
                className="pl-8 pr-4 py-2 w-full border rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left border-b">
                <th className="p-3 font-medium text-gray-600">Branch</th>
                <th className="p-3 font-medium text-gray-600">Region</th>
                <th className="p-3 font-medium text-gray-600">Start Date</th>
                <th className="p-3 font-medium text-gray-600">End Date</th>
                <th className="p-3 font-medium text-gray-600">Type</th>
                <th className="p-3 font-medium text-gray-600">Rating</th>
                <th className="p-3 font-medium text-gray-600">Auditors</th>
                <th className="p-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredAudits.length > 0 ? (
                filteredAudits.map((audit) => (
                  <tr key={audit.id} className="hover:bg-gray-50 bg-white">
                    <td className="p-3 text-gray-700">{audit.branch_name}</td>
                    <td className="p-3 text-gray-700">{audit.region || '-'}</td>
                    <td className="p-3 text-gray-700">{formatDate(audit.audit_start_date)}</td>
                    <td className="p-3 text-gray-700">{formatDate(audit.audit_end_date)}</td>
                    <td className="p-3 text-gray-700">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        audit.audit_type === 'fraud' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {audit.audit_type}
                      </span>
                    </td>
                    <td className="p-3 text-gray-700">
                      {audit.rating ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          audit.rating === 'high' 
                            ? 'bg-red-100 text-red-800' 
                            : audit.rating === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        }`}>
                          {audit.rating}
                        </span>
                      ) : (
                        // Differentiate between "not yet inputted" and "no rating (fraud not confirmed)"
                        audit.audit_type === 'fraud' && audit.is_real_fraud === false ? (
                          <span className="text-gray-400 italic text-xs">No rating</span>
                        ) : (
                          <span className="text-orange-500 text-xs font-medium">Belum diinput</span>
                        )
                      )}
                    </td>
                    <td className="p-3 text-gray-700">
                      {audit.leader || audit.team ? (
                        <div className="text-xs">
                          {audit.leader && (
                            <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-1 mb-1 font-medium">
                              {audit.leader} (Leader)
                            </span>
                          )}
                          {audit.team && audit.team.split(',')
                            .map(m => m.trim())
                            .filter(member => {
                              // Filter out academic titles
                              const academicTitles = [
                                'S.E', 'SE', 'S.E.', 'S.Tr', 'S.Tr.', 'S.Tr.Akun', 'S.Akun',
                                'M.M', 'MM', 'M.M.', 'M.Ak', 'M.Sc', 'M.Si',
                                'S.H', 'SH', 'S.H.', 'S.Kom', 'S.T', 'ST',
                                'Dr', 'Dr.', 'Drs', 'Drs.', 'Ir', 'Ir.',
                                'MBA', 'M.B.A', 'Ph.D', 'PhD',
                                'S.Sos', 'S.Pd', 'S.Ag', 'S.IP', 'S.Psi',
                                'Ak', 'Ak.', 'CA', 'CPA', 'CIA', 'CFE', 'CRMP',
                                'S.Akt', 'S.Stat', 'S.Si', 'S.Hum',
                                'MP', 'M.P', 'M.Eng', 'M.T',
                                ''
                              ];
                              const upperMember = member.toUpperCase();
                              return !academicTitles.some(title => 
                                upperMember === title.toUpperCase() || 
                                upperMember === title.toUpperCase().replace('.', '')
                              );
                            })
                            .map((member, index) => (
                              <span key={index} className="inline-block bg-gray-100 px-2 py-1 rounded mr-1 mb-1">
                                {member}
                              </span>
                            ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-700">
                      <button 
                        onClick={() => handleOpenInputModal(audit)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-600 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        {audit.rating || audit.fraud_amount ? 'Edit Input' : 'Input Data'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-gray-500">
                    No audit tasks found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Input/Edit Modal */}
      {isInputModalOpen && selectedAudit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {selectedAudit.inputted_by ? 'Edit Work Paper' : 'Input Work Paper'}
              </h3>
              <button 
                onClick={() => setIsInputModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveWorkPaper} className="space-y-4">
              {/* Read-only Info Section */}
              <div className="bg-gray-50 p-4 rounded-md grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-gray-500">Branch</span>
                  <span className="font-medium">{selectedAudit.branch_name}</span>
                </div>
                <div>
                  <span className="block text-gray-500">Region</span>
                  <span className="font-medium">{selectedAudit.region}</span>
                </div>
                <div>
                  <span className="block text-gray-500">Date</span>
                  <span className="font-medium">
                    {formatDate(selectedAudit.audit_start_date)} - {formatDate(selectedAudit.audit_end_date)}
                  </span>
                </div>
                <div>
                  <span className="block text-gray-500">Type</span>
                  <span className={`font-medium ${selectedAudit.audit_type === 'fraud' ? 'text-red-600' : 'text-blue-600'}`}>
                    {selectedAudit.audit_type.toUpperCase()}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="block text-gray-500">Auditors</span>
                  <span className="font-medium">
                    {selectedAudit.leader && `${selectedAudit.leader} (Leader)`}
                    {selectedAudit.leader && selectedAudit.team && ', '}
                    {selectedAudit.team || (!selectedAudit.leader && '-')}
                  </span>
                </div>
              </div>

              {/* Input Fields */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Rating - Only show for regular audits OR fraud audits with is_real_fraud = true */}
                  {(selectedAudit.audit_type === 'regular' || (selectedAudit.audit_type === 'fraud' && isRealFraud)) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rating
                      </label>
                      <select
                        value={rating}
                        onChange={(e) => setRating(e.target.value as any)}
                        className={`border p-2 rounded w-full ${selectedAudit.audit_type === 'fraud' && isRealFraud ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        disabled={selectedAudit.audit_type === 'fraud' && isRealFraud}
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                      {selectedAudit.audit_type === 'fraud' && isRealFraud && (
                        <p className="text-xs text-gray-500 mt-1">Rating locked to High for confirmed fraud</p>
                      )}
                    </div>
                  )}
                  
                  {/* Show info when fraud is not confirmed */}
                  {selectedAudit.audit_type === 'fraud' && !isRealFraud && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rating
                      </label>
                      <div className="border p-2 rounded w-full bg-gray-50 text-gray-400 italic text-sm">
                        No rating (fraud not confirmed)
                      </div>
                    </div>
                  )}
                  
                  {/* Is Real Fraud Checkbox - Only for fraud audit type */}
                  {selectedAudit.audit_type === 'fraud' && (
                    <div className="flex items-center">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={isRealFraud}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setIsRealFraud(checked);
                              if (checked) {
                                setRating('high'); // Lock to high when confirmed fraud
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-red-300 peer-checked:bg-red-500 transition-colors"></div>
                          <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                        </div>
                        <div>
                          <span className={`text-sm font-medium ${isRealFraud ? 'text-red-600' : 'text-gray-700'}`}>
                            Is fraud?
                          </span>
                          <p className="text-xs text-gray-500">
                            {isRealFraud ? 'Confirmed fraud case' : 'Mark if fraud is confirmed'}
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                  
                  {/* Has Field Fraud Checkbox - Only for regular audit type */}
                  {selectedAudit.audit_type === 'regular' && (
                    <div className="flex items-center">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={hasFieldFraud}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setHasFieldFraud(checked);
                              if (checked && fraudPersons.length === 0) {
                                // Initialize with one empty row when checking
                                setFraudPersons([{ audit_master_id: selectedAudit.id, fraud_staff: '', fraud_amount: 0 }]);
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-orange-300 peer-checked:bg-orange-500 transition-colors"></div>
                          <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                        </div>
                        <div>
                          <span className={`text-sm font-medium ${hasFieldFraud ? 'text-orange-600' : 'text-gray-700'}`}>
                            Ada temuan fraud?
                          </span>
                          <p className="text-xs text-gray-500">
                            {hasFieldFraud ? 'Ditemukan fraud saat audit' : 'Centang jika ada temuan fraud'}
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                {/* Dynamic Fraud Rows - Show for fraud audits with is_real_fraud OR regular audits with has_field_fraud */}
                {((selectedAudit.audit_type === 'fraud' && isRealFraud) || (selectedAudit.audit_type === 'regular' && hasFieldFraud)) && (
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Fraud Details (Staff & Amount)
                      </label>
                      <button
                        type="button"
                        onClick={handleAddFraudPersonRow}
                        className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                      >
                        <Plus size={16} className="mr-1" /> Add Person
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {fraudPersons.map((person, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Staff Name"
                              value={person.fraud_staff}
                              onChange={(e) => handleFraudPersonChange(index, 'fraud_staff', e.target.value)}
                              className="border p-2 rounded w-full text-sm"
                              required
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              type="number"
                              placeholder="Amount"
                              value={person.fraud_amount}
                              onChange={(e) => handleFraudPersonChange(index, 'fraud_amount', Number(e.target.value))}
                              className="border p-2 rounded w-full text-sm"
                              required
                            />
                            {person.fraud_amount > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                {new Intl.NumberFormat('id-ID', { 
                                  style: 'currency', 
                                  currency: 'IDR',
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                }).format(person.fraud_amount)}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFraudPersonRow(index)}
                            className="p-2 text-red-500 hover:text-red-700"
                            disabled={fraudPersons.length === 1} // Prevent deleting the last row if desired, or allow it
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                      {fraudPersons.length === 0 && (
                        <div className="text-sm text-gray-500 italic">No fraud staff added. Click "Add Person" to start.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsInputModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Work Paper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QASection;