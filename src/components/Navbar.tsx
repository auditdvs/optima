import { LogOut, Settings, User, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import dvs1Icon from '../assets/dvs-1.png';
import dvs2Icon from '../assets/dvs-2.png';
import magnifyingIcon from '../assets/magnifying-glass.svg';
import managerIcon from '../assets/manager.png';
import qaIcon from '../assets/qa.png';
import strategyIcon from '../assets/strategy.svg';
import userListIcon from '../assets/user-list.svg';
import { Button } from "../components/ui/button";
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import '../styles/bell.css';
import '../styles/hamburger-menu.css';
import '../styles/loaders.css';
import '../styles/pic.css';
import AccountSettings from './AccountSettings';
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
  const { signOut, user, userRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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

  const [accountData, setAccountData] = useState<any>(null);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

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

  // Update the fetchAccountData function
  const fetchAccountData = async () => {
    if (!user) return;

    try {
      console.log("Trying to fetch account data for user:", user.id);
      
      // Create default data that always works
      const userInitials = (fullName || user.email?.split('@')[0] || 'U').charAt(0).toUpperCase();
      
      // Default data without using email
      const defaultData = {
        full_name: fullName || 'User',
        nickname: 'Add your nickname',
        role: userRole || 'user',
        profile_pic: 'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics//default.jfif'
      };
      
      // Set default data first so UI is never empty
      setAccountData(defaultData);
      
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profileError) {
        console.error('Error fetching profile data:', profileError);
        return;
      }
      
      // Combine data from profile
      if (profileData) {
        console.log("PROFILE DATA:", JSON.stringify(profileData, null, 2));
        console.log("PROFILE PIC URL TYPE:", typeof profileData.profile_pic);
        console.log("PROFILE PIC URL VALUE:", profileData.profile_pic);
        
        // Ensure the URL is properly formatted
        const formattedPicUrl = profileData.profile_pic && profileData.profile_pic.trim();
        console.log("FORMATTED URL:", formattedPicUrl);
        
        // Get profile_pic from the "account" table instead
        let { data: accountData, error: accountError } = await supabase
          .from('account')
          .select('*')
          .eq('id', user.id)  // Try the id column first
          .single();
          
        // If that doesn't work, try this alternative approach:
        if (!accountData || accountError) {
          const { data: altAccountData, error: altAccountError } = await supabase
            .from('account')
            .select('*')
            .eq('user_id', user.id)  // Try the user_id column
            .single();
            
          if (altAccountData) {
            console.log("Found account data via user_id:", altAccountData);
            // Use this data instead
            accountData = altAccountData;
            accountError = null;
          }
        }
        
        let profilePicUrl = defaultData.profile_pic;
        
        // Use account table's profile_pic if available
        if (accountData && accountData.profile_pic) {
          profilePicUrl = accountData.profile_pic;
          console.log("Using account table profile pic:", profilePicUrl);
        }
        
        setAccountData({
          ...defaultData,
          full_name: accountData?.full_name || profileData.full_name || defaultData.full_name,
          profile_pic: profilePicUrl,
          role: accountData?.role || userRole || 'user',
          nickname: accountData?.nickname || defaultData.nickname
        });
      }
    } catch (error) {
      console.error('Error fetching account data:', error);
      // Error handling is already done with default data
    }
  };

  // Fetch account data on component mount
  useEffect(() => {
    if (user) {
      fetchAccountData();
    }
  }, [user]);

  // Handle clicks outside account dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setShowAccountDropdown(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getPublicImageUrl = (url: string) => {
    if (!url) return '';
    
    console.log('Original profile_pic URL:', url); // Add this for debugging
    
    // Simplify the approach - direct return for testing
    return url;
  };

  const handleAccountSettingsClick = () => {
    // Close the dropdown
    setShowAccountDropdown(false);
    
    // Navigate to the account settings page instead of showing modal
    navigate('/account-settings');
  };

  return (
    <div className="h-16 bg-white border-b flex items-center justify-between px-6 w-full max-w-fit-content">
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
            {/* My Account Menu Item */}
            <div className="menu-list" onClick={() => setShowAccountDropdown(!showAccountDropdown)}>
              <div className="flex items-center">
                <User className="w-4 h-4 mr-2 text-indigo-600" />
                <span>My Account</span>
              </div>
            </div>
            
            {/* Audit Rating Menu Item */}
            <div className="menu-list" onClick={() => setShowAuditRating(true)}>
              <div className="flex items-center">
                <img src={strategyIcon} alt="Audit Rating" className="w-5 h-5 mr-2" />
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
                <img src={magnifyingIcon} alt="RCM" className="w-5 h-5 mr-2" />
                <span>RCM</span>
              </div>
            </div>
            
            {/* PIC List Menu Item */}
            <div className="menu-list" onClick={handleShowPICList}>
              <div className="flex items-center">
                <img src={userListIcon} alt="PIC List" className="w-5 h-5 mr-2" />
                <span>PIC List</span>
              </div>
            </div>
            
            {/* Notifications Menu Item */}
            <div className="menu-list" onClick={() => {
              // Close the hamburger menu
              const checkbox = document.querySelector('.event-wrapper-inp') as HTMLInputElement;
              if (checkbox) checkbox.checked = false;
              
              // Show notifications panel
              setShowNotifications(true);
              setHasNewNotification(false);
            }}>
              <div className="flex items-center">
              {/* Ubah ukuran bell di sini: tambahkan w-5 h-5 (atau ukuran lain) */}
              <div className="bell-container mr-4 w-8 h-8">
                <div className="bell !border-indigo-600 !before:bg-indigo-600 !after:bg-indigo-600 w-5 h-5"></div>
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
                <LogOut className="w-4 h-4 mr-2 text-indigo-600" />
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
      <div className="hidden lg:flex items-center space-x-8 ml-auto">
        {/* Audit Rating */}
        <button
          onClick={() => setShowAuditRating(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-700 transition-all duration-200 relative group"
          title="Audit Rating"
        >
          <span className="absolute inset-0 rounded-lg border border-indigo-200 opacity-0 group-hover:opacity-100 group-hover:shadow-md transition-all duration-200 pointer-events-none"></span>
          <img src={strategyIcon} alt="Audit Rating" className="h-5 w-5 mr-2 z-10" />
          <span className="text-sm font-medium z-10">Audit Rating</span>
        </button>

        {/* RCM */}
        <button
          onClick={() => {
            setShowRCMSearch(true);
            setTimeout(() => rcmInputRef.current?.focus(), 100);
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-700 transition-all duration-200 relative group"
          title="RCM"
        >
          <span className="absolute inset-0 rounded-lg border border-indigo-200 opacity-0 group-hover:opacity-100 group-hover:shadow-md transition-all duration-200 pointer-events-none"></span>
          <img src={magnifyingIcon} alt="RCM" className="h-5 w-5 mr-2 z-10" />
          <span className="text-sm font-medium z-10">RCM</span>
        </button>

        {/* PIC List */}
        <button
          onClick={handleShowPICList}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-700 transition-all duration-200 relative group"
          title="PIC List"
        >
          <span className="absolute inset-0 rounded-lg border border-indigo-200 opacity-0 group-hover:opacity-100 group-hover:shadow-md transition-all duration-200 pointer-events-none"></span>
          <img src={userListIcon} alt="PIC List" className="h-5 w-5 mr-2 z-10" />
          <span className="text-sm font-medium z-10">PIC List</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setHasNewNotification(false);
            }}
            className="relative flex items-center gap-2 px-1 py-1.5 rounded hover:bg-gray-100 text-gray-700 hover:text-indigo-700 transition"
            title="Notifications"
          >
            {/* Bell Icon (Heroicons) */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full h-3 w-3 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {/* Desktop Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg z-50 border border-gray-100 max-h-[70vh] overflow-y-auto">
              <div className="flex justify-between items-center px-4 py-3 border-b">
                <span className="font-semibold">Notifications</span>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div>
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No notifications</div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b hover:bg-gray-50 ${!notification.read_by.includes(user?.id) ? 'bg-blue-50' : ''}`}
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
                              {notification.attachment_name || 'View attachment'}
                            </a>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Sent by: {notification.sender_name}
                          </p>
                        </div>
                        {!notification.read_by.includes(user?.id) && (
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
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="w-full py-2 text-indigo-600 hover:text-indigo-800 text-sm border-t"
                >
                  Mark all as read
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile/Tablet Notification Panel - keep existing code */}
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

      {/* Profile Button - New Component replacing Logout */}
      <div className="relative ml-4" ref={accountDropdownRef}>
        <button
          onClick={() => setShowAccountDropdown(!showAccountDropdown)}
          className="flex items-center space-x-2 focus:outline-none"
        >
          {/* Profile Picture */}
          <div className="ml-2 w-8 h-8 rounded-full overflow-hidden ring-2 ring-indigo-500 flex items-center justify-center bg-indigo-100">
            <img 
              src={accountData?.profile_pic}
              alt={accountData?.full_name || 'Profile'} 
              className="w-full h-full object-cover"
              onLoad={() => console.log('Profile image loaded successfully:', accountData?.profile_pic)}
              onError={(e) => {
                console.error('Profile image failed to load:', e.currentTarget.src);
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics//default.jfif';
              }}
            />
          </div>
          
          {/* Tetap tampilkan nickname di navbar */}
          <span className="text-sm font-medium text-gray-700 hidden md:block">
            {accountData?.nickname || 'Account'}
          </span>
        </button>
        
        {/* Account Dropdown */}
        {showAccountDropdown && (
          <div className="absolute right-0 mt-2 w-60 bg-white rounded-lg shadow-lg z-50 py-2 border border-gray-100">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center">
                {/* Profile Picture */}
                <div className="w-10 h-10 rounded-full overflow-hidden mr-3 ring-2 ring-indigo-100 flex items-center justify-center bg-indigo-50">
                  <img 
                    src={accountData?.profile_pic || 'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics//default.jfif'}
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onLoad={() => console.log('Dropdown profile image loaded successfully')}
                    onError={(e) => {
                      console.log('Dropdown profile image failed, using fallback');
                      e.currentTarget.onerror = null; 
                      e.currentTarget.src = 'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics//default.jfif';
                    }}
                  />
                </div>
                
                {/* User Info */}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {accountData?.full_name || fullName || 'User'}
                  </p>
                  <p className="text-xs font-medium text-indigo-600 capitalize">
                    {accountData?.role || userRole || 'User'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Account Options */}
            <div className="py-1">
              <button
                onClick={handleAccountSettingsClick}
                className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </button>
              
              <button
                onClick={() => {
                  setShowAccountDropdown(false);
                  signOut();
                }}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left flex items-center"
              >
                <LogOut className="w-4 h-4 mr-2 text-red-500" />
                Logout
              </button>
            </div>
          </div>
        )}
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
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h4 className="font-semibold text-lg">Search Matriks</h4>
              <Button
                onClick={() => setShowRCMSearch(false)}
                variant="ghost"
                size="sm"
                className="p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Search Form */}
            <div className="px-6 py-4 border-b">
              <form 
                onSubmit={handleRCMSearch} 
                className={`relative flex items-center w-full max-w-lg mx-auto h-[40px] px-3 bg-gray-50 rounded-[120px] transition-all duration-500 focus-within:rounded-[1px] group ${rcmQuery ? 'has-text' : ''}`}
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
            </div>

            {/* Results Container */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto px-6 py-4">
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
                  <div className="text-gray-500 text-center py-8">
                    {rcmQuery ? 'Tidak ada hasil ditemukan' : 'Masukkan kata kunci untuk mencari data matriks'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rcmResults.map((row, idx) => (
                      <div key={row.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="font-semibold text-gray-900 mb-2">{row.judul_temuan}</div>
                        <div className="flex items-center gap-2 text-xs mb-2">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">{row.kc_kr_kp}</span>
                          <span
                            className={`px-2 py-1 rounded font-medium ${
                              row.kategori?.toLowerCase() === "major"
                                ? "bg-red-100 text-red-700"
                                : row.kategori?.toLowerCase() === "moderate"
                                ? "bg-yellow-100 text-yellow-700"
                                : row.kategori?.toLowerCase() === "minor"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {row.kategori}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Kode:</span> {row.kode_risk_issue}
                        </div>
                        <div className="text-sm text-gray-800 mb-2">{row.judul_risk_issue}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Penyebab:</span>
                            <p className="text-gray-600 mt-1">{row.penyebab}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Dampak:</span>
                            <p className="text-gray-600 mt-1">{row.dampak}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Kelemahan:</span>
                            <p className="text-gray-600 mt-1">{row.kelemahan}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Rekomendasi:</span>
                            <p className="text-gray-600 mt-1">{row.rekomendasi}</p>
                          </div>
                        </div>
                        {(row.poin || row.jatuh_tempo) && (
                          <div className="flex gap-4 mt-3 pt-3 border-t border-gray-200">
                            {row.poin && (
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">Poin:</span>
                                <span className="text-gray-600 ml-1">{row.poin}</span>
                              </div>
                            )}
                            {row.jatuh_tempo && (
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">Jatuh Tempo:</span>
                                <span className="text-gray-600 ml-1">{row.jatuh_tempo}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAuditRating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative overflow-hidden">
            {/* Background accents - posisi yang lebih baik */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50 rounded-full opacity-60 transform translate-x-1/4 -translate-y-1/4"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-50 rounded-full opacity-60 transform -translate-x-1/4 translate-y-1/4"></div>
            
            <Button
              onClick={() => setShowAuditRating(false)}
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 p-1 z-10"
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
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full p-8 relative">
            <Button
              onClick={() => setShowPICList(false)}
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 p-1"
            >
              <X className="h-5 w-5" />
            </Button>
            <h4 className="font-semibold text-2xl mb-6 text-indigo-900 text-center">PIC List</h4>
            {picLoading ? (
              <div className="flex justify-center items-center py-10">
                <div id="wifi-loader">{/* Loader content */}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {picList.length === 0 ? (
                  <div className="col-span-full text-center text-gray-500">No PIC data available</div>
                ) : (
                  picList.map((pic) => {
                    let iconSrc;
                    if (pic.nama === "Ganjar Raharja") {
                      iconSrc = dvs1Icon;
                    } else if (pic.nama === "Dede Yudha N") {
                      iconSrc = dvs2Icon;
                    } else if (pic.posisi === "QA" || pic.posisi?.includes("QA")) {
                      iconSrc = qaIcon;
                    } else if (pic.nama === "M Afan") {
                      iconSrc = managerIcon;
                    } else {
                      iconSrc = pic.posisi === "Manager" ? managerIcon : qaIcon;
                    }

                    // Status badge color
                    let statusColor = "bg-gray-300 text-gray-700";
                    if (pic.status?.toLowerCase() === "aktif" || pic.status?.toLowerCase() === "active") {
                      statusColor = "bg-green-100 text-green-700";
                    } else if (pic.status?.toLowerCase() === "nonaktif" || pic.status?.toLowerCase() === "inactive") {
                      statusColor = "bg-red-100 text-red-700";
                    }

                    return (
                      <div key={pic.id} className="bg-white border rounded-lg p-5 flex flex-col items-center shadow-sm">
                        <img
                          src={iconSrc}
                          alt={pic.posisi}
                          className="w-16 h-16 object-contain mb-3 rounded-full border border-indigo-100 bg-white"
                        />
                        <div className="font-semibold text-gray-900 text-center">{pic.nama || '-'}</div>
                        {/* Status badge */}
                        {pic.status && (
                          <span className={`mt-1 mb-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                            {pic.status}
                          </span>
                        )}
                        <div className="text-sm text-indigo-600 mb-1 text-center">{pic.posisi || '-'}</div>
                        <div className="text-xs text-gray-500 text-center">{pic.pic_area || '-'}</div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <AccountSettings 
        isOpen={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
        onAccountUpdate={fetchAccountData} // This will refresh navbar data when account is updated
      />
    </div>
  );
}

export default Navbar;