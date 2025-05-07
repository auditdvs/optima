import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ArrowUpDown, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

const ALLOWED_ROLES = ['superadmin', 'qa', 'dvs', 'manager'];

interface Notification {
  id: string;
  title: string;
  message: string;
  sender_id: string;
  created_at: string;
  attachment_url?: string;
  attachment_name?: string;
  sender?: {
    full_name: string;
  };
}

const NotificationHistory = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Notification;
    direction: 'asc' | 'desc';
  }>({
    key: 'created_at',
    direction: 'desc'
  });

  const { user, userRole } = useAuth();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      // 1. Ambil semua notifikasi
      const { data: notifs, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 2. Ambil semua profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name');

      if (profilesError) throw profilesError;

      // 3. Gabungkan manual
      const notificationsWithSender = notifs.map(notif => ({
        ...notif,
        sender: {
          full_name: profiles.find(p => p.id === notif.sender_id)?.full_name || 'Unknown'
        }
      }));

      setNotifications(notificationsWithSender);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to fetch notifications');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    try {
      // First delete related notification reads
      const { error: readsError } = await supabase
        .from('notification_reads')
        .delete()
        .eq('notification_id', id);

      if (readsError) throw readsError;

      // Then delete the notification
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications(notifications.filter(n => n.id !== id));
      toast.success('Notification deleted successfully');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleSort = (key: keyof Notification) => {
    setSortConfig({
      key,
      direction: 
        sortConfig.key === key && sortConfig.direction === 'asc' 
          ? 'desc' 
          : 'asc'
    });
  };

  const handleDownload = async (url: string, originalName: string, title: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Get file extension from original filename if exists
      const extension = originalName ? originalName.split('.').pop() : '';
      // Create new filename from title + extension
      const fileName = `${title}${extension ? `.${extension}` : ''}`;
      
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy HH:mm');
  };

  const filteredAndSortedNotifications = notifications
    .filter(notification => {
      const searchLower = searchTerm.toLowerCase();
      return (
        notification.title.toLowerCase().includes(searchLower) ||
        notification.message.toLowerCase().includes(searchLower) ||
        (notification.sender?.full_name || '').toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (sortConfig.key === 'created_at') {
        return sortConfig.direction === 'asc'
          ? new Date(aValue).getTime() - new Date(bValue).getTime()
          : new Date(bValue).getTime() - new Date(aValue).getTime();
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-3 p-0">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Messages History</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search messages..."
            className="pl-9 pr-4 py-2 border rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-2">
                      Date
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center gap-2">
                      Title
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('sender_id')}
                  >
                    <div className="flex items-center gap-2">
                      Sender
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Attachment</TableHead>
                  {ALLOWED_ROLES.includes(userRole) && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedNotifications.map((notification) => (
                  <TableRow key={notification.id} className="align-top">
                    <TableCell className="force-align-top w-36">
                      {formatDate(notification.created_at)}
                    </TableCell>
                    <TableCell className="force-align-top w-48">
                      {notification.title}
                    </TableCell>
                    <TableCell className="align-top whitespace-pre-line">
                      {notification.message}
                    </TableCell>
                    <TableCell className="force-align-top">
                      {notification.sender?.full_name || 'Unknown'}
                    </TableCell>
                    <TableCell className="force-align-top">
                      {notification.attachment_url ? (
                        <button
                          onClick={() => handleDownload(
                            notification.attachment_url!, 
                            notification.attachment_name || '',
                            notification.title
                          )}
                          className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                        >
                          {notification.attachment_name || 'Download'}
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    {ALLOWED_ROLES.includes(userRole) && (
                      <TableCell className="force-align-top">
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationHistory;