import { AlignStartVertical, Bell, ChartNoAxesColumn, LogOut, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  attachment_url: string | null;
  attachment_name?: string;
  created_at: string;
  read_by: string[];
}

function Navbar() {
  const { signOut, user, auditor } = useAuth();
  const [fullName, setFullName] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewNotification, setHasNewNotification] = useState(false);

  useEffect(() => {
    async function fetchUserProfile() {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setFullName(data.full_name);
        }
      }
    }

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    if (user && auditor) {
      // Initial fetch
      fetchNotifications();

      // Subscribe to new notifications
      const channel = supabase
        .channel('public:notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications'
          },
          async (payload) => {
            console.log('New notification received:', payload);
            
            // Fetch the complete notification data
            const { data: newNotif, error } = await supabase
              .from('notifications')
              .select('id, title, message, attachment_url, attachment_name, created_at')
              .eq('id', payload.new.id)
              .single();

            if (error) {
              console.error('Error fetching new notification:', error);
              return;
            }

            // Add to notifications state with empty read_by array
            const newNotification = {
              ...newNotif,
              read_by: []
            };
            
            setNotifications(prev => [newNotification, ...prev]);
            setHasNewNotification(true);
            setUnreadCount(prev => prev + 1);
            toast.success('New notification received!');
          }
        )
        .subscribe();

      return () => {
        console.log('Unsubscribing from notifications channel');
        supabase.removeChannel(channel);
      };
    }
  }, [user, auditor]);

  useEffect(() => {
    if (notifications.length > 0 && auditor) {
      const count = notifications.filter(n => !n.read_by.includes(auditor.id)).length;
      setUnreadCount(count);
    }
  }, [notifications, auditor]);

  const fetchNotifications = async () => {
    if (!user || !auditor) return;

    console.log("Fetching notifications for auditor:", auditor.id);
    
    try {
      // 1. Fetch notifications
      const { data: notifs } = await supabase
        .from('notifications')
        .select('id, title, message, attachment_url, attachment_name, created_at')
        .order('created_at', { ascending: false });

      console.log("Fetched notifications:", notifs);

      // 2. Fetch notification reads
      const { data: reads, error: readsError } = await supabase
        .from('notification_reads')
        .select('notification_id, user_id');

      if (readsError) {
        console.error('Error fetching notification reads:', readsError);
        return;
      }

      // 3. Process notifications with read status
      const processedNotifications = notifs.map(notif => ({
        ...notif,
        read_by: reads
          ? reads
              .filter(read => read.notification_id === notif.id)
              .map(read => read.user_id)
          : []
      }));

      console.log('Processed notifications:', processedNotifications);
      setNotifications(processedNotifications);

      // 4. Update unread count
      const unreadCount = processedNotifications.filter(
        n => !n.read_by.includes(auditor.id)
      ).length;
      setUnreadCount(unreadCount);

    } catch (error) {
      console.error("Error in fetchNotifications:", error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    if (!auditor) {
      console.error("Cannot mark as read: No auditor data available");
      return;
    }

    console.log("Marking notification as read:", notificationId, "by auditor:", auditor.id);

    try {
      // First verify this specific notification exists
      const { data: notifCheck } = await supabase
        .from('notifications')
        .select('id')
        .eq('id', notificationId)
        .single();
        
      if (!notifCheck) {
        console.error('Notification not found:', notificationId);
        return;
      }

      // 1. Add record to notification_reads
      const { data, error: readError } = await supabase
        .from('notification_reads')
        .insert({
          notification_id: notificationId,
          user_id: auditor.id
        })
        .select();

      if (readError) {
        if (readError.code === '23505') {
          console.log('Notification already marked as read (unique constraint)');
        } else {
          console.error('Error marking notification as read:', readError);
          toast.error('Failed to mark notification as read');
          return;
        }
      } else {
        console.log('Successfully marked as read:', data);
      }

      // 2. Update UI
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, read_by: [...(n.read_by || []), auditor.id] }
            : n
        )
      );
      
      // 3. Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));

    } catch (error) {
      console.error('Error in markNotificationAsRead:', error);
      toast.error('An error occurred');
    }
  };

  const markAllAsRead = async () => {
    if (!auditor) {
      console.error("Cannot mark all as read: No auditor data available");
      return;
    }

    try {
      const unreadNotifications = notifications.filter(n => !n.read_by.includes(auditor.id));
      
      if (unreadNotifications.length === 0) {
        console.log("No unread notifications to mark");
        return;
      }
      
      console.log("Marking all notifications as read for auditor:", auditor.id);
      
      // Insert all unread notifications into notification_reads
      const readRecords = unreadNotifications.map(notification => ({
        notification_id: notification.id,
        user_id: auditor.id
      }));

      const { error } = await supabase
        .from('notification_reads')
        .insert(readRecords)
        .select();

      if (error && error.code !== '23505') {
        console.error('Error marking all as read:', error);
        toast.error('Failed to mark all as read');
        return;
      }

      // Update UI
      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          read_by: n.read_by.includes(auditor.id) ? n.read_by : [...n.read_by, auditor.id]
        }))
      );
      
      // Reset unread count
      setUnreadCount(0);
      toast.success('All notifications marked as read');

    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      toast.error('An error occurred');
    }
  };

  return (
    <div className="h-16 bg-white border-b flex items-center justify-between px-6 w-full max-w-fit-content">
      <div className="group">
        <a href="https://i.pinimg.com/736x/f4/7d/1a/f47d1a20470813af55020d51c4f5159a.jpg" target="_blank" rel="noopener noreferrer"> 
          <div className="text-sm text-gray-600 group-hover:animate-bounce cursor-pointer">
            Hello, {fullName}. Have a great day!
          </div>
        </a>
      </div>

      <div className="flex items-center space-x-6">
        {/* Audit Rating */}
        <Link
          to="https://risk-issue.streamlit.app/"
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <AlignStartVertical className="w-5 h-5 mr-2" />
          <span>Audit Rating</span>
        </Link>

        {/* RCM */}
        <Link
          to="https://risk-control-matriks.streamlit.app/"
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ChartNoAxesColumn className="w-5 h-5 mr-2" />
          <span>RCM</span>
        </Link>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setHasNewNotification(false);
            }}
            className="text-gray-600 hover:text-gray-900 relative"
          >
            <Bell className={`w-6 h-6 ${hasNewNotification ? 'animate-bounce' : ''}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg z-50">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold">Notifications</h3>
                <div className="flex items-center gap-4">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Mark all as read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b hover:bg-gray-50 ${
                        !notification.read_by.includes(auditor?.id || '') ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{notification.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          {notification.attachment_url && (
                            <a
                              href={notification.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-indigo-600 hover:text-indigo-800 mt-2 inline-block"
                            >
                              {notification.attachment_name || 'View attachment'}
                            </a>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!notification.read_by.includes(auditor?.id || '') && (
                          <button
                            onClick={() => markNotificationAsRead(notification.id)}
                            className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-800 ml-4"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={signOut}
          className="text-gray-600 hover:text-gray-900"
          title="Logout"
        >
          <LogOut className="w-6 h-6 mr-4" />
        </button>
      </div>
    </div>
  );
}

export default Navbar;