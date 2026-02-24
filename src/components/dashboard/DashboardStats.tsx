import { AlertTriangle, Building2, Eye, EyeOff, Lock as LockIcon, Star, Users, X } from 'lucide-react';
import { useRef, useState } from 'react';
import CountUp from '../common/CountUp';
import { Card, CardContent } from '../ui/card';

interface DashboardStatsProps {
  stats: {
    totalBranches: number;
    auditedBranches: number;
    unauditedBranches: number;
    fraudAudits: number;
    annualAudits: number;
    totalAudits: number;
    totalFraud: number;
    totalFraudCases: number;
    totalFraudulentBranches: number;
    surveyAvgScore: number;
    surveyTotalRespondents: number;
    surveyTotalBranches: number;
  };
  skipAnimation?: boolean;
}

const FRAUD_PASSWORD = 'optima';

const DashboardStats = ({ stats, skipAnimation = false }: DashboardStatsProps) => {
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const openModal = () => {
    setPassword('');
    setError('');
    setShowPassword(false);
    setShowModal(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSubmit = () => {
    if (password === FRAUD_PASSWORD) {
      setShowModal(false);
      window.open('/fraud-staff', '_blank');
    } else {
      setError('Password salah. Silakan coba lagi.');
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      setPassword('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') setShowModal(false);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-sky-50 rounded-lg shrink-0 mt-1">
              <Building2 className="w-5 h-5 md:w-6 md:h-6 text-sky-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 font-medium mb-1">Total Branches</p>
              <div className="flex flex-col">
                <CountUp 
                  to={stats.totalBranches} 
                  className="text-xl md:text-2xl font-bold text-gray-900 leading-none mb-2"
                  duration={1.5}
                  separator=","
                  skipAnimation={skipAnimation}
                />
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <span className="text-[10px] md:text-[11px] text-sky-600 flex items-center gap-1 font-medium bg-sky-50 px-1.5 py-0.5 rounded">
                    <CountUp 
                      to={stats.auditedBranches} 
                      duration={1.5}
                      delay={0.3}
                      skipAnimation={skipAnimation}
                    />
                    <span>audit</span>
                  </span>
                  <span className="text-[10px] md:text-[11px] text-rose-600 flex items-center gap-1 font-medium bg-rose-50 px-1.5 py-0.5 rounded">
                    <CountUp 
                      to={stats.unauditedBranches} 
                      duration={1.5}
                      delay={0.6}
                      skipAnimation={skipAnimation}
                    />
                    <span>pending</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Fraud Card — klik → password modal */}
      <Card
        onClick={openModal}
        className="bg-white shadow-sm transition-all group cursor-pointer hover:shadow-md hover:ring-2 hover:ring-rose-200 hover:bg-rose-50/20"
      >
        <CardContent className="p-3 md:p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-50 rounded-lg shrink-0 mt-1 group-hover:bg-rose-100 transition-colors">
              <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-rose-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-xs text-gray-500 font-medium">Total Fraud Nominal</p>
                <span className="text-[9px] text-rose-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                  <LockIcon className="w-2.5 h-2.5" /> detail
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg md:text-xl font-bold text-gray-900 leading-tight break-all">
                  Rp {stats.totalFraud.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-gray-400 mt-1">Accumulated value</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fraud Cases Card — not clickable */}
      <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-50 rounded-lg shrink-0 mt-1">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-xs text-gray-500 font-medium">Fraud Cases (Staff)</p>
              </div>
              <div className="flex flex-col">
                <CountUp 
                  to={stats.totalFraudCases} 
                  className="text-xl md:text-2xl font-bold text-gray-900 leading-none mb-1"
                  duration={1.5}
                  delay={0.5}
                  skipAnimation={skipAnimation}
                />
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <CountUp 
                      to={stats.totalFraudulentBranches} 
                      duration={1.5}
                      delay={0.8}
                      skipAnimation={skipAnimation}
                    />
                    <span>branches</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auditee Satisfaction Card */}
      <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-50 rounded-lg shrink-0 mt-1">
              <Star className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 font-medium mb-1 truncate">Kepuasan Auditee</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl md:text-2xl font-bold text-gray-900">
                   {stats.surveyAvgScore ? stats.surveyAvgScore.toFixed(2) : '0.00'}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  / 5.00
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className="text-[10px] text-purple-600 font-medium bg-purple-50 px-1.5 py-0.5 rounded whitespace-nowrap">
                  {stats.surveyTotalRespondents || 0} responden
                </span>
                <span className="text-[10px] text-purple-600 font-medium bg-purple-50 px-1.5 py-0.5 rounded whitespace-nowrap">
                  {stats.surveyTotalBranches || 0} cabang
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

      {/* Password Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

          {/* Modal */}
          <div
            className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden transition-transform ${
              shaking ? 'animate-[wiggle_0.4s_ease-in-out]' : ''
            }`}
            style={shaking ? { animation: 'wiggle 0.4s ease-in-out' } : {}}
          >
            {/* Header */}
            <div className="bg-rose-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <LockIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Akses Terbatas</p>
                  <p className="text-[10px] text-rose-200">Informasi Fraud Staf</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-rose-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5 space-y-4">
              <p className="text-sm text-gray-600">
                Masukkan password untuk mengakses data fraud staf.
              </p>

              <div className="relative">
                <input
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Clue nama sistem Internal Audit Komida"
                  className={`w-full px-4 py-2.5 pr-10 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    error
                      ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/30'
                      : 'border-gray-100 focus:ring-rose-200 focus:border-rose-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <p className="text-xs text-rose-600 font-medium flex items-center gap-1.5">
                  <span>⚠</span> {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors"
                >
                  Akses
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DashboardStats;
