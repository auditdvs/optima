import { useEffect, useState } from 'react';
import { grammarService } from '../services/supabaseClient';
import '../styles/grammar-correction.css';

interface GrammarRequest {
  id: string;
  user_id: string;
  original_text: string;
  corrected_text: string | null;
  status: 'pending' | 'completed';
  created_at: string;
}

export default function GrammarCorrectionPage() {
  const [text, setText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [requests, setRequests] = useState<GrammarRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<GrammarRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (activeRequest?.id && activeRequest.status === 'pending') {
      const subscription = grammarService.subscribeToChanges(
        activeRequest.id,
        (payload) => {
          if (payload.new.status === 'completed') {
            fetchRequests();
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [activeRequest]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await grammarService.getRequests();
      if (error) throw error;
      
      setRequests(data || []);
      if (data?.length > 0 && !activeRequest) {
        setActiveRequest(data[0]);
      }
    } catch (error) {
      console.error('Error fetching grammar requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await grammarService.submitText(text);
      if (error) throw error;
      
      setText('');
      await fetchRequests();
      if (data?.[0]) {
        setActiveRequest(data[0]);
      }
    } catch (error) {
      console.error('Error submitting text:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grammar-correction-container">
      <h1>Koreksi Tata Bahasa Laporan Audit</h1>
      
      <div className="input-section">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="audit-text">Masukkan teks laporan audit:</label>
            <textarea
              id="audit-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Masukkan teks laporan audit dalam Bahasa Indonesia di sini..."
              rows={8}
              disabled={isSubmitting}
            />
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting || !text.trim()}
            className="submit-button"
          >
            {isSubmitting ? "Memproses..." : "Koreksi Tata Bahasa"}
          </button>
        </form>
      </div>

      <div className="result-section">
        <h2>Riwayat Koreksi</h2>
        
        {loading ? (
          <div className="loading">Memuat data...</div>
        ) : requests.length === 0 ? (
          <div className="empty-state">Belum ada permintaan koreksi.</div>
        ) : (
          <div className="results-container">
            <div className="requests-list">
              <h3>Permintaan</h3>
              {requests.map((req) => (
                <div 
                  key={req.id} 
                  className={`request-item ${activeRequest?.id === req.id ? 'active' : ''}`}
                  onClick={() => setActiveRequest(req)}
                >
                  <div className="request-header">
                    <span className="request-date">
                      {new Date(req.created_at).toLocaleString('id-ID')}
                    </span>
                    <span className={`request-status ${req.status}`}>
                      {req.status === 'pending' ? 'Menunggu' : 'Selesai'}
                    </span>
                  </div>
                  <div className="request-preview">
                    {req.original_text.substring(0, 60)}...
                  </div>
                </div>
              ))}
            </div>
            
            {activeRequest && (
              <div className="request-detail">
                <div className="original-text">
                  <h3>Teks Asli</h3>
                  <div className="text-content">
                    {activeRequest.original_text}
                  </div>
                </div>
                
                <div className="corrected-text">
                  <h3>Hasil Koreksi</h3>
                  {activeRequest.status === 'pending' ? (
                    <div className="pending-message">
                      <div className="spinner"></div>
                      <p>Sedang diproses oleh AI...</p>
                      <p className="note">Koreksi tata bahasa akan segera selesai.</p>
                    </div>
                  ) : activeRequest.corrected_text ? (
                    <div className="text-content corrected">
                      {activeRequest.corrected_text}
                    </div>
                  ) : (
                    <div className="no-correction">
                      Teks sudah benar, tidak perlu koreksi.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}