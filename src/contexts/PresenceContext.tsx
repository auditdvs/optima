import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

interface PresenceState {
  user_id: string;
  full_name: string;
  online_at: string;
}

interface PresenceContextType {
  onlineUserIds: Set<string>;
  onlineCount: number;
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUserIds: new Set(),
  onlineCount: 0,
});

export const usePresence = () => useContext(PresenceContext);

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const presenceChannel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState<PresenceState>();
        const ids = new Set<string>();
        Object.keys(state).forEach(key => {
          ids.add(key);
        });
        setOnlineUserIds(ids);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            full_name: user.user_metadata?.full_name || '',
            online_at: new Date().toISOString(),
           });
        }
      });

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [user]);

  return (
    <PresenceContext.Provider value={{ 
      onlineUserIds, 
      onlineCount: onlineUserIds.size 
    }}>
      {children}
    </PresenceContext.Provider>
  );
}
