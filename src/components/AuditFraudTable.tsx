import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from '@tanstack/react-table';
import { ArrowUpDown, MessageSquare, Plus, Search, Edit2, Download } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { CustomCheckbox } from './CustomCheckbox';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface AuditFraudData {
  id?: string;
  branch_name: string;
  pic: string;
  data_preparation: boolean;
  assignment_letter: boolean;
  audit_working_papers: boolean;
  audit_report: boolean;
  detailed_findings: boolean;
  review?: string;
}

interface AddEditBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (branchData: { 
    branch_name: string;
    pic: string;
  }) => void;
  initialData?: AuditFraudData;
  isEditing?: boolean;
}

const AddEditBranchModal: React.FC<AddEditBranchModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData,
  isEditing = false 
}) => {
  const [branchName, setBranchName] = useState<string>(initialData?.branch_name || '');
  const [pic, setPic] = useState<string>(initialData?.pic || '');

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit({
      branch_name: branchName,
      pic: pic
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-semibold mb-4">{isEditing ? 'Edit Branch' : 'Add Branch'}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter branch name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PIC</label>
            <input
              type="text"
              value={pic}
              onChange={(e) => setPic(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter PIC name"
            />
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
            onClick={handleSubmit}
            disabled={!branchName || !pic}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {isEditing ? 'Save Changes' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
};

const columnHelper = createColumnHelper<AuditFraudData>();

export const AuditFraudTable: React.FC = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [auditData, setAuditData] = useState<AuditFraudData[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<AuditFraudData | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchAuditData();
  }, []);

  const fetchAuditData = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_fraud')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuditData(data || []);
    } catch (error) {
      console.error('Error fetching audit data:', error);
      toast.error('Failed to fetch audit data');
    }
  };

  const handleAddOrEditBranch = async (branchData: { branch_name: string; pic: string }) => {
    try {
      if (isEditing && selectedAudit?.id) {
        const { error } = await supabase
          .from('audit_fraud')
          .update({
            branch_name: branchData.branch_name,
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

  const saveAuditData = async (id: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('audit_fraud')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Audit data updated successfully');
      fetchAuditData();
    } catch (error) {
      console.error('Error updating audit data:', error);
      toast.error('Failed to update audit data');
    }
  };

  const handleEdit = (audit: AuditFraudData) => {
    setSelectedAudit(audit);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDownload = () => {
    try {
      const exportData = auditData.map(item => ({
        'Branch Name': item.branch_name,
        'PIC': item.pic,
        'Data Preparation': item.data_preparation ? '✓' : '✗',
        'Assignment Letter': item.assignment_letter ? '✓' : '✗',
        'Audit Working Papers': item.audit_working_papers ? '✓' : '✗',
        'Audit Report': item.audit_report ? '✓' : '✗',
        'Detailed Findings': item.detailed_findings ? '✓' : '✗',
        'Review': item.review || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Fraud');
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(dataBlob, 'audit_fraud_report.xlsx');
      
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  const columns = [
    columnHelper.accessor('branch_name', {
      header: ({ column }) => (
        <div className="flex items-center gap-2">
          Branch Name
          <ArrowUpDown 
            className="h-4 w-4 cursor-pointer" 
            onClick={() => column.toggleSorting()}
          />
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
              saveAuditData(info.row.original.id, 'data_preparation', checked);
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
              saveAuditData(info.row.original.id, 'assignment_letter', checked);
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
              saveAuditData(info.row.original.id, 'audit_working_papers', checked);
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
              saveAuditData(info.row.original.id, 'audit_report', checked);
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
              saveAuditData(info.row.original.id, 'detailed_findings', checked);
            }
          }}
        />
      ),
    }),
    columnHelper.accessor('review', {
      header: 'Review',
      cell: info => (
        <div className="relative">
          <button
            onClick={() => {
              const review = prompt('Enter review:', info.getValue() || '');
              if (review !== null && info.row.original.id) {
                saveAuditData(info.row.original.id, 'review', review);
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
    columnHelper.accessor('id', {
      header: 'Actions',
      cell: info => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(info.row.original)}
            className="text-blue-500 hover:text-blue-700"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => info.getValue() && handleDeleteAudit(info.getValue())}
            className="text-red-500 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: auditData,
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
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
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
        <div className="flex gap-2">
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
    </div>
  );
};