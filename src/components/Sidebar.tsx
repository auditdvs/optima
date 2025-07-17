import {
  ChartPie,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FilePenLine,
  FileVideo,
  GitPullRequest,
  History,
  LayoutDashboard,
  Library,
  Mail,
  MapPinPlus,
  Megaphone,
  ScanFace,
  Table2,
  UserCog,
  Users,
  Wrench
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { GradientText } from './GradientText';

function Sidebar({ isCollapsed, onToggleCollapse }: { 
  isCollapsed: boolean; 
  onToggleCollapse: (collapsed: boolean) => void;
}) {
  const location = useLocation();
  const { userRole } = useAuth();
  const [latestUpdateDate, setLatestUpdateDate] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    dashboard: true,
    audittools: true,
    communication: true,
    resources: true,
    userprofile: true,
    administration: true
  });
  
  // Fetch the latest update date from work_papers
  useEffect(() => {
    const fetchLatestUpdate = async () => {
      try {
        const { data, error } = await supabase
          .from('work_papers')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (error) {
          console.error('Error fetching latest update:', error);
          return;
        }
        
        if (data && data.length > 0) {
          setLatestUpdateDate(data[0].created_at);
        }
      } catch (error) {
        console.error('Error in fetchLatestUpdate:', error);
      }
    };
    
    fetchLatestUpdate();
  }, []);

  // Helper to format date as 'DD MMMM, YYYY'
  function formatDate(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('id-ID', { month: 'long' });
    const year = date.getFullYear();
    return `${day} ${month}, ${year}`;
  }

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const toggleSection = (sectionKey: string) => {
    if (isCollapsed) return; // Don't toggle when collapsed
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };
  
  if (!userRole) return null;

  // Define menu groups based on user role
  const menuGroups = [
    {
      title: "Dashboard",
      key: "dashboard",
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      ]
    },
    {
      title: "User Profile",
      key: "userprofile",
      items: [
        { path: '/account-settings', icon: ScanFace, label: 'Profiles' },
      ]
    },
    {
      title: "Resources",
      key: "resources",
      items: [
        { path: '/companyregulations', icon: Library, label: 'Company Regulations' },
        { path: '/tutorials', icon: FileVideo, label: 'Tutorials' },
        { path: '/branch-directory', icon: Table2, label: 'Branch Directory' },
      ]
    }
  ];

  // Add Manager Dashboard to Dashboard group for managers
  if (userRole === 'superadmin' || userRole === 'manager') {
    const dashboardGroup = menuGroups.find(group => group.key === 'dashboard');
    if (dashboardGroup) {
      dashboardGroup.items.push({ path: '/manager-dashboard', icon: ChartPie, label: 'Manager Dashboard' });
    }
  }

  // Add Risk Dashboard to Dashboard group for risk users
  if (userRole === 'superadmin' || userRole === 'risk' || userRole === 'manager') {
    const dashboardGroup = menuGroups.find(group => group.key === 'dashboard');
    if (dashboardGroup) {
      dashboardGroup.items.push({ path: '/risk-dashboard', icon: Table2, label: 'Risk Dashboard' });
    }
  }

  // Add Audit Tools group for specific roles
  if (userRole === 'superadmin' || userRole === 'qa' || userRole === 'dvs' || userRole === 'manager' || userRole === 'user') {
    const auditItems = [];
    
    if (userRole === 'superadmin' || userRole === 'qa' || userRole === 'dvs' || userRole === 'manager') {
      auditItems.push({ path: '/qa-section', icon: FilePenLine, label: 'Update Audits' });
    }
    
    if (userRole === 'superadmin' || userRole === 'qa' || userRole === 'manager') {
      auditItems.push({ path: '/qa-management', icon: Users, label: 'QA Management' });
    }
    
    // Tools and Grammar Correction for all users
    auditItems.push(
      { path: '/tools', icon: Wrench, label: 'Tools' },
      { path: '/grammar-correction', icon: FilePenLine, label: 'Grammar Correction' }
    );

    if (auditItems.length > 0) {
      menuGroups.push({
        title: "Audit Tools",
        key: "audittools",
        items: auditItems
      });
    }
  }

  // Add Communication group for all users
  if (userRole === 'superadmin' || userRole === 'qa' || userRole === 'user' || userRole === 'dvs' || userRole === 'manager') {
    const communicationItems = [];
    
    if (userRole === 'superadmin' || userRole === 'qa' || userRole === 'dvs' || userRole === 'manager') {
      communicationItems.push({ path: '/broadcast', icon: Megaphone, label: 'Broadcast Message' });
    }
    
    // Message History and Pull Request for all users
    communicationItems.push(
      { path: '/notification-history', icon: History, label: 'Message History' },
      { path: '/pull-request', icon: GitPullRequest, label: 'Pull Request' }
    );

    if (communicationItems.length > 0) {
      menuGroups.push({
        title: "Communication",
        key: "communication",
        items: communicationItems
      });
    }
  }

  // Add Administration group for superadmin only
  if (userRole === 'superadmin') {
    menuGroups.push({
      title: "Administration",
      key: "administration",
      items: [
        { path: '/add-user', icon: UserCog, label: 'Admin Menu' }
      ]
    });
  }
  
 return (
    <div className={`flex flex-col h-screen bg-white border-r-2 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <div className="relative flex flex-col items-center justify-center h-16 border-b px-2">
        {!isCollapsed && (
          <>
            <h1 className="text-xl font-bold text-indigo-600 w-full text-center leading-tight">OPTIMA</h1>
            <GradientText
              colors={["#4338ca", "#6366f1", "#818cf8", "#6366f1", "#4338ca"]}
              animationSpeed={3}
              showBorder={false}
              className="text-[10px] font-medium mt-0.5 w-full text-center leading-tight"
            >
              {latestUpdateDate ? `Data update: ${formatDate(latestUpdateDate)}` : 'Loading update info...'}
            </GradientText>
          </>
        )}
        <button
          onClick={() => onToggleCollapse(!isCollapsed)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-100 text-gray-500"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronsRight className="w-5 h-5" />
          ) : (
            <ChevronsLeft className="w-5 h-5" />
          )}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1">
        {menuGroups.map((group) => (
          <div key={group.key} className="mb-2">
            {!isCollapsed ? (
              // Expanded sidebar with dropdown
              <div>
                <button
                  onClick={() => toggleSection(group.key)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span>{group.title}</span>
                  {expandedSections[group.key] ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {expandedSections[group.key] && (
                  <div className="mt-1 space-y-1">
                    {group.items.map(({ path, icon: Icon, label }) => (
                      <Link
                        key={path}
                        to={path}
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ml-2 ${
                          isActive(path)
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        title={label}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        {label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Collapsed sidebar - show all items as icons
              <div className="space-y-1">
                {group.items.map(({ path, icon: Icon, label }) => (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive(path)
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    title={label}
                  >
                    <Icon className="w-5 h-5 mx-auto" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}

export default Sidebar;