import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  Send,
  Ticket
} from 'lucide-react';
import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface TokenInfo {
  id: string;
  token: string;
  branch_name: string;
  branch_code: string | null;
  expires_at: string;
  is_active: boolean;
}

// Survey questions data
const section1Questions = {
  A: {
    title: 'Atribut Profesional',
    questions: [
      { key: 'a1', text: 'Apakah tingkat obyektifitas Auditor dalam melaksanakan aktivitas audit memadai?' },
      { key: 'a2', text: 'Apakah Auditor memiliki pemahaman yang baik tentang kegiatan kantor cabang/ regional yang akan diaudit?' },
      { key: 'a3', text: 'Apakah Auditor bersikap proaktif dan memberikan saran-saran yang berguna daripada hanya menunjukkan masalah-masalah atau kesalahan?' },
      { key: 'a4', text: 'Apakah Auditor dapat berkomunikasi atau berhubungan secara efektif dengan Saudara?' },
      { key: 'a5', text: 'Apakah Auditor mau mendengarkan dan bersedia memberikan bantuan kepada Saudara?' },
      { key: 'a6', text: 'Apakah Auditor dapat dipercaya dan bertanggung jawab dalam menangani informasi-informasi yang bersifat sensitif?' },
    ]
  },
  B: {
    title: 'Ruang Lingkup Pegawaian Audit',
    questions: [
      { key: 'b1', text: 'Apakah tujuan dan ruang lingkup audit jelas dan konsisten dengan target kerja kantor cabang/ regional?' },
      { key: 'b2', text: 'Apakah Auditor selalu mengkomunikasikan tujuan dan ruang lingkup auditnya dengan Saudara?' },
      { key: 'b3', text: 'Apakah Auditor mempertimbangkan dengan baik saran-saran Saudara terhadap penambahan atau perubahan ruang lingkup audit?' },
    ]
  },
  C: {
    title: 'Kinerja Pelaksanaan Audit',
    questions: [
      { key: 'c1', text: 'Apakah Auditor mendiskusikan temuan yang diperoleh selama melakukan audit?' },
      { key: 'c2', text: 'Apakah pelaksanaan kegiatan audit tersebut mengganggu kegiatan operasional Saudara?' },
      { key: 'c3', text: 'Apakah jangka waktu kegiatan pelaksanaan audit dinilai cukup?' },
      { key: 'c4', text: 'Apakah hasil audit didukung dengan bukti yang akurat, cukup dan relevan?' },
      { key: 'c5', text: 'Apakah isi laporan audit sesuai dengan hasil Exit Meeting/ pertemuan pembahasan?' },
      { key: 'c6', text: 'Apakah rekomendasi/saran yang diberikan auditor bersifat membangun, dan dapat dilaksanakan dengan biaya yang efisien?' },
      { key: 'c7', text: 'Apakah laporan audit ditulis dengan jelas, dimengerti dan menggunakan bahasa yang baik?' },
    ]
  },
  D: {
    title: 'Keseluruhan Pelaksanaan Audit',
    questions: [
      { key: 'd1', text: 'Apakah kegiatan audit bermanfaat atau memberikan nilai tambah terhadap peningkatan operasional di satuan kerja kantor cabang/ regional Saudara?' },
      { key: 'd2', text: 'Apakah Saudara merasa puas atas pelaksanaan kegiatan audit yang dilaksanakan oleh Divisi Internal Audit KOMIDA?' },
      { key: 'd3', text: 'Apakah Auditor telah dapat berperan sebagai konsultan bagi Saudara?' },
    ]
  }
};

const section2Questions = [
  { key: 's2a', text: 'Membantu memperbaiki kesalahan prosedur yang kurang dimengerti oleh auditee.' },
  { key: 's2b', text: 'Auditee menjadi lebih hati-hati dalam melaksanakan tugas atau auditor telah mengingatkan terjadinya kesalahan.' },
  { key: 's2c', text: 'Membantu memberikan petunjuk SOP/SK/SE, ketentuan baru yang belum diketahui auditee.' },
  { key: 's2d', text: 'Memberikan solusi atas permasalahan yang terjadi di satuan kerja auditee.' },
  { key: 's2e', text: 'Mendorong manajemen cabang/ regional meningkatkan kinerjanya.' },
  { key: 's2f', text: 'Membantu melakukan pengawasan terhadap pelaksanaan prosedur.' },
  { key: 's2g', text: 'Membantu menemukan masalah yang tidak diketahui auditee.' },
  { key: 's2h', text: 'Memberikan solusi atas permasalahan yang terjadi di satuan kerja auditee.' },
];

