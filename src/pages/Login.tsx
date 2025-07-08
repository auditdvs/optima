import React, { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const notifyError = (message) => {
  // Clear any existing toasts first
  toast.dismiss();
  
  toast.error(message, {
    position: 'top-center',
    duration: 4000,
    style: {
      background: '#f44336',
      color: '#fff',
      borderRadius: '10px',
      padding: '14px 20px',
      maxWidth: '350px',
      boxShadow: '0 3px 10px rgba(0, 0, 0, 0.2)',
      margin: '0 auto', // Center horizontally
    },
  });
};

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const navigate = useNavigate();
  const { signIn, isLoading: authLoading, user } = useAuth();

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // PIC state
  const [picData, setPicData] = useState([]);
  const [loadingPic, setLoadingPic] = useState(true);

  // Add this effect to redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }
  }, [user, navigate]);
  
  // Fetch PIC data from Supabase
  useEffect(() => {
    async function fetchPICData() {
      try {
        setLoadingPic(true);
        const { data, error } = await supabase
          .from('pic')
          .select('*');
        
        if (error) throw error;
        setPicData(data || []);
      } catch (err) {
        console.error('Error fetching PIC data:', err);
      } finally {
        setLoadingPic(false);
      }
    }
    
    fetchPICData();
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('theme', !isDarkMode ? 'dark' : 'light');
  };

  // Handle login form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      setLoading(true);
      await signIn(email, password);
      // Don't navigate here - let the useEffect handle it
    } catch (err) {
      notifyError('Failed to sign in');
      console.error(err);
      setLoading(false);
    }
  }

  // Handle password reset
  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email) {
      notifyError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      
      setMessage('Password reset instructions have been sent to your email');
      setIsResettingPassword(false);
    } catch (err) {
      notifyError('Failed to send password reset email');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Use combined loading state
  const isPageLoading = loading || authLoading;

  return (
    <>
      <Toaster 
        position="top-center" 
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            maxWidth: '350px',
            margin: '0 auto',
          },
        }}
      />
      
      <div className="min-h-screen flex">
        {/* Left Side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-md">
            {/* Back to dashboard link */}
            {user && (
              <button 
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors mb-8 group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform">
                  <path d="m12 19-7-7 7-7"/>
                  <path d="M19 12H5"/>
                </svg>
                <span className="text-sm">Back to dashboard</span>
              </button>
            )}

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-800 mb-2">
                {isResettingPassword ? 'Reset Password' : 'Sign In'}
              </h1>
              <p className="text-slate-600">
                {isResettingPassword 
                  ? 'Enter your email to receive reset instructions' 
                  : 'Enter your email and password to sign in!'}
              </p>
            </div>

            {/* Success message */}
            {message && (
              <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-md animate-fadeIn">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-green-700">{message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Login Form */}
            {!isResettingPassword ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                    Email<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@example.com"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none hover:border-slate-300"
                    required
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                    Password<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none hover:border-slate-300"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                          <line x1="2" x2="22" y1="2" y2="22"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Keep me logged in & Forgot password */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={keepLoggedIn}
                      onChange={(e) => setKeepLoggedIn(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 focus:ring-2"
                    />
                    <span className="text-slate-700">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsResettingPassword(true)}
                    className="text-indigo-600 hover:text-indigo-700 transition-colors font-medium"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 px-4 rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </div>
                  ) : 'Sign In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-6">
                {/* Email Field */}
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700 mb-2">
                    Email<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="reset-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@example.com"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none hover:border-slate-300"
                    required
                  />
                </div>

                {/* Send Reset Instructions Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 px-4 rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </div>
                  ) : 'Send Reset Instructions'}
                </button>
                
                {/* Back to login */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsResettingPassword(false)}
                    className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                  >
                    Back to login
                  </button>
                </div>
              </form>
            )}

            {/* Account creation note */}
            <p className="text-center text-sm text-slate-600 mt-6">
              Don't have an account?{' '}
                <a
                href="https://wa.me/6281288172775?text=Hello%20OPTIMA%20Admin,%20I%20want%20to%20create%20an%20account."
                className="text-indigo-600 font-semibold hover:underline"
                >
                Contact administrator
                </a>
            </p>
          </div>
        </div>

        {/* Right Side - Branding */}
        <div className="flex-1 relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-8">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
            <div className="absolute top-0 right-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{ animationDelay: '4s' }}></div>
          </div>

          {/* Content */}
          <div className="relative z-10 text-center max-w-md">
            <div className="mb-2 flex justify-center">
              <Logo size="lg" />
            </div>
            <h2 className="text-s text-slate-300 leading-relaxed">
              Operational Performance and Internal Audit Management Application
            </h2>

            {/* PIC Section - Integrated in the right panel */}
            <div className="mt-2 pt-2 border-t border-white/10">
              <h3 className="text-sm font-semibold text-white/70 mb-3 text-left">PERSON IN CHARGE</h3>
              
              {loadingPic ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white/50"></div>
                </div>
              ) : (
                <div className="space-y-1 text-left">
                  {picData.map((person, index) => (
                    <div key={index} className="text-white/70 text-sm">
                      {person.nama} as {person.posisi} {person.status.toLowerCase().includes('active') 
                        ? 'currently Active' 
                        : `on ${person.status}`}{index < picData.length - 1 ? ',' : '.'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="absolute bottom-8 right-8 p-3 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-all transform hover:scale-110"
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2"/>
                <path d="M12 20v2"/>
                <path d="m4.93 4.93 1.41 1.41"/>
                <path d="m17.66 17.66 1.41 1.41"/>
                <path d="M2 12h2"/>
                <path d="M20 12h2"/>
                <path d="m6.34 17.66-1.41 1.41"/>
                <path d="m19.07 4.93-1.41 1.41"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            )}
          </button>
          
          {/* Footer */}
          <div className="absolute bottom-4 text-center w-full text-white/40 text-xs">
            OPTIMA Internal Audit © 2025
          </div>
        </div>
      </div>
    </>
  );
}

// ResetPassword component remains unchanged
function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const accessToken = searchParams.get('access_token');

  const handleReset = async (e) => {
    e.preventDefault();
    if (!accessToken) {
      setMessage('Invalid or missing token');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else setMessage('Password updated! You can now log in.');
  };

  return (
    <form onSubmit={handleReset}>
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="New password"
        required
      />
      <button type="submit">Set New Password</button>
      {message && <div>{message}</div>}
    </form>
  );
}

export default Login;
export { ResetPassword };