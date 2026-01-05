import { AlertTriangle, CheckCircle2, Filter, RefreshCw, Search, Table as TableIcon, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from 'react';
// @ts-ignore - JS module without type declarations
import { fetchSpreadsheetData } from "../../services/spreadsheetService";

export default function COA() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKelompok, setSelectedKelompok] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const spreadsheetData = await fetchSpreadsheetData();
      
      if (spreadsheetData.length > 0) {
        setData(spreadsheetData);
        setLastUpdate(new Date());
        setError(null);
      } else {
        setError('Tidak dapat mengakses data spreadsheet atau data kosong');
      }
    } catch (err) {
      console.error('Load data error:', err);
      setError('Gagal memuat data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto refresh setiap 5 menit
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadData();
    }, 5 * 60 * 1000); // 5 menit

    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  // Get unique kelompok values
  const kelompokOptions = useMemo(() => {
    if (data.length === 0) return [];
    
    const kelompokColumn = Object.keys(data[0]).find(key => 
      key.toLowerCase().includes('kelompok') || 
      key.toLowerCase().includes('group') ||
      key.toLowerCase().includes('kategori')
    );
    
    if (!kelompokColumn) return [];
    
    const uniqueKelompok = [...new Set(data.map(row => row[kelompokColumn]).filter(Boolean))];
    return uniqueKelompok.sort();
  }, [data]);

  // Filter data based on search and kelompok
  const filteredData = useMemo(() => {
    if (data.length === 0) return [];
    
    let filtered = data;
    
    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(row => {
        return Object.values(row).some(value => 
          value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }
    
    // Kelompok filter
    if (selectedKelompok) {
      const kelompokColumn = Object.keys(data[0]).find(key => 
        key.toLowerCase().includes('kelompok') || 
        key.toLowerCase().includes('group') ||
        key.toLowerCase().includes('kategori')
      );
      
      if (kelompokColumn) {
        filtered = filtered.filter(row => row[kelompokColumn] === selectedKelompok);
      }
    }
    
    return filtered;
  }, [data, searchTerm, selectedKelompok]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedKelompok('');
  };

  if (loading && data.length === 0) {
    return (
      <div className="w-full bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Chart of Accounts (COA)</h2>
              <p className="text-gray-500 mt-1">Loading data from spreadsheet...</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-48"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border">
      <div className="p-4 md:p-6 border-b">
        <div className="flex flex-col gap-4">
          {/* Title section */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                <TableIcon className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                <span className="break-words">Chart of Accounts (COA)</span>
                {!loading && !error && filteredData.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {filteredData.length} of {data.length}
                  </span>
                )}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Data COA dari accounting dan update secara realtime.
              </p>
            </div>
          </div>
          
          {/* Action buttons section */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                showFilters || searchTerm || selectedKelompok
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <div className="flex items-center justify-center sm:justify-start">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-700">Auto Refresh</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      {showFilters && (
        <div className="p-4 bg-gray-50 border-b">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search all columns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Kelompok Filter */}
            <div>
              <select
                value={selectedKelompok}
                onChange={(e) => setSelectedKelompok(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Kelompok</option>
                {kelompokOptions.map((kelompok) => (
                  <option key={kelompok} value={kelompok}>
                    {kelompok}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-center">
              {(searchTerm || selectedKelompok) && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        {lastUpdate && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Last updated:</strong> {lastUpdate.toLocaleString('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
              {autoRefresh && (
                <span className="ml-2 text-xs text-gray-500">
                  (Auto-refresh every 5 minutes)
                </span>
              )}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">
                  <strong>Error:</strong> {error}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Mungkin spreadsheet memerlukan akses publik atau ada pembatasan CORS
                </p>
              </div>
            </div>
          </div>
        )}

        {filteredData.length > 0 ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="mb-2 px-4 sm:px-0 text-xs sm:text-sm text-gray-600">
              Showing {filteredData.length} of {data.length} rows with {headers.length} columns
              {(searchTerm || selectedKelompok) && (
                <span className="ml-2 text-blue-600">
                  (filtered)
                </span>
              )}
            </div>
            <div className="border border-gray-200 rounded-lg mx-4 sm:mx-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                      NO.
                    </th>
                    {headers.map((header, index) => (
                      <th
                        key={index}
                        className={`px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                          header.toLowerCase().includes('kriteria') || 
                          header.toLowerCase().includes('description') || 
                          header.toLowerCase().includes('keterangan')
                            ? 'min-w-[250px] sm:min-w-[320px]'
                            : 'min-w-[100px] sm:min-w-[128px]'
                        }`}
                      >
                        <div className="break-words">
                          <div className="font-semibold">{header}</div>
                          <span className="text-gray-400 text-[10px] sm:text-xs font-normal">
                            ({filteredData.filter(row => row[header] && row[header].toString().trim()).length})
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 sm:px-4 py-2 sm:py-4 text-xs sm:text-sm text-gray-500 align-top sticky left-0 bg-white font-medium">
                        {index + 1}
                      </td>
                      {headers.map((header, cellIndex) => (
                        <td
                          key={cellIndex}
                          className={`px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-900 align-top ${
                            header.toLowerCase().includes('kriteria') || 
                            header.toLowerCase().includes('description') || 
                            header.toLowerCase().includes('keterangan')
                              ? 'max-w-xs'
                              : 'whitespace-nowrap'
                          }`}
                        >
                          <div className={`${
                            header.toLowerCase().includes('kriteria') || 
                            header.toLowerCase().includes('description') || 
                            header.toLowerCase().includes('keterangan')
                              ? 'break-words whitespace-pre-wrap leading-relaxed'
                              : ''
                          }`}>
                            {row[header] || <span className="text-gray-400">-</span>}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          !loading && !error && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                {searchTerm || selectedKelompok 
                  ? 'No data matches your current filters. Try adjusting your search criteria.'
                  : 'Tidak ada data tersedia. Pastikan spreadsheet dapat diakses dan berisi data.'
                }
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}