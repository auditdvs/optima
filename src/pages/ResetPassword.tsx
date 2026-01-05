import { ArrowRight, Eye, EyeOff, Home, Lock } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import BlurText from '../components/animation/BlurText';
import SplitText from '../components/animation/SplitText';
import { supabase } from '../lib/supabase';

function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSessionValid, setIsSessionValid] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a valid password reset token from URL hash
    const checkPasswordResetToken = async () => {
      // Check if URL has the password recovery hash/token
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      // If we have access_token and type=recovery in URL, let Supabase handle it
      if (accessToken && type === 'recovery') {
        // Small delay to allow Supabase to process URL hash
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setIsSessionValid(true);
          return;
        }
      }
      
      // Also listen for PASSWORD_RECOVERY event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session) {
          setIsSessionValid(true);
        }
      });

      // If no valid token in URL hash, check if there's a recovery session already
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (isSessionValid === null) {
        // No valid password reset token found
        setIsSessionValid(false);
      }

      return () => {
        subscription.unsubscribe();
      };
    };

    checkPasswordResetToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setError('');
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setMessage('Password has been reset successfully');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Error resetting password:', err);
      setError('Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Loading State
  if (isSessionValid === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Error/Unauthorized View
  if (isSessionValid === false) {
    return (
      <div className="min-h-screen relative flex items-center justify-center bg-slate-50 overflow-hidden font-sans text-center">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-200/30 rounded-full blur-[120px] mix-blend-multiply" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-200/30 rounded-full blur-[120px] mix-blend-multiply" />
        
        <div className="relative z-10 max-w-2xl mx-auto px-4">
          {/* Abstract Card Container */}
          <div className="relative bg-white/40 backdrop-blur-lg rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-white/60 p-12 md:p-16">
            
            <div className="flex justify-center mb-6">
              <img 
                src="/assets/404 not found.svg" 
                alt="404 Not Found" 
                className="w-48 h-48 object-contain"
              />
            </div>
            
            <div className="space-y-2 mb-6">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
                Link Expired or Invalid
              </h1>
              <p className="text-lg md:text-xl font-medium text-gray-600">
                Password reset link is not valid
              </p>
            </div>
            
            <div className="max-w-md mx-auto mb-10">
              <p className="text-gray-500 leading-relaxed">
                Oops! It seems like this password reset link is invalid or has expired. 
                Please try requesting a new one.
              </p>
            </div>
            
            <button
              onClick={async () => {
                // Sign out any stale session before navigating to login
                await supabase.auth.signOut();
                navigate('/login');
              }}
              className="group inline-flex items-center gap-2.5 bg-gradient-to-r from-[#8c71de] to-[#a78bfa] text-white px-8 py-4 rounded-2xl font-semibold text-[15px] hover:from-[#7c5fd4] hover:to-[#9775f5] focus:ring-4 focus:ring-purple-500/20 active:scale-[0.98] transition-all shadow-lg shadow-purple-500/25 hover:-translate-y-0.5"
            >
              <Home className="w-4 h-4" />
              <span>Back to Login</span>
            </button>

          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      
      {/* Background with abstract shapes */}
      <div className="min-h-screen relative flex items-center justify-center bg-slate-50 overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-200/30 rounded-full blur-[120px] mix-blend-multiply" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200/30 rounded-full blur-[120px] mix-blend-multiply" />
        
        {/* Main Card */}
        <div className="relative w-full max-w-5xl h-[700px] bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row m-4">
          
          {/* Left Panel - Visual & Branding */}
          <div className="relative flex-1 bg-[#1800a5] p-12 flex flex-col justify-between overflow-hidden">
             {/* Decorative circles */}
             <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />

            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl mb-8 flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-full" />
              </div>
              
              <div className="space-y-6">
                <SplitText
                  text="OPTIMA"
                  className="text-6xl md:text-7xl font-bold text-white tracking-tighter"
                  startDelay={100}
                  delay={50}
                  duration={1.2}
                />
                <BlurText
                  text="Secure Your Account"
                  className="text-xl md:text-2xl font-medium text-indigo-100/90 leading-tight"
                  startDelay={800}
                  delay={50}
                  animateBy="words"
                />
              </div>
            </div>

            <div className="relative z-10 transition-all duration-700 delay-300 transform translate-y-0 opacity-100">
              <BlurText
                text="Create a strong password to protect your audit data and maintain the integrity of your work."
                className="text-sm text-indigo-200/80 leading-relaxed max-w-md"
                startDelay={1800}
                delay={20}
                animateBy="words"
              />
            </div>
          </div>

          {/* Right Panel - Interactive Forms */}
          <div className="flex-1 bg-white relative">
            <div className="absolute inset-0 px-8 py-12 md:px-16 flex flex-col justify-center">
              <div className="mb-10">
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Set New Password</h2>
                <p className="text-gray-500 mt-2">Please enter your new password below.</p>
              </div>

              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}
              
              {message && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                  <span className="text-sm font-medium">{message}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider ml-1">New Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50/50 transition-all outline-none text-gray-900 placeholder:text-gray-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider ml-1">Confirm Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50/50 transition-all outline-none text-gray-900 placeholder:text-gray-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 bg-[#1800a5] text-white h-12 rounded-xl font-semibold text-[15px] hover:bg-indigo-900 focus:ring-4 focus:ring-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Resetting...</span>
                    </>
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ResetPassword;