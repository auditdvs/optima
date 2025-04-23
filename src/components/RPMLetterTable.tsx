import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Download, Search, ArrowUpDown } from 'lucide-react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from '@tanstack/react-table';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface RPMLetter {
  id?: string;
  letter_number: string;
  letter_date: string;
  region: string;
  branch_or_region_ho: string;
  subject: string;
  status: 'Adequate' | 'Inadequate' | 'Reminder 1' | 'Reminder 2';
  due_date: string;
}

const columnHelper = createColumnHelper<RPMLetter>();

const getRomanNumeral = (month: number): string => {
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return romanNumerals[month];
};

const generateLetterNumber = (index: number): string => {
  const currentDate = new Date();
  const month = getRomanNumeral(currentDate.getMonth());
  const year = currentDate.getFullYear();
  const number = String(index + 1).padStart(3, '0');
  return `${number}/KMD-AUDIT/QA/${month}/${year}`;
};

export const RPMLetterTable: React.FC = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [letters, setLetters] = useState<RPMLetter[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLetter, setNewLetter] = useState<Partial<RPMLetter>>({
    region: '',
    branch_or_region_ho: '',
    subject: '',
    status: 'Inadequate',
    letter_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchLetters();
  }, []);

  const fetchLetters = async () => {
    try {
      const { data, error } = await supabase
        .from('rpm_letters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLetters(data || []);
    } catch (error) {
      console.error('Error fetching letters:', error);
      toast.error('Failed to fetch letters');
    }
  };

  const handleAddLetter = async () => {
    try {
      const letterNumber = generateLetterNumber(letters.length);
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
      setShowAddModal(false);
      fetchLetters();
    } catch (error) {
      console.error('Error adding letter:', error);
      toast.error('Failed to add letter');
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

  const handleDownload = () => {
    try {
      const exportData = letters.map((letter, index) => ({
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
      saveAs(dataBlob, 'rpm_letters_report.xlsx');
      
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  const getRowClassName = (status: string, dueDate: string): string => {
    if (dueDate === 'Finished') return 'bg-green-100';
    if (dueDate === 'Open') return 'bg-red-100';
    if (dueDate) return 'bg-yellow-100';
    return '';
  };

  const columns = [
    columnHelper.accessor(row => letters.indexOf(row as RPMLetter) + 1, {
      id: 'no',
      header: 'No',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('letter_number', {
      header: 'Number Letter',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('letter_date', {
      header: 'Letter Date',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('region', {
      header: 'Region',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('branch_or_region_ho', {
      header: 'Branch/Region/HO',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('subject', {
      header: 'Subject',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => (
        <select
          value={info.getValue()}
          onChange={async (e) => {
            const newStatus = e.target.value as RPMLetter['status'];
            const dueDate = getDueDate(newStatus);
            
            const { error } = await supabase
              .from('rpm_letters')
              .update({ 
                status: newStatus,
                due_date: dueDate
              })
              .eq('id', info.row.original.id);

            if (error) {
              toast.error('Failed to update status');
              return;
            }

            fetchLetters();
          }}
          className="w-full border rounded px-2 py-1"
        >
          <option value="Adequate">Adequate</option>
          <option value="Inadequate">Inadequate</option>
          <option value="Reminder 1">Reminder 1</option>
          <option value="Reminder 2">Reminder 2</option>
        </select>
      ),
    }),
    columnHelper.accessor('due_date', {
      header: 'Due Date',
      cell: info => {
        const status = info.row.original.status;
        if (status === 'Reminder 1' || status === 'Reminder 2') {
          return (
            <input
              type="date"
              value={info.getValue() || ''}
              onChange={async (e) => {
                const { error } = await supabase
                  .from('rpm_letters')
                  .update({ due_date: e.target.value })
                  .eq('id', info.row.original.id);

                if (error) {
                  toast.error('Failed to update due date');
                  return;
                }

                fetchLetters();
              }}
              className="w-full border rounded px-2 py-1"
            />
          );
        }
        return info.getValue();
      },
    }),
  ];

  const table = useReactTable({
    data: letters,
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
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            <Download className="h-4 w-4"/>
            Download Report
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Add Letter
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
              <tr 
                key={row.id}
                className={getRowClassName(row.original.status, row.original.due_date)}
              >
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

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add New Letter</h2>
            <div className="space-y-4">
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
                onClick={() => setShowAddModal(false)}
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
    </div>
  );
};