import {
  ChartPie,
  ChevronsUpDown,
  FilePenLine,
  FileText,
  FileVideo,
  GitPullRequest,
  History,
  KeyRound,
  LayoutDashboard,
  Library,
  LogOut,
  Megaphone,
  ScanFace,
  Table2,
  Ticket,
  UserRoundPen,
  Users,
  Wrench,
  X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

// Default profile pictures
const DEFAULT_PROFILE_PICS = [
  'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics//default1.png',
  'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics//default2.png',
  'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics//default3.png',
  'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics//default4.png',
];

function Sidebar({ isCollapsed, onToggleCollapse }: { isCollapsed: boolean; onToggleCollapse?: (collapsed: boolean) => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole, user, signOut } = useAuth();
  const [latestUpdateDate, setLatestUpdateDate] = useState<string>('');
  
  const [accountData, setAccountData] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Edit Profile Modal states
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editProfilePic, setEditProfilePic] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch latest update
      const { data: updateData } = await supabase
        .from('work_papers')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (updateData && updateData.length > 0) {
        setLatestUpdateDate(updateData[0].created_at);
      }

      // Fetch user profile data (reuse logic from Navbar)
      try {
        const defaultData = {
          full_name: 'User',
          nickname: 'User',
          role: userRole || 'user',
          profile_pic: 'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics//default.jfif'
        };
        
        setAccountData(defaultData); // Set default first
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileData) {
          let { data: accData, error: accError } = await supabase
            .from('account')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (!accData || accError) {
            const { data: altAccData } = await supabase
              .from('account')
              .select('*')
              .eq('user_id', user.id)
              .single();
            if (altAccData) accData = altAccData;
          }
          
          let profilePicUrl = defaultData.profile_pic;
          if (accData && accData.profile_pic) {
            profilePicUrl = accData.profile_pic;
          }
          
          setAccountData({
            full_name: accData?.full_name || profileData.full_name || defaultData.full_name,
            profile_pic: profilePicUrl,
            role: accData?.role || userRole || 'user',
            nickname: accData?.nickname || profileData.full_name?.split(' ')[0] || defaultData.nickname
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    
    fetchData();
  }, [user, userRole]);

  function formatDate(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);
  
  if (!userRole) return null;

  const menuGroups = [
    {
      title: "Main",
      key: "dashboard",
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      ]
    },
    {
      title: "Resources",
      key: "resources",
      items: [
        { path: '/companyregulations', icon: Library, label: 'Regulations' },
        { path: '/tutorials', icon: FileVideo, label: 'Tutorials' },
        { path: '/branch-directory', icon: Table2, label: 'Branch Directory' },
      ]
    },
  ];

  if (userRole === 'superadmin' || userRole === 'manager') {
    const dashboardGroup = menuGroups.find(group => group.key === 'dashboard');
    if (dashboardGroup) {
      dashboardGroup.items.push({ path: '/manager-dashboard', icon: ChartPie, label: 'Manager' });
    }
  }

  if (userRole === 'superadmin' || userRole === 'qa' || userRole === 'dvs' || userRole === 'manager' || userRole === 'user') {
    const auditItems = [];
    if (['superadmin', 'qa', 'dvs', 'manager'].includes(userRole)) auditItems.push({ path: '/qa-section', icon: FilePenLine, label: 'Update Audits' });
    if (['superadmin', 'qa', 'manager'].includes(userRole)) auditItems.push({ path: '/qa-management', icon: Users, label: 'QA Workpapers' });
    if (['user', 'dvs', 'qa', 'manager', 'superadmin'].includes(userRole)) auditItems.push({ path: '/assignment-letter', icon: FileText, label: 'Assignment' });
    auditItems.push({ path: '/tools', icon: Wrench, label: 'Tools' });

    if (auditItems.length > 0) {
      menuGroups.push({ title: "Audit Tools", key: "audittools", items: auditItems });
    }
  }

  if (['superadmin', 'qa', 'user', 'dvs', 'manager'].includes(userRole)) {
    const communicationItems = [];
    if (['superadmin', 'qa', 'dvs', 'manager'].includes(userRole)) communicationItems.push({ path: '/broadcast', icon: Megaphone, label: 'Broadcast' });
    communicationItems.push({ path: '/notification-history', icon: History, label: 'History' });
    communicationItems.push({ path: '/pull-request', icon: GitPullRequest, label: 'Req Database' });
    communicationItems.push({ path: '/support-tickets', icon: Ticket, label: 'Support Tickets' });

    if (communicationItems.length > 0) {
      menuGroups.push({ title: "Communication", key: "communication", items: communicationItems });
    }
  }

  if (userRole === 'superadmin') {
    menuGroups.push({
      title: "Admin",
      key: "administration",
      items: [{ path: '/add-user', icon: KeyRound, label: 'Admin Menu' }]
    });
  }
  
  return (
    <>
      {/* Mobile Backdrop */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => onToggleCollapse?.(true)}
        />
      )}

      {/* Sidebar Container */}
      <div 
        className={`
          flex flex-col h-screen bg-white border-r border-gray-100 
          transition-all duration-300 ease-in-out z-50 group
          fixed lg:relative inset-y-0 left-0
          ${isCollapsed 
            ? '-translate-x-full lg:translate-x-0 lg:w-20' 
            : 'translate-x-0 w-[280px]'
          }
        `}
      >
      {/* Header */}
      <div className="flex items-center h-16 border-b border-gray-100 px-6 shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 animate-in fade-in duration-300">
             <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                <LayoutDashboard className="h-5 w-5" />
             </div>
             <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold text-gray-900 tracking-tight">OPTIMA</span>
                <span className="text-[10px] text-gray-500 font-medium">Internal Audit v2.0</span>
             </div>
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm mx-auto">
             <LayoutDashboard className="h-5 w-5" />
          </div>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 space-y-6 scrollbar-thin scrollbar-thumb-gray-200">
        {menuGroups.map((group) => (
          <div key={group.key}>
            {!isCollapsed && group.items.length > 0 && (
              <div className="px-3 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {group.title}
              </div>
            )}
            
            <div className="space-y-1">
              {group.items.map(({ path, icon: Icon, label }) => {
                const active = isActive(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    title={isCollapsed ? label : ''}
                    className={`
                      flex items-center px-3 py-2 rounded-md transition-all duration-200 group
                      ${active 
                        ? 'bg-indigo-50 text-indigo-700 font-medium' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      }
                      ${isCollapsed ? 'justify-center px-2' : ''}
                    `}
                  >
                    <Icon 
                      className={`
                        ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4 mr-3'} 
                        ${active ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}
                        transition-colors
                      `} 
                    />
                    {!isCollapsed && <span className="text-sm">{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / User Profile */}
      <div className="p-3 border-t border-gray-100 mt-auto shrink-0 relative" ref={dropdownRef}>
         
         {/* Popup Menu */}
         {showDropdown && (
            <div className={`
              absolute left-3 right-3 bottom-full mb-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden py-1 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200
              ${isCollapsed ? 'left-16 w-48' : ''}
            `}>
                <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">{accountData?.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <button 
                  onClick={() => {
                      setShowDropdown(false);
                      setEditNickname(accountData?.nickname || '');
                      setEditFullName(accountData?.full_name || '');
                      setEditProfilePic(accountData?.profile_pic || DEFAULT_PROFILE_PICS[0]);
                      setShowEditProfile(true);
                  }}
                  className="flex items-center px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors w-full text-left"
                >
                    <UserRoundPen className="w-4 h-4 mr-2"/> 
                    Edit Profile
                </button>
                <Link 
                  to="/account-settings" 
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
                  onClick={() => setShowDropdown(false)}
                >
                    <ScanFace className="w-4 h-4 mr-2 text-gray-500"/> 
                    Profile
                </Link>
                <button 
                  onClick={async () => {
                      setShowDropdown(false);
                      await signOut();
                      navigate('/login');
                  }} 
                  className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                >
                    <LogOut className="w-4 h-4 mr-2"/> 
                    Logout
                </button>
            </div>
         )}

         <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className={`
              flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors w-full text-left
              ${isCollapsed ? 'justify-center' : ''}
            `}
         >
            <div className="h-9 w-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-transparent group-hover:ring-indigo-100 transition-all">
               <img 
                 src={accountData?.profile_pic} 
                 alt={accountData?.nickname}
                 className="h-full w-full object-cover"
                 onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/profile-pics//default.jfif';
                 }}
               />
            </div>
            
            {!isCollapsed && (
              <>
                <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-900 truncate">
                       {accountData?.nickname || 'User'}
                    </span>
                    <span className="text-xs text-gray-500 truncate font-medium capitalize">
                       {accountData?.role || 'User'}
                    </span>
                </div>
                <ChevronsUpDown className="h-4 w-4 text-gray-400 shrink-0" />
              </>
            )}
         </button>
      </div>


    </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowEditProfile(false)}
          />
          
          {/* Modal Card */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in zoom-in-95 fade-in duration-200">
            {/* Close Button */}
            <button 
              onClick={() => setShowEditProfile(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            
            <h2 className="text-xl font-bold text-indigo-700 text-center mb-6">Profile Settings</h2>
            
            {/* Current Profile Picture */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-100 shadow-lg">
                  <img 
                    src={editProfilePic} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_PROFILE_PICS[0];
                    }}
                  />
                </div>
                <div className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-md border border-gray-100">
                  <UserRoundPen className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            </div>
            
            {/* Default Profile Options */}
            <p className="text-sm text-gray-600 text-center mb-3">Choose default profile</p>
            <div className="flex justify-center gap-3 mb-6">
              {DEFAULT_PROFILE_PICS.map((pic, index) => (
                <button
                  key={index}
                  onClick={() => setEditProfilePic(pic)}
                  className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all hover:scale-110 ${
                    editProfilePic === pic 
                      ? 'border-indigo-500 ring-2 ring-indigo-200' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img src={pic} alt={`Option ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            
            {/* Nickname Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nickname</label>
              <input
                type="text"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Enter nickname"
              />
            </div>
            
            {/* Full Name Input - Read Only */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-500 mb-1.5">Full Name</label>
              <input
                type="text"
                value={editFullName}
                readOnly
                disabled
                className="w-full px-4 py-2.5 border border-gray-100 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Full name cannot be changed</p>
            </div>
            
            {/* Save Button */}
            <button
              onClick={async () => {
                if (!user) return;
                setIsSaving(true);
                try {
                  const { error } = await supabase
                    .from('account')
                    .update({
                      nickname: editNickname,
                      profile_pic: editProfilePic,
                    })
                    .eq('id', user.id);
                  
                  if (error) {
                    // Try with user_id if id doesn't work
                    const { error: error2 } = await supabase
                      .from('account')
                      .update({
                        nickname: editNickname,
                        profile_pic: editProfilePic,
                      })
                      .eq('user_id', user.id);
                    
                    if (error2) throw error2;
                  }
                  
                  // Update local state
                  setAccountData((prev: any) => ({
                    ...prev,
                    nickname: editNickname,
                    profile_pic: editProfilePic,
                  }));
                  
                  toast.success('Profile updated successfully!');
                  setShowEditProfile(false);
                } catch (err) {
                  console.error('Error updating profile:', err);
                  toast.error('Failed to update profile');
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Update Profile'
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;