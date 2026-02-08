import React, { useState } from 'react';
import { Check, X, Star, Zap, Loader2, ShieldCheck } from 'lucide-react';
import { UserData } from '../types';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  currentTier: 'free' | 'premium';
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onUpgrade, currentTier }) => {
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSubscribe = () => {
    setProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      onUpgrade();
      setProcessing(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transform transition-all scale-100 relative">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-teal-600 to-teal-800 p-8 text-center text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
           <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-400/20 rounded-full -ml-10 -mb-10 blur-xl"></div>
           
           <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-lg border border-white/30">
             <Star className="w-8 h-8 text-yellow-300 fill-current" />
           </div>
           <h2 className="text-2xl font-bold mb-1">Upgrade to Premium</h2>
           <p className="text-teal-100 text-sm">Unlock more scans & features</p>
        </div>

        <div className="p-6 space-y-6">
           {/* Tier Comparison */}
           <div className="space-y-3">
              {/* Free Tier */}
              <div className={`p-4 rounded-xl border ${currentTier === 'free' ? 'border-gray-200 bg-gray-50' : 'border-gray-100 opacity-50'}`}>
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-700">Free Plan</h3>
                    {currentTier === 'free' && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">CURRENT</span>}
                 </div>
                 <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-gray-600">
                       <Check className="w-4 h-4 text-teal-600" /> 10 AI Scans / Month
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600">
                       <Check className="w-4 h-4 text-teal-600" /> SARA Checker & Basic Features
                    </li>
                 </ul>
              </div>

              {/* Premium Tier */}
              <div className={`p-4 rounded-xl border-2 ${currentTier === 'premium' ? 'border-teal-500 bg-teal-50' : 'border-teal-500 bg-white shadow-lg relative'}`}>
                 {currentTier !== 'premium' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">
                       RECOMMENDED
                    </div>
                 )}
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                       Premium Plan <Zap className="w-4 h-4 text-orange-500 fill-current" />
                    </h3>
                    <div className="text-right">
                       <span className="block text-lg font-black text-gray-900">RM 8.99</span>
                       <span className="text-[10px] text-gray-500 font-medium">PER MONTH</span>
                    </div>
                 </div>
                 <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                       <Check className="w-4 h-4 text-teal-600" /> 30 AI Scans / Month
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                       <Check className="w-4 h-4 text-teal-600" /> Full Access to Price Comparator
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                       <Check className="w-4 h-4 text-teal-600" /> Priority Smart Planner
                    </li>
                 </ul>
              </div>
           </div>

           {/* Action Button */}
           {currentTier === 'free' ? (
              <button 
                onClick={handleSubscribe}
                disabled={processing}
                className="w-full bg-gradient-to-r from-teal-600 to-teal-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-teal-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                Subscribe Now (RM 8.99)
              </button>
           ) : (
              <div className="text-center p-4 bg-green-50 text-green-700 rounded-xl font-medium border border-green-200">
                 You are already a Premium member!
              </div>
           )}

           <p className="text-center text-xs text-gray-400">
             Cancel anytime. Secure payment via fictitious gateway.
           </p>
        </div>
      </div>
    </div>
  );
};
