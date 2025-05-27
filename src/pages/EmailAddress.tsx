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
        Copy link
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
  const [selectedEmail, setSelectedEmail] = useState<EmailData | null>(null);
  const { userRole } = useAuth();
  const [contentVisible, setContentVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false); // Tambahkan state baru untuk tombol refresh loading

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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this email?')) return;

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
    }
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
            <div 
              className="p-0 overflow-hidden w-[45px] h-[45px] hover:w-[270px] bg-indigo-500 shadow-[2px_2px_20px_rgba(0,0,0,0.08)] rounded-full flex group items-center justify-end hover:duration-300 duration-300"
            >
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search branch or email..."
                className="outline-none text-[16px] bg-transparent w-full text-white font-normal pl-3 pr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              <div className="flex items-center justify-center fill-white min-w-[45px] h-[45px]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="white"
                >
                  <path
                    d="M18.9,16.776A10.539,10.539,0,1,0,16.776,18.9l5.1,5.1L24,21.88ZM10.5,18A7.5,7.5,0,1,1,18,10.5,7.507,7.507,0,0,1,10.5,18Z"
                  ></path>
                </svg>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchEmails}
              className="flex items-center justify-center text-xl w-32 h-10 rounded bg-indigo-500 text-white relative overflow-hidden group z-10 hover:text-white duration-1000"
              disabled={buttonLoading}
            >
              <span
                className="absolute bg-indigo-600 w-36 h-36 rounded-full group-hover:scale-100 scale-0 -z-10 -left-2 -top-10 group-hover:duration-500 duration-700 origin-center transform transition-all"
              ></span>
              <span
                className="absolute bg-indigo-800 w-36 h-36 -left-2 -top-10 rounded-full group-hover:scale-100 scale-0 -z-10 group-hover:duration-700 duration-500 origin-center transform transition-all"
              ></span>
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
                            onClick={() => handleDelete(email.id)}
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
      </div>
    </>
  );
};

export default EmailAddress;