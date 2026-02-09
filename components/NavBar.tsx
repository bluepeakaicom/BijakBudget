
import React, { useEffect, useState } from 'react';
import { Wallet, LogOut, Settings, Zap, ScanLine } from 'lucide-react';
import { UserData } from '../types';

interface NavBarProps {
  user: UserData | null;
  onLogout: () => void;
  onProfileClick: () => void;
}

export const NavBar: React.FC<NavBarProps> = ({ user, onLogout, onProfileClick }) => {
  const [scrolled, setScrolled] = useState(false);
  const [greeting, setGreeting] = useState('Welcome back');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const usagePercent = user 
    ? (user.subscription.scanCount / user.subscription.maxScans) * 100 
    : 0;
  
  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ease-out ${
        scrolled 
          ? 'bg-white/80 backdrop-blur-xl shadow-lg shadow-slate-200/20 py-3' 
          : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-xl mx-auto px-6 flex items-center justify-between">
        
        {/* Left: Brand / Greeting */}
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.location.reload()}>
           <div className={`relative p-2.5 rounded-2xl transition-all duration-500 ease-out ${scrolled ? 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/30' : 'bg-white shadow-xl shadow-slate-200/50'} shadow-md group-hover:scale-110 group-hover:rotate-3`}>
              <Wallet className={`w-6 h-6 transition-colors duration-300 ${scrolled ? 'text-white' : 'text-teal-600'}`} />
              <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
           </div>
           
           <div className="flex flex-col">
              <span className={`text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${scrolled ? 'text-slate-400 translate-y-0.5' : 'text-slate-500'}`}>
                {greeting},
              </span>
              <span className={`text-base font-black leading-none tracking-tight transition-all duration-300 group-hover:text-teal-600 ${scrolled ? 'text-slate-800' : 'text-slate-900'}`}>
                {user?.name.split(' ')[0] || 'Guest'}
              </span>
           </div>
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {user && (
            <div className={`hidden sm:flex flex-col items-end mr-2 transition-all duration-500 ${scrolled ? 'opacity-100 scale-100' : 'opacity-90 scale-95'}`}>
               <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  <Zap className={`w-3 h-3 ${user.subscription.tier === 'premium' ? 'text-yellow-500 fill-current animate-pulse' : 'text-slate-300'}`} />
                  {user.subscription.scanCount}/{user.subscription.maxScans}
               </div>
               <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${usagePercent >= 100 ? 'bg-red-500' : 'bg-gradient-to-r from-teal-400 to-emerald-500'}`} 
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  ></div>
               </div>
            </div>
          )}

          {user && (
            <>
                <button 
                  onClick={onProfileClick}
                  className={`p-2.5 rounded-full transition-all duration-300 active:scale-90 hover:scale-110 relative group overflow-hidden ${
                    scrolled ? 'bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-teal-600' : 'bg-white/80 backdrop-blur-md hover:bg-white text-slate-700 shadow-sm'
                  }`}
                >
                    <Settings className="w-5 h-5 relative z-10 transition-transform group-hover:rotate-90 duration-700" />
                </button>
                
                <button 
                onClick={onLogout}
                className={`p-2.5 rounded-full transition-all duration-300 active:scale-90 hover:scale-110 group ${
                    scrolled ? 'bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500' : 'bg-white/80 backdrop-blur-md hover:bg-white text-slate-400 hover:text-red-500 shadow-sm'
                }`}
                >
                <LogOut className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
