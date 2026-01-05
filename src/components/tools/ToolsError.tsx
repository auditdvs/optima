import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';

export default function ReportErrorButton() {
  const [loading, setLoading] = useState(false);

  const reportError = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('tools_errors')
        .insert({
          tools_error: true,
          reported_by: user?.id || null
        });

      if (error) {
        console.error('Error:', error);
        toast.error('Gagal melaporkan error');
      } else {
        toast.success('Error Reported!', {
          duration: 2000,
          icon: '🚨',
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={reportError}
      disabled={loading}
      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
    >
      <AlertTriangle size={20} />
      {loading ? 'Reporting...' : 'Report Error'}
    </button>
  );
}
