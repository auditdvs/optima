import { Download, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

const DetailAnggota = () => {
  const { user, userRole } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [srssFormData, setSrssFormData] = useState({
    branchCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [showSrssForm, setShowSrssForm] = useState(false);
  const [srssRequests, setSrssRequests] = useState<any[]>([]);
  const [loadingSrss, setLoadingSrss] = useState(true);
  const [srssError, setSrssError] = useState(false);

  const isAdmin = ['superadmin', 'dvs', 'manager'].includes(userRole || '');

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchSrssRequests();
    }
  }, [user]);

  const handleRequestClick = () => {
    setShowSrssForm(true);
  };

  const fetchUserProfile = async () => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setFullName(profileData?.full_name || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchSrssRequests = async () => {
    setLoadingSrss(true);
    try {
      let query = supabase
        .from('detail_nasabah_srss')
        .select('*');
      
      // If not admin, only show user's own requests
      if (!isAdmin) {
        query = query.eq('requested_by', user?.id);
      }
      
      const { data: srssData, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;

      // Jika berhasil mengambil data SRSS, ambil profile data secara terpisah
      if (srssData && srssData.length > 0) {
        // Ambil semua user ID unik
        const userIds = [...new Set(srssData.map(req => req.requested_by))];
        
        // Fetch profiles untuk user-user tersebut
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        if (profilesError) {
          console.error('Error fetching profiles for SRSS:', profilesError);
          // Tetap lanjutkan dengan data SRSS meskipun profiles gagal
        }
        
        // Buat map untuk lookup yang mudah
        const userMap: { [key: string]: any } = {};
        if (profilesData) {
          profilesData.forEach(profile => {
            userMap[profile.id] = profile;
          });
        }
        
        // Gabungkan data
        const combinedData = srssData.map(request => ({
          ...request,
          profiles: userMap[request.requested_by] || { full_name: 'Unknown' }
        }));
        
        setSrssRequests(combinedData);
      } else {
        setSrssRequests([]);
      }
    } catch (error) {
      console.error('Error fetching SRSS requests:', error);
      toast.error('Gagal mengambil data SRSS requests');
      setSrssError(true);
    } finally {
      setLoadingSrss(false);
    }
  };

  // Submit handler for SRSS request
  const handleSrssSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Format branch code to ensure 3 digits (add leading zeros)
    const formattedBranchCode = srssFormData.branchCode.padStart(3, '0');
    
    try {
      const { error } = await supabase
        .from('detail_nasabah_srss')
        .insert({
          requested_by: user?.id,
          branch_code: formattedBranchCode,
        })
        .select();

      if (error) throw error;
      
      toast.success('SRSS data request berhasil dikirim');
      setSrssFormData({ branchCode: '' });
      setShowSrssForm(false);
      fetchSrssRequests();
    } catch (error) {
      console.error('Error submitting SRSS request:', error);
      toast.error('Gagal mengirim permintaan SRSS');
    }
  };

  const handleDeleteSrssRequest = async (requestId: string) => {
    try {
      setLoading(true);
      console.log("Starting delete for SRSS request:", requestId);
      
      console.log("Deleting database record for SRSS request:", requestId);
      const { error: deleteError } = await supabase
        .from('detail_nasabah_srss')
        .delete()
        .eq('id', requestId);
    
      if (deleteError) throw deleteError;
    
      setSrssRequests((current) => current.filter(item => item.id !== requestId));
      
      toast.success('SRSS request deleted successfully');
      
      await fetchSrssRequests();
    } catch (error) {
      console.error('Error deleting SRSS request:', error);
      toast.error('Failed to delete SRSS request');
    } finally {
      setLoading(false);
    }
  };

  // Custom download handler
  const handleCustomDownload = (resultPath: string) => {
    if (resultPath.includes('mega.nz')) {
      // MEGA link - open di tab baru
      window.open(resultPath, '_blank');
    } else {
      // Supabase link - download langsung
      window.location.href = resultPath;
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold">Detail Anggota Requests</h1>
            <p className="text-sm text-gray-500 mt-1">
              Request data anggota berdasarkan kode cabang.
            </p>
          </div>
        </div>
        
        <div>
          <button
            onClick={handleRequestClick}
            className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded transition-colors"
            title="Request Data Anggota"
          >
            Request Data
          </button>
        </div>
      </div>

      {/* SRSS Status Legend */}
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">queued</span>
          <span className="text-sm text-gray-600">: Menunggu pemrosesan otomatis</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">completed</span>
          <span className="text-sm text-gray-600">: Selesai, data tersedia untuk diunduh</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-semibold">rejected</span>
          <span className="text-sm text-gray-600">: Ditolak sistem</span>
        </div>
      </div>

      {/* SRSS Requests Table */}
      {loadingSrss ? (
        <div className="flex justify-center items-center h-64">
          <div className="loader">
            <div className="loader-ring loader-ring-a"></div>
            <div className="loader-ring loader-ring-b"></div>
            <div className="loader-ring loader-ring-c"></div>
          </div>
        </div>
      ) : srssError ? (
        <div className="flex flex-col items-center justify-center p-8 bg-rose-50 border border-rose-200 rounded-lg text-center">
          <div className="text-rose-600 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-rose-800">Gagal Memuat Data</h3>
          <p className="text-rose-700 mt-1">Terjadi kesalahan saat mengambil data SRSS requests.</p>
          <button 
            onClick={() => {
              setSrssError(false);
              setLoadingSrss(true);
              fetchSrssRequests();
            }}
            className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 focus:outline-none"
          >
            Coba Lagi
          </button>
        </div>
      ) : srssRequests.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No SRSS requests found.
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="min-w-full border rounded-lg shadow-sm">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested By
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch Code
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {srssRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {request.profiles?.full_name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{request.branch_code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${request.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : request.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {request.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-900">
                      <div className="flex flex-col">
                        <div className="whitespace-nowrap">
                          {(() => {
                            const date = new Date(request.created_at);
                            const day = date.getDate().toString().padStart(2, '0');
                            const month = date.toLocaleDateString('id-ID', { month: 'long' });
                            const year = date.getFullYear();
                            
                            return `${day} ${month} ${year}`;
                          })()}
                        </div>
                        <div className="whitespace-nowrap text-xs text-stone-700">
                          {(() => {
                            const date = new Date(request.created_at);
                            const hours = date.getHours();
                            const minutes = date.getMinutes().toString().padStart(2, '0');
                            const seconds = date.getSeconds().toString().padStart(2, '0');
                            const ampm = hours >= 12 ? 'PM' : 'AM';
                            const displayHours = hours % 12 || 12;
                            
                            return `${displayHours.toString().padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
                          })()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        {request.result_path && (
                          <button
                            type="button"
                            className="text-indigo-600 hover:text-indigo-800 flex items-center justify-center p-1.5 rounded-full hover:bg-indigo-50"
                            title="Download file"
                            onClick={() => handleCustomDownload(request.result_path)}
                          >
                            <Download className='text-emerald-600' size={18} />
                          </button>
                        )}

                        {/* Delete action for superadmin */}
                        {userRole === 'superadmin' && (
                          <button
                            onClick={() => {
                              // Confirm before deleting
                              if (window.confirm(`Are you sure you want to delete this SRSS request for branch ${request.branch_code}?`)) {
                                handleDeleteSrssRequest(request.id);
                              }
                            }}
                            className="text-rose-600 hover:text-rose-800 p-1.5 rounded-full hover:bg-rose-50"
                            title="Delete SRSS request"
                          >
                            <Trash2 className='text-rose-600' size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SRSS Request Form */}
      {showSrssForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Request Detail Anggota</h2>
            <form onSubmit={handleSrssSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Requested By</label>
                <input
                  type="text"
                  value={fullName}
                  disabled
                  className="w-full p-2 border rounded bg-gray-100"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Kode Cabang (3 digit)</label>
                <input
                  type="text"
                  value={srssFormData.branchCode}
                  onChange={(e) => {
                    // Only allow numbers and limit to 3 characters
                    const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                    setSrssFormData({...srssFormData, branchCode: value});
                  }}
                  className="w-full p-2 border rounded"
                  placeholder="e.g. 080"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Masukkan kode cabang (akan otomatis ditambahkan leading zeros jika kurang dari 3 digit)
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSrssForm(false)}
                  className="px-4 py-2 border text-gray-600 rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailAnggota;
