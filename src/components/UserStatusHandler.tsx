// Create a new file: UserStatusHandler.tsx
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function UserStatusHandler() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const handleBeforeUnload = async () => {
      await supabase.from('user_status').upsert({
        user_id: user.id,
        is_online: false,
        last_activity: new Date().toISOString()
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  return null; // This component doesn't render anything
}