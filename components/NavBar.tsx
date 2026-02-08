
import React from 'react';
import { Wallet, LogOut, User, Settings, Zap } from 'lucide-react';
import { UserData } from '../types';

interface NavBarProps {
  user: UserData | null;
  onLogout: () => void;
  onProfileClick: () => void;
}

export const NavBar: React.FC<NavBarProps> = ({ user, onLogout, onProfileClick }) => {
  // Calculate usage percentage for the visual bar
  const usagePercent = user 
    ? (user.subscription.scanCount / user.subscription.maxScans) * 100 
    : 0;
  
  const isLimitReached = user && user.subscription.scanCount >= user.subscription.maxScans;

  return (
    <nav className="bg-teal-700/90 backdrop-blur-md text-white shadow-lg sticky top-0 z-[100] border-b border-teal-600/50 transition-all duration-300 hover:bg-teal-700/95">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div 
          className="flex items-center space-x-2.5 cursor-pointer group select-none transition-opacity hover:opacity-90" 
          onClick={() => window.location.reload()}
        >
          <div className="bg-white/10 p-1.5 rounded-xl group-hover:bg-white/20 transition-all border border-white/10 group-hover:rotate-3 group-hover:scale-110 duration-300 shadow-sm">
             <Wallet className="w-5 h-5 text-orange-300 transition-transform duration-300" />
          </div>
          <span className="font-bold text-lg tracking-tight group-hover:text-teal-100 transition-colors">BijakBudget</span>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Usage Indicator */}
          {user && (
            <div className="hidden xs:flex flex-col items-end mr-2 group cursor-help transition-transform hover:scale-105" title="Monthly Scan Limit">
               <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-90 mb-1 group-hover:opacity-100 transition-opacity">
                  <Zap className={`w-3 h-3 ${user.subscription.tier === 'premium' ? 'text-yellow-300' : 'text-slate-300'} group-hover:scale-110 transition-transform`} />
                  {user.subscription.tier} Plan
               </div>
               <div className="w-24 h-1.5 bg-teal-900/40 rounded-full overflow-hidden border border-teal-800/30 group-hover:border-teal-400/50 transition-colors">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)] ${isLimitReached ? 'bg-red-400' : 'bg-gradient-to-r from-teal-300 to-emerald-300'}`} 
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  ></div>
               </div>
            </div>
          )}

          {user && (
            <div className="flex items-center gap-2">
                <button 
                onClick={onProfileClick}
                className="flex items-center gap-2 text-sm font-bold bg-teal-800/50 hover:bg-teal-800 py-1.5 pl-1.5 pr-3 rounded-full transition-all duration-200 border border-teal-600 hover:border-teal-400 group active:scale-95 shadow-sm"
                title="Profile Settings"
                >
                <div className="bg-teal-600 p-1 rounded-full border border-teal-400 relative group-hover:scale-105 transition-transform group-hover:rotate-3">
                    <User className="w-3.5 h-3.5" />
                    {user.subscription.tier === 'premium' && (
                        <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 border border-teal-800 shadow-sm animate-pulse">
                        <StarIcon className="w-2 h-2 text-teal-900 fill-current" />
                        </div>
                    )}
                </div>
                <span className="hidden sm:inline opacity-90 group-hover:opacity-100">{user.name.split(' ')[0]}</span>
                <Settings className="w-4 h-4 sm:hidden opacity-80" />
                </button>
                
                <button 
                onClick={onLogout}
                className="p-2 text-teal-200 hover:text-white hover:bg-red-500/20 hover:bg-opacity-50 rounded-full transition-all active:scale-90 hover:rotate-90 duration-300"
                title="Log Out"
                >
                <LogOut className="w-5 h-5" />
                </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

// Mini helper for the star icon
const StarIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
  </svg>
);
