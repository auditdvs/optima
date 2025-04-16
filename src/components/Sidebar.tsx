import {
  Table2,
  FileVideo,
  FileText,
  LayoutDashboard,
  MapPinPlus,
  FilePenLine,
  UserCog,
  Library,
  Wrench,
  Users
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Sidebar() {
  const location = useLocation();
  const { userRole } = useAuth();
  
  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };
  
  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/companyregulations', icon: Library, label: 'Company Regulations' },
  ];
  
  // super admin, qa dan dvs
  if (userRole === 'superadmin' || userRole === 'qa'|| userRole === 'dvs') {
    menuItems.push(
      { path: '/update-location', icon: MapPinPlus, label: 'Update Location' },
      { path: '/qa-section', icon: FilePenLine, label: 'Update Audits' }
    );
  }
  // super admin dan qa
  if (userRole === 'superadmin' || userRole === 'qa') {
    menuItems.push(
      { path: '/qa-management', icon: Users, label: 'QA Management' }
    );
  }

  // super admin dan risk
  if (userRole === 'superadmin' || userRole === 'risk') {
    menuItems.push(
      { path: '/risk-dashboard', icon: Table2, label: 'Risk Dashboard' }
    );
  }

  // superadmin only
  if (userRole === 'superadmin') {
    menuItems.push(
      { path: '/add-user', icon: UserCog, label: 'User Management' },
      { path: '/workpapers', icon: FileText, label: 'Work Papers' }
    );
  }
  // all user IA
  if (userRole === 'superadmin' || userRole === 'qa' || userRole === 'user'|| userRole === 'dvs') {
    menuItems.push(
      { path: '/tools', icon: Wrench, label: 'Tools' },
      { path: '/tutorials', icon: FileVideo, label: 'Tutorials' }
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-white border-r w-full">
      <div className="flex items-center justify-center h-16 border-b">
        <h1 className="text-xl font-bold text-indigo-600">OPTIMA</h1>
      </div>
      
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {menuItems.map(({ path, icon: Icon, label }) => (
          <Link
            key={path}
            to={path}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive(path)
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon className="w-5 h-5 mr-3" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default Sidebar;