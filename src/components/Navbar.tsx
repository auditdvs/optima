import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Info, LogOut, AlignStartVertical, ChartNoAxesColumn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

function Navbar() {
  const { signOut, user } = useAuth();
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    async function fetchUserProfile() {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setFullName(data.full_name);
        }
      }
    }

    fetchUserProfile();
  }, [user]);

  return (
    <a href="https://i.pinimg.com/736x/f4/7d/1a/f47d1a20470813af55020d51c4f5159a.jpg" target="_blank" rel="noopener noreferrer"> 
    <div className="h-16 bg-white border-b flex items-center justify-between px-6 w-full max-w-fit-content">
      <div className="group"> 
      <div className="text-sm text-gray-600 group-hover:animate-bounce cursor-pointer">
        Hello, {fullName}. Have a great day!
      </div>
      </div>

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
    </a>
  );
}

export default Navbar;