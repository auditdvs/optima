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
  readers?: string[];
  sender_name?: string;
}

function Navbar() {
  const { signOut, user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [showFullMessage, setShowFullMessage] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  console.log("Navbar user:", user);

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
    if (user && user.id) {
      fetchNotifications();

      const channel = supabase
        .channel('public:notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications'
          },
          async () => {
            await fetchNotifications();
            setHasNewNotification(true);
            toast.success('New notification received!');
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    if (notifications.length > 0 && user) {
      const count = notifications.filter(n => !n.read_by.includes(user.id)).length;
      setUnreadCount(count);
    }
  }, [notifications, user]);

  const fetchNotifications = async () => {
    if (!user) return;

    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false }); // Notif terbaru di atas

    const { data: reads } = await supabase
      .from('notification_reads')
      .select('notification_id, user_id');

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name');

    const notificationsWithSender = notifs.map(notif => {
      const sender = profiles.find(p => p.id === notif.sender_id);
      const notifReads = reads.filter(read => read.notification_id === notif.id);
      return {
        ...notif, // pastikan notif sudah mengandung attachment_url & attachment_name
        sender_name: sender ? sender.full_name : 'Unknown',
        read_by: notifReads.map(read => read.user_id)
      };
    });

    setNotifications(notificationsWithSender);
  };

  const markNotificationAsRead = async (notificationId: string) => {
    if (!user) {
      console.error("Cannot mark as read: No user data available");
      return;
    }

    try {
      const { data: notifCheck } = await supabase
        .from('notifications')
        .select('id')
        .eq('id', notificationId)
        .single();

      if (!notifCheck) {
        console.error('Notification not found:', notificationId);
        return;
      }

      const { error: readError } = await supabase
        .from('notification_reads')
        .insert({
          notification_id: notificationId,
          user_id: user.id
        });

      if (readError && readError.code !== '23505') {
        console.error('Error marking notification as read:', readError);
        toast.error('Failed to mark notification as read');
        return;
      }

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, read_by: [...(n.read_by || []), user.id] }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error in markNotificationAsRead:', error);
      toast.error('An error occurred');
    }
  };

  const markAllAsRead = async () => {
    if (!user) {
      console.error("Cannot mark all as read: No user data available");
      return;
    }

    try {
      const unreadNotifications = notifications.filter(n => !n.read_by.includes(user.id));
      
      if (unreadNotifications.length === 0) {
        console.log("No unread notifications to mark");
        return;
      }
      
      const readRecords = unreadNotifications.map(notification => ({
        notification_id: notification.id,
        user_id: user.id
      }));

      const { error } = await supabase
        .from('notification_reads')
        .insert(readRecords);

      if (error && error.code !== '23505') {
        console.error('Error marking all as read:', error);
        toast.error('Failed to mark all as read');
        return;
      }

      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          read_by: n.read_by.includes(user.id) ? n.read_by : [...n.read_by, user.id]
        }))
      );
      
      setUnreadCount(0);
      toast.success('All notifications marked as read');

    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      toast.error('An error occurred');
    }
  };

  const handleShowFullMessage = (notif: Notification) => {
    setSelectedNotification(notif);
    setShowFullMessage(true);
  };

  const handleCloseFullMessage = () => {
    setShowFullMessage(false);
    setSelectedNotification(null);
  };

  return (
    <div className="h-16 bg-white border-b flex items-center justify-between px-6 w-full max-w-fit-content">
      <div className="group">
        <a href="https://i.pinimg.com/736x/f4/7d/1a/f47d1a20470813af55020d51c4f5159a.jpg" target="_blank" rel="noopener noreferrer"> 
          <div className="text-xl text-gray-600 group-hover:animate-bounce cursor-pointer">
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
                {notifications.filter(n => !n.read_by.includes(user?.id || '')).length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No notifications
                  </div>
                ) : (
                  notifications
                    .filter(n => !n.read_by.includes(user?.id || ''))
                    .map((notification) => (
                      <div
                        key={notification.id}
                        className="p-4 border-b hover:bg-gray-50 bg-blue-50"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium">{notification.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message.length > 80
                                ? `${notification.message.slice(0, 80)}...`
                                : notification.message}
                            </p>
                            {notification.message.length > 80 && (
                              <button
                                onClick={() => handleShowFullMessage(notification)}
                                className="text-xs text-indigo-600 hover:underline mt-1"
                              >
                                See full message
                              </button>
                            )}
                            {notification.attachment_url && (
                              <a
                                href={notification.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-indigo-600 hover:text-indigo-800 mt-2 inline-block"
                              >

                              </a>
                            )}
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              Sent by: {notification.sender_name}
                            </p>
                          </div>
                          <button
                            onClick={() => markNotificationAsRead(notification.id)}
                            className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-800 ml-4"
                          >
                            Mark as read
                          </button>
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

      {showFullMessage && selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
            <button
              onClick={handleCloseFullMessage}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
            <h4 className="font-semibold text-lg mb-2">{selectedNotification.title}</h4>
            <div className="overflow-y-auto max-h-[400px]">
              <p className="text-sm text-gray-700 whitespace-pre-line">{selectedNotification.message}</p>
              {selectedNotification.attachment_url && (
                <a
                  href={selectedNotification.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-4 text-indigo-600 hover:underline"
                >
                  {selectedNotification.attachment_name || 'View attachment'}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Navbar;