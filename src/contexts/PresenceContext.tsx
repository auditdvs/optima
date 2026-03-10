import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

interface PresenceContextType {
  onlineUserIds: Set<string>;
  onlineCount: number;
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUserIds: new Set(),
  onlineCount: 0,
});

export const usePresence = () => useContext(PresenceContext);

const HEARTBEAT_INTERVAL = 30_000;
const ONLINE_THRESHOLD = 60_000;
const POLL_INTERVAL = 15_000;

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const userRef = useRef(user);
  userRef.current = user;

  const userId = user?.id;

  // 1. Heartbeat: update own last_seen_at
  useEffect(() => {
    if (!userId) return;

    const updateLastSeen = async () => {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', userId);
        
        if (error) {
          console.error('[Presence] Heartbeat update failed:', error.message, error.code);
        } else {
          console.log('[Presence] Heartbeat OK for', userId);
        }
      } catch (e) {
        console.error('[Presence] Heartbeat exception:', e);
      }
    };

    updateLastSeen();
    const heartbeat = setInterval(updateLastSeen, HEARTBEAT_INTERVAL);

    return () => clearInterval(heartbeat);
  }, [userId]);

  // 2. Poll: fetch online user IDs
  useEffect(() => {
    if (!userId) return;

    const fetchOnlineUsers = async () => {
      try {
        const threshold = new Date(Date.now() - ONLINE_THRESHOLD).toISOString();
        const { data, error } = await supabase
          .from('profiles')
          .select('id, last_seen_at')
          .gte('last_seen_at', threshold);

        if (error) {
          console.error('[Presence] Poll failed:', error.message, error.code);
          return;
        }

        console.log('[Presence] Online users found:', data?.length, data?.map(r => r.id));
        
        if (data) {
          const ids = new Set<string>(data.map(row => row.id));
          setOnlineUserIds(ids);
        }
      } catch (e) {
        console.error('[Presence] Poll exception:', e);
      }
    };

    fetchOnlineUsers();
    const poller = setInterval(fetchOnlineUsers, POLL_INTERVAL);

    return () => clearInterval(poller);
  }, [userId]);

  const value = useMemo(() => ({
    onlineUserIds,
    onlineCount: onlineUserIds.size,
  }), [onlineUserIds]);

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}
