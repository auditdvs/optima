import React, { useState, useMemo } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  getSortedRowModel,
  flexRender,
  SortingState,
  ColumnDef 
} from '@tanstack/react-table';
import { Upload, Download, ArrowUpDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface ExcelManagerProps {
  onDataLoad?: (data: any[]) => void;
}

const ExcelManager: React.FC<ExcelManagerProps> = ({ onDataLoad }) => {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<ColumnDef<any>[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length > 0) {
          // Create columns from the first row
          const cols = Object.keys(jsonData[0]).map(key => ({
            accessorKey: key,
            header: ({ column }: any) => {
              return (
                <button
                  className="flex items-center gap-2"
                  onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                  {key}
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              );
            },
          }));

          setColumns(cols);
          setData(jsonData);
          if (onDataLoad) onDataLoad(jsonData);
          
          toast.success('Excel file loaded successfully');
        }
      } catch (error) {
        console.error('Error reading Excel file:', error);
        toast.error('Failed to read Excel file');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExport = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      
      // Generate buffer
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Save file
      saveAs(dataBlob, 'exported_data.xlsx');
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <label className="relative cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Excel
            </div>
          </label>
          
          {data.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </button>
          )}
        </div>
        
        {data.length > 0 && (
          <div className="text-sm text-gray-500">
            {data.length} rows loaded
          </div>
        )}
      </div>

      {data.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-[500px] overflow-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 sticky top-0">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th 
                        key={header.id}
                        className="text-left text-sm font-medium text-gray-500 uppercase tracking-wider px-6 py-3 border-b"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map(cell => (
                      <td 
                        key={cell.id}
                        className="text-sm text-gray-900 px-6 py-4 whitespace-nowrap"
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
      )}
    </div>
  );
};

export default ExcelManager;