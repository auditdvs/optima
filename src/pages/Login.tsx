import { Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import LoadingPage from '../components/LoadingPage';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

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
      setError('');
      setLoading(true);
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to sign in');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Handle password reset
  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setError('');
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      
      setMessage('Password reset instructions have been sent to your email');
      setIsResettingPassword(false);
    } catch (err) {
      setError('Failed to send password reset email');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-6 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className={`rounded-full bg-indigo-100 p-3 transition-all duration-700 ${fadeIn ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
            <Users className="h-12 w-12 text-indigo-600" />
          </div>
        </div>
        <h2 className={`mt-1 text-center text-3xl font-extrabold text-gray-900 transition-all duration-700 ${fadeIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          OPTIMA Dashboard
        </h2>
      </div>

      <div className={`mt-2 sm:mx-auto sm:w-full sm:max-w-5xl transition-all duration-700 ${fadeIn ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        <div className="bg-white overflow-hidden shadow-md rounded-lg">
          <div className="flex flex-col md:flex-row">
            {/* Login Form */}
            <div className="md:w-1/2 p-8 md:border-r md:border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h3>
              
              {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-md animate-fadeIn">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {message && (
                <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 rounded-md animate-fadeIn">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-green-700">{message}</p>
                    </div>
                  </div>
                </div>
              )}

              {!isResettingPassword ? (
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email address
                    </label>
                    <div className="mt-1">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <div className="mt-1">
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                        Remember me
                      </label>
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition duration-150 ease-in-out transform hover:scale-[1.02]"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Signing in...
                        </>
                      ) : 'Sign in'}
                    </button>
                  </div>
                </form>
              ) : (
                <form className="space-y-6" onSubmit={handlePasswordReset}>
                  <div>
                    <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">
                      Email address
                    </label>
                    <div className="mt-1">
                      <input
                        id="reset-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                      />
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition duration-150 ease-in-out transform hover:scale-[1.02]"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </>
                      ) : 'Send Reset Instructions'}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Options</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-col space-y-4">
                  <button
                    type="button"
                    onClick={() => setIsResettingPassword(!isResettingPassword)}
                    className="text-sm text-indigo-600 hover:text-indigo-500 transition duration-150 ease-in-out"
                  >
                    {isResettingPassword ? 'Back to login' : 'Forgot your password?'}
                  </button>
                  
                  <p className="text-center text-sm text-gray-600">
                    To create an account, please contact the administrator
                  </p>
                </div>
              </div>
            </div>
            
            {/* Person In Charge section */}
            <div className="md:w-1/2 p-4 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">Person In Charge</h2>
              
              {loadingPic ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <>
                  <div 
                    className="relative overflow-x-auto shadow-md sm:rounded-lg max-h-[400px] overflow-y-auto"
                    style={{
                      msOverflowStyle: 'none',  /* IE and Edge */
                      scrollbarWidth: 'none',   /* Firefox */
                      '&::-webkit-scrollbar': {
                        display: 'none'         /* Chrome, Safari and Opera */
                      }
                    }}
                  >
                    <table className="w-full text-sm text-left text-gray-500">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                          <th scope="col" className="px-6 py-3">
                            Nama
                          </th>
                          <th scope="col" className="px-6 py-3">
                            Posisi
                          </th>
                          <th scope="col" className="px-6 py-3">
                            PIC Area
                          </th>
                          <th scope="col" className="px-6 py-3">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {picData.length > 0 ? (
                          picData.map((person, index) => (
                            <tr key={index} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                              <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                {person.nama}
                              </th>
                              <td className="px-6 py-4">
                                {person.posisi}
                              </td>
                              <td className="px-6 py-4">
                                {person.pic_area}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  person.status === 'Active' ? 'bg-green-100 text-green-800' : 
                                  person.status === 'Sick' ? 'bg-red-100 text-red-800' : 
                                  person.status === 'On leave' ? 'bg-yellow-100 text-yellow-800' :
                                  person.status === 'On Branch' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {person.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr className="bg-white">
                            <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                              No PIC data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>               
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 text-center text-sm text-gray-500">
        OPTIMA Internal Audit © 2025
      </div>
    </div>
  );
}

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

// Add these animations to your global CSS file
const globalStyles = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pulseEffect {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

.animate-fadeIn {
  animation: fadeIn 0.5s ease-out;
}

.animate-pulse-slow {
  animation: pulseEffect 3s infinite ease-in-out;
}
`;

export default Login;
export { ResetPassword };
