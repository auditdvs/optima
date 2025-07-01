import { AlertTriangle, Info, RefreshCw, Send, Settings, Trash2, Wrench, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { grammarService } from '../services/grammarService';
import '../styles/grammar-correction.css';

interface GrammarRequest {
  id: string;
  user_id: string;
  original_text: string;
  corrected_text: string | null;
  status: 'pending' | 'completed';
  created_at: string;
}

interface ServiceStatus {
  status: 'ready' | 'error' | 'offline';
  message?: string;
}

export default function GrammarCorrectionPage() {
  const [text, setText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [requests, setRequests] = useState<GrammarRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showPopup, setShowPopup] = useState<boolean>(true);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>('');
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({ status: 'ready' });
  const [showServiceError, setShowServiceError] = useState<boolean>(true);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(true); // Show terms on first visit
  const [hasSeenTerms, setHasSeenTerms] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchRequests();
    checkUserRole();
    fetchServiceStatus();
    
    // Check if user has seen terms before
    const termsAccepted = localStorage.getItem('optima_terms_accepted');
    if (termsAccepted) {
      setShowTermsModal(false);
      setHasSeenTerms(true);
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Auto refresh management (tanpa auto scroll)
  useEffect(() => {
    const hasPendingRequests = requests.some(req => req.status === 'pending');
    
    if (hasPendingRequests && !isAutoRefreshing && serviceStatus.status === 'ready') {
      startAutoRefresh();
    } else if (!hasPendingRequests && isAutoRefreshing) {
      stopAutoRefresh();
    }
  }, [requests, isAutoRefreshing, serviceStatus.status]);

  // Auto scroll when new response comes
  useEffect(() => {
    if (requests.length > 0) {
      const lastRequest = requests[requests.length - 1];
      if (lastRequest.status === 'completed') {
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [requests]);

  const checkUserRole = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (user.user) {
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.user.id)
          .single();
        
        setUserRole(userRole?.role || '');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      setUserRole('superadmin'); // Fallback
    }
  };

  const fetchServiceStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'grammar_service_status')
        .single();
      
      if (data) {
        setServiceStatus(JSON.parse(data.value));
      }
    } catch (error) {
      console.error('Error fetching service status:', error);
    }
  };

  const updateServiceStatus = async (newStatus: ServiceStatus) => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({
          value: JSON.stringify(newStatus)
        })
        .eq('key', 'grammar_service_status');
      
      if (error) throw error;
      
      setServiceStatus(newStatus);
      setShowStatusModal(false);
      setShowServiceError(true); // Show popup lagi kalau status berubah
      
    } catch (error) {
      console.error('Error updating service status:', error);
      alert('Failed to update service status. Please try again.');
    }
  };

  const startAutoRefresh = () => {
    setIsAutoRefreshing(true);
    refreshIntervalRef.current = setInterval(() => {
      fetchRequests(false);
    }, 3000);
  };

  const stopAutoRefresh = () => {
    setIsAutoRefreshing(false);
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  const fetchRequests = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data, error } = await grammarService.getRequests();
      if (error) throw error;
      
      // Sort by created_at ascending (oldest first) untuk chat normal
      const sortedData = (data || []).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      setRequests(sortedData);
    } catch (error) {
      console.error('Error fetching grammar requests:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || serviceStatus.status !== 'ready') return;

    setIsSubmitting(true);
    try {
      const { data, error } = await grammarService.submitText(text);
      if (error) throw error;
      
      setText('');
      await fetchRequests();
      
      // Auto scroll ke bawah setelah submit
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (error) {
      console.error('Error submitting text:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualRefresh = () => {
    fetchRequests();
  };

  const clearUserChat = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Delete all user's grammar requests
      const { error } = await supabase
        .from('grammar_requests')
        .delete()
        .eq('user_id', user.user.id);

      if (error) throw error;

      // Clear local state
      setRequests([]);
      setShowClearConfirm(false);
      
      console.log('Chat cleared successfully');
    } catch (error) {
      console.error('Error clearing chat:', error);
      alert('Failed to clear chat. Please try again.');
    }
  };

  const handleClearChat = () => {
    setShowClearConfirm(true); // Show custom dialog instead of browser confirm
  };

  const acceptTerms = () => {
    localStorage.setItem('optima_terms_accepted', 'true');
    setShowTermsModal(false);
    setHasSeenTerms(true);
  };

  const showTermsAgain = () => {
    setShowTermsModal(true);
  };

  const getStatusConfig = () => {
    switch (serviceStatus.status) {
      case 'ready':
        return { 
          text: 'Ready', 
          dotColor: 'bg-emerald-500', 
          shadowColor: 'shadow-emerald-500/50' 
        };
      case 'error':
        return { 
          text: 'Error', 
          dotColor: 'bg-red-500', 
          shadowColor: 'shadow-red-500/50' 
        };
      case 'offline':
        return { 
          text: 'Offline', 
          dotColor: 'bg-yellow-500', 
          shadowColor: 'shadow-yellow-500/50' 
        };
      default:
        return { 
          text: 'Ready', 
          dotColor: 'bg-emerald-500', 
          shadowColor: 'shadow-emerald-500/50' 
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              {/* Icon */}
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-200 rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl">📋</span>
              </div>
              
              {/* Title */}
              <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Ketentuan Penggunaan
              </h3>
              <p className="text-gray-600">VIMA (<em>Virtual Internal Management Assistant</em>) - AI Grammar Correction</p>
            </div>
             
            {/* Content */}
            <div className="text-left space-y-4 mb-8">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                <h4 className="font-semibold text-indigo-800 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-indigo-600 text-white rounded-full text-xs flex items-center justify-center">✓</span>
                  Harap Dibaca dengan Saksama
                </h4>
                
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <div className="flex gap-3">
                    <span className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full text-sm flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <p>OPTIMA hanya membantu memperbaiki tata bahasa sesuai dengan <strong>KBBI</strong>, <strong>PUEBI</strong>, dan <strong>EBI</strong>.</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <span className="w-6 h-6 bg-yellow-100 text-yellow-600 rounded-full text-sm flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <p>Diharapkan <strong>tidak semua hasil</strong> disalin dan ditempel karena setiap auditor memiliki <em>warna bahasa</em> masing-masing, walaupun dengan bahasa yang baku.</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full text-sm flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <p>Harap <strong>tidak seluruh kata</strong> dalam laporan dimasukkan ke chatbot ini. Gunakan secara bijak untuk bagian yang memerlukan koreksi.</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full text-sm flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                    <p>Chatbot ini menggunakan referensi utama dari <strong>Laporan Hasil Audit 2025</strong> yang sudah diperbaiki oleh <strong>Quality Assurance</strong>.</p>
                  </div>
                </div>
              </div>
              
              {/* Footer message */}
              <div className="text-center">
                <p className="text-gray-600 italic">
                  Terima kasih sudah membaca keseluruhan ketentuan ini.
                </p>
              </div>
            </div>
            
            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={acceptTerms}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all hover:scale-105 shadow-lg"
              >
                Saya Mengerti & Setuju
              </button>
            </div>
            
            {/* Fine print */}
            <p className="text-xs text-gray-400 mt-4 text-center">
              Ketentuan ini akan ditampilkan sekali. Anda dapat mengaksesnya kembali melalui tombol info.
            </p>
          </div>
        </div>
      )}

      {/* Service Status Toast - Tailwind Popup */}
      {serviceStatus.status !== 'ready' && showServiceError && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right-full duration-300">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 max-w-sm">
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-full ${
                serviceStatus.status === 'error' 
                  ? 'bg-red-100 text-red-600' 
                  : 'bg-yellow-100 text-yellow-600'
              }`}>
                {serviceStatus.status === 'error' ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Wrench className="w-4 h-4" />
                )}
              </div>
              
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {serviceStatus.status === 'error' ? 'Service Error' : 'Service Offline'}
                </h4>
                <p className="text-sm text-gray-600">
                  {serviceStatus.message || 'Grammar correction service is currently unavailable.'}
                </p>
              </div>
              
              <button
                onClick={() => setShowServiceError(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 bg-white mx-4 mb-4 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Status Left */}
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${statusConfig.dotColor} ${statusConfig.shadowColor} shadow-lg animate-pulse`}></div>
              <span className="text-white/90 font-medium">{statusConfig.text}</span>
              
              {userRole === 'superadmin' && (
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="ml-3 p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <Settings className="w-4 h-4 text-white" />
                </button>
              )}
            </div>

            {/* Title Center */}
            <h1 className="text-xl font-bold text-white">
              🤖 VIMA - AI Grammar Correction
            </h1>

            {/* Actions Right */}
            <div className="flex items-center gap-2">
              {/* Info Button - Show Terms */}
              <button
                onClick={showTermsAgain}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Lihat Ketentuan Penggunaan"
              >
                <Info className="w-4 h-4 text-white" />
              </button>
              
              {/* Clear Chat Button */}
              {requests.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="flex items-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors group"
                  title="Clear Chat"
                >
                  <Trash2 className="w-4 h-4 text-red-200 group-hover:text-red-100" />
                  <span className="text-red-200 group-hover:text-red-100 font-medium text-sm">Clear</span>
                </button>
              )}
              
              {/* Refresh Button */}
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
                <span className="text-white font-medium text-sm">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Custom Clear Chat Confirmation Dialog */}
        {showClearConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="text-center">
                {/* Icon */}
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                
                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-2">Clear All Messages?</h3>
                
                {/* Description */}
                <p className="text-gray-600 mb-6 leading-relaxed">
                  This will permanently delete all your chat messages and conversation history. 
                  This action cannot be undone.
                </p>
                
                {/* Message Count */}
                <div className="bg-gray-50 rounded-lg p-3 mb-6">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">{requests.length} message{requests.length > 1 ? 's' : ''}</span> will be deleted
                  </p>
                </div>
                
                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={clearUserChat}
                    className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                  >
                    Delete All
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Modal */}
        {showStatusModal && userRole === 'superadmin' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Service Status Settings</h3>
              
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => updateServiceStatus({ status: 'ready' })}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    serviceStatus.status === 'ready'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="font-medium">Ready</span>
                </button>
                
                <button
                  onClick={() => updateServiceStatus({ status: 'error', message: 'Service temporarily unavailable' })}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    serviceStatus.status === 'error'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="font-medium">Error</span>
                </button>
                
                <button
                  onClick={() => updateServiceStatus({ status: 'offline', message: 'Service is offline for maintenance' })}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    serviceStatus.status === 'offline'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="font-medium">Offline</span>
                </button>
              </div>
              
              <button
                onClick={() => setShowStatusModal(false)}
                className="w-full py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {loading && requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="flex gap-1 mb-4">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
              </div>
              <p>Loading conversation...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex items-start gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white">
                🤖
              </div>
              <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border max-w-md">
                <p className="mb-2">Halo! Saya VIMA, asisten AI untuk koreksi tata bahasa laporan audit.</p>
                {serviceStatus.status === 'ready' ? (
                  <div>
                    <p className="mb-3">Silakan kirim teks yang ingin Anda koreksi!</p>
                    {hasSeenTerms && (
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                        💡 <strong>Tips:</strong> Gunakan untuk memperbaiki tata bahasa sesuai KBBI, PUEBI, dan EBI.
                      </div>
                    )}
                  </div>
                ) : (
                  <p>Maaf, layanan sedang tidak tersedia. Silakan coba lagi nanti.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {requests.map((request) => (
                <div key={request.id} className="space-y-4">
                  {/* User Message */}
                  <div className="flex justify-end items-start gap-3">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl rounded-tr-sm p-4 max-w-md">
                      <p>{request.original_text}</p>
                      <span className="text-xs text-white/70 mt-2 block">
                        {new Date(request.created_at).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      👤
                    </div>
                  </div>

                  {/* Assistant Response */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white">
                      🤖
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border max-w-md">
                      {request.status === 'pending' ? (
                        <div className="text-indigo-600">
                          <div className="flex gap-1 mb-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                          </div>
                          <p className="font-medium">VIMA sedang bekerja...</p>
                          <p className="text-sm text-gray-600 italic">Menganalisis dan memperbaiki tata bahasa...</p>
                        </div>
                      ) : request.corrected_text ? (
                        <div>
                          <p className="font-medium text-emerald-600 mb-3">✅ Koreksi Tata Bahasa Selesai!</p>
                          <div className="bg-gray-50 border-l-4 border-emerald-500 p-3 rounded font-serif leading-relaxed">
                            {request.corrected_text}
                          </div>
                          <div className="mt-3 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                            💡 <strong>Ingat:</strong> Sesuaikan dengan gaya bahasa Anda sendiri
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-emerald-600 mb-2">✅ Analisis Teks Selesai!</p>
                          <p>Teks Anda sudah sesuai tata bahasa yang benar! Tidak perlu perubahan.</p>
                        </div>
                      )}
                      {request.status === 'completed' && (
                        <span className="text-xs text-gray-500 mt-2 block">
                          Selesai pada {new Date(request.created_at).toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Form */}
        <div className="bg-white p-4 border-t">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                serviceStatus.status === 'ready' 
                  ? "Type your Indonesian audit report text here for grammar correction..."
                  : "Service is currently unavailable. Please try again later."
              }
              rows={3}
              disabled={isSubmitting || serviceStatus.status !== 'ready'}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={isSubmitting || !text.trim() || serviceStatus.status !== 'ready'}
              className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}