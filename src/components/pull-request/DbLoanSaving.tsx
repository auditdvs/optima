import { Download, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

const DbLoanSaving = () => {
  const { user, userRole } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    requestData: '', // Used for branch code
    message: '',     // Keeping for compatibility but not used in the form
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loadingLoanSaving, setLoadingLoanSaving] = useState(true);
  const [loanSavingError, setLoanSavingError] = useState(false);

  const isAdmin = ['superadmin', 'dvs', 'manager'].includes(userRole || '');

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchLoanSavingRequests();
    }
  }, [user]);

  const handleNewRequestClick = () => {
    setShowForm(true);
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

  const fetchLoanSavingRequests = async () => {
    setLoadingLoanSaving(true);
    try {
      // Query the dbLoanSaving table
      let query = supabase
        .from('dbLoanSaving')
        .select('*');
        
      // If not admin, only show user's own requests
      if (!isAdmin) {
        query = query.eq('requested_by', user?.id);
      }
      
      const { data: loanSavingData, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching loan and saving data:', error);
        throw error;
      }

      // If we have data, fetch the profile names separately
      if (loanSavingData && loanSavingData.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(loanSavingData.map(req => req.requested_by))];
        
        // Fetch the profiles for these users
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        if (profilesError) {
          console.error('Error fetching profiles for loan and saving:', profilesError);
        }
        
        // Create a user map for easy lookup
        const userMap: { [key: string]: any } = {};
        if (profilesData) {
          profilesData.forEach(profile => {
            userMap[profile.id] = profile;
          });
        }
        
        // Combine the data
        const combinedData = loanSavingData.map(request => ({
          ...request,
          profiles: userMap[request.requested_by] || { full_name: 'Unknown' }
        }));
        
        setRequests(combinedData);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error('Error fetching loan and saving data:', error);
      toast.error('Failed to load loan and saving data');
      setLoanSavingError(true);
    } finally {
      setLoading(false);
      setLoadingLoanSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Format branch code to ensure 3 digits (add leading zeros)
    const formattedBranchCode = formData.requestData.padStart(3, '0');
    
    try {
      // Insert into dbLoanSaving table with the branch code and status 'queued'
      const { error } = await supabase
        .from('dbLoanSaving')
        .insert({
          requested_by: user?.id,
          branch_code: formattedBranchCode,
          status: 'queued',
        });

      if (error) throw error;
      
      toast.success('Request submitted successfully');
      setFormData({ requestData: '', message: '' });
      setShowForm(false);
      fetchLoanSavingRequests(); // Refresh the list
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request');
    }
  };

  const handleAdminResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      let resultPathSaving = selectedRequest.result_path_saving || null;
      let resultPathLoan = selectedRequest.result_path_loan || null;

      // Upload files if status is completed
      if (selectedFiles.length > 0 && selectedRequest.status === 'completed') {
        try {
          // Start loading
          setUploading(true);
          
          // Process each file
          for (const file of selectedFiles) {
            // Clean filename - replace spaces with underscores
            const safeFileName = file.name.replace(/\s+/g, '_');
            
            // Use folder per request + safe filename
            const filePath = `${selectedRequest.id}/${safeFileName}`;
            
            console.log("Uploading file:", file.name);
            
            const { error: uploadError } = await supabase.storage
              .from('db.loansaving') // Use db.loansaving bucket
              .upload(filePath, file, { upsert: true });

            if (uploadError) {
              console.error("Upload error:", uploadError);
              throw uploadError;
            }

            const { data: publicURL } = supabase.storage
              .from('db.loansaving')
              .getPublicUrl(filePath);

            // Determine if the file is for saving or loan based on the filename
            if (file.name.toLowerCase().includes('saving')) {
              resultPathSaving = publicURL.publicUrl;
              console.log("Uploaded successfully (saving):", resultPathSaving);
            } else if (file.name.toLowerCase().includes('loan')) {
              resultPathLoan = publicURL.publicUrl;
              console.log("Uploaded successfully (loan):", resultPathLoan);
            }
          }
          
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error("Failed to upload file");
          // Continue with the update even if upload fails
        } finally {
          setUploading(false);
        }
      }

      // Update request with status and result paths
      const { error } = await supabase
        .from('dbLoanSaving')
        .update({
          status: selectedRequest.status,
          result_path_saving: resultPathSaving,
          result_path_loan: resultPathLoan
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success('Response submitted successfully');
      setSelectedRequest(null);
      setAdminResponse('');
      setSelectedFiles([]);
      fetchLoanSavingRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    }
  };

  // Handler untuk delete loan and saving request
  const handleDeleteRequest = async (request: any) => {
    try {
      setLoading(true);
      console.log("Starting delete for loan/saving request:", request.id);
      
      // Handle result_path_saving and result_path_loan deletion if present
      const deleteFileIfExists = async (fileUrl: string | null) => {
        if (!fileUrl) return;
        
        try {
          // Extract file path from the URL
          let filePath;
          try {
            const urlObj = new URL(fileUrl);
            
            // Path extraction for storage bucket
            if (urlObj.pathname.includes('/db.loansaving/')) {
              const bucketPart = '/db.loansaving/';
              const bucketIndex = urlObj.pathname.indexOf(bucketPart);
              if (bucketIndex !== -1) {
                filePath = decodeURIComponent(urlObj.pathname.substring(bucketIndex + bucketPart.length));
              }
            }
          } catch (parseErr) {
            console.error("URL parsing failed:", parseErr);
          }
          
          // Try fallback method if needed
          if (!filePath) {
            const parts = fileUrl.split('/db.loansaving/');
            if (parts.length > 1) {
              filePath = decodeURIComponent(parts[1].split('?')[0]);
            }
          }
          
          // Remove file if we have a path
          if (filePath) {
            console.log("Attempting to delete file:", filePath);
            await supabase.storage
              .from('db.loansaving')
              .remove([filePath]);
          }
        } catch (fileErr) {
          console.error("Error deleting file:", fileErr);
          // Continue with deletion even if file removal fails
        }
      };
      
      // Delete both saving and loan files if they exist
      if (request.result_path_saving) {
        await deleteFileIfExists(request.result_path_saving);
      }
      
      if (request.result_path_loan) {
        await deleteFileIfExists(request.result_path_loan);
      }
      
      // Delete the database record
      console.log("Deleting database record for request:", request.id);
      const { error } = await supabase
        .from('dbLoanSaving')
        .delete()
        .eq('id', request.id);
      
      if (error) {
        console.error("Database delete error:", error);
        throw error;
      }

      toast.success('Request deleted successfully');
      
      // Update UI immediately while waiting for refresh
      setRequests((current) => current.filter(item => item.id !== request.id));
      
      // Refresh data to ensure consistency
      await fetchLoanSavingRequests();
    } catch (err) {
      console.error('Error deleting request:', err);
      toast.error('Failed to delete request');
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
            <h1 className="text-2xl font-bold">Db Loan and Saving</h1>
            <p className="text-sm text-gray-500 mt-1">
              Request data pinjaman dan simpanan berdasarkan kriteria.
            </p>
          </div>
        </div>
        
        <div>
          <button
            onClick={handleNewRequestClick}
            className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded transition-colors"
            title="Request Data Pinjaman/Simpanan"
          >
            Request Data
          </button>
        </div>
      </div>

      {/* Status Legend */}
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

      {/* Db Loan and Saving Table */}
      {loadingLoanSaving ? (
        <div className="flex justify-center items-center h-64">
          <div className="loader">
            <div className="loader-ring loader-ring-a"></div>
            <div className="loader-ring loader-ring-b"></div>
            <div className="loader-ring loader-ring-c"></div>
          </div>
        </div>
      ) : loanSavingError ? (
        <div className="flex flex-col items-center justify-center p-8 bg-rose-50 border border-rose-200 rounded-lg text-center">
          <div className="text-rose-600 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-rose-800">Gagal Memuat Data</h3>
          <p className="text-rose-700 mt-1">Terjadi kesalahan saat mengambil data loan dan saving.</p>
          <button 
            onClick={() => {
              setLoanSavingError(false);
              setLoadingLoanSaving(true);
              fetchLoanSavingRequests();
            }}
            className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 focus:outline-none"
          >
            Coba Lagi
          </button>
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
                    Requested By
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kode Cabang
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
                {requests.map((request) => (
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
                        {request.status || 'queued'}
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
                        {request.result_path_saving && (
                          <button
                            type="button"
                            className="text-indigo-600 hover:text-indigo-800 flex items-center justify-center p-1.5 rounded-full hover:bg-indigo-50"
                            title="Download saving data"
                            onClick={() => handleCustomDownload(request.result_path_saving)}
                          >
                            <Download className='text-emerald-600' size={18} />
                            <span className="ml-1 text-xs">Saving</span>
                          </button>
                        )}

                        {request.result_path_loan && (
                          <button
                            type="button"
                            className="text-indigo-600 hover:text-indigo-800 flex items-center justify-center p-1.5 rounded-full hover:bg-indigo-50"
                            title="Download loan data"
                            onClick={() => handleCustomDownload(request.result_path_loan)}
                          >
                            <Download className='text-blue-600' size={18} />
                            <span className="ml-1 text-xs">Loan</span>
                          </button>
                        )}

                        {/* Delete action for superadmin */}
                        {userRole === 'superadmin' && (
                          <button
                            onClick={() => {
                              // Confirm before deleting
                              if (window.confirm(`Are you sure you want to delete this request for branch ${request.branch_code}?`)) {
                                handleDeleteRequest(request);
                              }
                            }}
                            className="text-rose-600 hover:text-rose-800 p-1.5 rounded-full hover:bg-rose-50"
                            title="Delete request"
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
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Request Db Loan and Saving</h2>
            <form onSubmit={handleSubmit}>
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
                  value={formData.requestData}
                  onChange={(e) => {
                    // Only allow numbers and limit to 3 characters
                    const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                    setFormData({...formData, requestData: value});
                  }}
                  className="w-full p-2 border rounded"
                  placeholder="e.g. 080"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Masukkan kode cabang (akan otomatis ditambahkan leading zeros jika kurang dari 3 digit)
                </p>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
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

      {/* Admin Response Form */}
      {isAdmin && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={() => { setSelectedRequest(null); setSelectedFiles([]); }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Respond to Request</h2>
            <form onSubmit={handleAdminResponse}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Requested By</label>
                <input
                  type="text"
                  value={selectedRequest.profiles?.full_name || ''}
                  disabled
                  className="w-full p-2 border rounded bg-gray-100"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Kode Cabang</label>
                <input
                  type="text"
                  value={selectedRequest.branch_code}
                  disabled
                  className="w-full p-2 border rounded bg-gray-100"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Request Details</label>
                <textarea
                  value={selectedRequest.message}
                  disabled
                  className="w-full p-2 border rounded min-h-[100px] bg-gray-100"
                ></textarea>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Status</label>
                <select
                  value={selectedRequest.status || 'queued'}
                  onChange={(e) => setSelectedRequest({...selectedRequest, status: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="queued">Queued</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              {selectedRequest.status === 'completed' && (
                <>
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Upload Saving Data File</label>
                    <div className="relative">
                      <input
                        type="file"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            // Add "saving_" prefix to identify file type
                            const file = e.target.files[0];
                            const renamedFile = new File([file], `saving_${file.name}`, { type: file.type });
                            setSelectedFiles([renamedFile]);
                          }
                        }}
                        className={`w-full p-2 border rounded ${uploading ? 'opacity-50' : ''}`}
                        disabled={uploading}
                      />
                      {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50">
                          <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                        </div>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Select saving data file
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Upload Loan Data File</label>
                    <div className="relative">
                      <input
                        type="file"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            // Add "loan_" prefix to identify file type
                            const file = e.target.files[0];
                            const renamedFile = new File([file], `loan_${file.name}`, { type: file.type });
                            setSelectedFiles(current => [...current, renamedFile]);
                          }
                        }}
                        className={`w-full p-2 border rounded ${uploading ? 'opacity-50' : ''}`}
                        disabled={uploading}
                      />
                      {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50">
                          <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                        </div>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Select loan data file
                      </p>
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
                        onClick={() => setSelectedFiles([])}
                      >
                        Hapus
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Admin Notes</label>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  className="w-full p-2 border rounded min-h-[100px]"
                  placeholder="Provide notes about this request"
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
                  className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-2"
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
    </div>
  );
};

export default DbLoanSaving;
