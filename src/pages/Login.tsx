import React, { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast'; // Add this import
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  // Remove the error state since we'll use toast instead
  // const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const navigate = useNavigate();
  const { signIn, isLoading: authLoading, user } = useAuth(); // Also get the user from context

  // Add this effect to redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  
  // PIC state
  const [picData, setPicData] = useState([]);
  const [loadingPic, setLoadingPic] = useState(true);
  
  // Animation state
  const [fadeIn, setFadeIn] = useState(false);
  
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
    
    // Trigger animation after component mounts
    setTimeout(() => {
      setFadeIn(true);
    }, 300);
  }, []);

  // Handle login form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      setLoading(true);
      await signIn(email, password);
      // Don't navigate here - let the useEffect handle it
    } catch (err) {
      // Replace the toast.error with our custom function
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
      // Remove setError('')
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
      {/* Add the Toaster component at the top of your JSX */}
      <Toaster 
  position="top-center" 
  reverseOrder={false}
  gutter={8}
  containerClassName=""
  containerStyle={{}}
  toastOptions={{
    // Default options for all toasts
    duration: 4000,
    style: {
      maxWidth: '350px',
      margin: '0 auto',
    },
  }}
/>
      
      {/* Existing style jsx */}
      <style jsx>{`
        /* Fix for autofill background in Chrome, Safari, and Edge */
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px rgba(30, 58, 138, 0.3) inset !important;
          -webkit-text-fill-color: white !important;
          transition: background-color 5000s ease-in-out 0s;
          caret-color: white;
        }

        /* Fix for Firefox */
        @-moz-document url-prefix() {
          input:-moz-autofill,
          input:-moz-autofill:focus {
            background-color: rgba(30, 58, 138, 0.3) !important;
            color: white !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-indigo-200 flex flex-col justify-center py-6 sm:px-6 lg:px-8">
        {/* Loading indicator remains unchanged */}
        {isPageLoading && (
          <div className="fixed top-0 left-0 w-full h-1 bg-indigo-200">
            <div className="h-full bg-indigo-600 animate-pulse-slow" style={{ width: '30%' }}></div>
          </div>
        )}


        <div className={`mt-2 sm:mx-auto sm:w-full sm:max-w-lg transition-all duration-700 ${fadeIn ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <div className="bg-indigo-200 overflow-hidden rounded-lg">
            <div className="flex flex-col">
              {/* Login Form - Now takes full width */}
              <div className="p-8 flex items-center justify-center">
                <div
                  style={{ animation: "slideInFromLeft 1s ease-out" }}
                  className="max-w-md w-full bg-gradient-to-r from-blue-800 to-purple-600 rounded-xl shadow-2xl overflow-hidden p-8 space-y-8"
                >
                  {/* Remove the error div since we're using toast */}
                  
                  {/* Keep the success message div */}
                  {message && (
                    <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 rounded-md animate-fadeIn">
                      <div className="flex">
                        <div className="ml-3">
                          <p className="text-sm text-green-700">{message}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Replace the separate heading and paragraph with this grouped div */}
                  <div className="mb-6">
                    <h2
                      style={{ animation: "appear 2s ease-out" }}
                      className="text-left text-4xl font-extrabold text-white mb-0"
                    >
                      OPTIMA Dashboard
                    </h2>
                    <p style={{ animation: "appear 3s ease-out" }} className="text-left text-gray-200 -mt-1 pl-1">
                      {isResettingPassword ? 'Reset your password' : 'Sign in to your account'}
                    </p>
                  </div>

                  {/* Login form and reset password form remain unchanged */}
                  {!isResettingPassword ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="relative mb-6">
                        <input
                          placeholder="joey@example.com"
                          className="peer h-14 w-full bg-blue-900/30 border-0 rounded-md px-4 pt-6 pb-2 text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          style={{ backgroundColor: 'rgba(30, 58, 138, 0.3)' }}
                          required
                          id="email"
                          name="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                        <label
                          className="absolute left-4 top-2 text-xs text-purple-300/80 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-300/60 peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-purple-300 peer-focus:text-xs"
                          htmlFor="email"
                        >
                          Email address
                        </label>
                      </div>
                      <div className="relative mb-6">
                        <input
                          placeholder="Password"
                          className="peer h-14 w-full bg-blue-900/30 border-0 rounded-md px-4 pt-6 pb-2 text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          style={{ backgroundColor: 'rgba(30, 58, 138, 0.3)' }}
                          required
                          id="password"
                          name="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <label
                          className="absolute left-4 top-2 text-xs text-purple-300/80 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-300/60 peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-purple-300 peer-focus:text-xs"
                          htmlFor="password"
                        >
                          Password
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center text-sm text-gray-200">
                          <input
                            className="form-checkbox h-4 w-4 text-purple-600 bg-gray-800 border-gray-300 rounded"
                            type="checkbox"
                          />
                          <span className="ml-2">Remember me</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsResettingPassword(true)}
                          className="text-sm text-purple-200 hover:underline"
                        >
                          Forgot your password?
                        </button>
                      </div>
<button
  className="relative w-full py-3 px-8 text-white text-base font-semibold overflow-hidden bg-purple-600 rounded-md transition-all duration-400 ease-in-out shadow-md hover:scale-105 hover:text-white hover:shadow-lg active:scale-95 before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-blue-800 before:to-purple-700 before:transition-all before:duration-500 before:ease-in-out before:z-[-1] before:rounded-md hover:before:left-0 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed"
  type="submit"
  disabled={loading}
>
  {loading ? (
    <>
      <svg className="animate-spin inline -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Signing in...
    </>
  ) : 'Sign In'}
</button>
                    </form>
                  ) : (
                    <form onSubmit={handlePasswordReset} className="space-y-6">
                      <div className="relative mb-6">
                        <input
                          placeholder="john@example.com"
                          className="peer h-14 w-full bg-blue-900/30 border-0 rounded-md px-4 pt-6 pb-2 text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          style={{ backgroundColor: 'rgba(30, 58, 138, 0.3)' }}
                          required
                          id="reset-email"
                          name="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                        <label
                          className="absolute left-4 top-2 text-xs text-purple-300/80 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-300/60 peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-purple-300 peer-focus:text-xs"
                          htmlFor="reset-email"
                        >
                          Email address
                        </label>
                      </div>
<button
  className="relative w-full py-3 px-8 text-white text-base font-semibold overflow-hidden bg-purple-600 rounded-md transition-all duration-400 ease-in-out shadow-md hover:scale-105 hover:text-white hover:shadow-lg active:scale-95 before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-blue-800 before:to-purple-700 before:transition-all before:duration-500 before:ease-in-out before:z-[-1] before:rounded-md hover:before:left-0 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed"
  type="submit"
  disabled={loading}
>
  {loading ? (
    <>
      <svg className="animate-spin inline -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Sending...
    </>
  ) : 'Send Reset Instructions'}
</button>
                    </form>
                  )}

                  <div className="text-center text-gray-300">
                    {isResettingPassword ? (
                      <button
                        type="button"
                        onClick={() => setIsResettingPassword(false)}
                        className="text-purple-300 hover:underline"
                      >
                        Back to login
                      </button>
                    ) : (
                      "To create an account, please contact the administrator"
                    )}
                  </div>
                </div>
              </div>
              
              {/* Person In Charge section - Now appears below login */}
              <div className="p-4 bg-indigo-200 flex flex-col">
                <h2 className="text-xs font-bold text-black mb-6 text-center marquee_header">Person In Charge</h2>
                
                {loadingPic ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (
                  <div className="marquee">
                    <div className="marquee__inner">
                      <div className="marquee__group">
                        {picData.map((person, index) => (
                          <span key={index}>{person.nama} - {person.posisi} - {person.status}</span>
                        ))}
                      </div>
                      <div className="marquee__group">
                        {picData.map((person, index) => (
                          <span key={`repeat-${index}`}>{person.nama} - {person.posisi} - {person.status}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          OPTIMA Internal Audit © 2025
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
