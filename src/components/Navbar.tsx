import React from 'react';
import { Link } from 'react-router-dom';
import { Info, LogOut, AlignStartVertical, ChartNoAxesColumn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function Navbar() {
  const { signOut } = useAuth();

  return (
    <div className="h-16 bg-white border-b flex items-center justify-end px-6 w-full max-w-fit-content">
      <div className="flex items-center space-x-6">
        {/* Audit Rating */}
        <Link
          to="https://risk-issue.streamlit.app/"
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <AlignStartVertical className="w-5 h-5 mr-2" />
          <span>Audit Rating</span>
        </Link>

        {/* RCM */}
        <Link
          to="https://risk-control-matriks.streamlit.app/"
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ChartNoAxesColumn className="w-5 h-5 mr-2" />
          <span>RCM</span>
        </Link>

        {/* Notifications */}
        <button className="cursor-not-allowed text-gray-600 hover:text-gray-900">
          <span className="relative inline-block">
            <Info className="w-6 h-6" />
            <span className="animate-ping absolute inline-flex top-0 right-0 h-2 w-2 rounded-full bg-indigo-600 opacity-75"/>
          </span>
        </button>

        {/* Logout */}
        <button
          onClick={signOut}
          className="text-gray-600 hover:text-gray-900"
          title="Logout"
        >
          <LogOut className="w-6 h-6 mr-4" />
        </button>
      </div>
    </div>
  );
}

export default Navbar;
