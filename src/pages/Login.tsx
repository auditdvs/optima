import React, { useEffect, useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BlurText from '../components/animation/BlurText';
import FallingText from '../components/animation/FallingText';
import SplitText from '../components/animation/SplitText';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const notifyError = (message: string) => {
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
  const { signIn, user } = useAuth();
  const descriptionContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Remove unused dark mode state
  // Remove unused PIC state

  // Add this effect to redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
    
    // Remove dark mode check
  }, [user, navigate]);
  
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

  // Remove unused loading state

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
      <div className="min-h-screen flex overflow-hidden">
        {/* Left Side - Blue or Reset Password Panel */}
        <div className={`flex-1 flex items-center justify-start transition-all duration-700 ease-out ${isResettingPassword ? 'bg-white' : 'bg-[#1800a5]'} relative px-0 md:px-0`}> 
          {/* Animated morph between blue info and reset password */}
          <div 
            className={`
              absolute inset-0 h-full w-full flex items-center 
              transition-all duration-700 ease-out transform origin-left
              ${isResettingPassword 
                ? 'opacity-100 z-10 scale-100 translate-x-0' 
                : 'opacity-0 z-0 pointer-events-none scale-95 -translate-x-full'
              }
            `}
          >  
            {/* Reset Password Form */}
            <div className="w-full max-w-xl pl-24 pr-8">
              <h1 className="text-5xl font-extrabold text-black mb-2 text-left">Reset Password</h1>
              <p className="text-lg font-semibold text-black mb-8 text-left">Enter your email to receive reset instructions</p>
              {message && (
                <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-md animate-fadeIn">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-green-700">{message}</p>
                    </div>
                  </div>
                </div>
              )}
              <form onSubmit={handlePasswordReset} className="space-y-6">
                <div>
                  <label htmlFor="reset-email" className="block text-base font-medium text-black mb-2 text-left">
                    Email<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="reset-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 bg-[#7d77d1] text-white border-none rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all outline-none placeholder-white/80 text-lg"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1800a5] text-white py-3 px-4 rounded-lg font-semibold text-lg hover:bg-[#0d0066] focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </div>
                  ) : 'Send reset instructions'}
                </button>
                <div className="text-left mt-6">
                  <button
                    type="button"
                    onClick={() => setIsResettingPassword(false)}
                    className="text-[#1800a5] font-bold hover:underline text-base"
                  >
                    Back to login
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Blue Info Panel */}
          <div 
            className={`
              absolute inset-0 flex flex-col items-start justify-center px-20 
              transition-all duration-700 ease-out transform origin-right
              ${isResettingPassword 
                ? 'opacity-0 z-0 pointer-events-none scale-95 translate-x-full' 
                : 'opacity-100 z-10 scale-100 translate-x-0'
              }
            `}
            ref={descriptionContainerRef}
          >
            <div className="mb-8">
              <SplitText
                text="OPTIMA!"
                className="text-9xl font-extrabold text-white mb-2"
                delay={50}
                duration={0.8}
                ease="power4.out"
                from={{ opacity: 0, y: 60, rotateX: -90 }}
                to={{ opacity: 1, y: 0, rotateX: 0 }}
                splitType="words"
              />
              <BlurText
                text="Operational Performance and Internal Audit Management Application"
                className="text-3xl font-bold text-white leading-relaxed"
                delay={100}
                animateBy="words"
                direction="bottom"
                stepDuration={0.45}
                easing={(t) => t * (2 - t)}
              />
              <BlurText
              text="Your central hub for all internal audit activities — from scheduling and working papers to anomaly detection tools and audit findings summaries. Empower your audit process with fast, accurate, and well-documented access."
              className="text-left text-lg text-white leading-relaxed mt-2"
              delay={5}
              animateBy="words"
              direction="top"
              stepDuration={0.1}
              easing={(t) => t * (2 - t)}
            />
          </div>
          </div>
        </div>

        {/* Right Side - Login Form or Indigo Panel */}
        <div 
          className={`
            flex-1 flex items-center justify-center relative z-20 
            transition-all duration-700 ease-out transform
            ${isResettingPassword 
              ? 'bg-[#1800a5]' 
              : 'bg-white'
            }
          `}
        >
          {!isResettingPassword && (
            <div className="w-full max-w-xl pl-24">
              <div className="mb-10">
                <h1 className="text-5xl font-extrabold text-black mb-2 text-left">Sign In</h1>
                <p className="text-lg font-semibold text-black mb-8 text-left">Enter your email and password to sign in!</p>
              </div>
              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-base font-medium text-black mb-2 text-left">
                    Email<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 bg-[#7d77d1] text-white border-none rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all outline-none placeholder-white/80 text-lg"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-base font-medium text-black mb-2 text-left">
                    Password<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 pr-12 bg-[#7d77d1] text-white border-none rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all outline-none placeholder-white/80 text-lg"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/80 hover:text-white transition-colors"
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
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1800a5] text-white py-3 px-4 rounded-lg font-semibold text-lg hover:bg-[#0d0066] focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
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
                <div className="flex items-center justify-between mt-2">
                  <button
                    type="button"
                    onClick={() => setIsResettingPassword(true)}
                    className="text-[#1800a5] font-bold hover:underline text-base"
                  >
                    Forgot password?
                  </button>
                  <label className="flex items-center gap-2 cursor-pointer text-black text-base">
                    <input
                      type="checkbox"
                      checked={keepLoggedIn}
                      onChange={(e) => setKeepLoggedIn(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 focus:ring-2"
                    />
                    <span>Remember me</span>
                  </label>
                </div>
                <div className="text-left text-base text-black mt-8">
                  Don't have an account?{' '}
                  <a
                    href="https://wa.me/6281288172775?text=Hello%20OPTIMA%20Admin,%20I%20want%20to%20create%20an%20account."
                    className="text-[#1800a5] font-bold hover:underline"
                  >
                    Contact administrator
                  </a>
                </div>
              </form>
            </div>
          )}
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

  const handleReset = async (e: React.FormEvent) => {
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
