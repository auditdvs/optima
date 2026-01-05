import { ReactNode, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface LayoutProps {
  children?: ReactNode;
}

function Layout({ children }: LayoutProps) {
  // Initialize collapsed state based on screen size (collapsed by default on mobile)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => window.innerWidth < 1024);
  const [showManagerAlert, setShowManagerAlert] = useState(false);
  const [pendingLetters, setPendingLetters] = useState(0);
  const [pendingAddendums, setPendingAddendums] = useState(0);
  const [userFullName, setUserFullName] = useState('');
  
  // Support ticket notification state
  const [showSupportTicketAlert, setShowSupportTicketAlert] = useState(false);
  const [openTicketCount, setOpenTicketCount] = useState(0);
  const [highestPriority, setHighestPriority] = useState<'low' | 'medium' | 'high'>('low');
  
  // Rejection notification state
  const [rejectionNotification, setRejectionNotification] = useState<{
    id: string;
    branch_name: string;
    rejection_reason: string;
  } | null>(null);
  
  const { userRole, user } = useAuth();
  const navigate = useNavigate();

  // Auto-collapse sidebar on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check for pending approvals for manager role
  const location = useLocation();

  // Check for rejected letters for regular users
  useEffect(() => {
    // ... existing rejection check logic ...
    const checkRejectedLetters = async () => {
      if (!user) return;
      
      try {
        // Get user's full name
        if (!userFullName) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          
          if (profileData) {
            setUserFullName(profileData.full_name || 'User');
          }
        }

        // Get rejected letters for this user
        const { data: rejectedLetters } = await supabase
          .from('letter')
          .select('id, branch_name, rejection_reason')
          .eq('created_by', user.id)
          .eq('status', 'rejected')
          .not('rejection_reason', 'is', null);

        if (rejectedLetters && rejectedLetters.length > 0) {
          // Check localStorage for acknowledged rejections
          const acknowledgedKey = 'acknowledged_rejections';
          const acknowledged = JSON.parse(localStorage.getItem(acknowledgedKey) || '[]');
          
          // Find first unacknowledged rejection
          const unacknowledged = rejectedLetters.find(letter => !acknowledged.includes(letter.id));
          
          if (unacknowledged) {
            setRejectionNotification(unacknowledged);
          }
        }
      } catch (error) {
        console.error('Error checking rejected letters:', error);
      }
    };

    checkRejectedLetters();
  }, [user, userFullName]);

  // Handle acknowledging rejection
  const handleAcknowledgeRejection = () => {
    if (rejectionNotification) {
      const acknowledgedKey = 'acknowledged_rejections';
      const acknowledged = JSON.parse(localStorage.getItem(acknowledgedKey) || '[]');
      acknowledged.push(rejectionNotification.id);
      localStorage.setItem(acknowledgedKey, JSON.stringify(acknowledged));
      setRejectionNotification(null);
    }
  };

  useEffect(() => {
    const checkPendingApprovals = async () => {
      // Don't show alert if user is already on manager dashboard
      if (location.pathname === '/manager-dashboard') {
        setShowManagerAlert(false);
        return;
      }

      if (userRole !== 'manager' && userRole !== 'superadmin') return;
      
      try {
        // Get user's full name if not set
        if (!userFullName && user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          
          if (profileData) {
            setUserFullName(profileData.full_name || 'Manager');
          }
        }

        // Count pending letters
        const { count: letterCount } = await supabase
          .from('letter')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Count pending addendums
        const { count: addendumCount } = await supabase
          .from('addendum')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        const totalLetters = letterCount || 0;
        const totalAddendums = addendumCount || 0;

        setPendingLetters(totalLetters);
        setPendingAddendums(totalAddendums);

        // Only show popup if there are pending items
        if (totalLetters > 0 || totalAddendums > 0) {
          setShowManagerAlert(true);
        } else {
           setShowManagerAlert(false);
        }
      } catch (error) {
        console.error('Error checking pending approvals:', error);
      }
    };

    checkPendingApprovals();
  }, [userRole, user, location.pathname]); // Add location.pathname to dependencies

      // Check for open support tickets
  useEffect(() => {
    const checkOpenTickets = async () => {
      // Don't show alert if user is already on/navigating to support tickets page
      if (location.pathname === '/support-tickets') {
        setShowSupportTicketAlert(false);
        return;
      }

      // Check permissions (dvs, manager, superadmin)
      if (!['dvs', 'manager', 'superadmin'].includes(userRole)) return;
      
      // Check if already shown today
      const today = new Date().toDateString();
      const lastShown = localStorage.getItem('support_ticket_popup_last_shown');
      if (lastShown === today) {
        return;
      }

      try {
        // Fetch open tickets with their priorities
        const { data: openTickets, error } = await supabase
          .from('support_tickets')
          .select('priority')
          .eq('status', 'open');

        if (error) {
          console.error('Error checking open tickets:', error);
          return;
        }

        const count = openTickets?.length || 0;
        
        // Show alert if there are open tickets
        if (count > 0 && openTickets) {
          // Determine highest priority
          const priorities = openTickets.map(t => t.priority);
          let topPriority: 'low' | 'medium' | 'high' = 'low';

          if (priorities.includes('high')) {
            topPriority = 'high';
          } else if (priorities.includes('medium')) {
            topPriority = 'medium';
          }

          setHighestPriority(topPriority);
          setOpenTicketCount(count);
          setShowSupportTicketAlert(true);
          
          // Mark as shown for today
          localStorage.setItem('support_ticket_popup_last_shown', today);
        } else {
          setShowSupportTicketAlert(false);
        }
      } catch (error) {
        console.error('Error in checkOpenTickets:', error);
      }
    };

    if (user) {
      checkOpenTickets();
    }
  }, [userRole, user, location.pathname]);

  const handleOkClick = () => {
    setShowManagerAlert(false);
    navigate('/manager-dashboard', { state: { targetTab: 'assignmentLetters', targetSubTab: 'letter' } });
  };

  const handleSupportTicketOkClick = () => {
    setShowSupportTicketAlert(false);
    navigate('/support-tickets');
  };

  // Helper to get color theme based on priority
  const getPriorityTheme = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high':
        return {
          bg: 'bg-red-50',
          border: 'border-red-100',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          textHighlight: 'text-red-600',
          buttonBg: 'bg-red-600',
          buttonHover: 'hover:bg-red-700',
          ring: 'focus:ring-red-600',
          shadow: 'shadow-red-600/20'
        };
      case 'medium':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-100',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          textHighlight: 'text-amber-600',
          buttonBg: 'bg-amber-600',
          buttonHover: 'hover:bg-amber-700',
          ring: 'focus:ring-amber-600',
          shadow: 'shadow-amber-600/20'
        };
      default: // low
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-100',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          textHighlight: 'text-blue-600',
          buttonBg: 'bg-blue-600',
          buttonHover: 'hover:bg-blue-700',
          ring: 'focus:ring-blue-600',
          shadow: 'shadow-blue-600/20'
        };
    }
  };

  // Check for pending LPJ submissions
  const [showPendingLpjAlert, setShowPendingLpjAlert] = useState(false);
  const [pendingLpjCount, setPendingLpjCount] = useState(0);
  const [showProcrastinateConfirm, setShowProcrastinateConfirm] = useState(false);

  useEffect(() => {
    const checkPendingLpjs = async () => {
      // Don't show if on assignment letter page
      if (location.pathname.includes('/assignment-letter')) {
        setShowPendingLpjAlert(false);
        return;
      }

      if (!user) return;

      // Check frequency (once a day)
      const today = new Date().toDateString();
      const lastShown = localStorage.getItem('pending_lpj_popup_last_shown');
      if (lastShown === today) return;

      try {
        // 1. Get approved letters
        const { data: letters } = await supabase
          .from('letter')
          .select('id, audit_end_date')
          .eq('status', 'approved')
          .eq('created_by', user.id);

        // 2. Get approved addendums
        const { data: addendums } = await supabase
          .from('addendum')
          .select('id, end_date')
          .eq('status', 'approved')
          .eq('created_by', user.id);

        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); // Compare dates without time

        // Filter letters where audit_end_date has passed
        const passedLetters = letters?.filter(l => {
          if (!l.audit_end_date) return false;
          const endDate = new Date(l.audit_end_date);
          return endDate < currentDate;
        }) || [];
        
        const letterIds = passedLetters.map(l => l.id);

        // Filter addendums where end_date has passed
        const passedAddendums = addendums?.filter(a => {
          if (!a.end_date) return false;
          const endDate = new Date(a.end_date);
          return endDate < currentDate;
        }) || [];

        const addendumIds = passedAddendums.map(a => a.id);

        if (letterIds.length === 0 && addendumIds.length === 0) return;

        // 3. Get existing submissions for these specific docs
        let submittedLetterIds = new Set();
        let submittedAddendumIds = new Set();

        if (letterIds.length > 0) {
          const { data: s1 } = await supabase
            .from('lpj_submissions')
            .select('letter_id')
            .in('letter_id', letterIds);
          s1?.forEach(s => submittedLetterIds.add(s.letter_id));
        }

        if (addendumIds.length > 0) {
          const { data: s2 } = await supabase
            .from('lpj_submissions')
            .select('addendum_id')
            .in('addendum_id', addendumIds);
          s2?.forEach(s => submittedAddendumIds.add(s.addendum_id));
        }

        // Count unsubmitted
        const pendingLetters = letterIds.filter(id => !submittedLetterIds.has(id)).length;
        const pendingAddendums = addendumIds.filter(id => !submittedAddendumIds.has(id)).length;
        const totalPending = pendingLetters + pendingAddendums;

        if (totalPending > 0) {
          setPendingLpjCount(totalPending);
          setShowPendingLpjAlert(true);
          // Mark shown for today immediately to avoid re-shows on nav
          localStorage.setItem('pending_lpj_popup_last_shown', today);
        }

      } catch (error) {
        console.error('Error checking pending LPJs:', error);
      }
    };

    checkPendingLpjs();
  }, [user, location.pathname]);

  const handleLpjAlertOk = () => {
    setShowPendingLpjAlert(false);
    setShowProcrastinateConfirm(false);
    navigate('/assignment-letter');
  };

  const handleProcrastinate = () => {
    setShowPendingLpjAlert(false); // Close main
    setShowProcrastinateConfirm(false); // Close confirm
  };

  const theme = getPriorityTheme(highestPriority);
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* ... (Sidebar, Navbar, Main Content) */}
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggleCollapse={(collapsed: boolean) => setIsSidebarCollapsed(collapsed)}
      />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar 
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          {children || <Outlet />}
        </main>
      </div>

      {/* Pending LPJ Reminder Modal */}
      {showPendingLpjAlert && !showProcrastinateConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 border border-gray-100">
            
            <div className="p-8">
              {/* Header with Icon */}
              <div className="flex flex-col items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 text-center">Tunggakan LPJ Terdeteksi</h3>
                <p className="text-gray-500 text-sm mt-2 text-center">Halo, <span className="font-semibold text-gray-700">{user?.user_metadata?.full_name || userFullName || 'Auditor'}</span></p>
              </div>

              {/* Content Card */}
              <div className="mb-8 bg-amber-50 rounded-xl p-5 border border-amber-100">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-amber-800">
                      Dokumen Menunggu Pelaporan
                    </h3>
                    <div className="mt-2 text-sm text-amber-700 leading-relaxed">
                      Sistem mendeteksi ada <span className="font-bold text-amber-900 text-lg mx-0.5">{pendingLpjCount}</span> dokumen Surat Tugas / Addendum yang sudah <strong>Approved</strong> namun belum Anda laporkan (LPJ).
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setShowProcrastinateConfirm(true)}
                  className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold rounded-xl transition-all hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
                >
                  Nanti Saja
                </button>
                <button
                  onClick={handleLpjAlertOk}
                  className="flex-1 py-3 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-gray-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 flex items-center justify-center gap-2 group"
                >
                  <span>Input LPJ</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Procrastinate Confirmation Modal */}
      {showProcrastinateConfirm && (
        <div className="fixed inset-0 z-[205] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-red-50 rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300">
            <div className="p-6 text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Yakin Ingin Menunda?</h3>
              <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                Menunda pekerjaan sama dengan menumpuk beban di masa depan. Lebih cepat selesai, lebih tenang, lho!
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={handleProcrastinate}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-95 shadow-red-200"
                >
                  Tetap Tunda
                </button>
                <button
                  onClick={handleLpjAlertOk}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-95 shadow-green-200"
                >
                  Kerjakan Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manager Pending Approval Alert Modal - Minimalist Design with Animation */}
      {showManagerAlert && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 border border-gray-100">
            
            <div className="p-8">
              {/* Minimalist Header */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-4 border border-indigo-100">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 text-center">Menunggu Persetujuan</h3>
                <p className="text-gray-500 text-sm mt-1">Halo, <span className="font-medium text-indigo-600">{userFullName}</span></p>
              </div>

              {/* Content */}
              <div className="mb-8 text-center text-gray-600">
                <p>
                  Mohon tinjau dokumen berikut yang memerlukan persetujuan Anda:
                </p>

                {/* Minimalist Stats */}
                <div className="flex justify-center gap-8 mt-6">
                  {pendingLetters > 0 && (
                    <div className="text-center group cursor-default">
                      <div className="text-3xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{pendingLetters}</div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mt-1 font-medium">Surat Tugas</div>
                    </div>
                  )}
                  
                  {pendingLetters > 0 && pendingAddendums > 0 && (
                    <div className="w-px bg-gray-200 h-10 self-center"></div>
                  )}

                  {pendingAddendums > 0 && (
                    <div className="text-center group cursor-default">
                      <div className="text-3xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{pendingAddendums}</div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mt-1 font-medium">Addendum</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleOkClick}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 flex items-center justify-center gap-2 group"
              >
                <span>Tinjau Dokumen</span>
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* User Rejection Notification Modal - Minimalist Design */}
      {rejectionNotification && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 border border-gray-100">
            
            <div className="p-8">
              {/* Minimalist Header */}
              <div className="flex flex-col items-center mb-6">
                <img 
                  src="/assets/oh no.svg" 
                  alt="Oh no!" 
                  className="w-24 h-24 mb-4"
                />
                <h3 className="text-xl font-semibold text-gray-900 text-center">Surat Tugas Ditolak</h3>
                <p className="text-gray-500 text-sm mt-1">Halo, <span className="font-medium text-red-600">{userFullName}</span></p>
              </div>

              {/* Content */}
              <div className="mb-6 text-center text-gray-600">
                <p>
                  Surat Tugas untuk cabang <span className="font-semibold text-gray-900">{rejectionNotification.branch_name}</span> telah ditolak oleh Manager.
                </p>
              </div>

              {/* Rejection Reason */}
              <div className="mb-6 bg-red-50 border border-red-100 rounded-lg p-4">
                <p className="text-xs font-medium text-red-500 uppercase tracking-wide mb-2">Alasan Penolakan</p>
                <p className="text-sm text-red-800 font-medium">
                  {rejectionNotification.rejection_reason}
                </p>
              </div>

              {/* Action hint */}
              <p className="text-center text-sm text-gray-500 mb-6">
                Silakan input ulang atau hubungi Manager langsung.
              </p>

              {/* Action Button */}
              <button
                onClick={handleAcknowledgeRejection}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600"
              >
                Mengerti
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Support Ticket Alert Modal */}
      {showSupportTicketAlert && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300">
            
            {/* Header - Solid Color */}
            <div className={`py-6 px-8 ${theme.buttonBg}`}>
              <h3 className="text-2xl font-bold text-white text-center">Tiket Support Baru</h3>
            </div>
            
            <div className="p-8">
              <div className="text-left text-gray-800 text-lg leading-relaxed mb-8">
                <p className="mb-2">
                  Halo, {user?.user_metadata?.full_name || userFullName || 'Admin'}.
                </p>
                <p>
                  Terdapat <span className="font-bold">{openTicketCount}</span> tiket support 
                  dengan status <span className="font-bold">Open</span> yang perlu ditindaklanjuti.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={handleSupportTicketOkClick}
                  className={`flex-1 py-3 ${theme.buttonBg} ${theme.buttonHover} text-white font-semibold rounded-lg transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 group`}
                >
                  <span>Lihat tiket</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
                
                <button
                  onClick={() => setShowSupportTicketAlert(false)}
                  className="flex-1 py-3 text-gray-400 hover:text-gray-600 font-medium text-base transition-colors"
                >
                  Nanti saja
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default Layout;