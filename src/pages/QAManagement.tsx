import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit2, Table2, UserPlus } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import AuditTable from '../components/AuditTable';
import { AuditFraudTable } from '../components/AuditFraudTable';
import { RegularAuditRecap } from '../components/RegularAuditRecap';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedAuditor, setSelectedAuditor] = useState<AuditorWithAssignments | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'auditors' | 'excel' | 'fraud' | 'recap'>('auditors');
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
      branchName: '',
      auditPeriodStart: '',
      auditPeriodEnd: '',
      pic: '',
      dapa: false,
      revisedDapa: false,
      dapaSupportingData: false,
      assignmentLetter: false,
      entranceAgenda: false,
      entranceAttendance: false,
      auditWorkingPapers: false,
      cashCount: false,
      auditReporting: false,
      exitMeetingMinutes: false,
      exitAttendanceList: false,
      auditResultLetter: false,
      rta: false,
      monitoring: 'Adequate' as 'Adequate' | 'Inadequate',
      comment: '',
    },
  ]);

  useEffect(() => {
    fetchAuditors();
  }, []);

  const fetchAuditors = async () => {
    try {
      const { data: auditorsData, error: auditorsError } = await supabase
        .from('auditors')
        .select('*')
        .order('name');

      if (auditorsError) throw auditorsError;

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('auditor_assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      const auditorsWithAssignments = auditorsData.map(auditor => ({
        ...auditor,
        assignments: assignmentsData.filter(assignment => assignment.auditor_id === auditor.id),
      }));

      setAuditors(auditorsWithAssignments);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch auditors data');
    } finally {
      setLoading(false);
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
        .single();

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

  if (loading && auditors.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quality Assurance Management</h1>
          <p className="text-sm text-gray-500">Manage auditors and their regional assignments</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('auditors')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'auditors'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <UserPlus className="h-5 w-5" />
            Auditors
          </button>
          <button
            onClick={() => setActiveTab('excel')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'excel'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Table2 className="h-5 w-5" />
            Audit Table Regular
          </button>
          <button
            onClick={() => setActiveTab('fraud')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'fraud'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Table2 className="h-5 w-5" />
            Audit Table Fraud
          </button>
          <button
            onClick={() => setActiveTab('recap')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'recap'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Table2 className="h-5 w-5" />
            Regular Audit Recap
          </button>
        </div>
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
                  <div className="max-h-[850px] overflow-y-auto">
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
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <AuditTable data={auditData} onDataChange={setAuditData} />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : activeTab === 'fraud' ? (
        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <AuditFraudTable />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <RegularAuditRecap />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showAddModal && (
        <AddAuditorModal
          handleAddAuditor={handleAddAuditor}
          setShowAddModal={setShowAddModal}
          loading={loading}
        />
      )}
      {showAssignmentModal && selectedAuditor && <UpdateAssignmentModal />}
      <Toaster />
    </div>
  );
};

export default QAManagement;