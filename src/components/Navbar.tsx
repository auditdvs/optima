import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, LogOut, FileCheck, GitBranch } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function Navbar() {
  const { signOut } = useAuth();

  return (
    <div className="h-16 bg-white border-b flex items-center justify-end px-6">
      <div className="flex items-center space-x-6">
        {/* Audit Rating */}
        <Link
          to="#"
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <FileCheck className="w-5 h-5 mr-2" />
          <span>Audit Rating</span>
        </Link>

        {/* RCM */}
        <Link
          to="#"
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <GitBranch className="w-5 h-5 mr-2" />
          <span>RCM</span>
        </Link>

        {/* Notifications */}
        <button className="text-gray-600 hover:text-gray-900">
          <span className="relative inline-block">
            <Bell className="w-6 h-6" />
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
          </span>
        </button>

        {/* Logout */}
        <button
          onClick={signOut}
          className="text-gray-600 hover:text-gray-900"
          title="Logout"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

export default Navbar;