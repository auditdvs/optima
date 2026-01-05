import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from '@tanstack/react-table';
import { ArrowUpDown, Search } from 'lucide-react';
import React, { useState } from 'react';

export interface RPMLetter {
  id?: string;
  letter_number: string;
  letter_date: string;
  region: string;
  branch_or_region_ho: string;
  subject: string;
  status: 'Adequate' | 'Inadequate' | 'Reminder 1' | 'Reminder 2';
  due_date: string;
}

interface RPMLetterTableProps {
  data: RPMLetter[];
  onUpdateStatus: (id: string, status: RPMLetter['status']) => void;
  onUpdateDueDate: (id: string, dueDate: string) => void;
  onEdit?: (letter: RPMLetter) => void;
}

const columnHelper = createColumnHelper<RPMLetter>();

export const RPMLetterTable: React.FC<RPMLetterTableProps> = ({ data, onUpdateStatus, onUpdateDueDate, onEdit }) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const getRowClassName = (status: string, dueDate: string): string => {
    if (dueDate === 'Finished') return 'bg-green-100';
    if (dueDate === 'Open') return 'bg-red-100';
    if (dueDate) return 'bg-yellow-100';
    return '';
  };

  const columns = [
    columnHelper.accessor('letter_number', {
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            NUMBER LETTER
            <ArrowUpDown className="h-4 w-4" />
          </button>
        );
      },
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
      cell: info => (
        <div className="whitespace-normal break-words max-w-xs">
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => (
        <select
          value={info.getValue()}
          onChange={(e) => onUpdateStatus(info.row.original.id!, e.target.value as RPMLetter['status'])}
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
              onChange={(e) => onUpdateDueDate(info.row.original.id!, e.target.value)}
              className="w-full border rounded px-2 py-1"
            />
          );
        }
        return info.getValue();
      },
    }),
    // Edit Action Column
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: info => (
        <button
          onClick={() => onEdit?.(info.row.original)}
          className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-md transition-colors"
        >
          Edit
        </button>
      ),
    }),
  ];

  const table = useReactTable({
    data,
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
    </div>
  );
};