const section3Questions = [
  { key: 's3a', text: 'Kesalahan/temuan audit sudah diperbaiki namun tetap diangkat kembali dalam laporan.' },
  { key: 's3b', text: 'Memberikan penafsiran yang berbeda mengenai pelaksanaan SOP/SK/SE.' },
  { key: 's3c', text: 'Terlalu kaku terhadap prosedur, tidak mempertimbangkan faktor bisnis.' },
  { key: 's3d', text: 'Penggalian temuan kurang mendalam.' },
  { key: 's3e', text: 'Temuan ringan dibesar-besarkan.' },
  { key: 's3f', text: 'Mencari-cari kesalahan.' },
  { key: 's3g', text: 'Temuan tidak didiskusikan atau tidak dibicarakan.' },
  { key: 's3h', text: 'Pelaksanaan Exit Meeting tidak fokus dan terlalu lama.' },
  { key: 's3i', text: 'Auditor tidak komunikatif, dan bersikap tidak terbuka.' },
  { key: 's3j', text: 'Terdapat auditor dalam bertanya dengan gaya interogasi.' },
  { key: 's3k', text: 'Auditor memperhatikan penampilan dan kebersihan.' },
];

function AuditeeSurvey() {
  const { token: urlToken } = useParams<{ token: string }>();
  
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Manual token input state
  const [manualToken, setManualToken] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(null); // Custom modal state

  // Form state
  const [answers, setAnswers] = useState<Record<string, number | boolean | string>>({});

  // Total steps: 0=Intro, 1=Section1A, 2=Section1B, 3=Section1C, 4=Section1D, 5=Section2, 6=Section3, 7=Section4
  const totalSteps = 8;

  // Helper to show error (Full page for URL, Centered Modal for Manual)
  const showError = (msg: string) => {
    if (urlToken) {
      setError(msg);
    } else {
      setErrorModalMessage(msg);
      // Auto-dismiss after 4 seconds
      setTimeout(() => setErrorModalMessage(null), 4000);
    }
  };

  // Validate token function
  const validateToken = async (tokenToValidate: string) => {
    if (!tokenToValidate) {
      showError('Token tidak valid');
      return;
    }

    try {
      setIsValidating(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('survey_tokens')
        .select('id, token, branch_name, branch_code, expires_at, is_active')
        .eq('token', tokenToValidate.toUpperCase())
        .single();



      if (fetchError || !data) {
        showError('Token tidak ditemukan');
        setIsValidating(false);
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        showError('Token sudah kadaluarsa');
        setIsValidating(false);
        return;
      }

      // Check if active
      if (!data.is_active) {
        showError('Token sudah tidak aktif');
        setIsValidating(false);
        return;
      }

      // Check respondent limit (Max 5) using RPC to bypass RLS
      try {
        const { data: isQuotaFull, error: rpcError } = await supabase
          .rpc('check_token_quota', { lookup_token_id: data.id });

        if (!rpcError && isQuotaFull) {
          showError('Token sudah mencapai batas maksimal 5 responden. Terima kasih atas partisipasi Anda.');
          setIsValidating(false);
          return;
        }
        
        // Fallback for direct count (if API not updated yet)
        if (rpcError) {
           const { count, error: countError } = await supabase
            .from('survey_responses')
            .select('*', { count: 'exact', head: true })
            .eq('token_id', data.id);

          if (!countError && count !== null && count >= 5) {
            showError('Token sudah mencapai batas maksimal 5 responden. Terima kasih atas partisipasi Anda.');
            setIsValidating(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Quota check failed', e);
      }

      setTokenInfo(data);
    } catch (err) {
      console.error('Error validating token:', err);
      setError('Terjadi kesalahan saat memvalidasi token');
    } finally {
      setIsValidating(false);
      setLoading(false);
    }
  };

  // Auto-validate if token in URL
  useEffect(() => {
    if (urlToken) {
      setLoading(true);
      validateToken(urlToken);
    }
  }, [urlToken]);

  // Handle manual token submit
  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualToken.trim()) {
      validateToken(manualToken.trim());
    }
  };

  // Handle scale answer
  const handleScaleAnswer = (key: string, value: number) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  // Handle boolean answer
  const handleBooleanAnswer = (key: string, value: boolean) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  // Handle text answer
  const handleTextAnswer = (key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  // Check if current step is complete
  // Check valid text answer (must contain alphabets)
  const isValidTextAnswer = (text: string | null | undefined) => {
    if (!text) return false;
    const trimmed = String(text).trim();
    if (trimmed.length === 0) return false;
    // Must contain at least one alphabet character (not just numbers or symbols)
    return /[a-zA-Z]/.test(trimmed);
  };

  // Check if current step is complete
  const isStepComplete = () => {
    switch (currentStep) {
      case 0: return true; // Intro
      case 1: return section1Questions.A.questions.every(q => answers[q.key] !== undefined);
      case 2: return section1Questions.B.questions.every(q => answers[q.key] !== undefined);
      case 3: return section1Questions.C.questions.every(q => answers[q.key] !== undefined);
      case 4: return section1Questions.D.questions.every(q => answers[q.key] !== undefined);
      case 5: return section2Questions.every(q => answers[q.key] !== undefined);
      case 6: return section3Questions.every(q => answers[q.key] !== undefined);
      case 7: return isValidTextAnswer(answers.harapan as string) && isValidTextAnswer(answers.kritik_saran as string);
      default: return true;
    }
  };

  // Submit survey
  const handleSubmit = async () => {
    if (!tokenInfo) return;

    try {
      setIsSubmitting(true);

      // Check if already reached max 5 responses
      const { count, error: countError } = await supabase
        .from('survey_responses')
        .select('*', { count: 'exact', head: true })
        .eq('token_id', tokenInfo.id);

      if (countError) throw countError;

      if (count !== null && count >= 5) {
        toast.error('Survei ini sudah mencapai batas maksimal 5 responden');
        setIsSubmitting(false);
        return;
      }

      const { error: submitError } = await supabase
        .from('survey_responses')
        .insert({
          token_id: tokenInfo.id,
          // Section 1
          a1: answers.a1, a2: answers.a2, a3: answers.a3, a4: answers.a4, a5: answers.a5, a6: answers.a6,
          b1: answers.b1, b2: answers.b2, b3: answers.b3,
          c1: answers.c1, c2: answers.c2, c3: answers.c3, c4: answers.c4, c5: answers.c5, c6: answers.c6, c7: answers.c7,
          d1: answers.d1, d2: answers.d2, d3: answers.d3, d4: answers.d4,
          // Section 2
          s2a: answers.s2a, s2b: answers.s2b, s2c: answers.s2c, s2d: answers.s2d, s2e: answers.s2e,
          s2f: answers.s2f, s2g: answers.s2g,
          // Section 3
          s3a: answers.s3a, s3b: answers.s3b, s3c: answers.s3c, s3d: answers.s3d, s3e: answers.s3e,
          s3f: answers.s3f, s3g: answers.s3g, s3h: answers.s3h, s3i: answers.s3i, s3j: answers.s3j,
          s3k: answers.s3k,
          // Section 4
          harapan: answers.harapan || null,
          kritik_saran: answers.kritik_saran || null,
        });

      if (submitError) throw submitError;

      setIsSubmitted(true);
      toast.success('Survei berhasil dikirim!');
    } catch (err: any) {
      console.error('Error submitting survey:', err);
      
      // Check for specific trigger error message
      if (err.message && (
        err.message.includes('Token sudah mencapai batas maksimum') || 
        err.message.includes('limit reached') ||
        err.details?.includes('Token sudah mencapai batas maksimum')
      )) {
        toast.error('Maaf, kuota 5 responden untuk token ini sudah terpenuhi saat Anda mencoba mengirim.');
      } else {
        toast.error('Gagal mengirim survei. Silakan coba lagi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render scale question
  const renderScaleQuestion = (question: { key: string; text: string }, index: number) => (
    <div key={question.key} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <p className="text-gray-800 font-medium mb-4">
        <span className="text-indigo-600 font-bold mr-2">{index + 1}.</span>
        {question.text}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500 hidden sm:block">Sangat Tidak Setuju</span>
        <div className="flex gap-2 flex-1 justify-center">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => handleScaleAnswer(question.key, value)}
              className={`w-12 h-12 rounded-xl font-bold text-lg transition-all ${
                answers[question.key] === value
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-110'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500 hidden sm:block">Sangat Setuju</span>
      </div>
    </div>
  );

  // Render boolean question
  const renderBooleanQuestion = (question: { key: string; text: string }, index: number) => (
    <div key={question.key} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between gap-4">
        <p className="text-gray-800 font-medium flex-1">
          <span className="text-indigo-600 font-bold mr-2">{String.fromCharCode(97 + index)}.</span>
          {question.text}
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleBooleanAnswer(question.key, true)}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              answers[question.key] === true
                ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Ya
          </button>
          <button
            type="button"
            onClick={() => handleBooleanAnswer(question.key, false)}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              answers[question.key] === false
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tidak
          </button>
        </div>
      </div>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Memvalidasi token...</p>
        </div>
      </div>
    );
  }

  // No token in URL - show input form
  if (!urlToken && !tokenInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Ticket className="w-8 h-8 text-indigo-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Survei Kepuasan Auditee</h1>
              <p className="text-gray-500">Masukkan token survei yang diberikan oleh auditor</p>
            </div>

            {/* Token Input Form */}
            <form onSubmit={handleManualTokenSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Token Survei</label>
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value.toUpperCase())}
                  placeholder="Contoh: ABC12345"
                  className="w-full px-4 py-3 text-center text-xl font-mono font-bold tracking-widest border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all uppercase"
                  maxLength={10}
                />
              </div>



              <button
                type="submit"
                disabled={!manualToken.trim() || isValidating}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Memvalidasi...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Mulai Survei
                  </>
                )}
              </button>
            </form>

            {/* Error Popup Modal */}
            {errorModalMessage && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-white rounded-3xl shadow-2xl p-6 border border-red-100 max-w-sm w-full flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Perhatian</h3>
                      <p className="text-gray-600 mb-6">{errorModalMessage}</p>
                      <button 
                          onClick={() => setErrorModalMessage(null)}
                          className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-gray-900/20"
                      >
                          Tutup
                      </button>
                  </div>
              </div>
            )}

            <p className="text-xs text-center text-gray-400 mt-6">
              Token diberikan oleh tim audit setelah proses audit selesai
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state with URL token
  if (error && urlToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Token Tidak Valid</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500 mb-6">
            Silakan hubungi auditor untuk mendapatkan token yang valid.
          </p>
          <a
            href="/survey"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            <Ticket className="w-5 h-5" />
            Input Token Manual
          </a>
        </div>
      </div>
    );
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Terima Kasih!</h1>
          <p className="text-gray-600 mb-6">
            Jawaban survei Anda telah berhasil dikirim. Terima kasih atas partisipasi Anda.
          </p>
          <p className="text-sm text-gray-500">
            Cabang: <span className="font-semibold">{tokenInfo?.branch_name}</span>
          </p>
        </div>
      </div>
    );
  }

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      // Intro
      case 0:
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <ClipboardCheck className="w-10 h-10 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Survei Kepuasan Auditee</h2>
            <p className="text-gray-600 mb-6 max-w-lg mx-auto">
              Survei ini bertujuan untuk mengetahui tingkat kepuasan Anda terhadap pelaksanaan audit 
              yang dilakukan oleh Divisi Internal Audit KOMIDA.
            </p>
            <div className="bg-indigo-50 rounded-2xl p-6 max-w-md mx-auto text-left">
              <p className="text-sm text-indigo-800 mb-3">
                <span className="font-semibold">Cabang:</span> {tokenInfo?.branch_name}
              </p>
              <p className="text-sm text-indigo-600">
                Jawaban Anda bersifat anonim dan akan digunakan untuk meningkatkan kualitas layanan audit.
              </p>
            </div>
          </div>
        );

      // Section 1A - Atribut Profesional
      case 1:
        return (
          <div>
            <div className="mb-6">
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                Section 1 - Bagian A
              </span>
              <h2 className="text-xl font-bold text-gray-900 mt-3">{section1Questions.A.title}</h2>
              <p className="text-gray-500 text-sm mt-1">Nilai 1-5 (1 = Sangat Tidak Setuju, 5 = Sangat Setuju)</p>
            </div>
            <div className="space-y-4">
              {section1Questions.A.questions.map((q, i) => renderScaleQuestion(q, i))}
            </div>
          </div>
        );

      // Section 1B - Ruang Lingkup
      case 2:
        return (
          <div>
            <div className="mb-6">
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                Section 1 - Bagian B
              </span>
              <h2 className="text-xl font-bold text-gray-900 mt-3">{section1Questions.B.title}</h2>
              <p className="text-gray-500 text-sm mt-1">Nilai 1-5 (1 = Sangat Tidak Setuju, 5 = Sangat Setuju)</p>
            </div>
            <div className="space-y-4">
              {section1Questions.B.questions.map((q, i) => renderScaleQuestion(q, i))}
            </div>
          </div>
        );

      // Section 1C - Kinerja Pelaksanaan
      case 3:
        return (
          <div>
            <div className="mb-6">
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                Section 1 - Bagian C
              </span>
              <h2 className="text-xl font-bold text-gray-900 mt-3">{section1Questions.C.title}</h2>
              <p className="text-gray-500 text-sm mt-1">Nilai 1-5 (1 = Sangat Tidak Setuju, 5 = Sangat Setuju)</p>
            </div>
            <div className="space-y-4">
              {section1Questions.C.questions.map((q, i) => renderScaleQuestion(q, i))}
            </div>
          </div>
        );

      // Section 1D - Keseluruhan
      case 4:
        return (
          <div>
            <div className="mb-6">
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                Section 1 - Bagian D
              </span>
              <h2 className="text-xl font-bold text-gray-900 mt-3">{section1Questions.D.title}</h2>
              <p className="text-gray-500 text-sm mt-1">Nilai 1-5 (1 = Sangat Tidak Setuju, 5 = Sangat Setuju)</p>
            </div>
            <div className="space-y-4">
              {section1Questions.D.questions.map((q, i) => renderScaleQuestion(q, i))}
            </div>
          </div>
        );

      // Section 2 - Hal yang membantu
      case 5:
        return (
          <div>
            <div className="mb-6">
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                Section 2
              </span>
              <h2 className="text-xl font-bold text-gray-900 mt-3">
                Hal-hal Khusus yang Membantu
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Apakah ada hal-hal khusus tentang audit yang membantu atau mengesankan bagi Saudara?
              </p>
            </div>
            <div className="space-y-3">
              {section2Questions.map((q, i) => renderBooleanQuestion(q, i))}
            </div>
          </div>
        );

      // Section 3 - Hal yang mengecewakan
      case 6:
        return (
          <div>
            <div className="mb-6">
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                Section 3
              </span>
              <h2 className="text-xl font-bold text-gray-900 mt-3">
                Hal-hal Khusus yang Mengecewakan
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Apakah ada hal-hal khusus tentang audit yang mengecewakan Saudara?
              </p>
            </div>
            <div className="space-y-3">
              {section3Questions.map((q, i) => renderBooleanQuestion(q, i))}
            </div>
          </div>
        );

      // Section 4 - Long Answer
      case 7:
        return (
          <div>
            <div className="mb-6">
              <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                Section 4
              </span>
              <h2 className="text-xl font-bold text-gray-900 mt-3">Harapan, Kritik dan Saran</h2>
              <p className="text-gray-500 text-sm mt-1">Bagian ini wajib diisi</p>
            </div>
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-gray-800 font-medium mb-3">
                  <span className="text-purple-600 font-bold mr-2">1.</span>
                  Harapan Saudara terhadap peran dan fungsi Divisi Internal Audit?
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  value={(answers.harapan as string) || ''}
                  onChange={(e) => handleTextAnswer('harapan', e.target.value)}
                  placeholder="Tulis harapan Anda di sini..."
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all resize-none"
                  required
                />
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-gray-800 font-medium mb-3">
                  <span className="text-purple-600 font-bold mr-2">2.</span>
                  Kritik dan Saran mengenai pelaksanaan audit secara keseluruhan (misalnya: auditor bermain game di jam kerja, judi online, dsb)?
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  value={(answers.kritik_saran as string) || ''}
                  onChange={(e) => handleTextAnswer('kritik_saran', e.target.value)}
                  placeholder="Tulis kritik dan saran Anda di sini..."
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all resize-none"
                  required
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Survei Kepuasan</p>
                <p className="text-xs text-gray-500">{tokenInfo?.branch_name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{currentStep + 1} / {totalSteps}</p>
              <p className="text-xs text-gray-500">Langkah</p>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {renderStepContent()}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${
              currentStep === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            Sebelumnya
          </button>

          {currentStep < totalSteps - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.min(totalSteps - 1, prev + 1))}
              disabled={!isStepComplete()}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all ${
                isStepComplete()
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              Selanjutnya
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !isStepComplete()}
              className={`flex items-center gap-2 px-6 py-2.5 font-semibold rounded-xl hover:shadow-lg transition-all ${
                isSubmitting || !isStepComplete()
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none'
                  : 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/20'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Kirim Survei
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuditeeSurvey;
