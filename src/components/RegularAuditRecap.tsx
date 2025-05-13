import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from '@tanstack/react-table';
import { saveAs } from 'file-saver';
import { ArrowUpDown, Download, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import { LoadingAnimation } from './LoadingAnimation'; // Import the new component

interface RecapData {
  id?: string;
  branchName: string;
  auditPeriod: string;
  pic: string;
  monitoring: string;
  rating: string;
  qaRating: string;
}

const columnHelper = createColumnHelper<RecapData>();

export const RegularAuditRecap: React.FC = () => {
  const [data, setData] = useState<RecapData[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch regular audit data
      const { data: regularAuditData, error: regularError } = await supabase
        .from('audit_regular')
        .select('*')
        .order('created_at', { ascending: false });

      if (regularError) throw regularError;

      // Fetch work papers data for regular audits
      const { data: workPapersData, error: workPapersError } = await supabase
        .from('work_papers')
        .select('*')
        .eq('audit_type', 'regular');

      if (workPapersError) throw workPapersError;

      // Combine and map the data
      const combinedData = regularAuditData?.map(regular => {
        const workPaper = workPapersData?.find(wp => 
          wp.branch_name === regular.branch_name
        );

        return {
          id: regular.id,
          branchName: regular.branch_name,
          auditPeriod: `${regular.audit_period_start || ''} - ${regular.audit_period_end || ''}`,
          pic: regular.pic,
          monitoring: regular.monitoring,
          rating: workPaper?.rating || '-',
          qaRating: regular.qa_rating || ''
        };
      }) || [];

      setData(combinedData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleQARatingChange = async (id: string, value: string) => {
    try {
      const { error } = await supabase
        .from('audit_regular')
        .update({ qa_rating: value })
        .eq('id', id);

      if (error) throw error;

      setData(prev => prev.map(item => 
        item.id === id ? { ...item, qaRating: value } : item
      ));

      toast.success('QA Rating updated successfully');
    } catch (error) {
      console.error('Error updating QA Rating:', error);
      toast.error('Failed to update QA Rating');
    }
  };

  const handleDownload = () => {
    try {
      const exportData = data.map(item => ({
        'Branch Name': item.branchName,
        'Audit Period': item.auditPeriod,
        'PIC': item.pic,
        'Monitoring': item.monitoring,
        'Rating': item.rating,
        'QA Rating': item.qaRating
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Regular Audit Recap');
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(dataBlob, 'regular_audit_recap.xlsx');
      
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  const columns = [
    columnHelper.accessor('branchName', {
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
    columnHelper.accessor('auditPeriod', {
      header: 'Audit Period',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('pic', {
      header: 'PIC',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('monitoring', {
      header: 'Monitoring',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('rating', {
      header: 'Rating',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('qaRating', {
      header: 'Rating by QA',
      cell: info => (
        <select
          value={info.getValue() || ''}
          onChange={(e) => info.row.original.id && handleQARatingChange(info.row.original.id, e.target.value)}
          className="w-full border rounded px-2 py-1"
        >
          <option value="">Select...</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
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

  if (loading) {
    return <LoadingAnimation />;  // Replace the default spinner with our custom animation
  }

  return (
    <div className="space-y-4 mt-2 pt-1">
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
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 mt-4"
        >
          <Download className="h-4 w-4" />
          Download Report
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden border rounded-lg">
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
        </div>
      </div>
    </div>
  );
};