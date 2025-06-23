import { Button } from "@/components/ui/button";
import { AlignStartVertical, ChartNoAxesColumn, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import dvs1Icon from '../assets/dvs-1.png';
import dvs2Icon from '../assets/dvs-2.png';
import managerIcon from '../assets/manager.png';
import qaIcon from '../assets/qa.png';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import '../styles/bell.css';
import '../styles/hamburger-menu.css';
import '../styles/loaders.css';
import '../styles/pic.css';
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
  const [showPICList, setShowPICList] = useState(false);
  const [picList, setPicList] = useState<any[]>([]);
  const [picLoading, setPicLoading] = useState(false);

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
      // Use existing 'matriks' table with updated search fields
      const { data, error } = await supabase
        .from('matriks') // Using existing 'matriks' table
        .select('*')
        .or([
          `judul_temuan.ilike.%${rcmQuery}%`,
          `kode_risk_issue.ilike.%${rcmQuery}%`,
          `judul_risk_issue.ilike.%${rcmQuery}%`,
          `kategori.ilike.%${rcmQuery}%`,
          `penyebab.ilike.%${rcmQuery}%`,
          `dampak.ilike.%${rcmQuery}%`,
          `rekomendasi.ilike.%${rcmQuery}%`,
          `kc_kr_kp.ilike.%${rcmQuery}%`,
          `kelemahan.ilike.%${rcmQuery}%`,
          `perbaikan_temuan.ilike.%${rcmQuery}%`
        ].join(','));
        
      if (error) {
        console.error('Search error:', error);
        toast.error('Search failed');
        return;
      }
      
      // Add a minimum 2-second delay for loader to be visible
      const minLoadTime = 2000; // 2 seconds
      const startTime = Date.now();
      const elapsedTime = Date.now() - startTime;
      
      if (elapsedTime < minLoadTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadTime - elapsedTime));
      }
      
      setRcmResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
    } finally {
      setRcmLoading(false);
    }
  };

  // Add this function to fetch PIC data
  const fetchPICList = async () => {
    setPicLoading(true);
    try {
      const { data, error } = await supabase
        .from('pic')
        .select('*');
        
      if (error) throw error;
      
      if (data) {
        setPicList(data);
      }
    } catch (error) {
      console.error('Error fetching PIC list:', error);
      toast.error('Failed to load PIC list');
    } finally {
      setPicLoading(false);
    }
  };

  const handleShowPICList = () => {
    setShowPICList(true);
    fetchPICList();
  };

  return (
    <div className="h-16 bg-white border-b flex items-center justify-between px-6 w-full max-w-fit-content">
      {/* Only show greeting on desktop (lg screens and up) */}
      <div className="group hidden lg:block">
        <a href="https://i.pinimg.com/736x/f4/7d/1a/f47d1a20470813af55020d51c4f5159a.jpg" target="_blank" rel="noopener noreferrer"> 
          <div className="text-xl text-gray-600 group-hover:animate-bounce cursor-pointer">
            Hello, {fullName}. Have a great day!
          </div>
        </a>
      </div>

      {/* Mobile/Tablet Hamburger Menu (hidden on desktop) */}
      <div className="block lg:hidden w-full flex justify-end">
        <label className="event-wrapper">
          <input type="checkbox" className="event-wrapper-inp" />
          <div className="bar">
            <span className="top bar-list"></span>
            <span className="middle bar-list"></span>
            <span className="bottom bar-list"></span>
          </div>
          <section className="menu-container">
            {/* Audit Rating Menu Item */}
            <div className="menu-list" onClick={() => setShowAuditRating(true)}>
              <div className="flex items-center">
                <AlignStartVertical className="w-4 h-4 mr-2 text-indigo-600" />
                <span>Audit Rating</span>
              </div>
            </div>
            
            {/* RCM Menu Item */}
            <div 
              className="menu-list" 
              onClick={() => {
                setShowRCMSearch(true);
                setTimeout(() => rcmInputRef.current?.focus(), 100);
              }}
            >
              <div className="flex items-center">
                <ChartNoAxesColumn className="w-4 h-4 mr-2 text-indigo-600" />
                <span>RCM</span>
              </div>
            </div>
            
            {/* PIC List Menu Item */}
            <div className="menu-list" onClick={handleShowPICList}>
              <div className="flex items-center">
                <Users className="w-2 h-2 mr-2 text-indigo-600" />
                <span>PIC List</span>
              </div>
            </div>
            
            {/* Notifications Menu Item */}
            <div 
              className="menu-list" 
              onClick={() => {
                // Close the hamburger menu
                const checkbox = document.querySelector('.event-wrapper-inp') as HTMLInputElement;
                if (checkbox) checkbox.checked = true;
                
                // Show notifications panel
                setShowNotifications(true);
                setHasNewNotification(false);
              }}
            >
              <div className="flex items-center">
                <div className="bell-container mr-2">
                  <div className="bell !border-indigo-600 !before:bg-indigo-600 !after:bg-indigo-600"></div>
                </div>
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>
            
            {/* Logout Menu Item */}
            <div className="menu-list" onClick={signOut}>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-indigo-600" viewBox="0 0 512 512" fill="currentColor">
                  <path 
                    d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"
                  />
                </svg>
                <span>Logout</span>
              </div>
            </div>
          </section>
        </label>
      </div>

      {/* Mobile/Tablet Notification Panel */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="bg-black bg-opacity-40 absolute inset-0" onClick={() => setShowNotifications(false)}></div>
          <div className="absolute top-16 right-0 w-full sm:w-96 max-h-[80vh] bg-white rounded-b-lg shadow-lg overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
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
                <Button
                  onClick={() => setShowNotifications(false)}
                  variant="ghost"
                  size="sm"
                  className="p-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="max-h-[calc(80vh-4rem)] overflow-y-auto">
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
                      {/* Same notification content as in the desktop view */}
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
        </div>
      )}

      {/* Desktop Buttons (hidden on mobile/tablet) */}
      <div className="hidden lg:flex items-center space-x-6">
        {/* Audit Rating */}
        <button
          onClick={() => setShowAuditRating(true)}
          className="group overflow-hidden relative w-8 h-8 bg-indigo-500 rounded-full cursor-pointer z-10 flex items-center justify-center text-white shadow-lg hover:w-28 hover:rounded-lg transition-all duration-200 active:translate-x-1 active:translate-y-1"
        >
          <AlignStartVertical className="w-4 h-4 group-hover:opacity-0 transition-opacity absolute" />
          
          <span
            className="absolute w-36 h-32 -top-8 -left-2 bg-white rotate-12 transform scale-x-0 group-hover:scale-x-100 transition-transform group-hover:duration-500 duration-1000 origin-left"
          ></span>
          <span
            className="absolute w-36 h-32 -top-8 -left-2 bg-indigo-400 rotate-12 transform scale-x-0 group-hover:scale-x-100 transition-transform group-hover:duration-700 duration-700 origin-left"
          ></span>
          <span
            className="absolute w-36 h-32 -top-8 -left-2 bg-indigo-600 rotate-12 transform scale-x-0 group-hover:scale-x-50 transition-transform group-hover:duration-1000 duration-500 origin-left"
          ></span>
          
          <span
            className="group-hover:opacity-100 opacity-0 text-sm font-medium transition-opacity group-hover:duration-1000 duration-100 z-10"
          >
            Audit Rating
          </span>
        </button>

        {/* RCM */}
        <button
          onClick={() => {
            setShowRCMSearch(true);
            setTimeout(() => rcmInputRef.current?.focus(), 100);
          }}
          className="group relative cursor-pointer outline-none border-none rounded-full flex flex-row items-center justify-center h-8 w-8 hover:!w-[75px] transition-all duration-[0.75s] before:content-[''] before:absolute before:w-full before:h-full before:inset-0 before:bg-[linear-gradient(130deg,#4f46e5,#6366f1_33%,#818cf8)] before:ring-2 before:ring-offset-2 before:ring-indigo-500 before:rounded-full before:transition before:duration-300 before:ring-offset-[#fff] hover:before:scale-105 active:before:scale-95 text-white"
        >
          <ChartNoAxesColumn className="absolute left-2 group-hover:left-1.5 group-active:left-[7px] duration-300 transition-[left] z-10 w-4 h-4 text-white" />
          <span
            className="absolute right-1.5 text-[13px] font-semibold [--w:calc(100%-32px)] w-[--w] max-w-[--w] overflow-hidden flex items-center justify-end -z-[1] group-hover:z-[9] pointer-events-none select-none opacity-0 group-hover:opacity-100 text-transparent group-hover:text-inherit group-active:right-2 transition-all duration-[2s] group-hover:duration-300 group-active:scale-[0.85]"
          >
            RCM
          </span>
        </button>

        {/* PIC List */}
        <button
          onClick={handleShowPICList}
          className="group overflow-hidden relative w-8 h-8 bg-indigo-500 rounded-full cursor-pointer z-10 flex items-center justify-center text-white shadow-lg hover:w-28 hover:rounded-lg transition-all duration-200 active:translate-x-1 active:translate-y-1"
        >
          <Users className="w-4 h-4 group-hover:opacity-0 transition-opacity absolute" />
          
          <span
            className="absolute w-36 h-32 -top-8 -left-2 bg-white rotate-12 transform scale-x-0 group-hover:scale-x-100 transition-transform group-hover:duration-500 duration-1000 origin-left"
          ></span>
          <span
            className="absolute w-36 h-32 -top-8 -left-2 bg-indigo-400 rotate-12 transform scale-x-0 group-hover:scale-x-100 transition-transform group-hover:duration-700 duration-700 origin-left"
          ></span>
          <span
            className="absolute w-36 h-32 -top-8 -left-2 bg-indigo-600 rotate-12 transform scale-x-0 group-hover:scale-x-50 transition-transform group-hover:duration-1000 duration-500 origin-left"
          ></span>
          
          <span
            className="group-hover:opacity-100 opacity-0 text-sm font-medium transition-opacity group-hover:duration-1000 duration-100 z-10"
          >
            PIC List
          </span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setHasNewNotification(false);
            }}
            className="notification text-gray-600 hover:text-gray-900 relative"
          >
            <div className="bell-container">
              <div className="bell"></div>
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full h-3.5 w-3.5 flex items-center justify-center">
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
                  <Button
                    onClick={() => setShowNotifications(false)}
                    variant="ghost"
                    size="sm"
                    className="p-1"
                  >
                    <X className="h-4 w-4" />
                  </Button>
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
          className="group flex items-center justify-start w-8 h-8 bg-indigo-500 rounded-full cursor-pointer relative overflow-hidden transition-all duration-200 shadow-lg hover:w-24 hover:rounded-lg active:translate-x-1 active:translate-y-1"
        >
          <div
            className="flex items-center justify-center w-full transition-all duration-300 group-hover:justify-start group-hover:px-2"
          >
            <svg className="w-3 h-3" viewBox="0 0 512 512" fill="white">
              <path
                d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"
              ></path>
            </svg>
          </div>
          <div
            className="absolute right-3 transform translate-x-full opacity-0 text-white text-sm font-semibold transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
          >
            Logout
          </div>
        </button>
      </div>

      {showFullMessage && selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
            <Button
              onClick={handleCloseFullMessage}
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 p-1"
            >
              <X className="h-4 w-4" />
            </Button>
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
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full p-6 relative mx-4">
            <Button
              onClick={() => setShowRCMSearch(false)}
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 p-1"
            >
              <X className="h-4 w-4" />
            </Button>
            <h4 className="font-semibold text-lg mb-4">Search Matriks</h4>
            
            {/* Updated search form with new style */}
            <form 
              onSubmit={handleRCMSearch} 
              className={`relative flex items-center w-full max-w-lg mx-auto h-[40px] px-3 bg-gray-50 rounded-[120px] transition-all duration-500 focus-within:rounded-[1px] group mb-4 ${rcmQuery ? 'has-text' : ''}`}
            >
              {/* Search Button */}
              <button 
                type="submit" 
                className="text-[#8b8ba7] hover:text-indigo-600 transition-colors duration-200"
                disabled={rcmLoading}
              >
                {rcmLoading ? (
                  <div className="animate-spin w-[17px] h-[17px]">
                    <svg width="17" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="32" strokeDashoffset="32">
                        <animate attributeName="stroke-dasharray" dur="2s" values="0 64;32 32;0 64" repeatCount="indefinite"/>
                        <animate attributeName="stroke-dashoffset" dur="2s" values="0;-32;-64" repeatCount="indefinite"/>
                      </circle>
                    </svg>
                  </div>
                ) : (
                  <svg width="17" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="search">
                    <path d="M7.667 12.667A5.333 5.333 0 107.667 2a5.333 5.333 0 000 10.667zM14.334 14l-2.9-2.9" stroke="currentColor" strokeWidth="1.333" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                )}
              </button>

              {/* Input */}
              <input
                ref={rcmInputRef}
                type="text"
                value={rcmQuery}
                onChange={e => setRcmQuery(e.target.value)}
                required
                placeholder="Search matriks data..."
                className="flex-1 h-full px-2 py-[0.7em] text-sm bg-transparent border-none placeholder-gray-400 focus:outline-none"
                disabled={rcmLoading}
              />

              {/* Reset Button */}
              <button 
                type="button"
                onClick={() => setRcmQuery('')}
                className={`opacity-0 invisible transition-opacity duration-200 ${rcmQuery ? 'opacity-100 visible' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-[17px] h-[17px] mt-[3px] text-gray-400 hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>

              {/* Animated Border */}
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-indigo-500 scale-x-0 origin-center transition-transform duration-300 group-focus-within:scale-x-100 rounded-sm"></span>
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
                    <div className="text-xs mb-1">
                      <span className="text-blue-500">{row.kc_kr_kp}</span>
                      {" | "}
                      <span
                        className={
                          row.kategori?.toLowerCase() === "major"
                            ? "text-red-500"
                            : row.kategori?.toLowerCase() === "moderate"
                            ? "text-yellow-500"
                            : row.kategori?.toLowerCase() === "minor"
                            ? "text-green-500"
                            : ""
                        }
                      >
                        {row.kategori}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      <span className="font-semibold">Kode:</span> {row.kode_risk_issue}
                    </div>
                    <div className="text-sm text-gray-700 mb-1">{row.judul_risk_issue}</div>
                    <div className="text-xs text-gray-600 mb-1">
                      <span className="font-semibold">Penyebab:</span> {row.penyebab}
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      <span className="font-semibold">Dampak:</span> {row.dampak}
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      <span className="font-semibold">Kelemahan:</span> {row.kelemahan}
                    </div>
                    <div className="text-xs text-gray-600">
                      <span className="font-semibold">Rekomendasi:</span> {row.rekomendasi}
                    </div>
                    {row.poin && (
                      <div className="text-xs text-gray-600 mt-1">
                        <span className="font-semibold">Poin:</span> {row.poin}
                      </div>
                    )}
                    {row.jatuh_tempo && (
                      <div className="text-xs text-gray-600">
                        <span className="font-semibold">Jatuh Tempo:</span> {row.jatuh_tempo}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showAuditRating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full p-6 relative">
            <Button
              onClick={() => setShowAuditRating(false)}
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 p-1"
            >
              <X className="h-4 w-4" />
            </Button>
            <AuditRatingCalculator />
          </div>
        </div>
      )}

      {/* PIC List Modal */}
      {showPICList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="pic-list-container rounded-lg shadow-lg max-w-6xl w-full p-6 relative">
            {/* Background waves */}
            <div className="background-wave"></div>
            <div className="background-wave"></div>
            <div className="background-wave"></div>
            
            {/* Modal content */}
            <div className="pic-content">
              {/* Replace the current close button in the PIC List modal */}
              <Button
                onClick={() => setShowPICList(false)}
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 p-1"
              >
                <X className="h-4 w-4" />
              </Button>
              <h4 className="font-semibold text-lg mb-4 text-indigo-900">PIC List</h4>
              
              {picLoading ? (
                <div className="flex justify-center items-center py-10">
                  <div id="wifi-loader">
                    {/* Loader content */}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 p-4">
                  {picList.length === 0 ? (
                    <div className="col-span-full text-center text-gray-500">No PIC data available</div>
                  ) : (
                    picList.map((pic) => (
                      <div key={pic.id} className="flex justify-center">
                        <div className="e-card playing">
                          <div className="wave"></div>
                          <div className="wave"></div>
                          <div className="wave"></div>
                          
                          <div className="infotop">
                            {/* Conditional rendering based on name/position */}
                            {(() => {
                              // Determine which image to use
                              let iconSrc;
                              if (pic.nama === "Ganjar Raharja") {
                                iconSrc = dvs1Icon;
                              } else if (pic.nama === "Dede Yudha N") {
                                iconSrc = dvs2Icon;
                              } else if (pic.posisi === "QA" || pic.posisi.includes("QA")) {
                                iconSrc = qaIcon;
                              } else if (pic.nama === "M Afan") {
                                iconSrc = managerIcon;
                              } else {
                                iconSrc = pic.posisi === "Manager" ? managerIcon : qaIcon;
                              }
                              
                              return (
                                <div className="icon-container">
                                  <img src={iconSrc} alt={pic.posisi} className="icon" />
                                </div>
                              );
                            })()}
                            <br />
                            <div className="font-semibold text-white mb-4">
                              {pic.nama || 'Name'} - {pic.posisi || 'Position'}
                            </div>
                            <div className="pic-area">{pic.pic_area || 'Area'}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Navbar;