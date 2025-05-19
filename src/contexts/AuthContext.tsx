import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: any;
  userRole: string;
  auditor: { id: string; name: string } | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  resetInactivityTimer: () => void; // Tambahkan fungsi reset timer
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 60 menit dalam milidetik
const WARNING_BEFORE_TIMEOUT = 1 * 60 * 1000; // Peringatan 1 menit sebelum timeout

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [userRole, setUserRole] = useState<string>(() => {
    return localStorage.getItem('userRole') || 'user';
  });
  const [auditor, setAuditor] = useState<{ id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpiresIn, setSessionExpiresIn] = useState<number | null>(null);
  const [ignoreAuthChanges, setIgnoreAuthChanges] = useState(false);
  const [lastAuthEventTime, setLastAuthEventTime] = useState(Date.now());
  
  // Tambahkan state untuk inaktivitas
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [inactivityWarningShown, setInactivityWarningShown] = useState(false);
  const [inactivityTimerId, setInactivityTimerId] = useState<number | null>(null);

  // Add a throttling ref
  const lastActivityUpdateRef = useRef(Date.now());

  // Fungsi untuk reset timer inaktivitas
  const resetInactivityTimer = useCallback(() => {
    // Only update state if at least 5 seconds have passed since last update
    const now = Date.now();
    if (now - lastActivityUpdateRef.current > 5000) {
      lastActivityUpdateRef.current = now;
      setLastActivity(now);
      setInactivityWarningShown(false);
    }
  }, []);

  // Effect untuk memonitor inaktivitas pengguna
  useEffect(() => {
    if (!user) return;
    
    // Fungsi untuk memeriksa inaktivitas
    const checkInactivity = () => {
      const inactiveTime = Date.now() - lastActivity;

      // Jika sudah tidak aktif lebih dari INACTIVITY_TIMEOUT - WARNING_BEFORE_TIMEOUT
      // dan peringatan belum ditampilkan
      if (inactiveTime >= INACTIVITY_TIMEOUT - WARNING_BEFORE_TIMEOUT && !inactivityWarningShown) {
        toast.warning('Weh, kalo gaada aktivitas log-out aja. Yang ada ngeberatin server, ini gue logout otomatis ya semenit lagi.', {
          toastId: 'inactivity-warning',
        });
        setInactivityWarningShown(true);
      }

      // Jika sudah tidak aktif lebih dari INACTIVITY_TIMEOUT, lakukan logout
      if (inactiveTime >= INACTIVITY_TIMEOUT) {
        toast.info('Anda telah otomatis keluar karena tidak ada aktivitas', {
          toastId: 'inactivity-logout',
        });
        signOut();
      }
    };

    // Buat interval untuk memeriksa inaktivitas setiap 30 detik
    const timerId = window.setInterval(checkInactivity, 30000);
    setInactivityTimerId(timerId);

    // Setup event listener untuk mendeteksi aktivitas pengguna
    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click',
      'keydown', 'keyup', 'touchmove', 'touchend'
    ];

    // Use passive: true for better performance with touch events
    const handleUserActivity = () => {
      resetInactivityTimer();
    };

    // Tambahkan event listener untuk semua event aktivitas
    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Cleanup event listener saat unmount
    return () => {
      if (inactivityTimerId) {
        clearInterval(inactivityTimerId);
      }
      
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
    };
  }, [user, resetInactivityTimer]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
    localStorage.setItem('userRole', userRole || 'user');
  }, [user, userRole]);

  useEffect(() => {
    // Check active sessions and sets the user
    setIsLoading(true);
    
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        Promise.all([
          fetchUserRole(session.user.id),
          fetchAuditor(session.user.id)
        ]).finally(() => {
          // Remove the artificial delay
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });
  }, []); 

  // Add this function to check if the session is expired
  const isSessionExpired = (session) => {
    if (!session) return true;
    
    // Check if the session expires_at is in the past
    const expiresAt = session.expires_at;
    if (!expiresAt) return false;
    
    const expirationTime = expiresAt * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    
    return currentTime > expirationTime;
  };

  // Add a function to calculate time until expiration
  const calculateTimeUntilExpiration = (session) => {
    if (!session) return null;
    
    const expiresAt = session.expires_at;
    if (!expiresAt) return null;
    
    const expirationTime = expiresAt * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    
    return Math.max(0, expirationTime - currentTime);
  };

  async function fetchUserRole(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to handle null case

      if (error && error.code !== 'PGRST116') { // Ignore "No rows returned" error
        console.error('Error fetching user role:', error);
        return;
      }

      setUserRole(data?.role || 'user'); // Default to 'user' if no role found
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setUserRole('user'); // Default to 'user' on error
    }
  }

  async function fetchAuditor(userId: string) {
    try {
      const { data: auditor, error } = await supabase
        .from('auditors')
        .select('id, name')
        .eq('id', userId) // Use user_id to find the auditor record
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') { // "No rows returned" error
          console.log('User is not an auditor');
        } else {
          console.error('Error fetching auditor:', error);
        }
        setAuditor(null);
        return;
      }

      console.log('Found auditor:', auditor);
      setAuditor(auditor);
    } catch (error) {
      console.error('Error in fetchAuditor:', error);
      setAuditor(null);
    }
  }

  async function signIn(email: string, password: string) {
    setIsLoading(true); // Set loading when signing in
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Immediately set the user to avoid double login
      setUser(data.user);
      
      // Fetch the user role and auditor info
      if (data.user) {
        await Promise.all([
          fetchUserRole(data.user.id),
          fetchAuditor(data.user.id)
        ]);
      }
      
      // Then update loading state
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false); // Reset loading on error
      throw error;
    }
  }
    
  async function signOut() {
    setIsLoading(true); // Set loading when signing out
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUserRole('user'); // Reset role on sign out
      setAuditor(null); // Reset auditor on sign out
      // Loading state will be handled by the auth state change
    } catch (error) {
      setIsLoading(false); // Reset loading on error
      throw error;
    }
  }

  // Add this function to your AuthContext
  async function refreshSession() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) throw error;
      
      setUser(data.user);
      console.log('Session manually refreshed');
    } catch (error) {
      console.error('Failed to refresh session:', error);
      // Handle session refresh failure
      await signOut();
    } finally {
      setIsLoading(false);
    }
  }

  // Update expiration time periodically
  useEffect(() => {
    if (!user) {
      setSessionExpiresIn(null);
      return;
    }
    
    const updateExpirationTimer = async () => {
      const { data } = await supabase.auth.getSession();
      const timeUntilExpiration = calculateTimeUntilExpiration(data.session);
      setSessionExpiresIn(timeUntilExpiration);
      
      // Show warning when less than 5 minutes remain
      if (timeUntilExpiration && timeUntilExpiration < 5 * 60 * 1000) {
        // toast.warning('Your session will expire soon. Please save your work.');
        console.warn('Your session will expire soon. Please save your work.');
      }
    };
    
    // Initial calculation
    updateExpirationTimer();
    
    // Update every minute
    const interval = setInterval(updateExpirationTimer, 60000);
    
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Jika tab tidak aktif, abaikan event
        if (ignoreAuthChanges) {
          console.log('Ignoring auth event due to tab visibility:', event);
          return;
        }

        // Abaikan event jika belum lewat 5 detik dari event terakhir
        const now = Date.now();
        if (now - lastAuthEventTime < 5000) {
          console.log('Ignoring auth event, too soon after previous event:', event);
          return;
        }
        setLastAuthEventTime(now);

        // Hanya perbarui user jika terjadi sign-in atau sign-out
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setIsLoading(true);
          setUser(session?.user ?? null);
          if (session?.user) {
            Promise.all([
              fetchUserRole(session.user.id),
              fetchAuditor(session.user.id)
            ]).finally(() => {
              // Remove the artificial delay
              setIsLoading(false);
            });
          } else {
            setIsLoading(false);
          }
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [ignoreAuthChanges, lastAuthEventTime]); // Tambahkan dependency

  // Tambahkan listener untuk visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIgnoreAuthChanges(true);
      } else {
        // Beri delay sedikit sebelum kembali menerima event
        setTimeout(() => setIgnoreAuthChanges(false), 300);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const value = {
    user,
    userRole,
    auditor,
    isLoading,
    signIn,
    signOut,
    refreshSession,
    resetInactivityTimer, // Tambahkan fungsi ini ke context
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}