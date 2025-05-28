import {
  ChartPie,
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
  Table2,
  UserCog,
  Users,
  Wrench
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Sidebar({ isCollapsed, onToggleCollapse }: { 
  isCollapsed: boolean; 
  onToggleCollapse: (collapsed: boolean) => void;
}) {
  const location = useLocation();
  const { userRole } = useAuth();
  
  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };
  
  if (!userRole) return null;

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/companyregulations', icon: Library, label: 'Company Regulations' },
    { path: '/email-address', icon: Mail, label: 'Email Address Branch' },
  ];
  
  // super admin, qa, manager dan dvs
  if (userRole === 'superadmin' || userRole === 'qa'|| userRole === 'dvs' || userRole === 'manager') { 
    menuItems.push(
      { path: '/update-location', icon: MapPinPlus, label: 'Update Location' },
      { path: '/qa-section', icon: FilePenLine, label: 'Update Audits' },
      { path: '/broadcast', icon: Megaphone, label: 'Broadcast Message' }
    );
  }

  // super admin dan qa
  if (userRole === 'superadmin' || userRole === 'qa'|| userRole === 'manager') {
    menuItems.push(
      { path: '/qa-management', icon: Users, label: 'QA Management' }
    );
  }

  // super admin dan risk
  if (userRole === 'superadmin' || userRole === 'risk' || userRole === 'manager') {
    menuItems.push(
      { path: '/risk-dashboard', icon: Table2, label: 'Risk Dashboard' }
    );
  }

  // manager dashboard
  if (userRole === 'superadmin' || userRole === 'manager') {
    menuItems.push(
      { path: '/manager-dashboard', icon: ChartPie, label: 'Manager Dashboard' }
    );
  }

  // all user IA
  if (userRole === 'superadmin' || userRole === 'qa' || userRole === 'user'|| userRole === 'dvs'|| userRole === 'manager') {
    menuItems.push(
      { path: '/tools', icon: Wrench, label: 'Tools' },
      { path: '/tutorials', icon: FileVideo, label: 'Tutorials' },
      { path: '/notification-history', icon: History, label: 'Message History' }
    );
  }
  
  // superadmin only
  if (userRole === 'superadmin') {
    menuItems.push(
      { path: '/add-user', icon: UserCog, label: 'Admin Menu' }
     );
  }

  // Add this to your menuItems array
  menuItems.push(
    { path: '/pull-request', icon: GitPullRequest, label: 'Pull Request' }
  );
  
 return (
    <div className={`flex flex-col h-screen bg-white border-r-2 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex items-center justify-between h-16 border-b px-3">
        {!isCollapsed && (
          <h1 className="text-3xl font-bold text-indigo-600">OPTIMA</h1>
        )}
        <button
          onClick={() => onToggleCollapse(!isCollapsed)}
          className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
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
        {menuItems.map(({ path, icon: Icon, label }) => (
          <Link
            key={path}
            to={path}
            className={`flex items-center px-${isCollapsed ? '2' : '4'} py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive(path)
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            title={isCollapsed ? label : ''}
          >
            <Icon className={`w-5 h-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
            {!isCollapsed && label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default Sidebar;