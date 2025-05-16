import { AlignStartVertical, Bell, ChartNoAxesColumn, LogOut, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import '../styles/loaders.css';
import AuditRatingCalculator from './AuditRatingCalculator';

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

  const [showRCMSearch, setShowRCMSearch] = useState(false);
  const [rcmQuery, setRcmQuery] = useState('');
  const [rcmResults, setRcmResults] = useState<any[]>([]);
  const [rcmLoading, setRcmLoading] = useState(false);
  const rcmInputRef = useRef<HTMLInputElement>(null);

  const [showAuditRating, setShowAuditRating] = useState(false);

  console.log("Navbar user:", user);

  useEffect(() => {
    async function fetchUserProfile() {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();

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
        .maybeSingle();

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

  const handleRCMSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setRcmLoading(true);
    setRcmResults([]);
    
    try {
      // Get search results from Supabase
      const { data, error } = await supabase
        .from('matriks')
        .select('*')
        .or([
          `judul_temuan.ilike.%${rcmQuery}%`,
          `kode_risk_issue.ilike.%${rcmQuery}%`,
          `judul_risk_issue.ilike.%${rcmQuery}%`,
          `penyebab.ilike.%${rcmQuery}%`,
          `dampak.ilike.%${rcmQuery}%`,
          `kelemahan.ilike.%${rcmQuery}%`,
          `rekomendasi.ilike.%${rcmQuery}%`,
          `branch_name.ilike.%${rcmQuery}%`
        ].join(','));
        
      if (error) toast.error('Search failed');
      
      // Add a minimum 2-second delay for loader to be visible
      const minLoadTime = 2000; // 2 seconds
      const startTime = Date.now();
      const elapsedTime = Date.now() - startTime;
      
      if (elapsedTime < minLoadTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadTime - elapsedTime));
      }
      
      setRcmResults(data || []);
    } finally {
      setRcmLoading(false);
    }
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
        <button
          type="button"
          onClick={() => setShowAuditRating(true)}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <AlignStartVertical className="w-5 h-5 mr-2" />
          <span>Audit Rating</span>
        </button>

        {/* RCM */}
        <button
          type="button"
          onClick={() => {
            setShowRCMSearch(true);
            setTimeout(() => rcmInputRef.current?.focus(), 100);
          }}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ChartNoAxesColumn className="w-5 h-5 mr-2" />
          <span>RCM</span>
        </button>

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

      {showRCMSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
            <button
              onClick={() => setShowRCMSearch(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
            <h4 className="font-semibold text-lg mb-4">Search Matriks</h4>
            <form onSubmit={handleRCMSearch} className="mb-4">
              <div className="relative">
                <input
                  ref={rcmInputRef}
                  type="search"
                  value={rcmQuery}
                  onChange={e => setRcmQuery(e.target.value)}
                  className="input shadow-lg focus:border-2 border-gray-300 px-5 py-3 rounded-xl w-full md:w-96 transition-all focus:w-full md:focus:w-[28rem] outline-none"
                  placeholder="Search..."
                  name="search"
                />
                <button
                  type="submit"
                  className="absolute top-3 right-3 text-gray-500"
                  disabled={rcmLoading}
                >
                  {rcmLoading ? (
                    <span className="sr-only">Loading...</span>
                  ) : (
                    <svg
                      className="size-6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      ></path>
                    </svg>
                  )}
                </button>
              </div>
            </form>
            <div className="max-h-96 overflow-y-auto">
              {rcmLoading ? (
                <div className="flex justify-center items-center py-10">
                  <div id="wifi-loader">
                    <svg className="circle-outer" viewBox="0 0 86 86">
                      <circle className="back" cx="43" cy="43" r="40"></circle>
                      <circle className="front" cx="43" cy="43" r="40"></circle>
                      <circle className="new" cx="43" cy="43" r="40"></circle>
                    </svg>
                    <svg className="circle-middle" viewBox="0 0 60 60">
                      <circle className="back" cx="30" cy="30" r="27"></circle>
                      <circle className="front" cx="30" cy="30" r="27"></circle>
                    </svg>
                    <svg className="circle-inner" viewBox="0 0 34 34">
                      <circle className="back" cx="17" cy="17" r="14"></circle>
                      <circle className="front" cx="17" cy="17" r="14"></circle>
                    </svg>
                    <div className="text" data-text="Searching"></div>
                  </div>
                </div>
              ) : rcmResults.length === 0 ? (
                <div className="text-gray-500 text-center">Tidak ada hasil</div>
              ) : (
                rcmResults.map((row, idx) => (
                  <div key={row.id} className="border-b py-2 px-1">
                    <div className="font-semibold">{row.judul_temuan}</div>
                    <div className="text-xs text-gray-500 mb-1">
                      {row.branch_name} | {row.jatuh_tempo}
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      <span className="font-semibold">Kode Risk Issue:</span> {row.kode_risk_issue}
                    </div>
                    <div className="text-sm">{row.rekomendasi}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showAuditRating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
            <button
              onClick={() => setShowAuditRating(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
            <AuditRatingCalculator />
          </div>
        </div>
      )}
    </div>
  );
}

export default Navbar;