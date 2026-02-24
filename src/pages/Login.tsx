import { ArrowLeft, Eye, EyeOff, Lock, Mail, Send } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import BlurText from '../components/animation/BlurText';
import SplitText from '../components/animation/SplitText';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// Memoized Visual Component to prevent re-renders
const LoginVisuals = React.memo(({ isResettingPassword }: { isResettingPassword: boolean }) => (
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
          textAlign="left"
        />
        <BlurText
          text="Operational Performance and Internal Audit Management Application"
          className="text-xl md:text-2xl font-medium text-indigo-100/90 leading-tight"
          startDelay={800}
          delay={30} // 30ms stagger
          animateBy="words"
        />
      </div>
    </div>

    <div className={`relative z-10 transition-all duration-700 delay-300 transform ${isResettingPassword ? 'translate-y-10 opacity-0' : 'translate-y-0 opacity-100'}`}>
      <BlurText
        text="Your central hub for all internal audit activities. Empower your process with fast, accurate, and well-documented tools."
        className="text-sm text-indigo-200/80 leading-relaxed max-w-md"
        startDelay={1800}
        delay={20} // 20ms stagger
        animateBy="words"
      />
    </div>
  </div>
));

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdminContact, setShowAdminContact] = useState(false);

  const navigate = useNavigate();
  const { signIn, user } = useAuth();

  const adminContacts = [
    {
      name: 'Admin Baik',
      role: 'Support 1',
      phone: '6281288172775',
      message: 'Hello%20Admin,%20I%20need%20help%20with%20my%20account.' 
    },
    {
      name: 'Admin Baik Sekali',
      role: 'Support 2',
      phone: '628172320099', 
      message: 'Hello%20Admin%20Baik%20Sekali,%20I%20need%20help%20with%20my%20account.'
    }
  ];

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
      setTimeout(() => {
        toast.custom(
          (t) => (
            <div
              className={`
                bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 rounded-2xl shadow-xl p-4 max-w-sm
                transform transition-all duration-500 ease-out
                ${t.visible ? 'animate-in slide-in-from-bottom fade-in' : 'animate-out slide-out-to-right fade-out'}
              `}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <img 
                    src="/assets/tips.svg" 
                    alt="Tips" 
                    className="w-12 h-12 object-contain"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900">
                    OPTIMA Quick Guide
                  </p>
                  <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                    Did you know? The{' '}
                    <a 
                      href="/tutorials" 
                      className="font-semibold text-amber-600 hover:text-amber-800 underline underline-offset-2 transition-colors"
                    >
                      Tutorial menu
                    </a>{' '}
                    can help guide you through OPTIMA.
                  </p>
                </div>
              </div>
            </div>
          ),
          { duration: 10000, position: 'bottom-right' }
        );
      }, 1000);
    }
  }, [user, navigate]);

  // Auto-dismiss error after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      await signIn(email, password);
      toast.success('Login Successful, Have a great day!', {
        style: {
          background: '#059669',
          color: '#fff',
          padding: '16px',
          borderRadius: '16px',
          fontWeight: '500',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#059669',
        },
        duration: 3000,
      });
    } catch (err: any) {
      // Handle specific Supabase auth errors
      if (err?.message?.includes('Invalid login credentials')) {
        setError('Nice try. That email or password is incorrect.');
      } else if (err?.message?.includes('Email not confirmed')) {
        setError('Email belum dikonfirmasi. Silakan cek inbox Anda.');
      } else if (err?.message?.includes('banned') || err?.message?.includes('user_banned')) {
        setError('BANNED:Anda sudah tidak memiliki akses lagi ke dalam platform.');
      } else {
        setError('Gagal masuk. Silakan coba lagi.');
      }
      console.error(err);
      setLoading(false);
    }
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setMessage('Reset instructions sent to your email');
      setTimeout(() => {
        setIsResettingPassword(false);
        setMessage('');
      }, 3000);
    } catch (err) {
      setError('Failed to send password reset email');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      
      {/* Custom Minimalist Centered Error Popup */}
      {error && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className={`${error.startsWith('BANNED:') ? 'bg-gray-900' : 'bg-red-500'} shadow-2xl p-6 rounded-2xl flex flex-col items-center text-center animate-in zoom-in-95 fade-in duration-300 pointer-events-auto max-w-sm mx-4`}>
            {error.startsWith('BANNED:') ? (
              <>
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-1 font-display">
                  Akses Ditolak
                </h3>
                <p className="text-white/80 text-sm leading-relaxed font-medium">
                  {error.replace('BANNED:', '')}
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white mb-1 font-display">
                  Access Denied
                </h3>
                <p className="text-white/90 text-sm leading-relaxed font-medium">
                  {error}
                </p>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Background with abstract shapes */}
      <div className="min-h-screen relative flex items-center justify-center bg-slate-50 overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
        <div className="absolute top-[-20%] left-[-10%] w-[40rem] h-[40rem] bg-purple-400/40 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob" />
        <div className="absolute top-[-20%] right-[-10%] w-[40rem] h-[40rem] bg-indigo-400/40 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-20%] left-20 w-[40rem] h-[40rem] bg-pink-400/40 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob animation-delay-4000" />
        <div className="absolute bottom-[-20%] right-20 w-[40rem] h-[40rem] bg-blue-400/40 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob animation-delay-2000" />
        
        {/* Main Card */}
        <div className="relative w-full max-w-5xl h-[700px] bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row m-4">
          
          {/* Left Panel - Visual & Branding */}
          <LoginVisuals isResettingPassword={isResettingPassword} />

          {/* Right Panel - Interactive Forms */}
          <div className="flex-1 bg-white relative">
            <div className={`absolute inset-0 px-8 py-12 md:px-16 flex flex-col justify-center transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isResettingPassword ? 'opacity-0 translate-x-10 pointer-events-none' : 'opacity-100 translate-x-0'}`}>
              <div className="mb-10">
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome Back</h2>
                <p className="text-gray-500 mt-2">Please enter your details to sign in.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider ml-1">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50/50 transition-all outline-none text-gray-900 placeholder:text-gray-400"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider ml-1">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
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

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={keepLoggedIn}
                        onChange={(e) => setKeepLoggedIn(e.target.checked)}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 transition-all checked:border-indigo-600 checked:bg-indigo-600 hover:border-indigo-400"
                      />
                      <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white transition-opacity" viewBox="0 0 14 14" fill="none">
                        <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Remember me</span>
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => setIsResettingPassword(true)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 bg-[#1800a5] text-white h-12 rounded-xl font-semibold text-[15px] hover:bg-indigo-900 focus:ring-4 focus:ring-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="mt-8 text-center relative z-20">
                <p className="text-sm text-gray-500">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setShowAdminContact(!showAdminContact)}
                    className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors focus:outline-none relative"
                  >
                    Contact admin
                  </button>
                </p>

                {/* Admin Contact Popover */}
                {showAdminContact && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowAdminContact(false)} 
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 animate-in fade-in zoom-in-95 duration-200 z-20">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 text-left">
                        Select Support Channel
                      </div>
                      <div className="space-y-1">
                        {adminContacts.map((contact, index) => (
                          <a
                            key={index}
                            href={`https://wa.me/${contact.phone}?text=${contact.message}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 w-full p-2.5 hover:bg-indigo-50 rounded-xl transition-colors group text-left"
                            onClick={() => setShowAdminContact(false)}
                          >
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600 group-hover:bg-green-500 group-hover:text-white transition-colors">
                              {/* Simple Phone/Chat Icon */}
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700">
                                {contact.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {contact.role}
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                      
                      {/* Triangle Pointer */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-2 border-8 border-transparent border-t-white" />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Forgot Password View */}
            <div className={`absolute inset-0 px-8 py-12 md:px-16 flex flex-col justify-center transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isResettingPassword ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
              <button 
                onClick={() => setIsResettingPassword(false)}
                className="absolute top-12 left-12 md:left-16 p-2 -ml-2 text-gray-500 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>

              <div className="flex justify-center mb-6">
                <img 
                  src="/assets/forgot.svg" 
                  alt="Forgot Password" 
                  className="w-32 h-32 object-contain"
                />
              </div>

              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Forgot Password</h2>
                <p className="text-gray-500 mt-2">Enter your email to receive instructions.</p>
              </div>
              
              {message && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">{message}</span>
                </div>
              )}

              <form onSubmit={handlePasswordReset} className="space-y-6">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider ml-1">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50/50 transition-all outline-none text-gray-900 placeholder:text-gray-400"
                        required
                      />
                    </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1800a5] text-white h-12 rounded-xl font-semibold text-[15px] hover:bg-indigo-900 focus:ring-4 focus:ring-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Instructions</span>
                      <Send className="w-4 h-4 ml-1" />
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

export default Login;

