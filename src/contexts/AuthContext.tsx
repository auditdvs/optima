import React, { createContext, useContext, useEffect, useState } from 'react';
import LoadingPage from '../components/LoadingPage';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: any;
  userRole: string;
  auditor: { id: string; name: string } | null;
  isLoading: boolean; // Add loading state
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [auditor, setAuditor] = useState<{ id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with loading state true

  useEffect(() => {
    // Check active sessions and sets the user
    setIsLoading(true); // Ensure loading state is true at start
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        Promise.all([
          fetchUserRole(session.user.id),
          fetchAuditor(session.user.id)
        ]).finally(() => {
          // Delay setting loading to false slightly for better user experience
          setTimeout(() => {
            setIsLoading(false);
          }, 500);
        });
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoading(true);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        Promise.all([
          fetchUserRole(session.user.id),
          fetchAuditor(session.user.id)
        ]).finally(() => {
          setTimeout(() => {
            setIsLoading(false);
          }, 500);
        });
      } else {
        setUserRole('user'); // Reset role when user logs out
        setAuditor(null); // Reset auditor when user logs out
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
        .single();

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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      // Loading state will be handled by the auth state change
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

  const value = {
    user,
    userRole,
    auditor,
    isLoading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {isLoading ? <LoadingPage /> : children}
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