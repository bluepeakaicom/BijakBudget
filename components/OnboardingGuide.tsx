
import React, { useState } from 'react';
import { Check, ScanLine, ShoppingBag, Map, MessageCircle, Sparkles, ChevronRight, ChevronLeft, X } from 'lucide-react';

interface OnboardingGuideProps {
  onComplete: () => void;
}

const STEPS = [
  {
    title: "Welcome to BijakBudget",
    description: "Your AI-powered companion for maximizing savings and government subsidies in Malaysia.",
    icon: (className: string) => <Sparkles className={className} />,
    color: "from-teal-600 to-emerald-600",
    bgAccent: "bg-emerald-400"
  },
  {
    title: "Scan & Analyze",
    description: "Snap a photo of your receipt or product. We automatically identify SARA-eligible items and track your spending.",
    icon: (className: string) => <ScanLine className={className} />,
    color: "from-blue-600 to-indigo-600",
    bgAccent: "bg-indigo-400"
  },
  {
    title: "Compare Prices",
    description: "Find the best deals. We compare prices across major retailers like Lotus's, Mydin, and Shopee instantly.",
    icon: (className: string) => <ShoppingBag className={className} />,
    color: "from-orange-500 to-red-600",
    bgAccent: "bg-orange-400"
  },
  {
    title: "Smart Planning",
    description: "Optimize your shopping trips. We calculate the most cost-effective route based on your list and location.",
    icon: (className: string) => <Map className={className} />,
    color: "from-purple-600 to-fuchsia-600",
    bgAccent: "bg-fuchsia-400"
  },
  {
    title: "AI Assistant",
    description: "Need help? Chat with our AI to check SARA eligibility, find stores, or get money-saving tips 24/7.",
    icon: (className: string) => <MessageCircle className={className} />,
    color: "from-cyan-600 to-blue-600",
    bgAccent: "bg-cyan-400"
  }
];

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [direction, setDirection] = useState(1); // 1 for next, -1 for prev

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    setIsClosing(true);
    setTimeout(onComplete, 400);
  };

  const step = STEPS[currentStep];

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-500 ${isClosing ? 'bg-black/0 backdrop-blur-none pointer-events-none' : 'bg-slate-900/80 backdrop-blur-sm'}`}>
      <div 
        className={`w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${isClosing ? 'scale-90 opacity-0 translate-y-20' : 'scale-100 opacity-100 translate-y-0'}`}
      >
        {/* Dynamic Header Section */}
        <div className={`relative h-[340px] bg-gradient-to-br ${step.color} transition-all duration-500 ease-in-out flex flex-col items-center justify-center text-white overflow-hidden`}>
           
           {/* Animated Background Shapes */}
           <div className={`absolute top-0 right-0 w-64 h-64 ${step.bgAccent} rounded-full -mr-20 -mt-20 blur-[80px] opacity-40 animate-pulse`}></div>
           <div className={`absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -ml-16 -mb-16 blur-[60px] opacity-20`}></div>
           
           {/* Skip Button */}
           <button 
             onClick={handleFinish}
             className="absolute top-6 right-6 text-white/60 text-xs font-bold hover:text-white bg-black/10 hover:bg-black/20 px-3 py-1.5 rounded-full transition-all backdrop-blur-sm z-20"
           >
             Skip
           </button>

           {/* Icon Container with slide animation */}
           <div key={currentStep} className={`relative z-10 transform transition-all duration-500 ${direction > 0 ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}>
              <div className="bg-white/10 p-8 rounded-[2rem] backdrop-blur-md shadow-2xl border border-white/20 ring-1 ring-black/5 relative group">
                <div className="absolute inset-0 bg-white/5 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {step.icon("w-20 h-20 text-white drop-shadow-xl filter")}
              </div>
           </div>
           
           {/* Decorative dots pattern */}
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
        </div>

        {/* Content Body */}
        <div className="px-8 pt-8 pb-8 flex flex-col items-center text-center bg-white relative">
           
           {/* Text Content */}
           <div key={currentStep} className="flex-1 animate-fade-in min-h-[140px] flex flex-col justify-center">
             <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight leading-tight">
               {step.title}
             </h2>
             <p className="text-slate-500 text-sm leading-relaxed font-medium px-1">
               {step.description}
             </p>
           </div>

           {/* Footer: Indicators & Buttons */}
           <div className="w-full mt-6 space-y-8">
              {/* Pagination Dots */}
              <div className="flex justify-center gap-2.5">
                  {STEPS.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setDirection(idx > currentStep ? 1 : -1);
                        setCurrentStep(idx);
                      }} 
                      className={`h-2 rounded-full transition-all duration-500 ease-out ${idx === currentStep ? 'w-8 bg-slate-800' : 'w-2 bg-slate-200 hover:bg-slate-300'}`}
                    />
                  ))}
              </div>

              <div className="flex items-center gap-4">
                  <button 
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className={`p-4 rounded-2xl border-2 border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-all active:scale-95 ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <button 
                    onClick={handleNext}
                    className={`flex-1 font-bold py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 active:scale-95 transition-all flex items-center justify-center gap-2 text-white bg-gradient-to-r ${step.color}`}
                  >
                    {currentStep === STEPS.length - 1 ? (
                      <>Get Started <Check className="w-5 h-5 stroke-[3px]" /></>
                    ) : (
                      <>Next <ChevronRight className="w-5 h-5 stroke-[3px]" /></>
                    )}
                  </button>
              </div>
           </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px) scale(0.9); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px) scale(0.9); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        .animate-slide-in-right { animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-in-left { animation: slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};
