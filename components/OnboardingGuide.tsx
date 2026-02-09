
import React, { useState, useRef } from 'react';
import { Sparkles, ScanLine, ShoppingBag, Map, CreditCard, Check, ArrowRight } from 'lucide-react';

interface OnboardingGuideProps {
  onComplete: () => void;
}

const STEPS = [
  {
    id: 'welcome',
    title: "Welcome to BijakBudget",
    description: "The ultimate Malaysian grocery companion. We help you find the lowest prices and maximize your government subsidies.",
    color: "bg-teal-600",
    gradient: "from-teal-500 to-emerald-600",
    icon: Sparkles,
    shadow: "shadow-teal-500/50"
  },
  {
    id: 'scan',
    title: "AI Price Scanner",
    description: "Just snap a photo of any product or receipt. Our AI instantly identifies items and compares prices across 99 Speedmart, Lotus's, and more.",
    color: "bg-indigo-600",
    gradient: "from-indigo-500 to-violet-600",
    icon: ScanLine,
    shadow: "shadow-indigo-500/50"
  },
  {
    id: 'compare',
    title: "Real-Time Comparison",
    description: "Don't overpay. Compare live prices between supermarkets, mini markets, and online stores to secure the best deal every time.",
    color: "bg-blue-600",
    gradient: "from-blue-500 to-cyan-600",
    icon: ShoppingBag,
    shadow: "shadow-blue-500/50"
  },
  {
    id: 'sara',
    title: "MySARA Checker",
    description: "Unsure about your SARA eligibility? Check your status and balance instantly to ensure you claim your RM 600/year aid.",
    color: "bg-pink-600",
    gradient: "from-pink-500 to-rose-600",
    icon: CreditCard,
    shadow: "shadow-pink-500/50"
  },
  {
    id: 'plan',
    title: "Smart Planner",
    description: "Create a shopping list and let us calculate the cheapest route. We factor in petrol costs to see if splitting stores is worth it.",
    color: "bg-orange-600",
    gradient: "from-orange-500 to-amber-600",
    icon: Map,
    shadow: "shadow-orange-500/50"
  }
];

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const touchStart = useRef(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(p => p + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsExiting(true);
    setTimeout(onComplete, 500);
  };

  // Simple Swipe Detection
  const handleTouchStart = (e: React.TouchEvent) => {
      touchStart.current = e.touches[0].clientX;
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart.current - touchEnd;
    
    if (diff > 50) {
        // Swipe Left (Next)
        handleNext();
    } else if (diff < -50 && currentStep > 0) {
        // Swipe Right (Prev)
        setCurrentStep(p => p - 1);
    }
  };

  const StepIcon = STEPS[currentStep].icon;

  return (
    <div className={`fixed inset-0 z-[150] bg-slate-900 flex flex-col transition-opacity duration-500 ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      
      {/* 1. IMMERSIVE VISUAL HEADER (60% Height) */}
      <div 
        className={`relative flex-1 transition-all duration-700 ease-in-out bg-gradient-to-br ${STEPS[currentStep].gradient} overflow-hidden`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Skip Button */}
        <button 
          onClick={handleComplete}
          className="absolute top-6 right-6 z-20 px-4 py-1.5 rounded-full bg-black/20 text-white/90 text-xs font-bold backdrop-blur-md hover:bg-black/30 transition-colors active:scale-95"
        >
          Skip
        </button>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
           <div className={`absolute top-1/4 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float transition-all duration-1000 ${currentStep % 2 === 0 ? 'translate-x-0' : 'translate-x-20'}`}></div>
           <div className={`absolute bottom-1/4 right-1/4 w-48 h-48 bg-black/10 rounded-full blur-2xl animate-float delay-700 transition-all duration-1000 ${currentStep % 2 === 0 ? 'scale-100' : 'scale-125'}`}></div>
        </div>

        {/* Central Icon Composition */}
        <div className="absolute inset-0 flex items-center justify-center p-10 pointer-events-none">
           {STEPS.map((step, idx) => (
             <div 
                key={step.id}
                className={`absolute transition-all duration-700 ease-out transform ${
                  idx === currentStep 
                    ? 'opacity-100 scale-100 translate-y-0 rotate-0' 
                    : idx < currentStep 
                      ? 'opacity-0 scale-50 -translate-y-20 -rotate-12' 
                      : 'opacity-0 scale-150 translate-y-20 rotate-12'
                }`}
             >
                <div className={`w-40 h-40 rounded-[2.5rem] bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl flex items-center justify-center relative ${step.shadow}`}>
                    <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-white/40 to-transparent opacity-50"></div>
                    <step.icon className="w-20 h-20 text-white drop-shadow-lg relative z-10" strokeWidth={1.5} />
                    
                    {/* Decorative Orbiting Elements */}
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center animate-bounce delay-100 border border-white/20">
                       <div className="w-4 h-4 bg-white rounded-full shadow-lg"></div>
                    </div>
                    <div className="absolute -bottom-2 -left-6 w-16 h-8 bg-white/20 backdrop-blur-md rounded-full border border-white/20 animate-pulse"></div>
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* 2. CONTENT SHEET (40% Height) */}
      <div className="relative bg-white rounded-t-[2.5rem] -mt-10 pt-12 pb-8 px-8 flex flex-col justify-between min-h-[35%] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] animate-slide-up z-10">
         
         {/* Text Content */}
         <div className="text-center">
            <h2 className="text-2xl font-black text-slate-900 mb-4 transition-all duration-300 tracking-tight">
               {STEPS[currentStep].title}
            </h2>
            <p className="text-slate-500 font-medium leading-relaxed text-sm min-h-[80px] transition-opacity duration-300">
               {STEPS[currentStep].description}
            </p>
         </div>

         {/* Navigation & Indicators */}
         <div className="space-y-8 mt-2">
            
            {/* Dots */}
            <div className="flex justify-center gap-2">
               {STEPS.map((_, idx) => (
                 <div 
                   key={idx}
                   onClick={() => setCurrentStep(idx)}
                   className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                     idx === currentStep 
                       ? `w-8 ${STEPS[currentStep].color}` 
                       : 'w-1.5 bg-slate-200'
                   }`}
                 />
               ))}
            </div>

            {/* Main Action Button */}
            <button
              onClick={handleNext}
              className={`w-full py-4 rounded-2xl text-white font-bold text-lg shadow-xl shadow-slate-200 active:scale-[0.98] transition-all hover:-translate-y-1 flex items-center justify-center gap-3 bg-gradient-to-r ${STEPS[currentStep].gradient}`}
            >
               {currentStep === STEPS.length - 1 ? (
                 <>Get Started <Check className="w-6 h-6" /></>
               ) : (
                 <>Continue <ArrowRight className="w-6 h-6" /></>
               )}
            </button>
         </div>
      </div>
    </div>
  );
};
