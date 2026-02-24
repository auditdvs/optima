import { Bell, Menu, Paintbrush, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import magnifyingIcon from '../../assets/magnifying-glass.svg';
import strategyIcon from '../../assets/strategy.svg';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardCache } from '../../contexts/DashboardCacheContext';
import { useMapCache } from '../../contexts/MapCacheContext';
import { supabase } from '../../lib/supabaseClient';
import '../../styles/bell.css';
import '../../styles/loaders.css';
import { Button } from "../ui/button";
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

interface NavbarProps {
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

function Navbar({ isSidebarCollapsed, onToggleSidebar }: NavbarProps) {
  const { signOut, user, userRole } = useAuth();
  const navigate = useNavigate();
  const dashboardCache = useDashboardCache();
  const mapCache = useMapCache();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [showFullMessage, setShowFullMessage] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  
  // Attachment Preview State
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<{url: string; name: string; type: 'pdf' | 'image' | 'other'} | null>(null);

  const [showRCMSearch, setShowRCMSearch] = useState(false);
  const [rcmQuery, setRcmQuery] = useState('');
  const [rcmResults, setRcmResults] = useState<any[]>([]);
  const [rcmLoading, setRcmLoading] = useState(false);
  const rcmInputRef = useRef<HTMLInputElement>(null);

  const [showAuditRating, setShowAuditRating] = useState(false);



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
      .order('created_at', { ascending: false });

    const { data: reads } = await supabase
      .from('notification_reads')
      .select('notification_id, user_id');

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name');

    if (notifs && reads && profiles) {
      const notificationsWithSender = notifs.map(notif => {
        const sender = profiles.find(p => p.id === notif.sender_id);
        const notifReads = reads.filter(read => read.notification_id === notif.id);
        return {
          ...notif,
          sender_name: sender ? sender.full_name : 'Unknown',
          read_by: notifReads.map(read => read.user_id)
        };
      });

      setNotifications(notificationsWithSender);
    }
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

  const renderMessageWithLinks = (message: string) => {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const parts = message.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a 
            key={index} 
            href={part.startsWith('www.') ? `http://${part}` : part} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-1.5 px-4 py-1.5 mx-1 my-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Click Here
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Helper to detect file type from URL or filename
  const getFileType = (url: string, name?: string): 'pdf' | 'image' | 'other' => {
    const fileName = name?.toLowerCase() || url.toLowerCase();
    if (fileName.endsWith('.pdf')) return 'pdf';
    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName)) return 'image';
    return 'other';
  };

  // Handle attachment click
  const handleAttachmentClick = (url: string, name?: string) => {
    const fileType = getFileType(url, name);
    
    if (fileType === 'other') {
      // For other files, open in new tab
      window.open(url, '_blank');
    } else {
      // For PDF and images, show preview modal
      setPreviewAttachment({ url, name: name || 'Attachment', type: fileType });
      setShowAttachmentPreview(true);
    }
  };

  const handleRCMSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setRcmLoading(true);
    setRcmResults([]);
    
