import { Edit, Search, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import { CheckboxGroup, CheckboxOption } from '../components/ui/checkbox';
import { supabase } from '../lib/supabaseClient';

interface WorkPaper {
  id?: string;
  branch_name: string;
  region?: string; // Add region field
  audit_start_date: string;
  audit_end_date: string;
  audit_type: 'regular' | 'fraud';
  fraud_amount?: number;
  fraud_staff?: string;
  rating: 'high' | 'medium' | 'low';
  inputted_by: string;
  auditors: string[];
  work_paper_auditors?: { auditor_name: string }[];
}

interface Branch {
  id: string;
  name: string;
}

interface InputterSummary {
  name: string;
  count: number;
}

const SearchableCheckboxGroup = ({ options, selectedOptions, onChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter options based on search term
  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="space-y-3">
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search auditors..."
          className="pl-9 pr-8 py-2 w-full border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>
      
      <div className="max-h-52 overflow-y-auto pr-1">
        <CheckboxGroup
          options={filteredOptions}
          selectedOptions={selectedOptions}
          onChange={onChange}
        />
      </div>
    </div>
  );
};

const QASection: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [workPapers, setWorkPapers] = useState<WorkPaper[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuditors, setShowAuditors] = useState(false);
  const [inputterSummary, setInputterSummary] = useState<InputterSummary[]>([]);
  const [newWorkPaper, setNewWorkPaper] = useState<WorkPaper>({
    branch_name: '',
    region: '', // Add region to initial state
    audit_start_date: '',
    audit_end_date: '',
    audit_type: 'regular',
    fraud_amount: undefined,
    fraud_staff: undefined,
    rating: 'low',
    inputted_by: '',
    auditors: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingWorkPaper, setEditingWorkPaper] = useState<string | null>(null);

  // New state variables for editing
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [workPaperToEdit, setWorkPaperToEdit] = useState<WorkPaper | null>(null);

  // Add a new state to control the delete confirmation modal
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [workPaperToDelete, setWorkPaperToDelete] = useState<string | null>(null);

  // First, add a new state variable to control the add work paper modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Add these state variables near your other state declarations
  const [showAuditorDetails, setShowAuditorDetails] = useState(false);
  const [selectedAuditorDetails, setSelectedAuditorDetails] = useState<{ auditor_name: string }[]>([]);

  // Add month filter state
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedRegion, setSelectedRegion] = useState<string>(''); // Add region filter state

  const auditorOptions: CheckboxOption[] = [
    { label: 'Andre Perkasa Ginting', value: 'andre' },
    { label: 'Sanjung', value: 'sanjung' },
    { label: 'Abduloh', value: 'abduloh' },
    { label: 'Fatir Anis Sabir', value: 'fatir' },
    { label: 'Anwar Sadat, S.E', value: 'anwar' },
    { label: 'Antoni', value: 'antoni' },
    { label: 'Maya Lestari, S.E', value: 'maya' },
    { label: 'Indah Marsita', value: 'indah' },
    { label: 'Aditya Dwi Susanto', value: 'aditya' },
    { label: 'Achmad Miftachul Huda, S.E', value: 'miftach' },
    { label: 'Heri Hermawan', value: 'heri' },
    { label: 'Aris Munandar', value: 'aris' },
    { label: 'Sandi Mulyadi', value: 'sandi' },
    { label: 'Ahmad', value: 'ahmad' },
    { label: 'Widya Lestari', value: 'widya' },
    { label: 'Retno Istiyanto, A.Md', value: 'retno' },
    { label: 'Ade Yadi Heryadi', value: 'ade' },
    { label: 'Muhamad Yunus', value: 'yunus' },
    { label: 'Dara Fusvita Adityacakra, S.Tr.Akun', value: 'dara' },
    { label: 'Lukman Yasir', value: 'lukman' },
    { label: 'Ngadiman', value: 'ngadiman' },
    { label: 'Solikhin, A.Md', value: 'solikhin' },
    { label: 'Amriani', value: 'amriani' },
    { label: 'Maria Sulistya Wati', value: 'maria' },
    { label: "Muhammad Rifa'i", value: 'rifai' },
    { label: 'Buldani', value: 'buldani' },
    { label: 'Imam Kristiawan', value: 'imam' },
    { label: 'Darmayani', value: 'darmayani' },
    { label: 'Novi Dwi Juanda', value: 'novi' },
    { label: 'Afdal Juanda', value: 'afdal' },
    { label: 'Kandidus Yosef Banu', value: 'kandidus' },
    { label: 'Muhammad Alfian Sidiq', value: 'alfian' },
    { label: 'Fadhlika Sugeng Achmadani, S.E', value: 'fadhlika' },
    { label: 'Hendra Hermawan', value: 'hendra' },
    { label: 'Dadang Supriatna', value: 'dadang' },
    { label: 'Yogi Nugraha', value: 'yogi' },
    { label: 'Iqbal Darmazi', value: 'iqbal' },
    { label: 'Ganjar Raharja', value: 'ganjar' },
    { label: 'Dede Yudha Nersanto', value: 'dede' },
    { label: 'Ayu Sri Erian Agustin', value: 'eri' },
    { label: 'Lise Roswati Rochendi MP', value: 'lise' },
  ];

  const inputterOptions = ['Ayu', 'Lise', 'Ganjar', 'Dede', 'Afan'];

  useEffect(() => {
    setLoading(true);
    fetchBranches();
    fetchWorkPapers();

    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // Add a new useEffect to calculate the inputter summary when workPapers changes
  useEffect(() => {
    calculateInputterSummary();
  }, [workPapers]);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // Redirect to login if not authenticated
        navigate('/login');
        return;
      }
      setUser(data.session.user);
    };
    
    checkAuth();
  }, [navigate]);

  const calculateInputterSummary = () => {
    // Initialize with required inputters set to 0
    const summary: Record<string, number> = {
      'Afan': 0,
      'Lise': 0, 
      'Ayu': 0,
      'Ganjar': 0,
      'Dede': 0
    };
    
    // Count work papers by inputter
    workPapers.forEach(wp => {
      if (wp.inputted_by) {
        if (summary[wp.inputted_by] !== undefined) {
          summary[wp.inputted_by]++;
        } else {
          summary[wp.inputted_by] = 1;
        }
      }
    });
    
    // Convert to array format for display
    const summaryArray = Object.entries(summary).map(([name, count]) => ({
      name,
      count
    }));
    
    setInputterSummary(summaryArray);
  };
  
  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      if (data) setBranches(data);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Failed to fetch branches');
    }
  };

  const fetchWorkPapers = async () => {
    try {
      const { data, error } = await supabase
        .from('work_papers')
        .select(`
          *,
          work_paper_auditors(auditor_name)
        `);
      
      if (error) throw error;
      if (data) {
        setWorkPapers(data);
      }
    } catch (error) {
      console.error('Error fetching work papers:', error);
      toast.error('Failed to fetch work papers');
    }
  };


  const handleDeleteWorkPaper = async (id: string) => {
    // Instead of using confirm(), set the workPaperToDelete and show the confirmation modal
    setWorkPaperToDelete(id);
    setShowDeleteConfirmation(true);
  };

  // Add a new function to handle the actual deletion after confirmation
  const confirmDelete = async () => {
    if (!workPaperToDelete) return;
    
    try {
      setLoading(true);
      
      // First, get all work_paper_auditor IDs for this work paper
      const { data: existingAuditors, error: fetchError } = await supabase
        .from('work_paper_auditors')
        .select('id')
        .eq('work_paper_id', workPaperToDelete);
      
      if (fetchError) {
        console.error('Error fetching existing auditors:', fetchError);
        throw fetchError;
      }
      
      // Delete related audit_counts records first (if any exist)
      if (existingAuditors && existingAuditors.length > 0) {
        const auditorIds = existingAuditors.map(a => a.id);
        
        console.log('Deleting audit_counts for auditor IDs:', auditorIds);
        
        const { error: auditCountsDeleteError } = await supabase
          .from('audit_counts')
          .delete()
          .in('work_paper_auditor_id', auditorIds);
        
        if (auditCountsDeleteError) {
          console.error('Error deleting audit counts:', auditCountsDeleteError);
          throw auditCountsDeleteError;
        }
      }
      
      // Now delete the work_paper_auditors
      const { error: deleteError } = await supabase
        .from('work_paper_auditors')
        .delete()
        .eq('work_paper_id', workPaperToDelete);
        
      if (deleteError) {
        console.error('Error deleting work paper auditors:', deleteError);
        throw deleteError;
      }
      
      // Finally delete the work paper
      const { error: workPaperError } = await supabase
        .from('work_papers')
        .delete()
        .eq('id', workPaperToDelete);

      if (workPaperError) {
        console.error('Error deleting work paper:', workPaperError);
        throw workPaperError;
      }

      // Update state and show toast
      setWorkPapers(workPapers.filter(wp => wp.id !== workPaperToDelete));
      toast.success('Work paper deleted successfully');
    } catch (error) {
      console.error('Error deleting work paper:', error);
      debugError(error, 'confirmDelete');
      toast.error('Failed to delete work paper. Check console for details.');
    } finally {
      setShowDeleteConfirmation(false);
      setWorkPaperToDelete(null);
      setLoading(false);
    }
  };

  const handleAuditTypeChange = (type: 'regular' | 'fraud') => {
    setNewWorkPaper({
      ...newWorkPaper,
      audit_type: type,
      rating: type === 'fraud' ? 'high' : newWorkPaper.rating,
      fraud_amount: type === 'regular' ? undefined : newWorkPaper.fraud_amount,
      fraud_staff: type === 'regular' ? undefined : newWorkPaper.fraud_staff
    });
  };

  const handleAddWorkPaper = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    if (new Date(newWorkPaper.audit_start_date) > new Date(newWorkPaper.audit_end_date)) {
      toast.error('Start date cannot be after end date');
      return;
    }

    if (newWorkPaper.audit_type === 'fraud' && !newWorkPaper.fraud_amount) {
      toast.error('Please provide a fraud amount for fraud audit type');
      return;
    }

    if (newWorkPaper.audit_type === 'fraud' && !newWorkPaper.fraud_staff) {
      toast.error('Please provide fraud staff name for fraud audit type');
      return;
    }

    try {
      setLoading(true);
      // Insert work paper
      const { data: workPaperData, error: workPaperError } = await supabase
        .from('work_papers')
        .insert({
          branch_name: newWorkPaper.branch_name,
          region: newWorkPaper.region, // Add region to insert
          audit_start_date: newWorkPaper.audit_start_date,
          audit_end_date: newWorkPaper.audit_end_date,
          audit_type: newWorkPaper.audit_type,
          fraud_amount: newWorkPaper.fraud_amount,
          fraud_staff: newWorkPaper.fraud_staff,
          rating: newWorkPaper.rating,
          inputted_by: newWorkPaper.inputted_by
        })
        .select('id');

      if (workPaperError) throw workPaperError;

      // Handle auditors
      if (workPaperData && workPaperData[0]?.id) {
        const workPaperId = workPaperData[0].id;

        const auditorInserts = newWorkPaper.auditors.map(auditor => ({
          work_paper_id: workPaperId,
          auditor_name: auditor
        }));

        if (auditorInserts.length > 0) {
          const { error: auditorError } = await supabase
            .from('work_paper_auditors')
            .insert(auditorInserts);

          if (auditorError) throw auditorError;
        }
      }

      // Refresh work papers and reset form
      await fetchWorkPapers();
      setNewWorkPaper({
        branch_name: '',
        region: '', // Reset region
        audit_start_date: '',
        audit_end_date: '',
        audit_type: 'regular',
        fraud_amount: undefined,
        fraud_staff: undefined,
        rating: 'medium',
        inputted_by: '',
        auditors: []
      });

      // Close the modal
      setIsAddModalOpen(false);
      
      toast.success('Work paper added successfully!');
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error adding work paper:', error);
      toast.error('Failed to add work paper');
      setLoading(false);
    }
  };

  // Filter workPapers based on search term, month/year, and region
  const filteredWorkPapers = workPapers.filter(wp => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      wp.branch_name.toLowerCase().includes(searchLower) ||
      wp.inputted_by.toLowerCase().includes(searchLower) ||
      wp.audit_type.toLowerCase().includes(searchLower) ||
      (wp.fraud_staff && wp.fraud_staff.toLowerCase().includes(searchLower)) ||
      (wp.region && wp.region.toLowerCase().includes(searchLower)) // Add region to search
    );

    // Month/Year filter
    let matchesDate = true;
    if (selectedMonth || selectedYear) {
      const startDate = new Date(wp.audit_start_date);
      const endDate = new Date(wp.audit_end_date);
      
      if (selectedYear) {
        const year = parseInt(selectedYear);
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();
        matchesDate = matchesDate && (startYear === year || endYear === year);
      }
      
      if (selectedMonth) {
        const month = parseInt(selectedMonth);
        const startMonth = startDate.getMonth() + 1; // getMonth() returns 0-11
        const endMonth = endDate.getMonth() + 1;
        matchesDate = matchesDate && (startMonth === month || endMonth === month);
      }
    }

    // Region filter
    const matchesRegion = !selectedRegion || wp.region === selectedRegion;

    return matchesSearch && matchesDate && matchesRegion;
  });

  // Get available years from work papers
  const availableYears = Array.from(new Set(
    workPapers.flatMap(wp => [
      new Date(wp.audit_start_date).getFullYear(),
      new Date(wp.audit_end_date).getFullYear()
    ])
  )).sort((a, b) => b - a);

  // Get available regions from work papers
  const availableRegions = Array.from(new Set(
    workPapers.map(wp => wp.region).filter(region => region && region.trim() !== '')
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

  const handleEditWorkPaper = (id: string) => {
    // Find the work paper to edit
    const workPaperToEdit = workPapers.find(wp => wp.id === id);
    if (workPaperToEdit) {
      // Set it in state with auditors prepared
      const auditorNames = workPaperToEdit.work_paper_auditors?.map(a => a.auditor_name) || [];
      
      setWorkPaperToEdit({
        ...workPaperToEdit,
        auditors: auditorNames
      });
      
      // Open the modal
      setIsEditModalOpen(true);
    } else {
      toast.error('Work paper not found');
    }
  };
  
  // Tambahkan fungsi debug
  const debugError = (error: any, context: string) => {
    console.group(`Error in ${context}:`);
    console.log('Error object:', error);
    console.log('Error message:', error?.message);
    console.log('Error code:', error?.code);
    console.log('Error details:', error?.details);
    console.log('Error hint:', error?.hint);
    console.groupEnd();
  };

  const handleUpdateWorkPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workPaperToEdit || !workPaperToEdit.id) {
      toast.error('No work paper to update');
      return;
    }
    
    // Add validation for dates
    if (new Date(workPaperToEdit.audit_start_date) > new Date(workPaperToEdit.audit_end_date)) {
      toast.error('Start date cannot be after end date');
      return;
    }
    
    // Validate inputs for fraud type
    if (workPaperToEdit.audit_type === 'fraud' && !workPaperToEdit.fraud_amount) {
      toast.error('Please provide a fraud amount for fraud audit type');
      return;
    }
    
    if (workPaperToEdit.audit_type === 'fraud' && !workPaperToEdit.fraud_staff) {
      toast.error('Please provide fraud staff name for fraud audit type');
      return;
    }
    
    try {
      setLoading(true);
      
      // Log current session for debugging
      const { data: session } = await supabase.auth.getSession();
      console.log('Current session:', session?.session?.user?.id);
      
      // Update the work paper only (tidak update auditors di sini)
      const updateData: any = {
        audit_start_date: workPaperToEdit.audit_start_date,
        audit_end_date: workPaperToEdit.audit_end_date,
        rating: workPaperToEdit.rating,
        inputted_by: workPaperToEdit.inputted_by
      };

      // Only add region if it's not empty
      if (workPaperToEdit.region && workPaperToEdit.region.trim() !== '') {
        updateData.region = workPaperToEdit.region;
      }

      // Only add fraud fields if it's a fraud type
      if (workPaperToEdit.audit_type === 'fraud') {
        if (workPaperToEdit.fraud_amount) {
          updateData.fraud_amount = workPaperToEdit.fraud_amount;
        }
        if (workPaperToEdit.fraud_staff) {
          updateData.fraud_staff = workPaperToEdit.fraud_staff;
        }
      }

      const { error: workPaperError } = await supabase
        .from('work_papers')
        .update(updateData)
        .eq('id', workPaperToEdit.id);
        
      if (workPaperError) {
        console.error('Work paper update error:', workPaperError);
        throw workPaperError;
      }
      
      // Handle auditors - HANYA jika ada perubahan auditor
      const currentAuditors = workPapers.find(wp => wp.id === workPaperToEdit.id)?.work_paper_auditors?.map(a => a.auditor_name) || [];
      const newAuditors = workPaperToEdit.auditors || [];
      
      // Check if auditors have changed
      const auditorsChanged = JSON.stringify(currentAuditors.sort()) !== JSON.stringify(newAuditors.sort());
      
      if (auditorsChanged) {
        // First, get existing work_paper_auditor IDs
        const { data: existingAuditors, error: fetchError } = await supabase
          .from('work_paper_auditors')
          .select('id')
          .eq('work_paper_id', workPaperToEdit.id);
        
        if (fetchError) {
          console.error('Error fetching existing auditors:', fetchError);
          throw fetchError;
        }
        
        // Delete related audit_counts records first (if any exist)
        if (existingAuditors && existingAuditors.length > 0) {
          const auditorIds = existingAuditors.map(a => a.id);
          
          console.log('Deleting audit_counts for auditor IDs:', auditorIds);
          
          const { error: auditCountsDeleteError } = await supabase
            .from('audit_counts')
            .delete()
            .in('work_paper_auditor_id', auditorIds);
          
          if (auditCountsDeleteError) {
            console.error('Error deleting audit counts:', auditCountsDeleteError);
            throw auditCountsDeleteError;
          }
        }
        
        // Now delete the work_paper_auditors
        const { error: deleteError } = await supabase
          .from('work_paper_auditors')
          .delete()
          .eq('work_paper_id', workPaperToEdit.id);
          
        if (deleteError) {
          console.error('Error deleting work paper auditors:', deleteError);
          throw deleteError;
        }
        
        // Insert new auditors if any
        if (newAuditors.length > 0) {
          const auditorInserts = newAuditors.map(auditor => ({
            work_paper_id: workPaperToEdit.id!,
            auditor_name: auditor
          }));
          
          const { error: auditorsError } = await supabase
            .from('work_paper_auditors')
            .insert(auditorInserts);
            
          if (auditorsError) {
            console.error('Auditor insert error:', auditorsError);
            throw auditorsError;
          }
        }
      }
      
      // Refresh data and close modal
      await fetchWorkPapers();
      setIsEditModalOpen(false);
      setWorkPaperToEdit(null);
      toast.success('Work paper updated successfully!');
    } catch (error) {
      debugError(error, 'handleUpdateWorkPaper');
      
      // More detailed error message
      if (error && typeof error === 'object' && 'message' in error) {
        toast.error(`Failed to update work paper: ${error.message}`);
      } else if (error && typeof error === 'object' && 'code' in error) {
        toast.error(`Database error (${error.code}): Please check console for details.`);
      } else {
        toast.error('Failed to update work paper. Please check console for details.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleAuditTypeChangeForEdit = (type: 'regular' | 'fraud') => {
    if (!workPaperToEdit) return;
    
    setWorkPaperToEdit({
      ...workPaperToEdit,
      audit_type: type,
      rating: type === 'fraud' ? 'high' : workPaperToEdit.rating,
      fraud_amount: type === 'regular' ? undefined : workPaperToEdit.fraud_amount,
      fraud_staff: type === 'regular' ? undefined : workPaperToEdit.fraud_staff
    });
  };
  
  // Add this function with your other handler functions
  const handleShowAuditors = (auditors: { auditor_name: string }[]) => {
    setSelectedAuditorDetails(auditors);
    setShowAuditorDetails(true);
  };

  // Add function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2); // Get last 2 digits of year
    return `${day}/${month}/${year}`;
  };

  if (!branches || branches.length < 1) {
    return <Loader />;
  }

  return (
    <div className="space-y-2 p-0 mb-2 flex flex-col">
      {/* Inputter Summary Table */}
      <div className="rounded-md border mb-4">
        <div className="bg-gray-50 p-2 rounded-t-md">
          <h3 className="text-xl font-medium text-gray-700">Inputter Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {inputterOptions.slice(0, 5).map((name) => (
                  <th key={name} scope="col" className="px-4 py-2 text-center font-medium text-gray-500">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                {inputterOptions.slice(0, 5).map((name) => {
                  const entry = inputterSummary.find(item => item.name === name);
                  return (
                    <td key={name} className="px-4 py-2 text-center text-gray-700 font-medium">
                      {entry ? entry.count : 0}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <h2 className="text-2xl font-bold">Update data input audits</h2>

      {/* Search bar and table container with shadcn styling */}
      <div className="rounded-md border shadow-sm">
        {/* Table header with search, filters and add button */}
        <div className="bg-white p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium">Work Papers</h3>
          <div className="flex items-center space-x-4">
            {/* Region Filter */}
            <div className="w-32">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="">All Regions</option>
                {availableRegions.map(region => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Filter */}
            <div className="w-32">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div className="w-24">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search work papers..."
                className="pl-8 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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

            {/* Add Button */}
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              <span className="mr-1">+</span> Add Work Paper
            </button>
          </div>
        </div>

        {/* Table with shadcn styling */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left border-b">
                <th className="p-3 font-medium text-gray-600">Branch</th>
                <th className="p-3 font-medium text-gray-600">Region</th>
                <th className="p-3 font-medium text-gray-600">Start Date</th>
                <th className="p-3 font-medium text-gray-600">End Date</th>
                <th className="p-3 font-medium text-gray-600">Type</th>
                <th className="p-3 font-medium text-gray-600">Fraud Amount</th>
                <th className="p-3 font-medium text-gray-600">Fraud Staff</th>
                <th className="p-3 font-medium text-gray-600">Rating</th>
                <th className="p-3 font-medium text-gray-600">Inputted By</th>
                <th className="p-3 font-medium text-gray-600">Auditors</th>
                <th className="p-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredWorkPapers.length > 0 ? (
                filteredWorkPapers.map((wp) => (
                  <tr key={wp.id} className="hover:bg-gray-50 bg-white">
                    <td className="p-3 text-gray-700">{wp.branch_name}</td>
                    <td className="p-3 text-gray-700">{wp.region || '-'}</td>
                    <td className="p-3 text-gray-700">{formatDate(wp.audit_start_date)}</td>
                    <td className="p-3 text-gray-700">{formatDate(wp.audit_end_date)}</td>
                    <td className="p-3 text-gray-700">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        wp.audit_type === 'fraud' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {wp.audit_type}
                      </span>
                    </td>
                    <td className="p-3 text-gray-700">
                      {wp.fraud_amount ? `Rp ${wp.fraud_amount.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3 text-gray-700">{wp.fraud_staff || '-'}</td>
                    <td className="p-3 text-gray-700">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        wp.rating === 'high' 
                          ? 'bg-red-100 text-red-800' 
                          : wp.rating === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {wp.rating}
                      </span>
                    </td>
                    <td className="p-3 text-gray-700">{wp.inputted_by}</td>
                    <td className="p-3 text-gray-700">
                      {wp.work_paper_auditors && wp.work_paper_auditors.length > 0 ? (
                        <button
                          onClick={() => handleShowAuditors(wp.work_paper_auditors!)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full transition-colors"
                        >
                          {wp.work_paper_auditors.length} auditor(s)
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3 text-gray-700">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => wp.id && handleEditWorkPaper(wp.id)}
                          className="text-blue-500 hover:text-blue-700"
                          title="Edit work paper"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => wp.id && handleDeleteWorkPaper(wp.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete work paper"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="p-4 text-center text-gray-500">
                    {searchTerm || selectedMonth || selectedYear || selectedRegion ? 'No results found for your filters' : 'No work papers available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Edit Work Paper Modal */}
      {isEditModalOpen && workPaperToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Edit Work Paper</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateWorkPaper} className="grid grid-cols-2 gap-4">
              {/* Branch Name - Read Only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <input 
                  type="text" 
                  value={workPaperToEdit.branch_name} 
                  disabled
                  className="border p-2 rounded w-full bg-gray-100"
                />
              </div>

              {/* Region - Editable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region
                </label>
                <input 
                  type="text" 
                  value={workPaperToEdit.region || ''} 
                  onChange={(e) => setWorkPaperToEdit({
                    ...workPaperToEdit,
                    region: e.target.value
                  })}
                  placeholder="Enter region"
                  className="border p-2 rounded w-full"
                />
              </div>
              
              {/* Dates - Editable */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input 
                    type="date" 
                    value={workPaperToEdit.audit_start_date} 
                    onChange={(e) => setWorkPaperToEdit({
                      ...workPaperToEdit,
                      audit_start_date: e.target.value
                    })}
                    className="border p-2 rounded w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input 
                    type="date" 
                    value={workPaperToEdit.audit_end_date} 
                    onChange={(e) => setWorkPaperToEdit({
                      ...workPaperToEdit,
                      audit_end_date: e.target.value
                    })}
                    className="border p-2 rounded w-full"
                    required
                  />
                </div>
              </div>
              
              {/* Audit Type - Read Only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <input
                  type="text"
                  value={workPaperToEdit.audit_type === 'regular' ? 'Regular' : 'Fraud'}
                  disabled
                  className="border p-2 rounded w-full bg-gray-100"
                />
              </div>
              
              {/* Inputted By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inputted By
                </label>
                <select
                  value={workPaperToEdit.inputted_by}
                  onChange={(e) => setWorkPaperToEdit({
                    ...workPaperToEdit,
                    inputted_by: e.target.value
                  })}
                  className="border p-2 rounded w-full"
                  required
                >
                  <option value="">Select Inputter</option>
                  {inputterOptions.map(inputter => (
                    <option key={inputter} value={inputter}>{inputter}</option>
                  ))}
                </select>
              </div>
              
              {/* Fraud details - shown only for fraud type */}
              {workPaperToEdit.audit_type === 'fraud' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fraud Amount
                    </label>
                    <input
                      type="number"
                      placeholder="Fraud Amount"
                      value={workPaperToEdit.fraud_amount || ''}
                      onChange={(e) => setWorkPaperToEdit({
                        ...workPaperToEdit,
                        fraud_amount: Number(e.target.value)
                      })}
                      className="border p-2 rounded w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fraud Staff
                    </label>
                    <input
                      type="text"
                      placeholder="Fraud Staff Name"
                      value={workPaperToEdit.fraud_staff || ''}
                      onChange={(e) => setWorkPaperToEdit({
                        ...workPaperToEdit,
                        fraud_staff: e.target.value
                      })}
                      className="border p-2 rounded w-full"
                      required
                    />
                  </div>
                </>
              )}
              
              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rating
                </label>
                <select
                  value={workPaperToEdit.rating}
                  onChange={(e) => setWorkPaperToEdit({
                    ...workPaperToEdit,
                    rating: e.target.value as 'high' | 'medium' | 'low'
                  })}
                  className="border p-2 rounded w-full"
                  required
                  disabled={workPaperToEdit.audit_type === 'fraud'}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              
              {/* Auditors Section */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auditors
                </label>
                <div className="border rounded-md p-3">
                  <SearchableCheckboxGroup
                    options={auditorOptions}
                    selectedOptions={workPaperToEdit.auditors}
                    onChange={(selectedOptions) => {
                      setWorkPaperToEdit({
                        ...workPaperToEdit,
                        auditors: selectedOptions
                      });
                    }}
                  />
                </div>
              </div>
              
              {/* Form buttons */}
              <div className="col-span-2 flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Update Work Paper
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg
                      aria-hidden="true"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-6 w-6 text-red-600"
                    >
                      <path
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      ></path>
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3
                      id="modal-title"
                      className="text-base font-semibold leading-6 text-gray-900"
                    >
                      Delete Work Paper
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this work paper? All related data will be permanently removed.
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                  type="button"
                  onClick={confirmDelete}
                >
                  Delete
                </button>
                <button
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  type="button"
                  onClick={() => setShowDeleteConfirmation(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Work Paper Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Add New Work Paper</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddWorkPaper} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <select
                  value={newWorkPaper.branch_name}
                  onChange={(e) => setNewWorkPaper({...newWorkPaper, branch_name: e.target.value})}
                  required
                  className="border p-2 rounded w-full"
                >
                  <option value="">Select Branch</option>          
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <input
                  type="text"
                  placeholder="Enter region"
                  value={newWorkPaper.region || ''}
                  onChange={(e) => setNewWorkPaper({...newWorkPaper, region: e.target.value})}
                  className="border p-2 rounded w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newWorkPaper.audit_start_date}
                    onChange={(e) => setNewWorkPaper({...newWorkPaper, audit_start_date: e.target.value})}
                    required
                    className="border p-2 rounded w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newWorkPaper.audit_end_date}
                    onChange={(e) => setNewWorkPaper({...newWorkPaper, audit_end_date: e.target.value})}
                    required
                    className="border p-2 rounded w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Audit Type</label>
                <select
                  value={newWorkPaper.audit_type}
                  onChange={(e) => handleAuditTypeChange(e.target.value as 'regular' | 'fraud')}
                  className="border p-2 rounded w-full"
                >
                  <option value="regular">Regular</option>
                  <option value="fraud">Fraud</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inputted By</label>
                <select
                  value={newWorkPaper.inputted_by}
                  onChange={(e) => setNewWorkPaper({...newWorkPaper, inputted_by: e.target.value})}
                  className="border p-2 rounded w-full"
                  required
                >
                  <option value="">Select Inputter</option>
                  {inputterOptions.map(inputter => (
                    <option key={inputter} value={inputter}>{inputter}</option>
                  ))}
                </select>
              </div>
              
              {newWorkPaper.audit_type === 'fraud' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fraud Amount</label>
                    <input
                      type="number"
                      placeholder="Fraud Amount"
                      value={newWorkPaper.fraud_amount || ''}
                      onChange={(e) => setNewWorkPaper({...newWorkPaper, fraud_amount: Number(e.target.value)})}
                      className="border p-2 rounded w-full"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fraud Staff</label>
                    <input
                      type="text"
                      placeholder="Fraud Staff Name"
                      value={newWorkPaper.fraud_staff || ''}
                      onChange={(e) => setNewWorkPaper({...newWorkPaper, fraud_staff: e.target.value})}
                      className="border p-2 rounded w-full"
                      required
                    />
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                <select
                  value={newWorkPaper.rating}
                  onChange={(e) => setNewWorkPaper({...newWorkPaper, rating: e.target.value as 'high' | 'medium' | 'low'})}
                  className="border p-2 rounded w-full"
                  required
                  disabled={newWorkPaper.audit_type === 'fraud'}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Auditors</label>
                <div className="border rounded-md p-3">
                  <SearchableCheckboxGroup
                    options={auditorOptions}
                    selectedOptions={newWorkPaper.auditors}
                    onChange={(selectedOptions) => {
                      setNewWorkPaper({
                        ...newWorkPaper,
                        auditors: selectedOptions
                      });
                    }}
                  />
                </div>
              </div>
              
              <div className="col-span-2 flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Add Work Paper
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auditor Details Modal */}
      {showAuditorDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Auditor Details</h3>

            </div>
            <div className="space-y-2">
              {selectedAuditorDetails.map((auditor, index) => (
                <div 
                  key={index}
                  className="p-2 bg-gray-50 rounded-md flex items-center space-x-2"
                >
                  <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-indigo-600 font-medium">
                      {auditor.auditor_name.charAt(0)}
                    </span>
                  </div>
                  <span className="text-gray-700">{auditor.auditor_name}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowAuditorDetails(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QASection;