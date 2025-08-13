import { Eye, FileText, Filter } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';

interface LetterData {
  id: number;
  assigment_letter: string;
  branch_name: string;
  region: string;
  audit_type?: string;
  addendum_type?: string;
  audit_period_start?: string;
  audit_period_end?: string;
  start_date?: string;
  end_date?: string;
  team?: string;
  transport?: number;
  konsumsi?: number;
  etc?: number;
  type: 'letter' | 'addendum';
  created_at?: string;
}

interface LetterViewerProps {
  refreshTrigger?: number;
}

export default function LetterViewer({ refreshTrigger }: LetterViewerProps) {
  const [letters, setLetters] = useState<LetterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState<LetterData | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  // Filter states
  const [filterRegion, setFilterRegion] = useState('');
  const [filterType, setFilterType] = useState('');
  const [regions, setRegions] = useState<string[]>([]);

  useEffect(() => {
    fetchLetters();
  }, [refreshTrigger]);

  const fetchLetters = async () => {
    try {
      setLoading(true);

      // Fetch assignment letters
      const { data: letterData, error: letterError } = await supabase
        .from('letter')
        .select(`
          id,
          assigment_letter,
          branch_name,
          region,
          audit_type,
          audit_period_start,
          audit_period_end,
          team,
          transport,
          konsumsi,
          etc
        `);

      if (letterError) {
        console.error('Letter error:', letterError);
        throw letterError;
      }

      // Fetch addendums
      const { data: addendumData, error: addendumError } = await supabase
        .from('addendum')
        .select(`
          id,
          assigment_letter,
          branch_name,
          region,
          addendum_type,
          start_date,
          end_date,
          transport,
          konsumsi,
          etc
        `);

      if (addendumError) {
        console.error('Addendum error:', addendumError);
        throw addendumError;
      }

      // Combine and sort data
      const combinedData: LetterData[] = [
        ...(letterData || []).map(letter => ({
          ...letter,
          type: 'letter' as const
        })),
        ...(addendumData || []).map(addendum => ({
          ...addendum,
          type: 'addendum' as const
        }))
      ].sort((a, b) => {
        // Sort by letter number (extract number from format like "001/KMD-AUDIT/VIII/2025")
        const getLetterNumber = (letterNumber: string) => {
          const match = letterNumber.match(/^(\d+)([a-z]*)/);
          if (match) {
            const number = parseInt(match[1]);
            const suffix = match[2] || '';
            return number * 1000 + (suffix ? suffix.charCodeAt(0) : 0);
          }
          return 0;
        };
        return getLetterNumber(a.assigment_letter) - getLetterNumber(b.assigment_letter);
      });

      setLetters(combinedData);

      // Extract unique regions for filter
      const uniqueRegions = [...new Set(combinedData.map(item => item.region).filter(Boolean))];
      setRegions(uniqueRegions);

    } catch (error) {
      console.error('Error fetching letters:', error);
      toast.error('Gagal memuat data surat');
    } finally {
      setLoading(false);
    }
  };

  // Filter letters based on selected filters
  const filteredLetters = letters.filter(letter => {
    const regionMatch = !filterRegion || letter.region === filterRegion;
    const typeMatch = !filterType || letter.type === filterType;
    return regionMatch && typeMatch;
  });

  const handleViewDetail = (letter: LetterData) => {
    setSelectedLetter(letter);
    setShowModal(true);
  };

  const formatAuditPeriod = (letter: LetterData) => {
    // Untuk surat tugas, gunakan audit_period_start dan audit_period_end
    // Untuk addendum, gunakan start_date dan end_date
    const startDate = letter.type === 'letter' ? letter.audit_period_start : letter.start_date;
    const endDate = letter.type === 'letter' ? letter.audit_period_end : letter.end_date;
    
    if (!startDate || !endDate) return '-';
    const start = new Date(startDate).toLocaleDateString('id-ID');
    const end = new Date(endDate).toLocaleDateString('id-ID');
    return `${start} - ${end}`;
  };

  const formatTeam = (team?: string | string[]) => {
    if (!team) return '-';
    if (typeof team === 'string') {
      try {
        const parsed = JSON.parse(team);
        return Array.isArray(parsed) ? parsed.join(', ') : team;
      } catch {
        return team;
      }
    }
    return Array.isArray(team) ? team.join(', ') : String(team);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Lihat Semua Surat</h2>
        <p className="text-gray-600">Daftar semua surat tugas dan addendum yang telah dibuat</p>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <div className="flex space-x-4">
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Regional</option>
              {regions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Jenis</option>
              <option value="letter">Surat Tugas</option>
              <option value="addendum">Addendum</option>
            </select>
          </div>
          
          {(filterRegion || filterType) && (
            <button
              onClick={() => {
                setFilterRegion('');
                setFilterType('');
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nomor Surat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama Cabang
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Regional
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Auditor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Periode Audit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jenis
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLetters.map((letter) => (
                <tr key={`${letter.type}-${letter.id}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {letter.assigment_letter}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {letter.branch_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {letter.region}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatTeam(letter.team)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatAuditPeriod(letter)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      letter.type === 'letter' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {letter.type === 'letter' ? 'Surat Tugas' : 'Addendum'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button
                      onClick={() => handleViewDetail(letter)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Lihat Detail"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLetters.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada surat</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filterRegion || filterType 
                ? 'Tidak ada surat yang sesuai dengan filter.'
                : 'Belum ada surat tugas atau addendum yang dibuat.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showModal && selectedLetter && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Detail {selectedLetter.type === 'letter' ? 'Surat Tugas' : 'Addendum'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nomor Surat</label>
                  <p className="text-sm text-gray-900">{selectedLetter.assigment_letter}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nama Cabang</label>
                    <p className="text-sm text-gray-900">{selectedLetter.branch_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Regional</label>
                    <p className="text-sm text-gray-900">{selectedLetter.region}</p>
                  </div>
                </div>

                {selectedLetter.audit_type && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Jenis Audit</label>
                    <p className="text-sm text-gray-900 capitalize">{selectedLetter.audit_type}</p>
                  </div>
                )}

                {selectedLetter.addendum_type && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Jenis Addendum</label>
                    <p className="text-sm text-gray-900 capitalize">{selectedLetter.addendum_type.replace('_', ' ')}</p>
                  </div>
                )}

                {selectedLetter.team && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tim Auditor</label>
                    <p className="text-sm text-gray-900">{selectedLetter.team}</p>
                  </div>
                )}

                {(selectedLetter.audit_period_start || selectedLetter.start_date) && (selectedLetter.audit_period_end || selectedLetter.end_date) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Periode Audit</label>
                    <p className="text-sm text-gray-900">
                      {formatAuditPeriod(selectedLetter)}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tanggal Dibuat</label>
                  <p className="text-sm text-gray-900">
                    {selectedLetter.created_at 
                      ? new Date(selectedLetter.created_at).toLocaleDateString('id-ID')
                      : 'Tidak tersedia'
                    }
                  </p>
                </div>
              </div>

              {/* Section Anggaran */}
              {(selectedLetter.transport !== undefined || selectedLetter.konsumsi !== undefined || selectedLetter.etc !== undefined) && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="text-base font-semibold text-gray-900 mb-3">Anggaran</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Transportasi</span>
                      <span className="text-sm text-gray-900 font-medium">{selectedLetter.transport !== undefined ? `Rp ${selectedLetter.transport.toLocaleString('id-ID')}` : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Konsumsi</span>
                      <span className="text-sm text-gray-900 font-medium">{selectedLetter.konsumsi !== undefined ? `Rp ${selectedLetter.konsumsi.toLocaleString('id-ID')}` : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Lain-lain</span>
                      <span className="text-sm text-gray-900 font-medium">{selectedLetter.etc !== undefined ? `Rp ${selectedLetter.etc.toLocaleString('id-ID')}` : '-'}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
                      <span className="text-sm font-bold text-gray-900">Total</span>
                      <span className="text-sm font-bold text-indigo-700">
                        Rp {((selectedLetter.transport || 0) + (selectedLetter.konsumsi || 0) + (selectedLetter.etc || 0)).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
