import { Download, MessageSquare, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

const PullRequest = () => {
  const { user, userRole } = useAuth();
  
  // Tambahkan state untuk uploaders
  const [uploaders, setUploaders] = useState<{id: string, name: string}[]>([]);
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
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [selectedUploader, setSelectedUploader] = useState('');

  // Tambahkan state uploading
  const [uploading, setUploading] = useState(false);

  const isAdmin = ['superadmin', 'dvs', 'manager'].includes(userRole || '');

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchRequests();
      fetchUploaders(); // Tambahkan pemanggilan fungsi fetchUploaders
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

  // Fungsi untuk mengambil data uploaders dari tabel profiles
  const fetchUploaders = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name');
      
      if (error) throw error;
      
      // Transform data untuk sesuai dengan format yang dibutuhkan
      const formattedUploaders = data.map(profile => ({
        id: profile.id,
        name: profile.full_name
      }));
      
      setUploaders(formattedUploaders);
    } catch (error) {
      console.error('Error fetching uploaders:', error);
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
        try {
          // Mulai loading
          setUploading(true);
          
          // Kumpulkan URL yang berhasil diupload
          const successfulUploads = [];
          
          for (const file of selectedFiles) {
            try {
              // Bersihkan nama file - ganti spasi dengan underscore
              const safeFileName = file.name.replace(/\s+/g, '_');
              
              // Gunakan folder per request + nama file yang aman
              const filePath = `${selectedRequest.id}/${safeFileName}`;
              
              console.log("Uploading file:", file.name);
              console.log("Using safe path:", filePath);
              
              const { error: uploadError } = await supabase.storage
                .from('pull.request')
                .upload(filePath, file, { upsert: true });

              if (uploadError) {
                console.error("Upload error for file:", file.name, uploadError);
                continue; // Skip ke file berikutnya jika gagal
              }

              const { data: publicURL } = supabase.storage
                .from('pull.request')
                .getPublicUrl(filePath);

              successfulUploads.push(publicURL.publicUrl);
              console.log("Uploaded successfully:", publicURL.publicUrl);
            } catch (fileError) {
              console.error("Error processing file:", file.name, fileError);
              // Lanjut ke file berikutnya
            }
          }
          
          // Tambahkan URL baru ke fileUrls yang sudah ada
          fileUrls = [...(selectedRequest.file_urls || []), ...successfulUploads];
          console.log("Final file URLs:", fileUrls);
          
        } catch (batchError) {
          console.error("Batch upload error:", batchError);
          toast.error("Some files failed to upload");
          // Tetap lanjutkan dengan file yang berhasil
        } finally {
          // Selesai loading
          setUploading(false);
        }
      }

      // Update request - uploader adalah user yang login (fullName)
      const { error } = await supabase
        .from('pull_requests')
        .update({
          status: selectedRequest.status,
          admin_response: adminResponse,
          file_urls: fileUrls,
          uploader: fullName // Nama user yang login saat ini
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
  
  // Handler untuk delete
  const handleDeleteRequest = async (request: any) => {
    try {
      setLoading(true);
      console.log("Starting delete for request:", request.id);
      
      // Hapus file di storage jika ada
      if (request.file_urls && Array.isArray(request.file_urls)) {
        console.log("Files to delete:", request.file_urls);
        
        for (const url of request.file_urls) {
          try {
            console.log("Processing URL:", url);
            
            // Extract file path - improve path extraction
            let filePath;
            try {
              const urlObj = new URL(url);
              console.log("URL pathname:", urlObj.pathname);
              
              // More robust path extraction
              if (urlObj.pathname.includes('/pull.request/')) {
                const bucketPart = '/pull.request/';
                const bucketIndex = urlObj.pathname.indexOf(bucketPart);
                if (bucketIndex !== -1) {
                  filePath = decodeURIComponent(urlObj.pathname.substring(bucketIndex + bucketPart.length));
                  console.log("Extracted file path:", filePath);
                }
              }
            } catch (parseErr) {
              console.error("URL parsing failed:", parseErr);
            }
            
            // Fallback method if first approach fails
            if (!filePath) {
              const parts = url.split('/pull.request/');
              if (parts.length > 1) {
                filePath = decodeURIComponent(parts[1].split('?')[0]);
                console.log("Fallback file path:", filePath);
              }
            }
            
            if (filePath) {
              console.log("Attempting to delete:", filePath);
              const { data, error: removeError } = await supabase.storage
                .from('pull.request')
                .remove([filePath]);
                
              console.log("Delete result:", { data, error: removeError });
              
              if (removeError) {
                console.error("File delete error:", removeError);
              }
            } else {
              console.error("Could not extract file path from URL:", url);
            }
          } catch (fileErr) {
            console.error("Error processing file:", fileErr);
          }
        }
      }
      
      // Hapus data di table - do this outside the file loop
      console.log("Deleting database record for request:", request.id);
      const { data, error } = await supabase
        .from('pull_requests')
        .delete()
        .eq('id', request.id);
      
      console.log("Database delete result:", { data, error });
      
      if (error) {
        console.error("Database delete error:", error);
        throw error;
      }

      toast.success('Request & files deleted');
      console.log("Refreshing requests list");
      await fetchRequests(); // pastikan refresh data setelah delete
      console.log("Refresh complete");
    } catch (err) {
      console.error('Complete delete error:', err);
      toast.error('Failed to delete request or files');
    } finally {
      setLoading(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="w-full h-full flex flex-col px-4 py-2">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold">Data Pull Requests</h1>
            <p className="text-sm text-gray-500 mt-1">Request data only 1 per input to minimize errors and a maximum of 5 data per-week. If there are problems in retrieving data, please coordinate with DVS.</p>
          </div>
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
          <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">Pending</span>
          <span className="text-sm text-gray-600">: Menunggu persetujuan admin</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">Waiting List</span>
          <span className="text-sm text-gray-600">: Sedang diproses/diterima admin</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">Done</span>
          <span className="text-sm text-gray-600">: Selesai, data sudah diberikan</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-semibold">Rejected</span>
          <span className="text-sm text-gray-600">: Ditolak admin</span>
        </div>
      </div>

      {/* Loading or No Data */}
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
        <div className="flex-1 overflow-auto">
          <div className="min-w-full border rounded-lg shadow-sm">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
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
                    Uploader
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
                            ? 'bg-emerald-100 text-emerald-800'
                            : request.status === 'Rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : request.status === 'Pending'
                            ? 'bg-amber-100 text-amber-800'
                            : request.status === 'Waiting List'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-stone-100 text-stone-800'
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-900 whitespace-normal break-words max-w-xs">
                        {request.message}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {request.admin_response ? (
                        <div className="text-xs text-gray-900 whitespace-normal break-words max-w-xs">
                          {request.admin_response}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {request.uploader ? (
                        <div className="text-sm text-gray-900">
                          {request.uploader}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
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
                        {request.status === 'Done' && request.file_urls && Array.isArray(request.file_urls) && request.file_urls.length > 0 && (
                          <div className="flex gap-2">
                            {request.file_urls.map((url: string, idx: number) => (
                              <a 
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  // Prevent default action to handle manually
                                  e.preventDefault();
                                  
                                  // Try to download using fetch API first
                                  fetch(url)
                                    .then(response => {
                                      if (!response.ok) {
                                        throw new Error('Network response was not ok');
                                      }
                                      return response.blob();
                                    })
                                    .then(blob => {
                                      // Create a download link
                                      const downloadUrl = window.URL.createObjectURL(blob);
                                      
                                      // Extract filename from URL
                                      const urlParts = url.split('/');
                                      const fileName = urlParts[urlParts.length - 1].split('?')[0];
                                      const decodedFileName = decodeURIComponent(fileName);
                                      
                                      // Create temporary link and click it
                                      const tempLink = document.createElement('a');
                                      tempLink.href = downloadUrl;
                                      tempLink.setAttribute('download', decodedFileName);
                                      document.body.appendChild(tempLink);
                                      tempLink.click();
                                      document.body.removeChild(tempLink);
                                      
                                      // Clean up
                                      window.URL.revokeObjectURL(downloadUrl);
                                    })
                                    .catch(error => {
                                      console.error('Download error details:', error);
                                      console.error('URL tried:', url);
                                      // Fallback to direct link if fetch fails
                                      window.open(url, '_blank');
                                      toast.error('Error downloading file. Trying direct link.');
                                    });
                                }}
                                className="text-indigo-600 hover:text-indigo-800 flex items-center justify-center p-1.5 rounded-full hover:bg-indigo-50"
                                title={`Download file ${idx + 1}`}
                              >
                                <Download className='text-emerald-600' size={18} />
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
                            className="text-indigo-600 hover:text-indigo-800 p-1.5 rounded-full hover:bg-indigo-50"
                            title="Respond to request"
                          >
                            <MessageSquare className='text-sky-600' size={18} />
                          </button>
                        )}

                        {/* Delete action for superadmin */}
                        {userRole === 'superadmin' && (
                          <button
                            onClick={() => setDeleteTarget(request)}
                            className="text-rose-600 hover:text-rose-800 p-1.5 rounded-full hover:bg-rose-50"
                            title="Delete request and files"
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
                <>
                  {/* Hapus dropdown uploader dan ganti dengan informasi */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-gray-700">Uploader</label>
                      <span className="text-sm font-medium text-indigo-600">
                        {fullName}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Upload Data</label>
                    <div className="relative">
                      <input
                        type="file"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setSelectedFiles(prev => [...prev, ...files]);
                        }}
                        className={`w-full p-2 border rounded ${uploading ? 'opacity-50' : ''}`}
                        disabled={uploading}
                      />
                      {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50">
                          <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
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
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      <span>Uploading...</span>
                    </>
                  ) : 'Submit Response'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Konfirmasi Delete Custom */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-4 text-red-600">Konfirmasi Hapus</h2>
            <p className="mb-6">Yakin ingin menghapus request <span className="font-semibold">{deleteTarget.request_type}</span> beserta file di bucket?</p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded border text-gray-600 hover:bg-gray-100"
                onClick={() => setDeleteTarget(null)}
                disabled={loading}
              >
                Batal
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                onClick={() => handleDeleteRequest(deleteTarget)}
                disabled={loading}
              >
                {loading ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PullRequest;