
import React, { useEffect, useState } from 'react';
import { X, Gift, Sparkles, PartyPopper } from 'lucide-react';

interface BirthdayOverlayProps {
  name: string;
  message: string;
  onClose: () => void;
}

export const BirthdayOverlay: React.FC<BirthdayOverlayProps> = ({ name, message, onClose }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 rounded-[2rem] p-1 shadow-2xl w-full max-w-sm relative overflow-hidden animate-pop-in">
        
        {/* Confetti CSS (Simplified Visuals) */}
        <div className="absolute inset-0 pointer-events-none opacity-50">
            <div className="absolute top-10 left-10 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
            <div className="absolute top-20 right-20 w-3 h-3 bg-pink-400 rounded-full animate-bounce"></div>
            <div className="absolute bottom-10 left-1/2 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="absolute top-1/2 left-4 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse delay-75"></div>
            <div className="absolute bottom-20 right-10 w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-150"></div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-[1.8rem] p-8 text-center text-white border border-white/20 relative z-10">
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
                <X className="w-5 h-5" />
            </button>

            <div className="w-20 h-20 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/40 animate-[bounce_2s_infinite]">
                <Gift className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-3xl font-black mb-2 tracking-tight drop-shadow-md">
                Happy Birthday!
            </h2>
            <h3 className="text-xl font-bold text-yellow-300 mb-6">{name}</h3>

            <div className="bg-black/20 p-4 rounded-xl border border-white/10 mb-6">
                <p className="text-lg leading-relaxed font-medium italic">
                    "{message}"
                </p>
                <div className="flex justify-end mt-2">
                    <Sparkles className="w-4 h-4 text-yellow-200" />
                </div>
            </div>

            <button 
                onClick={onClose}
                className="w-full bg-white text-purple-900 font-bold py-3.5 rounded-xl hover:bg-purple-50 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
            >
                <PartyPopper className="w-5 h-5" />
                Thanks Bijak!
            </button>
        </div>
      </div>
    </div>
  );
};
