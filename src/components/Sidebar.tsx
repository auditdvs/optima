import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wrench, FileText, Settings, MapPin, ClipboardList, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function Sidebar() {
  const location = useLocation();
  const { userRole } = useAuth();
  
  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };
  
  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/tools', icon: Wrench, label: 'Tools' },
    { path: '/workpapers', icon: FileText, label: 'Work Papers' },
    { path: '/tutorials', icon: FileText, label: 'Tutorials' },
    { path: '/companyregulations', icon: FileText, label: 'Company Regulations' },
  ];
  
  // Only show admin and QA-specific links for admin and qa roles
  if (userRole === 'admin' || userRole === 'qa') {
    menuItems.push(
      { path: '/update-location', icon: MapPin, label: 'Update Location' },
      { path: '/qa-section', icon: ClipboardList, label: 'Update Audits' }
    );
  }

  // Add user management link only for admin role
  if (userRole === 'admin') {
    menuItems.push(
      { path: '/add-user', icon: UserPlus, label: 'Add User' }
    );
  }
  
  return (
    <div className="flex flex-col w-64 bg-white border-r">
      <div className="flex items-center justify-center h-16 border-b">
        <h1 className="text-xl font-bold text-indigo-600">OPTIMA</h1>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-1">
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