import { MapPin, AlertTriangle } from 'lucide-react';
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

// Cache IP data at the module level so we don't spam GeoIP APIs every 30s
let moduleIpCache: any = null;
let isFetchingIp = false;

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const coordinatesRef = useRef<{ lat: number, lon: number } | null>(null);
  
  const userRef = useRef(user);
  userRef.current = user;

  const userId = user?.id;

  // 0. Enforce HTML5 Geolocation when logged in
  useEffect(() => {
    if (!userId) {
      return; // Cuma jalan kalau udah login
    }

    if (locationStatus === 'granted' || locationStatus === 'fallback') return;

    if (!navigator.geolocation) {
      console.warn('Geolocation not supported by browser.');
      setLocationStatus('fallback');
      return;
    }

    const checkLocation = () => {
      // Paksa fallback kalau user nyuekin pop-up izin map lebih dari 5 detik
      const promptTimeoutId = setTimeout(() => {
        setLocationStatus((prev) => {
           if (prev === 'pending') return 'fallback';
           return prev;
        });
      }, 5000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(promptTimeoutId);
          coordinatesRef.current = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          setLocationStatus('granted');
        },
        (error) => {
          clearTimeout(promptTimeoutId);
          console.warn('Geolocation denied or failed, using Edge Function fallback:', error);
          setLocationStatus('fallback');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    checkLocation();
  }, [userId, locationStatus]);

  // 1. Heartbeat: update own last_seen_at
  useEffect(() => {
    if (!userId || locationStatus === 'pending') return;

    const updateLastSeen = async () => {
      try {
        let ipUpdate = {};
        
        if (locationStatus === 'granted' && coordinatesRef.current) {
          // ==============================
          // Tipe 1: GPS Presisi (Front-end)
          // ==============================
          if (moduleIpCache) {
            ipUpdate = moduleIpCache;
          } else if (!isFetchingIp) {
            isFetchingIp = true;
            try {
              const resIP = await fetch('https://api.ipify.org?format=json');
              const dataIP = await resIP.json();
              
              const { lat, lon } = coordinatesRef.current;
              let locDesc = 'GPS Lokasi Aktif';
              try {
                 const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                 const geoData = await geoRes.json();
                 const city = geoData.address?.city || geoData.address?.town || geoData.address?.county || '-';
                 const state = geoData.address?.state || geoData.address?.region || '-';
                 locDesc = `${city}, ${state} (GPS Verified)`;
              } catch(e) {
                 console.warn('[Presence] Reverse geocoding failed', e);
              }
              
              ipUpdate = {
                 last_ip: dataIP.ip || '-',
                 ip_location: locDesc,
                 ip_coords: `${lat},${lon}`
              };
            } catch (e) {
              console.warn('[Presence] IP/Geo fetch failed', e);
            }
            
            if (Object.keys(ipUpdate).length > 0) {
               moduleIpCache = ipUpdate;
            }
            isFetchingIp = false;
          }

          const safeIpUpdate = { ...ipUpdate };
          if ('edge_fallback' in safeIpUpdate) delete (safeIpUpdate as any).edge_fallback;

          const { error } = await supabase
            .from('profiles')
            .update({ 
              last_seen_at: new Date().toISOString(),
              ...safeIpUpdate
            })
            .eq('id', userId);
          
          if (error) {
            console.error('[Presence] Heartbeat update failed:', error.message);
          } else {
            console.log('[Presence] GPS Heartbeat OK', userId);
          }

        } else if (locationStatus === 'fallback') {
          // ==============================
          // Tipe 2: IP Tracking (Front-end Fallback)
          // ==============================
          if (moduleIpCache) {
             ipUpdate = moduleIpCache;
          } else if (!isFetchingIp) {
            isFetchingIp = true;
            try {
              const res = await fetch('https://ipinfo.io/json?token=ac28a2bc61c49b');
              const data = await res.json();
              if (data.ip) {
                ipUpdate = {
                  last_ip: data.ip,
                  ip_location: `${data.city}, ${data.region} (${data.org || 'ISP'}) [IP Network]`,
                  ip_coords: data.loc // lat,lon
                };
              }
            } catch (e) {
              console.warn('[Presence] ipinfo fallback failed:', e);
            }
            if (Object.keys(ipUpdate).length > 0) {
              moduleIpCache = ipUpdate;
            }
            isFetchingIp = false;
          }

          const safeIpUpdate = { ...ipUpdate };
          if ('edge_fallback' in safeIpUpdate) delete (safeIpUpdate as any).edge_fallback;

          const { error } = await supabase
            .from('profiles')
            .update({ 
              last_seen_at: new Date().toISOString(),
              ...safeIpUpdate
            })
            .eq('id', userId);
          
          if (error) {
            console.error('[Presence] Fallback update failed:', error.message);
          } else {
            console.log('[Presence] Fallback Heartbeat OK', userId);
          }
        }

      } catch (e) {
        console.error('[Presence] Heartbeat exception:', e);
        isFetchingIp = false;
      }
    };

    updateLastSeen();
    const intervalId = setInterval(updateLastSeen, HEARTBEAT_INTERVAL);

    return () => clearInterval(intervalId);
  }, [userId, locationStatus]);



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

  // Block rendering until geolocation is granted (only for non-public pages)
  if (userId) {
    const isPublicPage = [
      '/login', 
      '/reset-password', 
      '/survey', 
      '/s/'
    ].some(path => window.location.pathname.startsWith(path));

    if (!isPublicPage) {
      if (locationStatus === 'pending') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-500 animate-pulse">
                <MapPin className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Meminta Akses Lokasi</h2>
              <p className="text-gray-600 leading-relaxed text-sm">
                Sistem OPTIMA membutuhkan informasi dari GPS perangkat untuk tujuan validasi keamanan sesi operasi. Silakan klik <strong>"Allow"</strong> atau <strong>"Izinkan"</strong> pada peramban/browser Anda.
              </p>
            </div>
          </div>
        );
      }
      
      if (locationStatus === 'denied') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Akses Ditolak</h2>
              <p className="text-gray-600 leading-relaxed text-sm">
                Anda tidak dapat mengakses sistem OPTIMA tanpa memberikan izin koordinat lokasi dari perangkat ini. Harap beri izin pada setelan browser Anda dan segarkan (<em className="font-semibold text-gray-900">refresh</em>) halaman.
              </p>
            </div>
          </div>
        );
      }
    }
  }

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}
