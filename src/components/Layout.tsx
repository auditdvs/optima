import { ReactNode, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface LayoutProps {
  children?: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggleCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}

export default Layout;