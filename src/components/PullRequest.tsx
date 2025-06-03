import { Download, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

const PullRequest = () => {
  const { user, userRole } = useAuth();
  const [fullName, setFullName] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    requestData: '',
    message: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [adminResponse, setAdminResponse] = useState('');

  const isAdmin = ['superadmin', 'dvs', 'manager'].includes(userRole || '');

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchRequests();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setFullName(data?.full_name || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Simplify the query first to isolate the issue
      let query = supabase
        .from('pull_requests')
        .select('*');
        
      // If not admin, only show user's own requests
      if (!isAdmin) {
        query = query.eq('user_id', user?.id);
      }
      
      const { data: requestsData, error: requestsError } = await query.order('created_at', { ascending: false });
      
      if (requestsError) {
        console.error('Error fetching requests:', requestsError);
        throw requestsError;
      }
      
      // Now, if we have requests, fetch the profile names separately
      if (requestsData && requestsData.length > 0) {
        // Get unique user IDs from requests
        const userIds = [...new Set(requestsData.map(req => req.user_id))];
        
        // Fetch the profiles for these users
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          // Continue with request data even if profiles fail
        }
        
        // Create a user map for easy lookup
        const userMap = {};
        if (profilesData) {
          profilesData.forEach(profile => {
            userMap[profile.id] = profile;
          });
        }
        
        // Combine the data
        const combinedData = requestsData.map(request => ({
          ...request,
          profiles: userMap[request.user_id] || { full_name: 'Unknown User' }
        }));
        
        setRequests(combinedData);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('pull_requests')
        .insert({
          user_id: user?.id,
          request_type: formData.requestData,
          message: formData.message,
          status: 'Pending', // <-- ubah ke Pending
        })
        .select();

      if (error) throw error;
      
      toast.success('Request submitted successfully');
      setFormData({ requestData: '', message: '' });
      setShowForm(false);
      fetchRequests();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request');
    }
  };

  const handleAdminResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      let fileUrls: string[] = selectedRequest.file_urls || [];

      // Upload files jika status Done
      if (selectedFiles.length > 0 && selectedRequest.status === 'Done') {
        const uploadResults = await Promise.all(selectedFiles.map(async (file) => {
          const filePath = file.name; // gunakan nama asli file
          const { error: uploadError } = await supabase.storage
            .from('pull.request')
            .upload(filePath, file, { upsert: true }); // upsert agar file lama bisa tertimpa jika nama sama

          if (uploadError) throw uploadError;

          const { data: publicURL } = supabase.storage
            .from('pull.request')
            .getPublicUrl(filePath);

          return publicURL.publicUrl;
        }));

        fileUrls = uploadResults;
      }

      // Update request
      const { error } = await supabase
        .from('pull_requests')
        .update({
          status: selectedRequest.status,
          admin_response: adminResponse,
          file_urls: fileUrls, // <-- array of urls
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success('Response submitted successfully');
      setSelectedRequest(null);
      setAdminResponse('');
      setSelectedFiles([]);
      fetchRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    }
  };

  return (
    <div className="w-full h-full px-4 py-2 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Data Pull Requests</h1>
          <button
            onClick={() => {
              setLoading(true);
              fetchRequests();
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Refresh data"
            disabled={loading}
          >
            <RefreshCw size={18} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {!isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white mx-5 px-4 py-2 rounded hover:bg-indigo-700"
          >
            New Request
          </button>
        )}
      </div>

      {/* Status Legend */}
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold">Pending</span>
          <span className="text-sm text-gray-600">: Menunggu persetujuan admin</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">Waiting List</span>
          <span className="text-sm text-gray-600">: Sedang diproses/diterima admin</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">Done</span>
          <span className="text-sm text-gray-600">: Selesai, data sudah diberikan</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold">Rejected</span>
          <span className="text-sm text-gray-600">: Ditolak admin</span>
        </div>
      </div>

      {/* Request Form */}
      {showForm && !isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">New Data Request</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Auditor</label>
                <input
                  type="text"
                  value={fullName}
                  disabled
                  className="w-full p-2 border rounded bg-gray-100"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Request Data</label>
                <select
                  value={formData.requestData}
                  onChange={(e) => setFormData({...formData, requestData: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select data type</option>
                  <option value="DbPinjaman">DbPinjaman</option>
                  <option value="DbSimpanan">DbSimpanan</option>
                  <option value="Informasi Portofolio">Informasi Portofolio</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full p-2 border rounded min-h-[100px]"
                  placeholder="e.g. reason why you can't get data from mdis or you can request a tools for supporting your data"
                  required
                ></textarea>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border text-gray-600 rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Response Form */}
      {isAdmin && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Respond to Request</h2>
            <form onSubmit={handleAdminResponse}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Auditor</label>
                <input
                  type="text"
                  value={selectedRequest.profiles?.full_name || ''}
                  disabled
                  className="w-full p-2 border rounded bg-gray-100"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Request Data</label>
                <input
                  type="text"
                  value={selectedRequest.request_type}
                  disabled
                  className="w-full p-2 border rounded bg-gray-100"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Message</label>
                <textarea
                  value={selectedRequest.message}
                  disabled
                  className="w-full p-2 border rounded min-h-[100px] bg-gray-100"
                ></textarea>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Status</label>
                <select
                  value={selectedRequest.status}
                  onChange={(e) => setSelectedRequest({...selectedRequest, status: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="Pending">Pending</option>
                  <option value="Waiting List">Waiting List</option>
                  <option value="Done">Done</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              
              {selectedRequest.status === 'Done' && (
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Upload Data</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setSelectedFiles(prev => [...prev, ...files]);
                    }}
                    className="w-full p-2 border rounded"
                  />
                </div>
              )}
              
              {selectedFiles.length > 0 && (
                <ul className="mb-2">
                  {selectedFiles.map((file, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      {file.name}
                      <button
                        type="button"
                        className="text-red-500 hover:underline"
                        onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== idx))}
                      >
                        Hapus
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Response Message</label>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  className="w-full p-2 border rounded min-h-[100px]"
                  placeholder="Provide feedback about this request"
                  required
                ></textarea>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 border text-gray-600 rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Submit Response
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="loader">
            <div className="loader-ring loader-ring-a"></div>
            <div className="loader-ring loader-ring-b"></div>
            <div className="loader-ring loader-ring-c"></div>
          </div>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No requests found.
        </div>
      ) : (
        <div className="w-full overflow-x-auto border rounded-lg shadow-sm">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Auditor
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin Response
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
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{request.request_type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{request.profiles?.full_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${request.status === 'Done'
                          ? 'bg-green-100 text-green-800'
                          : request.status === 'Rejected'
                          ? 'bg-red-100 text-red-800'
                          : request.status === 'Pending'
                          ? 'bg-orange-100 text-orange-800'
                          : request.status === 'Waiting List'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate" title={request.message}>
                      {request.message}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {request.admin_response ? (
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={request.admin_response}>
                        {request.admin_response}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(request.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex gap-2">
                      {request.status === 'Done' && request.file_urls && Array.isArray(request.file_urls) && request.file_urls.length > 0 && (
                        <div className="flex flex-col gap-1">
                          {request.file_urls.map((url: string, idx: number) => (
                            <a 
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                              <Download size={16} /> Download {idx + 1}
                            </a>
                          ))}
                        </div>
                      )}
                      
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setAdminResponse(request.admin_response || '');
                          }}
                          className="text-indigo-600 hover:text-indigo-800 underline"
                        >
                          Respond
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PullRequest;