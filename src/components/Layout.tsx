import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import '../styles/hamburger.css';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile); // Close sidebar by default on mobile
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Hamburger Menu */}
      <label className="hamburger lg:hidden fixed top-4 left-4 z-50">
        <input 
          type="checkbox" 
          checked={isSidebarOpen}
          onChange={(e) => setIsSidebarOpen(e.target.checked)}
        />
        <svg viewBox="0 0 32 32">
          <path
            className="line line-top-bottom"
            d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"
          ></path>
          <path className="line" d="M7 16 27 16"></path>
        </svg>
      </label>
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64">
        <Sidebar />
      </div>
      
      {/* Mobile Sidebar */}
      {isMobile && (
        <div 
          className={`fixed inset-y-0 left-0 w-64 bg-white z-40 transform ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } transition-transform duration-300 ease-in-out`}
        >
          <div className="h-full pt-16 overflow-y-auto"> {/* Add padding-top to avoid overlap with hamburger */}
            <Sidebar />
          </div>
        </div>
      )}
      
      {/* Overlay for mobile */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <div className="flex-1 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 overflow-x-hidden bg-gray-100 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
export default Layout;

export { Layout };