    try {
      const { data, error } = await supabase
        .from('matriks')
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
      
      const minLoadTime = 2000;
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

  
  // Account settings state removed (moved to Sidebar)

  // Clear Cache function
  const handleClearCache = () => {
    dashboardCache.clearCache();
    mapCache.clearCache();
    toast.success('Cache cleared! Refreshing data...');
    
    // Refresh data after a short delay
    setTimeout(() => {
      dashboardCache.refreshDashboardData();
      mapCache.refreshMapData();
      // Reload page to ensure clean state
      // window.location.reload(); 
    }, 500);
  };

  return (
    <div className="h-16 bg-white border-b flex items-center justify-between px-6 w-full max-w-fit-content">
      {/* Sidebar Toggle & Clear Cache */}
      <div className="flex items-center gap-2 mr-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all duration-300 group relative"
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <div className="relative h-5 w-5">
            <PanelLeftOpen 
              className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-in-out ${
                isSidebarCollapsed 
                  ? 'opacity-100 rotate-0 scale-100' 
                  : 'opacity-0 -rotate-90 scale-50'
              }`} 
            />
            <PanelLeftClose 
              className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-in-out ${
                isSidebarCollapsed 
                  ? 'opacity-0 rotate-90 scale-50' 
                  : 'opacity-100 rotate-0 scale-100'
              }`} 
            />
          </div>
        </button>
        
        {/* Clear Cache Button with Custom Tooltip */}
        <div className="relative group">
          <button
            onClick={handleClearCache}
            className="p-2 rounded-md hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors flex items-center gap-2"
          >
            <Paintbrush className="h-5 w-5" />
          </button>
          
          {/* Custom Tooltip - Positioned Right to avoid overflow clipping */}
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-indigo-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50 shadow-lg">
            Clear Cache & Refresh Data
            {/* Arrow pointing left */}
            <div className="absolute right-full top-1/2 -translate-y-1/2">
              <div className="border-4 border-transparent border-r-indigo-900"></div>
            </div>
          </div>
        </div>
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

      {/* Mobile/Tablet Hamburger Menu (hidden on desktop) */}
      <div className="block lg:hidden ml-auto relative">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-indigo-600 transition-all duration-300 active:scale-95"
          aria-label="Toggle mobile menu"
        >
          <div className="relative w-6 h-6 perspective-100">
             <div className={`absolute inset-0 transition-all duration-300 ease-in-out transform origin-center ${isMobileMenuOpen ? 'rotate-90 opacity-0 scale-50' : 'rotate-0 opacity-100 scale-100'}`}>
               <Menu className="w-6 h-6" />
             </div>
             <div className={`absolute inset-0 transition-all duration-300 ease-in-out transform origin-center ${isMobileMenuOpen ? 'rotate-0 opacity-100 scale-100' : '-rotate-90 opacity-0 scale-50'}`}>
               <X className="w-6 h-6" />
             </div>
          </div>
        </button>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="absolute right-0 top-14 w-[calc(100vw-3rem)] max-w-sm bg-white rounded-2xl shadow-xl shadow-indigo-900/10 border border-gray-100 py-3 z-[60] animate-in slide-in-from-top-4 fade-in duration-300 ease-out origin-top-right ring-1 ring-black/5">
            
            {/* Audit Rating */}
            <button 
              onClick={() => {
                setShowAuditRating(true);
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center px-5 py-3.5 text-sm text-gray-700 hover:bg-indigo-50/50 hover:text-indigo-700 transition-all duration-200 group relative overflow-hidden"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mr-4 group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300 shadow-sm border border-indigo-100/50">
                <img src={strategyIcon} alt="Audit Rating" className="w-5 h-5 transition-transform duration-300" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">Audit Rating</span>
                <span className="text-xs text-gray-400 group-hover:text-indigo-500/70">View audit performance stats</span>
              </div>
            </button>

            {/* RCM Search */}
            <button 
              onClick={() => {
                setShowRCMSearch(true);
                setTimeout(() => rcmInputRef.current?.focus(), 100);
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center px-5 py-3.5 text-sm text-gray-700 hover:bg-indigo-50/50 hover:text-indigo-700 transition-all duration-200 group relative overflow-hidden"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mr-4 group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300 shadow-sm border border-indigo-100/50">
                <img src={magnifyingIcon} alt="RCM" className="w-5 h-5 transition-transform duration-300" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">RCM Search</span>
                 <span className="text-xs text-gray-400 group-hover:text-indigo-500/70">Search risk control matrix</span>
              </div>
            </button>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent my-2 mx-6"></div>

            {/* Notifications */}
            <button 
              onClick={() => {
                setShowNotifications(true);
                setHasNewNotification(false);
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center px-5 py-3.5 text-sm text-gray-700 hover:bg-indigo-50/50 hover:text-indigo-700 transition-all duration-200 group relative overflow-hidden justify-between"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mr-4 group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300 shadow-sm border border-indigo-100/50">
                  <Bell className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />
                </div>
                 <div className="flex flex-col items-start">
                  <span className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">Notifications</span>
                   <span className="text-xs text-gray-400 group-hover:text-indigo-500/70">View recent updates</span>
                </div>
              </div>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm shadow-red-200 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

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

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setHasNewNotification(false);
            }}
            className="group relative flex items-center justify-center p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Notifications"
          >
            <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-indigo-600 fill-indigo-100' : 'text-gray-500 group-hover:text-gray-700'}`} />
            
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 border-2 border-white rounded-full"></span>
            )}
          </button>

          {/* New Notification Dropdown Style */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-[450px] bg-white rounded-xl shadow-2xl z-50 border border-gray-100 overflow-hidden ring-1 ring-black/5">
              <div className="flex justify-between items-center px-5 py-4 border-b border-gray-50 bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2">
                   <h3 className="font-bold text-gray-900">Notifications</h3>
                   {unreadCount > 0 && <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount} New</span>}
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                    Mark all as read
                  </button>
                )}
              </div>
              
              <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="bg-gray-50 p-4 rounded-full mb-3">
                       <Bell className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-medium">No notifications yet</p>
                    <p className="text-sm text-gray-500 mt-1">When you get notifications, they'll show up here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {notifications.map((notification) => {
                      const isUnread = !notification.read_by.includes(user?.id || '');
                      const formattedDate = new Date(notification.created_at).toLocaleString('id-ID', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      });
                      
