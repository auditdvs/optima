import { LoaderCircle, Plus, Send, Upload, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// Shadcn UI components
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../components/ui/table";
import { Textarea } from "../components/ui/textarea";

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
  const [dialogOpen, setDialogOpen] = useState(false);

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
          sender_id: user.id,
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
      setDialogOpen(false);
      fetchNotifications();
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
    <div className="w-full min-h-screen py-6 px-1 pt-1 md:px-6">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-2xl font-bold pt-1">Broadcast Messages</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className='bg-yellow-400 hover:bg-yellow-300 text-yellow-900 hover:text-yellow-800 transition-colors duration-300'
            onClick={fetchNotifications}
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              "Refresh"
            )}
          </Button>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" 
                className="bg-indigo-600 hover:bg-indigo-400 text-white transition-colors duration-400">
                <Plus className="h-4 w-4 mx-auto" />
                New Broadcast
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg w-full">
              <DialogHeader>
                <DialogTitle>Send Broadcast Message</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Attachment (optional)</Label>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" className="h-9 bg-green-500 text-white hover:bg-green-400 hover:text-green-900" asChild>
                      <label>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleFileChange}
                          accept=".pdf,.jpg,.jpeg,.png,.gif"
                        />
                      </label>
                    </Button>
                    {file && (
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFile(null);
                            setAttachmentDetails(null);
                          }}
                          className="h-6 w-6 p-0 ml-1"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    PDF, JPG, PNG or GIF up to 5MB
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    className='bg-red-600 hover:bg-rose-500 text-white transition-colors duration-400'
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={loading || uploading}
                    className='bg-indigo-600 hover:bg-indigo-500 text-white transition-colors duration-400 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {uploading ? 'Uploading...' : loading ? 'Sending...' : 'Send Message'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {/* Table for broadcast history */}
      <div className="border rounded-lg overflow-x-auto bg-white dark:bg-background">
        <Table className="min-w-[700px] w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Title</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="w-[150px]">Attachment</TableHead>
              <TableHead className="w-[200px]">Read by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-gray-500 italic">
                  No broadcast messages found
                </TableCell>
              </TableRow>
            ) : (
              notifications.map((notif) => (
                <TableRow key={notif.id}>
                  <TableCell className="font-medium">{notif.title}</TableCell>
                  <TableCell className="whitespace-pre-wrap">{notif.message}</TableCell>
                  <TableCell>
                    {notif.attachment_url ? (
                      <Button 
                        variant="link" 
                        onClick={() => handleDownload(notif.attachment_url!, notif.attachment_name || 'attachment')}
                        className="p-0 h-auto"
                      >
                        {notif.attachment_name || 'Attachment'}
                      </Button>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {notif.readers.length > 0
                      ? notif.readers.join(', ')
                      : <span className="italic text-gray-400">Belum ada</span>}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default Broadcast;
