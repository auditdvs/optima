import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, SortingState, useReactTable } from '@tanstack/react-table';
import { saveAs } from 'file-saver';
import { AlertTriangle, Download, Edit2, Plus, Save, Search, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import { CustomCheckbox } from './CustomCheckbox';
import { LoadingAnimation } from './LoadingAnimation';

interface AuditFraudData {
  id?: string;
  branch_name: string;
  region: string;
  pic: string;
  data_preparation: boolean;
  assignment_letter: boolean;
  audit_working_papers: boolean;
  audit_report: boolean;
  detailed_findings: boolean;
  review?: string;
  created_at?: string;
  updated_at?: string;
}

// Track changes before saving
interface ChangedItems {
  [id: string]: {
    [field: string]: any;
  }
}

interface AddEditBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { branch_name: string; region: string; pic: string }) => void;
  initialData: AuditFraudData | null;
  isEditing: boolean;
}

const AddEditBranchModal: React.FC<AddEditBranchModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing
}) => {
  const [formData, setFormData] = useState({
    branch_name: initialData?.branch_name || '',
    region: initialData?.region || '',
    pic: initialData?.pic || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">
          {isEditing ? 'Edit Branch' : 'Add New Branch'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="branch_name" className="block text-sm font-medium text-gray-700">
                Branch Name
              </label>
              <input
                type="text"
                id="branch_name"
                name="branch_name"
                value={formData.branch_name}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            
            <div>
              <label htmlFor="region" className="block text-sm font-medium text-gray-700">
                Region
              </label>
              <input
                type="text"
                id="region"
                name="region"
                value={formData.region}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            
            <div>
              <label htmlFor="pic" className="block text-sm font-medium text-gray-700">
                PIC
              </label>
              <input
                type="text"
                id="pic"
                name="pic"
                value={formData.pic}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
            >
              {isEditing ? 'Save Changes' : 'Add Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add this after your AddEditBranchModal component
interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  branchName: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  branchName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center mb-4 text-red-600">
          <AlertTriangle className="h-6 w-6 mr-2" />
          <h2 className="text-xl font-semibold">Delete Confirmation</h2>
        </div>
        
        <p className="mb-4 text-gray-700">
          Are you sure you want to delete <strong>{branchName}</strong>? This action cannot be undone.
        </p>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export const AuditFraudTable: React.FC = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [auditData, setAuditData] = useState<AuditFraudData[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<AuditFraudData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hideCompleted, setHideCompleted] = useState(false);
  
  // Add state to track changes
  const [changedItems, setChangedItems] = useState<ChangedItems>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Add these new states to your component
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [auditToDelete, setAuditToDelete] = useState<AuditFraudData | null>(null);

  // Add this to your component state declarations
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    fetchAuditData();
    getCurrentUserRole();
  }, []);

  // Update hasChanges whenever changedItems changes
  useEffect(() => {
    setHasChanges(Object.keys(changedItems).length > 0);
  }, [changedItems]);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_fraud')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuditData(data || []);
      // Clear tracked changes when fetching fresh data
      setChangedItems({});
    } catch (error) {
      console.error('Error fetching audit data:', error);
      toast.error('Failed to fetch audit data');
    } finally {
      setLoading(false);
    }
  };

  // Add this function to get the current user's role
  const getCurrentUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Get role from user metadata and add debugging
        const role = user.app_metadata?.role || null;
        console.log('User role detected:', role);
        console.log('Full user object:', user);
        
        setUserRole(role);
        
        // Set isAuthorized to true to enable edit and delete buttons
        setIsAuthorized(true);
      }
    } catch (error) {
      console.error('Error getting user role:', error);
    }
  };

  // Update local state without saving to DB
  const updateLocalAuditData = (id: string, field: string, value: any) => {
    if (!id) return;
    
    // Update the local data state
    setAuditData(prevData => 
      prevData.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
    
    // Track the change
    setChangedItems(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value,
        updated_at: new Date().toISOString()
      }
    }));
  };

  // Save all pending changes at once
  const saveAllChanges = async () => {
    if (Object.keys(changedItems).length === 0) {
      toast.info('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      // Process each update individually to avoid malformed requests
      for (const [id, changes] of Object.entries(changedItems)) {
        // Create a proper update object with ID
        const updateData = {
          id,
          ...changes,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('audit_fraud')
          .update(updateData)
          .eq('id', id);

        if (error) {
          console.error(`Error updating item ${id}:`, error);
          throw error;
        }
      }
      
      toast.success(`Saved ${Object.keys(changedItems).length} changes successfully`);
      // Clear tracked changes after successful save
      setChangedItems({});
      // Refresh the data to ensure consistency
      fetchAuditData();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Add or edit branch information
  const handleAddOrEditBranch = async (branchData: { branch_name: string; region: string; pic: string }) => {
    try {
      if (isEditing && selectedAudit?.id) {
        const { error } = await supabase
          .from('audit_fraud')
          .update({
            branch_name: branchData.branch_name,
            region: branchData.region,
            pic: branchData.pic,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedAudit.id);
  
        if (error) throw error;
        toast.success('Branch updated successfully');
      } else {
        const { error } = await supabase
          .from('audit_fraud')
          .insert([{
            branch_name: branchData.branch_name,
            region: branchData.region,
            pic: branchData.pic,
            data_preparation: false,
            assignment_letter: false,
            audit_working_papers: false,
            audit_report: false,
            detailed_findings: false
          }]);
  
        if (error) throw error;
        toast.success('Branch added successfully');
      }
      fetchAuditData();
    } catch (error) {
      console.error('Error managing branch:', error);
      toast.error(isEditing ? 'Failed to update branch' : 'Failed to add branch');
    }
  };
  
  const handleDeleteAudit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('audit_fraud')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Audit data deleted successfully');
      fetchAuditData();
    } catch (error) {
      console.error('Error deleting audit data:', error);
      toast.error('Failed to delete audit data');
    }
  };

  const handleEdit = (audit: AuditFraudData) => {
    setSelectedAudit(audit);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDownload = () => {
    try {
      // Format data for Excel
      const workbook = XLSX.utils.book_new();
      const formattedData = auditData.map(item => ({
        'Branch Name': item.branch_name,
        'Region': item.region,
        'PIC': item.pic,
        'Data Preparation': item.data_preparation ? 'Yes' : 'No',
        'Assignment Letter': item.assignment_letter ? 'Yes' : 'No',
        'Audit Working Papers': item.audit_working_papers ? 'Yes' : 'No',
        'Audit Report': item.audit_report ? 'Yes' : 'No',
        'Detailed Findings': item.detailed_findings ? 'Yes' : 'No',
        'Review': item.review || '',
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Fraud Audit Data');
      
      // Generate Excel file and download
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(data, `Fraud_Audit_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  const columnHelper = createColumnHelper<AuditFraudData>();

  const columns = [
    columnHelper.accessor('branch_name', {
      header: 'Branch Name',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('region', {
      header: ({ column }) => (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => column.toggleSorting()}>
          Region
        </div>
      ),
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('pic', {
      header: 'PIC',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('data_preparation', {
      header: 'Data Preparation',
      cell: info => (
        <CustomCheckbox
          id={`data-prep-${info.row.original.id}`}
          checked={info.getValue()}
          onChange={(checked) => {
            if (info.row.original.id) {
              updateLocalAuditData(info.row.original.id, 'data_preparation', checked);
            }
          }}
        />
      ),
    }),
    columnHelper.accessor('assignment_letter', {
      header: 'Assignment Letter',
      cell: info => (
        <CustomCheckbox
          id={`assignment-${info.row.original.id}`}
          checked={info.getValue()}
          onChange={(checked) => {
            if (info.row.original.id) {
              updateLocalAuditData(info.row.original.id, 'assignment_letter', checked);
            }
          }}
        />
      ),
    }),
    columnHelper.accessor('audit_working_papers', {
      header: 'Audit Working Papers',
      cell: info => (
        <CustomCheckbox
          id={`working-papers-${info.row.original.id}`}
          checked={info.getValue()}
          onChange={(checked) => {
            if (info.row.original.id) {
              updateLocalAuditData(info.row.original.id, 'audit_working_papers', checked);
            }
          }}
        />
      ),
    }),
    columnHelper.accessor('audit_report', {
      header: 'Audit Report',
      cell: info => (
        <CustomCheckbox
          id={`audit-report-${info.row.original.id}`}
          checked={info.getValue()}
          onChange={(checked) => {
            if (info.row.original.id) {
              updateLocalAuditData(info.row.original.id, 'audit_report', checked);
            }
          }}
        />
      ),
    }),
    columnHelper.accessor('detailed_findings', {
      header: 'Detailed Findings',
      cell: info => (
        <CustomCheckbox
          id={`detailed-findings-${info.row.original.id}`}
          checked={info.getValue()}
          onChange={(checked) => {
            if (info.row.original.id) {
              updateLocalAuditData(info.row.original.id, 'detailed_findings', checked);
            }
          }}
        />
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: info => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(info.row.original)}
            className="p-1 text-blue-600 hover:text-blue-800"
            title="Edit"
            disabled={!isAuthorized}
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setAuditToDelete(info.row.original);
              setShowDeleteConfirmation(true);
            }}
            className="p-1 text-red-600 hover:text-red-800"
            title="Delete"
            disabled={!isAuthorized}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    }),
  ];

  // Filter completed audits if needed
  const filteredAuditData = hideCompleted
    ? auditData.filter(item => 
        !(item.data_preparation && 
          item.assignment_letter && 
          item.audit_working_papers && 
          item.audit_report && 
          item.detailed_findings))
    : auditData;

  const table = useReactTable({
    data: filteredAuditData,
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

  if (loading) {
    return <LoadingAnimation />;
  }

  return (
    <div className="space-y-4 mt-4">
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
          
          <div className="flex items-center">
            <input
              id="hide-completed"
              type="checkbox"
              checked={hideCompleted}
              onChange={() => setHideCompleted(!hideCompleted)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="hide-completed" className="ml-2 text-sm text-gray-700">
              Hide completed audits
            </label>
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* Save changes button */}
          <button
            onClick={saveAllChanges}
            disabled={!hasChanges || isSaving}
            className={`flex items-center gap-2 ${
              hasChanges 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : 'bg-gray-400 cursor-not-allowed'
            } text-white px-4 py-2 rounded-md transition-colors`}
          >
            <Save className="h-4 w-4" />
            {isSaving 
              ? 'Saving...'
              : `Save Changes${hasChanges ? ` (${Object.keys(changedItems).length})` : ''}`
            }
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            <Download className="h-4 w-4" />
            Download Report
          </button>
          
          <button
            onClick={() => {
              setIsEditing(false);
              setSelectedAudit(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add Branch
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header.isPlaceholder ? null : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <AddEditBranchModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedAudit(null);
            setIsEditing(false);
          }}
          onSubmit={handleAddOrEditBranch}
          initialData={selectedAudit}
          isEditing={isEditing}
        />
      )}

      {showDeleteConfirmation && auditToDelete && (
        <DeleteConfirmationModal
          isOpen={showDeleteConfirmation}
          onClose={() => {
            setShowDeleteConfirmation(false);
            setAuditToDelete(null);
          }}
          onConfirm={() => {
            if (auditToDelete?.id) {
              handleDeleteAudit(auditToDelete.id);
            }
          }}
          branchName={auditToDelete.branch_name}
        />
      )}
    </div>
  );
};