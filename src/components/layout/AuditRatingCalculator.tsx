import { useEffect, useState } from "react";
import { Info, ShieldAlert, X, FileText, Minus, Plus, Calculator } from "lucide-react";
import "../../styles/audit-rating.css"; // Keep if there are global styles needed, else we use tailwind

const NumberInput = ({ label, value, onChange, iconBg, delayClass }: { label: string, value: number, onChange: (val: number) => void, iconBg: string, delayClass: string }) => (
  <div className={`py-3 px-2 rounded-xl border border-gray-100 bg-white flex flex-col items-center justify-center gap-2 shadow-sm hover:shadow-md hover:border-gray-200 transition-all ${delayClass}`}>
    <div className="flex items-center gap-1.5 mb-0.5">
      <div className={`w-2 h-2 rounded-full ${iconBg}`}></div>
      <span className="font-bold text-[11px] text-gray-500 uppercase tracking-widest">{label}</span>
    </div>
    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
      <button 
        type="button" 
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-800 transition-colors focus:outline-none"
      >
        <Minus className="w-4 h-4" strokeWidth={2.5} />
      </button>
      <input 
        type="number" 
        value={value} 
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-10 p-0 m-0 text-center bg-transparent font-black text-xl text-gray-800 outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
      />
      <button 
        type="button" 
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-800 transition-colors focus:outline-none"
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </div>
  </div>
);

