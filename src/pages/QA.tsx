import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Trash2, ChevronDown } from 'lucide-react';
import { CheckboxGroup, CheckboxOption } from '../components/ui/checkbox';

interface WorkPaper {
  id?: string;
  branch_name: string;
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

const QASection: React.FC = () => {
  const [workPapers, setWorkPapers] = useState<WorkPaper[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showAuditors, setShowAuditors] = useState(false);
  const [newWorkPaper, setNewWorkPaper] = useState<WorkPaper>({
    branch_name: '',
    audit_start_date: '',
    audit_end_date: '',
    audit_type: 'regular',
    fraud_amount: undefined,
    fraud_staff: undefined,
    rating: 'low',
    inputted_by: '',
    auditors: []
  });

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
    { label: 'Dwi Purnawigati', value: 'dwi' },
    { label: 'Heri Hermawan', value: 'heri' },
    { label: 'Aris Munandar', value: 'aris' },
    { label: 'Sandi Mulyadi', value: 'sandi' },
    { label: 'Ahmad', value: 'ahmad' },
    { label: 'Widya Lestari', value: 'widya' },
    { label: 'Retno Istiyanto, A.Md', value: 'retno' },
    { label: 'Ade Yadi Heryadi', value: 'ade' },
    { label: 'Muhamad Yunus', value: 'myunus' },
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
    { label: 'Muhammad Alfian Sidiq', value: 'muhammad' },
    { label: 'Fadhlika Sugeng Achmadani, S.E', value: 'fadhlika' },
    { label: 'Hendra Hermawan', value: 'hendra' },
    { label: 'Dadang Supriatna', value: 'dadang' },
    { label: 'Rivaldi Ando D Laudu', value: 'rivaldi' },
    { label: 'Yogi Nugraha', value: 'yogi' },
    { label: 'Ganjar Raharja', value: 'ganjar' },
    { label: 'Dede Yudha Nersanto', value: 'dede' },
    { label: 'Ayu Sri Erian Agustin', value: 'eri' },
    { label: 'Lise Roswati Rochendi MP', value: 'lise' },
  ];

  const inputterOptions = ['Ayu', 'Lise', 'Ganjar', 'Dede', 'Afan'];

  useEffect(() => {
    fetchBranches();
    fetchWorkPapers();
  }, []);

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
      setMessage({ text: 'Failed to fetch branches', type: 'error' });
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
      if (data) setWorkPapers(data);
    } catch (error) {
      console.error('Error fetching work papers:', error);
      setMessage({ text: 'Failed to fetch work papers', type: 'error' });
    }
  };

  const handleDeleteWorkPaper = async (id: string) => {
    if (!confirm('Are you sure you want to delete this work paper?')) return;

    try {
      // First, delete related auditor records
      const { error: auditorsError } = await supabase
        .from('work_paper_auditors')
        .delete()
        .eq('work_paper_id', id);

      if (auditorsError) throw auditorsError;

      // Then delete the work paper
      const { error: workPaperError } = await supabase
        .from('work_papers')
        .delete()
        .eq('id', id);

      if (workPaperError) throw workPaperError;

      setWorkPapers(workPapers.filter(wp => wp.id !== id));
      setMessage({ text: 'Work paper deleted successfully', type: 'success' });
    } catch (error) {
      console.error('Error deleting work paper:', error);
      setMessage({ text: 'Failed to delete work paper', type: 'error' });
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
      setMessage({ text: 'Start date cannot be after end date', type: 'error' });
      return;
    }

    if (newWorkPaper.audit_type === 'fraud' && !newWorkPaper.fraud_amount) {
      setMessage({ text: 'Please provide a fraud amount for fraud audit type', type: 'error' });
      return;
    }

    if (newWorkPaper.audit_type === 'fraud' && !newWorkPaper.fraud_staff) {
    setMessage({ text: 'Please provide fraud staff name for fraud audit type', type: 'error' });
    return;
  }


    try {
      // Insert work paper
      const { data: workPaperData, error: workPaperError } = await supabase
        .from('work_papers')
        .insert({
          branch_name: newWorkPaper.branch_name,
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

      // Refresh work papers
      await fetchWorkPapers();

      // Reset form
      setNewWorkPaper({
        branch_name: '',
        audit_start_date: '',
        audit_end_date: '',
        audit_type: 'regular',
        fraud_amount: undefined,
        fraud_staff: undefined,
        rating: 'medium',
        inputted_by: '',
        auditors: []
      });

      setMessage({
        text: 'Work paper added successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error('Error adding work paper:', error);
      setMessage({
        text: 'Failed to add work paper',
        type: 'error'
      });
    }
  };

  if (!branches || branches.length < 1) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">QA Work Papers</h2>
      
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700' 
            : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleAddWorkPaper} className="grid grid-cols-3 gap-4">
        <select
          value={newWorkPaper.branch_name}
          onChange={(e) => setNewWorkPaper({...newWorkPaper, branch_name: e.target.value})}
          required
          className="border p-2 rounded"
        >
          <option value="">Select Branch</option>          
          {branches.map(branch => (
            <option key={branch.id} value={branch.name}>
              {branch.name}
            </option>
          ))}
        </select>

        <div>
          <label>Audit Start Date</label>
          <input
            type="date"
            value={newWorkPaper.audit_start_date}
            onChange={(e) => setNewWorkPaper({...newWorkPaper, audit_start_date: e.target.value})}
            required
            className="border p-2 rounded w-full"
          />
        </div>
        <div>
          <label>Audit End Date</label>
          <input
            type="date"
            value={newWorkPaper.audit_end_date}
            onChange={(e) => setNewWorkPaper({...newWorkPaper, audit_end_date: e.target.value})}
            required
            className="border p-2 rounded w-full"
          />
        </div>
        <select
          value={newWorkPaper.audit_type}
          onChange={(e) => handleAuditTypeChange(e.target.value as 'regular' | 'fraud')}
          className="border p-2 rounded"
        >
          <option value="regular">Regular</option>
          <option value="fraud">Fraud</option>
        </select>
        
        {newWorkPaper.audit_type === 'fraud' && (
          <>
          <input
            type="number"
            placeholder="Fraud Amount"
            value={newWorkPaper.fraud_amount || ''}
            onChange={(e) => setNewWorkPaper({...newWorkPaper, fraud_amount: Number(e.target.value)})}
            className="border p-2 rounded"
            required
          />

          <input
          type="text"
          placeholder="Fraud Staff Name"
          value={newWorkPaper.fraud_staff || ''}
          onChange={(e) => setNewWorkPaper({...newWorkPaper, fraud_staff: e.target.value})}
          className="border p-2 rounded"
          required
        />
        
      </>
        )}
        
        <select
          value={newWorkPaper.rating}
          onChange={(e) => setNewWorkPaper({...newWorkPaper, rating: e.target.value as 'high' | 'medium' | 'low'})}
          className="border p-2 rounded"
          required
          disabled={newWorkPaper.audit_type === 'fraud'}
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        
        <select
          value={newWorkPaper.inputted_by}
          onChange={(e) => setNewWorkPaper({...newWorkPaper, inputted_by: e.target.value})}
          className="border p-2 rounded"
          required
        >
          <option value="">Select Inputter</option>
          {inputterOptions.map(inputter => (
            <option key={inputter} value={inputter}>{inputter}</option>
          ))}
        </select>

        <div className="col-span-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAuditors(!showAuditors)}
              className="w-full flex items-center justify-between p-2 border rounded bg-white"
            >
              <span>
                {newWorkPaper.auditors.length 
                  ? `${newWorkPaper.auditors.length} auditor(s) selected` 
                  : 'Select Auditors'}
              </span>
              <ChevronDown className={`w-5 h-5 transition-transform ${showAuditors ? 'transform rotate-180' : ''}`} />
            </button>
            {showAuditors && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                <CheckboxGroup
                  options={auditorOptions}
                  selectedOptions={newWorkPaper.auditors}
                  onChange={(selectedOptions) => {
                    setNewWorkPaper({...newWorkPaper, auditors: selectedOptions});
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <button 
          type="submit" 
          className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"
        >
          Add Work Paper
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Branch</th>
              <th className="p-2 border">Start Date</th>
              <th className="p-2 border">End Date</th>
              <th className="p-2 border">Type</th>
              <th className="p-2 border">Fraud Amount</th>
              <th className="p-2 border">Fraud Staff</th>
              <th className="p-2 border">Rating</th>
              <th className="p-2 border">Inputted By</th>
              <th className="p-2 border">Auditors</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {workPapers.map((wp) => (
  <tr key={wp.id} className="hover:bg-gray-50">
    <td className="p-2 border">{wp.branch_name}</td>
    <td className="p-2 border">{wp.audit_start_date}</td>
    <td className="p-2 border">{wp.audit_end_date}</td>
    <td className="p-2 border">{wp.audit_type}</td>
    <td className="p-2 border">
      {wp.fraud_amount ? `Rp ${wp.fraud_amount.toLocaleString()}` : '-'}
    </td>
    <td className="p-2 border">{wp.fraud_staff || '-'}</td>
    <td className="p-2 border">{wp.rating}</td>
    <td className="p-2 border">{wp.inputted_by}</td>
    <td className="p-2 border">
      {wp.work_paper_auditors 
        ? wp.work_paper_auditors.map(a => a.auditor_name).join(', ') 
        : '-'}
    </td>
    <td className="p-2 border">
      <button 
        onClick={() => wp.id && handleDeleteWorkPaper(wp.id)}
        className="text-red-500 hover:text-red-700"
      >
        <Trash2 size={18} />
      </button>
    </td>
  </tr>
))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QASection;