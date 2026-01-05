import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BlurText from '../components/animation/BlurText';

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-50 overflow-hidden font-sans text-center">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-200/30 rounded-full blur-[120px] mix-blend-multiply" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-200/30 rounded-full blur-[120px] mix-blend-multiply" />
      
      <div className="relative z-10 max-w-2xl mx-auto px-4">
        {/* Abstract Card Container */}
        <div className="relative bg-white/40 backdrop-blur-lg rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-white/60 p-12 md:p-16">
          
          <div className="flex justify-center mb-6">
            <img 
              src="/assets/denied.svg" 
              alt="Access Denied" 
              className="w-48 h-48 object-contain"
            />
          </div>
          
          <div className="space-y-2 mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
              Access Restricted
            </h1>
            <p className="text-lg md:text-xl font-medium text-gray-600">
              Please log in to continue
            </p>
          </div>
          
          <div className="max-w-md mx-auto mb-10">
             <BlurText 
                text="The page you are trying to view requires authentication. Keep your data safe by signing in to your account."
                className="text-gray-500 leading-relaxed"
                startDelay={200}
                delay={20}
                animateBy="words"
              />
          </div>
          
          <button
            onClick={() => navigate('/login')}
            className="group inline-flex items-center gap-2.5 bg-gradient-to-r from-[#fc5d59] to-[#f2ad00] text-white px-8 py-4 rounded-2xl font-semibold text-[15px] hover:from-[#e54945] hover:to-[#d99a00] focus:ring-4 focus:ring-red-500/20 active:scale-[0.98] transition-all shadow-lg shadow-red-500/25 hover:-translate-y-0.5"
          >
            <span>Login to Dashboard</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;