function AuditRatingCalculator({ onClose }: { onClose?: () => void }) {
  const [minor, setMinor] = useState<number>(0);
  const [moderate, setModerate] = useState<number>(0);
  const [major, setMajor] = useState<number>(0);
  const [fraud, setFraud] = useState<boolean>(false);
  const [rating, setRating] = useState<string>("LOW");
  const [showCriteria, setShowCriteria] = useState<boolean>(false);

  useEffect(() => {
    calculateRating();
  }, [minor, moderate, major, fraud]);

  const calculateRating = () => {
    if (fraud) {
      setRating("HIGH");
      return;
    }

    if (major >= 3) {
      setRating("HIGH");
      return;
    }

    if (major === 2) {
      setRating(moderate > 10 ? "HIGH" : "MEDIUM");
      return;
    }

    if (major === 1) {
      setRating(moderate > 12 ? "HIGH" : "MEDIUM");
      return;
    }

    // major === 0
    if (moderate > 15) setRating("HIGH");
    else if (moderate >= 8) setRating("MEDIUM");
    else setRating("LOW");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className={`bg-white rounded-2xl shadow-2xl relative flex flex-row overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] w-full max-h-[90vh] ${showCriteria ? 'max-w-[780px]' : 'max-w-[420px]'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Calculator */}
        <div className={`w-full sm:w-[420px] shrink-0 p-6 relative flex flex-col overflow-y-auto custom-scrollbar transition-colors duration-500
          ${rating === 'LOW' ? 'bg-emerald-50/30' :
            rating === 'MEDIUM' ? 'bg-amber-50/30' :
            'bg-rose-50/30'}
        `}>

          {onClose && (
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors z-50"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-4 mb-5 relative z-10">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner border transition-colors duration-500
              ${rating === 'LOW' ? 'bg-emerald-50 border-emerald-100/50' :
                rating === 'MEDIUM' ? 'bg-amber-50 border-amber-100/50' :
                'bg-rose-50 border-rose-100/50'}
            `}>
              <Calculator className={`w-6 h-6 transition-colors duration-500
                ${rating === 'LOW' ? 'text-emerald-600' :
                  rating === 'MEDIUM' ? 'text-amber-600' :
                  'text-rose-600'}
              `} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight leading-tight mb-0.5">Audit Rating Calculator</h2>
              <p className="text-gray-500 text-xs leading-relaxed">
                Proyeksikan rating temuan audit dengan simulasi angka di bawah.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 relative z-10 mb-3">
            <NumberInput 
              label="Minor" 
              value={minor} 
              onChange={setMinor} 
              iconBg="bg-blue-400" 
              delayClass="animate-in fade-in slide-in-from-bottom-2 duration-400" 
            />
            <NumberInput 
              label="Moderate" 
              value={moderate} 
              onChange={setModerate} 
              iconBg="bg-amber-400" 
              delayClass="animate-in fade-in slide-in-from-bottom-3 duration-400" 
            />
            <NumberInput 
              label="Major" 
              value={major} 
              onChange={setMajor} 
              iconBg="bg-rose-500" 
              delayClass="animate-in fade-in slide-in-from-bottom-4 duration-400" 
            />
          </div>

          <div 
            onClick={() => setFraud(!fraud)}
            className={`cursor-pointer mb-5 p-3.5 rounded-xl border transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 duration-500 shadow-sm flex justify-between items-center relative z-10 ${
              fraud ? 'bg-red-50 border-red-200 shadow-red-100' : 'bg-white border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-colors ${fraud ? 'bg-red-100 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
                 <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <span className={`block text-sm font-bold leading-none ${fraud ? 'text-red-700' : 'text-gray-700'}`}>
                  Terdapat Fraud
                </span>
              </div>
            </div>
            {/* Toggle Switch */}
            <div className={`w-10 h-5 rounded-full transition-colors duration-300 relative flex items-center ${fraud ? 'bg-red-500' : 'bg-gray-200'}`}>
              <div className={`absolute w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform duration-300 ${fraud ? 'translate-x-5' : 'translate-x-[2px]'}`}></div>
            </div>
          </div>

          <div className="flex items-center justify-between relative z-10 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col">
              <span className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 transition-colors duration-500
                ${rating === 'LOW' ? 'text-emerald-600/60' :
                  rating === 'MEDIUM' ? 'text-amber-600/60' :
                  'text-rose-600/60'}
              `}>Estimasi Rating Asesmen</span>
              
              <div className={`
                inline-flex items-center justify-center py-1.5 px-6 rounded-lg font-black text-lg text-white tracking-widest shadow-md
                ${rating === 'LOW' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/20' : 
                  rating === 'MEDIUM' ? 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-500/20' :
                  'bg-gradient-to-r from-rose-500 to-rose-600 shadow-rose-500/20'}
              `}>
                {rating}
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setShowCriteria(!showCriteria)}
              className={`flex flex-col items-center justify-center px-3 py-2 text-xs font-bold bg-white/80 backdrop-blur-sm rounded-lg border shadow-sm transition-all focus:outline-none
                ${rating === 'LOW' ? 'text-emerald-700 border-emerald-200 hover:bg-emerald-50' : 
                  rating === 'MEDIUM' ? 'text-amber-700 border-amber-200 hover:bg-amber-50' :
                  'text-rose-700 border-rose-200 hover:bg-rose-50'}
                ${showCriteria ? 'ring-2 ring-offset-1 ring-indigo-200' : ''}
              `}
            >
              <Info className="w-4 h-4 mb-0.5" />
              Kriteria
            </button>
          </div>
        </div>

        {/* Expandable Criteria Panel */}
        <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] border-l border-gray-100 bg-gray-50/80 ${showCriteria ? 'w-[340px] opacity-100' : 'w-0 opacity-0'}`}>
          <div className="w-[340px] h-full flex flex-col p-5">
            
            {/* Header */}
            <div className="mb-3 shrink-0">
              <h3 className="text-[13px] font-bold text-gray-900 tracking-tight">Kriteria Rating Audit</h3>
              <a href="https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/documents/Memo%20Intern%20-%20Penetapan%20Audit%20Rating.pdf" target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-500 hover:text-indigo-700 hover:underline inline-flex items-center gap-1 mt-0.5 font-medium transition-colors"><FileText className="w-3 h-3"/> Memo Intern Penetapan Rating</a>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar">
              
              {/* LOW */}
              <div className="rounded-md border-l-[3px] border-emerald-400 bg-white px-3 py-2 shadow-sm">
                <div className="text-[9px] font-black text-emerald-600 tracking-widest uppercase mb-0.5">Low</div>
                <p className="text-[10px] text-gray-600 leading-relaxed">
                  Tidak ada temuan <span className="font-semibold text-gray-800">MAJOR</span>, atau maks. <span className="font-semibold text-gray-800">7</span> temuan <span className="font-semibold text-gray-800">MODERATE</span>.
                </p>
              </div>

              {/* MEDIUM */}
              <div className="rounded-md border-l-[3px] border-amber-400 bg-white px-3 py-2 shadow-sm">
                <div className="text-[9px] font-black text-amber-600 tracking-widest uppercase mb-0.5">Medium</div>
                <ul className="text-[10px] text-gray-600 leading-relaxed space-y-0.5 list-disc list-inside marker:text-amber-300">
                  <li>0 MAJOR &amp; <span className="font-semibold text-gray-800">8–15</span> MODERATE</li>
                  <li>1 MAJOR &amp; maks. <span className="font-semibold text-gray-800">12</span> MODERATE</li>
                  <li>2 MAJOR &amp; maks. <span className="font-semibold text-gray-800">10</span> MODERATE</li>
                </ul>
              </div>

              {/* HIGH */}
              <div className="rounded-md border-l-[3px] border-rose-400 bg-white px-3 py-2 shadow-sm">
                <div className="text-[9px] font-black text-rose-600 tracking-widest uppercase mb-0.5">High</div>
                <ul className="text-[10px] text-gray-600 leading-relaxed space-y-0.5 list-disc list-inside marker:text-rose-300">
                  <li>0 MAJOR &amp; <span className="font-semibold text-gray-800">&gt;15</span> MODERATE</li>
                  <li>1 MAJOR &amp; <span className="font-semibold text-gray-800">&gt;12</span> MODERATE</li>
                  <li>2 MAJOR &amp; <span className="font-semibold text-gray-800">&gt;10</span> MODERATE</li>
                  <li><span className="font-semibold text-gray-800">≥3</span> MAJOR (berapapun)</li>
                  <li className="text-rose-600 font-medium">Terdapat indikasi FRAUD</li>
                </ul>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuditRatingCalculator;