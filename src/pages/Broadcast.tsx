import { Send, Upload, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// Add these constants at the top of your component
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif'
};

interface NotificationWithReaders {
  id: string;
  title: string;
  message: string;
  attachment_url?: string;
  attachment_name?: string;
  readers: string[]; // array of string
}

function Broadcast() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachmentDetails, setAttachmentDetails] = useState<{ url: string; name: string } | null>(null);
  const [notifications, setNotifications] = useState<NotificationWithReaders[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check file type
    if (!Object.keys(ALLOWED_FILE_TYPES).includes(selectedFile.type)) {
      toast.error('Invalid file type. Please upload PDF, JPG, PNG, or GIF files only.');
      e.target.value = ''; // Reset input
      return;
    }

    // Check file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 5MB');
      e.target.value = ''; // Reset input
      return;
    }

    setFile(selectedFile);
    console.log('File selected:', selectedFile.name);
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      let attachmentUrl = null;

      if (file) {
        try {
          const STORAGE_BUCKET = 'attachments';

          // Generate unique file path
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substr(2)}.${fileExt}`;
          const filePath = `${fileName}`;

          // Upload file
          setUploading(true);
          const { error: uploadError, data: uploadData } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, file, {
              contentType: file.type,
              cacheControl: '3600',
              upsert: false
            });
          setUploading(false);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Failed to upload file: ${uploadError.message}`);
          }

          // Get public URL only if upload was successful
          if (uploadData?.path) {
            const { data: { publicUrl } } = supabase.storage
              .from(STORAGE_BUCKET)
              .getPublicUrl(uploadData.path);

            attachmentUrl = publicUrl;
            // Store both URL and original filename
            setAttachmentDetails({ 
              url: publicUrl,
              name: file.name 
            });
            console.log('File uploaded successfully:', attachmentUrl);
          }
        } catch (error) {
          console.error('File upload error:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to upload file');
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          title,
          message,
          sender_id: user.id, // <-- field ini tidak di-select di Navbar
          attachment_url: attachmentUrl,
          attachment_name: attachmentDetails?.name,
          created_at: new Date().toISOString()
        })
        .select();

      console.log("Inserted notification:", data, error);

      if (error) throw error;

      toast.success('Message broadcast successfully');
      setTitle('');
      setMessage('');
      setFile(null);
    } catch (error) {
      console.error('Error broadcasting message:', error);
      toast.error('Failed to broadcast message');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      setRefreshing(true);
      // 1. Ambil semua notifikasi
      const { data: notifs, error } = await supabase
        .from('notifications')
        .select('id, title, message, attachment_url, attachment_name, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        setRefreshing(false);
        return;
      }

      // 2. Ambil semua notification_reads
      const { data: reads, error: readsError } = await supabase
        .from('notification_reads')
        .select('notification_id, user_id');

      if (readsError) {
        console.error('Error fetching notification reads:', readsError);
      }

      // 3. Ambil semua profiles untuk mendapatkan nama
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name');

      // 4. Gabungkan data untuk setiap notifikasi
      const notificationsWithReaders = notifs.map(notif => {
        const notifReads = reads ? reads.filter(read => read.notification_id === notif.id) : [];
        // Ubah jadi array string, bukan objek
        const readers = notifReads.map(read => {
          const foundUser = profiles.find(u => u.id === read.user_id);
          return foundUser ? foundUser.full_name : 'Unknown';
        });

        return {
          ...notif,
          readers // array of string
        };
      });

      setNotifications(notificationsWithReaders);
      setRefreshing(false);
    } catch (err) {
      setRefreshing(false);
      console.error('Error in fetchNotifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="max-w-6xl ml-1 mr-2 p-1">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Kiri: Broadcast Message */}
        <div className="md:w-2/3 w-full">
          <h1 className="text-2xl font-bold mb-6">Broadcast Message</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attachment (optional)
              </label>
              <div className="mt-1 flex items-center">
                <label className="relative cursor-pointer bg-white px-4 py-2 border rounded-md hover:bg-gray-50">
                  <Upload className="h-5 w-5 text-gray-600" />
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png,.gif"
                  />
                </label>
                {file && (
                  <div className="ml-4 flex items-center">
                    <span className="text-sm text-gray-500">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setAttachmentDetails(null);
                      }}
                      className="ml-2 text-gray-400 hover:text-gray-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                PDF, JPG, PNG or GIF up to 5MB
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || uploading}
              className="flex items-center justify-center w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send className="h-5 w-5 mr-2" />
              {uploading ? 'Uploading...' : loading ? 'Broadcasting...' : 'Broadcast Message'}
            </button>
          </form>
        </div>

        {/* Kanan: Broadcast History */}
        <div className="md:w-2/3 w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Broadcast History</h2>
            <button
              onClick={fetchNotifications}
              disabled={refreshing}
              className="flex items-center px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm text-gray-700 disabled:opacity-50"
              title="Refresh"
            >
              <svg className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M5.582 9A7.003 7.003 0 0112 5c3.314 0 6.127 2.163 6.816 5M18.418 15A7.003 7.003 0 0112 19c-3.314 0-6.127-2.163-6.816-5" />
              </svg>
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <div className="overflow-x-auto overflow-y-visible max-h-[500px] border rounded">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-2 text-left w-32">Title</th>
                  <th className="p-2 text-left">Message</th>
                  <th className="p-2 text-left w-36">Attachment</th>
                  <th className="p-2 text-left w-32">Read by</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notif) => (
                  <tr key={notif.id} className="border-b align-top">
                    <td className="p-2 font-medium break-words">{notif.title}</td>
                    <td className="p-2 break-words">{notif.message}</td>
                    <td className="p-2">
                      {notif.attachment_url && (
                        <a
                          href={notif.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          {notif.attachment_name || 'Attachment'}
                        </a>
                      )}
                    </td>
                    <td className="p-2 break-words">
                      {notif.readers.length > 0
                        ? notif.readers.join(', ')
                        : <span className="italic text-gray-400">Belum ada</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Broadcast;
