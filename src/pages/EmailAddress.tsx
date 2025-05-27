import { ArrowUpDown, Pencil, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

interface EmailData {
  id: string;
  branch_name: string;
  email: string;
}

interface EditEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailData: EmailData | null;
  onSubmit: (data: { branch_name: string; email: string }) => Promise<void>;
}

const EditEmailModal: React.FC<EditEmailModalProps> = ({ isOpen, onClose, emailData, onSubmit }) => {
  const [formData, setFormData] = useState({
    branch_name: emailData?.branch_name || '',
    email: emailData?.email || ''
  });

  useEffect(() => {
    if (emailData) {
      setFormData({
        branch_name: emailData.branch_name,
        email: emailData.email
      });
    }
  }, [emailData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Edit Email Address</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Branch Name</label>
            <input
              type="text"
              value={formData.branch_name}
              onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CopyEmailButton: React.FC<{ email: string }> = ({ email }) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    if (btnRef.current) btnRef.current.focus();
    setTimeout(() => {
      setCopied(false);
      btnRef.current?.blur(); // hilangkan focus agar animasi kembali normal
    }, 1000);
  };

  return (
    <button
      ref={btnRef}
      className="copy-email-btn"
      type="button"
      onClick={handleCopy}
      tabIndex={0}
    >
      <span style={{ opacity: copied ? 0 : 1, pointerEvents: copied ? 'none' : 'auto' }}>
        <svg
          width="14"
          height="14"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 467 512.22"
          style={{ marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }}
        >
          <path
            fillRule="nonzero"
            d="M131.07 372.11c.37 1 .57 2.08.57 3.2 0 1.13-.2 2.21-.57 3.21v75.91c0 10.74 4.41 20.53 11.5 27.62s16.87 11.49 27.62 11.49h239.02c10.75 0 20.53-4.4 27.62-11.49s11.49-16.88 11.49-27.62V152.42c0-10.55-4.21-20.15-11.02-27.18l-.47-.43c-7.09-7.09-16.87-11.5-27.62-11.5H170.19c-10.75 0-20.53 4.41-27.62 11.5s-11.5 16.87-11.5 27.61v219.69zm-18.67 12.54H57.23c-15.82 0-30.1-6.58-40.45-17.11C6.41 356.97 0 342.4 0 326.52V57.79c0-15.86 6.5-30.3 16.97-40.78l.04-.04C27.51 6.49 41.94 0 57.79 0h243.63c15.87 0 30.3 6.51 40.77 16.98l.03.03c10.48 10.48 16.99 24.93 16.99 40.78v36.85h50c15.9 0 30.36 6.5 40.82 16.96l.54.58c10.15 10.44 16.43 24.66 16.43 40.24v302.01c0 15.9-6.5 30.36-16.96 40.82-10.47 10.47-24.93 16.97-40.83 16.97H170.19c-15.9 0-30.35-6.5-40.82-16.97-10.47-10.46-16.97-24.92-16.97-40.82v-69.78zM340.54 94.64V57.79c0-10.74-4.41-20.53-11.5-27.63-7.09-7.08-16.86-11.48-27.62-11.48H57.79c-10.78 0-20.56 4.38-27.62 11.45l-.04.04c-7.06 7.06-11.45 16.84-11.45 27.62v268.73c0 10.86 4.34 20.79 11.38 27.97 6.95 7.07 16.54 11.49 27.17 11.49h55.17V152.42c0-15.9 6.5-30.35 16.97-40.82 10.47-10.47 24.92-16.96 40.82-16.96h170.35z"
          ></path>
        </svg>
        Copy Email
      </span>
      <span style={{ opacity: copied ? 1 : 0, pointerEvents: 'none' }}>
        Copied
      </span>
    </button>
  );
};

const EmailAddress = () => {
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'branch_name',
    direction: 'asc'
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false); // Tambahkan state untuk modal tambah email
  const [selectedEmail, setSelectedEmail] = useState<EmailData | null>(null);
  const { userRole } = useAuth();
  const [contentVisible, setContentVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false); // Tambahkan state baru untuk tombol refresh loading
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    // Set kedua state loading menjadi true
    setIsRefreshing(true);
    setButtonLoading(true);
    
    const start = Date.now();
    try {
      const { data, error } = await supabase
        .from('email')
        .select('*')
        .order('branch_name', { ascending: true });

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast.error('Failed to fetch email data');
    } finally {
      const elapsed = Date.now() - start;
      const minDelay = 3000;
      
      if (elapsed < minDelay) {
        await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
      }
      
      // Matikan kedua state loading
      setIsRefreshing(false);
      setButtonLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      // Ketika loading selesai, set contentVisible ke true
      setContentVisible(true);
    }
  }, [loading]);

  const handleSort = (key: string) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const handleEdit = async (data: { branch_name: string; email: string }) => {
    if (!selectedEmail) return;

    try {
      const { error } = await supabase
        .from('email')
        .update({
          branch_name: data.branch_name,
          email: data.email
        })
        .eq('id', selectedEmail.id);

      if (error) throw error;
      toast.success('Email updated successfully');
      fetchEmails();
    } catch (error) {
      console.error('Error updating email:', error);
      toast.error('Failed to update email');
    }
  };

  const handleAdd = async (data: { branch_name: string; email: string }) => {
    try {
      const { error } = await supabase.from('email').insert([
        {
          branch_name: data.branch_name,
          email: data.email
        }
      ]);

      if (error) throw error;
      toast.success('Email added successfully');
      fetchEmails();
    } catch (error) {
      console.error('Error adding email:', error);
      toast.error('Failed to add email');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('email')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Email deleted successfully');
      fetchEmails();
    } catch (error) {
      console.error('Error deleting email:', error);
      toast.error('Failed to delete email');
    } finally {
      setShowDeleteModal(false);
      setEmailToDelete(null);
    }
  };

  const confirmDelete = (id: string) => {
    setEmailToDelete(id);
    setShowDeleteModal(true);
  };

  const filteredAndSortedEmails = emails
    .filter(email =>
      email.branch_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortConfig.key as keyof EmailData];
      const bValue = b[sortConfig.key as keyof EmailData];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const fadeInStyle = {
    opacity: contentVisible ? 1 : 0,
    transform: contentVisible ? 'translateY(0)' : 'translateY(10px)',
    transition: 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out'
  };

  return (
    <>
      {/* Overlay loading dengan background transparan */}
      {isRefreshing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50 flex justify-center items-center">
          <svg className="loader" width="240" height="240" viewBox="0 0 240 240">
            <circle className="loader-ring loader-ring-a" cx="120" cy="120" r="105" fill="none" stroke="#9708F4" strokeWidth="20" strokeDasharray="0 660" strokeDashoffset="-330" strokeLinecap="round"></circle>
            <circle className="loader-ring loader-ring-b" cx="120" cy="120" r="35" fill="none" stroke="#5E14E4" strokeWidth="20" strokeDasharray="0 220" strokeDashoffset="-110" strokeLinecap="round"></circle>
            <circle className="loader-ring loader-ring-c" cx="85" cy="120" r="70" fill="none" stroke="#9708F4" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round"></circle>
            <circle className="loader-ring loader-ring-d" cx="155" cy="120" r="70" fill="none" stroke="#5E14E4" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round"></circle>
          </svg>
        </div>
      )}

      {/* Content selalu terlihat, tidak perlu kondisional */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Email Address Branch</h1>
          <div className="flex items-center gap-2">
            {/* Search bar dengan ukuran konsisten */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search branch or email..."
                className="pl-10 pr-3 py-2 h-10 w-64 rounded-md bg-indigo-500 text-white placeholder-indigo-200 outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="white"
                >
                  <path
                    d="M18.9,16.776A10.539,10.539,0,1,0,16.776,18.9l5.1,5.1L24,21.88ZM10.5,18A7.5,7.5,0,1,1,18,10.5,7.507,7.507,0,0,1,10.5,18Z"
                  ></path>
                </svg>
              </div>
            </div>
            
            {/* Add Email button dengan ukuran yang sama */}
            {userRole === 'superadmin' && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex items-center justify-center h-10 px-4 w-32 rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-2" viewBox="0 0 16 16">
                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
                Add Email
              </button>
            )}
            
            {/* Refresh button dengan ukuran yang sama */}
            <button
              type="button"
              onClick={fetchEmails}
              className="flex items-center justify-center h-10 px-4 w-32 rounded-md bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
              disabled={buttonLoading}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                fill="currentColor" 
                className="mr-2" 
                viewBox="0 0 16 16"
              >
                <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">No.</TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('branch_name')}
                  >
                    <div className="flex items-center gap-2">
                      Branch / Region Name
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-2">
                      Email
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  {userRole === 'superadmin' && (
                    <TableHead>Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedEmails.map((email, index) => (
                  <TableRow key={email.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{email.branch_name}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      {email.email}
                      <CopyEmailButton email={email.email} />
                    </TableCell>
                    {userRole === 'superadmin' && (
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedEmail(email);
                              setShowEditModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => confirmDelete(email.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <EditEmailModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEmail(null);
          }}
          emailData={selectedEmail}
          onSubmit={handleEdit}
        />

        {/* Add Email Modal */}
        <EditEmailModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          emailData={null}
          onSubmit={handleAdd}
        />

        {/* Modal Konfirmasi Hapus */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 w-screen overflow-y-auto" style={{backgroundColor: 'rgba(0,0,0,0.4)'}}>
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg
                        aria-hidden="true"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-6 w-6 text-red-600"
                      >
                        <path
                          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        ></path>
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <h3
                        id="modal-title"
                        className="text-base font-semibold leading-6 text-gray-900"
                      >
                        Delete Email Address
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to delete this email? This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                    type="button"
                    onClick={() => emailToDelete && handleDelete(emailToDelete)}
                  >
                    Delete
                  </button>
                  <button
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setEmailToDelete(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default EmailAddress;