                      return (
                        <div
                          key={notification.id}
                          className={`
                             group relative p-4 transition-all duration-200 hover:bg-gray-50
                             ${isUnread ? 'bg-indigo-50/40 hover:bg-indigo-50/70' : 'bg-white'}
                          `}
                        >
                          <div className="flex gap-3 items-start">
                             <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${isUnread ? 'bg-indigo-600' : 'bg-transparent'}`} />
                             
                             <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-4 mb-2">
                                    <h4 className={`text-sm font-semibold truncate ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                                       {notification.title}
                                    </h4>
                                    <div className="text-right shrink-0">
                                       <p className="text-[10px] font-semibold text-gray-900 mb-0.5">{notification.sender_name || 'System'}</p>
                                       <p className="text-[10px] text-gray-400">{formattedDate}</p>
                                    </div>
                                </div>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShowFullMessage(notification);
                                    setShowNotifications(false);
                                  }}
                                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
                                >
                                   See full message
                                </button>
                             </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Button removed - moved to Sidebar */}
      
      {showFullMessage && selectedNotification && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-gray-100 bg-white flex justify-between items-center">
               <h3 className="font-bold text-2xl text-gray-900 leading-tight">
                 {selectedNotification.title}
               </h3>
               <div className="text-sm text-gray-500 text-right">
                 <span className="block font-medium text-gray-900">{selectedNotification.sender_name || 'System'}</span>
                 <span className="text-xs">
                    {new Date(selectedNotification.created_at).toLocaleString('id-ID', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    })}
                 </span>
               </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto bg-gray-50/30 flex-1">
               <div className="prose prose-blue prose-lg max-w-none text-gray-800 whitespace-pre-line leading-relaxed">
                  {renderMessageWithLinks(selectedNotification.message)}
               </div>
               
               {selectedNotification.attachment_url && (
                 <div className="mt-10 p-4 bg-white rounded-xl border border-gray-200 shadow-sm inline-block min-w-full sm:min-w-[300px]">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Attachment</p>
                    <button
                      onClick={() => handleAttachmentClick(
                        selectedNotification.attachment_url!, 
                        selectedNotification.attachment_name
                      )}
                      className="flex items-center gap-4 text-indigo-600 hover:text-indigo-700 transition-colors group cursor-pointer"
                    >
                      <div className="p-3 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors text-indigo-600">
                        {getFileType(selectedNotification.attachment_url, selectedNotification.attachment_name) === 'pdf' ? (
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        ) : getFileType(selectedNotification.attachment_url, selectedNotification.attachment_name) === 'image' ? (
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                        )}
                      </div>
                      <div className="text-left">
                        <span className="font-semibold text-lg block group-hover:underline decoration-indigo-300 underline-offset-4">
                           {selectedNotification.attachment_name || 'View Attachment'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {getFileType(selectedNotification.attachment_url, selectedNotification.attachment_name) === 'pdf' 
                            ? 'Click to preview PDF' 
                            : getFileType(selectedNotification.attachment_url, selectedNotification.attachment_name) === 'image'
                            ? 'Click to view image'
                            : 'Click to download'
                          }
                        </span>
                      </div>
                    </button>
                 </div>
               )}
            </div>

            {/* Modal Footer with Done Button */}
             <div className="px-8 py-6 bg-white border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => {
                      if (!selectedNotification.read_by.includes(user?.id || '')) {
                         markNotificationAsRead(selectedNotification.id);
                      }
                      handleCloseFullMessage();
                  }}
                  className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transform active:scale-95 duration-100"
                >
                   Done
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {showAttachmentPreview && previewAttachment && (
        <div 
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setShowAttachmentPreview(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  {previewAttachment.type === 'pdf' ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{previewAttachment.name}</h3>
                  <p className="text-xs text-gray-500">
                    {previewAttachment.type === 'pdf' ? 'PDF Document' : 'Image Preview'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewAttachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in New Tab
                </a>
                <button
                  onClick={() => setShowAttachmentPreview(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden bg-gray-100 flex items-center justify-center p-4">
              {previewAttachment.type === 'pdf' ? (
                <iframe
                  src={previewAttachment.url}
                  className="w-full h-full min-h-[70vh] rounded-lg border border-gray-200 bg-white"
                  title="PDF Preview"
                />
              ) : (
                <div className="max-h-full max-w-full overflow-auto flex items-center justify-center">
                  <img
                    src={previewAttachment.url}
                    alt={previewAttachment.name}
                    className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showRCMSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
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
            
            <div className="px-6 py-4 border-b">
              <form 
                onSubmit={handleRCMSearch} 
                className={`relative flex items-center w-full max-w-lg mx-auto h-[40px] px-3 bg-gray-50 rounded-[120px] transition-all duration-500 focus-within:rounded-[1px] group ${rcmQuery ? 'has-text' : ''}`}
              >
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

                <button 
                  type="button"
                  onClick={() => setRcmQuery('')}
                  className={`opacity-0 invisible transition-opacity duration-200 ${rcmQuery ? 'opacity-100 visible' : ''}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-[17px] h-[17px] mt-[3px] text-gray-400 hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>

                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-indigo-500 scale-x-0 origin-center transition-transform duration-300 group-focus-within:scale-x-100 rounded-sm"></span>
              </form>
            </div>

            <div className="flex-1">
              <div className="overflow-y-auto px-6 py-4 max-h-[60vh]">
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
                    {rcmQuery ? 'Tidak ada hasil ditemukan' : 'Masukkan kata kunci untuk mencari data matriks (Sumber: RCM 2025)'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rcmResults.map((row) => (
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


    </div>
  );
}

export default Navbar;