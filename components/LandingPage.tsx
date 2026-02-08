
import React, { useState } from 'react';
import { Wallet, ArrowRight, ArrowLeft, Lock, Mail, Loader2, CheckCircle2, User, Smartphone, ShoppingBag } from 'lucide-react';
import { UserData } from '../types';
import PhoneInput from 'react-phone-number-input';

interface LandingPageProps {
  onLogin: (user: UserData) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  
  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  
  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Basic Validation
    if (authMethod === 'email' && !email) {
      setError("Please enter your email.");
      return;
    }
    if (authMethod === 'phone' && !phoneNumber) {
      setError("Please enter your phone number.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    if (isSignUp && !name) {
      setError("Please enter your full name.");
      return;
    }

    setIsLoading(true);

    // Simulate API call for Login or Sign Up
    setTimeout(() => {
      setIsLoading(false);
      
      const phoneStr = phoneNumber; 
      const userData: UserData = {
        name: isSignUp ? name : (authMethod === 'email' ? (email.split('@')[0] || 'User') : 'Mobile User'),
        email: authMethod === 'email' ? email : phoneStr, 
        phone: authMethod === 'phone' ? phoneStr : undefined,
        subscription: {
          tier: 'free',
          scanCount: 0,
          maxScans: 10,
          lastResetDate: new Date().toISOString()
        }
      };
      
      onLogin(userData);
    }, 1500);
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError("Please enter your email.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setResetSent(true);
    }, 1500);
  };

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    setTimeout(() => {
      setIsGoogleLoading(false);
      onLogin({
        name: 'Google User',
        email: 'user@gmail.com',
        subscription: {
          tier: 'free',
          scanCount: 0,
          maxScans: 10,
          lastResetDate: new Date().toISOString()
        }
      });
    }, 2000);
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setIsForgotPassword(false);
  };

  const resetView = () => {
    setIsForgotPassword(false);
    setResetSent(false);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-900 flex flex-col justify-center px-4 py-8 font-inter relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-teal-400 rounded-full blur-[100px] animate-[pulse_8s_infinite]"></div>
          <div className="absolute top-[40%] -left-[10%] w-[400px] h-[400px] bg-emerald-400 rounded-full blur-[100px] animate-[pulse_10s_infinite]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Brand Header */}
        <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center p-4 bg-white/10 rounded-3xl backdrop-blur-md border border-white/20 shadow-2xl mb-4 hover:scale-105 transition-transform duration-500 hover:rotate-3 hover:shadow-teal-500/20 cursor-pointer">
                <ShoppingBag className="w-10 h-10 text-emerald-300 drop-shadow-md" />
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight drop-shadow-sm">BijakBudget</h1>
            <p className="text-teal-100 text-lg opacity-90 leading-relaxed font-medium">
                Your smart assistant for SARA subsidies & grocery savings.
            </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-6 sm:p-8 animate-slide-up border border-white/50 hover:shadow-[0_25px_60px_rgba(0,0,0,0.35)] transition-shadow duration-500">
            
            {isForgotPassword ? (
            <div className="animate-fade-in">
                <button 
                onClick={resetView}
                className="text-slate-500 hover:text-teal-700 transition-colors mb-6 flex items-center gap-1.5 text-sm font-bold hover:-translate-x-1 duration-200"
                >
                <ArrowLeft className="w-4 h-4" /> Back
                </button>
                
                <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">
                Reset Password
                </h2>

                {resetSent ? (
                <div className="text-center py-6 animate-fade-in">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100 shadow-sm">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Check your inbox!</h3>
                    <p className="text-sm text-slate-500 mb-6">We've sent a password reset link to your email.</p>
                    <button 
                    onClick={resetView}
                    className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.98] hover:shadow-xl hover:-translate-y-0.5"
                    >
                    Return to Login
                    </button>
                </div>
                ) : (
                <>
                    <p className="text-sm text-slate-500 mb-6 text-center px-4">Enter your registered email address and we'll help you get back in.</p>
                    <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                    <div>
                        <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email Address"
                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all text-sm font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 hover:border-teal-400 shadow-sm group-focus-within:shadow-md"
                        />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-600 text-xs bg-red-50 p-3 rounded-xl text-center font-bold border border-red-100 animate-pulse">
                        {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-teal-500/30 active:scale-[0.98] hover:shadow-teal-500/40 flex items-center justify-center gap-2 mt-2 hover:-translate-y-0.5"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
                    </button>
                    </form>
                </>
                )}
            </div>
            ) : (
            <>
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">
                    {isSignUp ? "Create Account" : "Welcome Back"}
                    </h2>
                    <p className="text-slate-500 text-sm mt-1 font-medium">
                        {isSignUp ? "Start saving on your groceries today" : "Login to access your savings dashboard"}
                    </p>
                </div>

                {/* Auth Method Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-xl mb-6 shadow-inner">
                <button
                    type="button"
                    onClick={() => { setAuthMethod('email'); setError(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${
                    authMethod === 'email' 
                        ? 'bg-white text-teal-700 shadow-sm transform scale-[1.02]' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                >
                    <Mail className="w-4 h-4" /> Email
                </button>
                <button
                    type="button"
                    onClick={() => { setAuthMethod('phone'); setError(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${
                    authMethod === 'phone' 
                        ? 'bg-white text-teal-700 shadow-sm transform scale-[1.02]' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                >
                    <Smartphone className="w-4 h-4" /> Phone
                </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                
                {isSignUp && (
                    <div className="animate-fade-in relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
                        <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full Name"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all text-sm font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 hover:border-teal-400 shadow-sm focus:shadow-md"
                        />
                    </div>
                )}

                {authMethod === 'email' && (
                    <div className="animate-fade-in relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
                        <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email Address"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all text-sm font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 hover:border-teal-400 shadow-sm focus:shadow-md"
                        />
                    </div>
                )}

                {authMethod === 'phone' && (
                    <div className="animate-fade-in w-full border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-teal-500 focus-within:bg-white transition-all bg-slate-50 overflow-hidden hover:border-teal-400 shadow-sm focus-within:shadow-md">
                        <PhoneInput
                            international
                            defaultCountry="MY"
                            value={phoneNumber}
                            onChange={(val) => setPhoneNumber(val || '')}
                            className="px-4 py-3.5 text-sm font-bold text-slate-800"
                            placeholder="Enter mobile number"
                        />
                    </div>
                )}
                
                <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all text-sm font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 hover:border-teal-400 shadow-sm focus:shadow-md"
                    />
                </div>

                {!isSignUp && authMethod === 'email' && (
                    <div className="flex justify-end pt-1">
                        <button
                        type="button"
                        onClick={() => { setIsForgotPassword(true); setError(''); setResetSent(false); }}
                        className="text-xs font-bold text-teal-600 hover:text-teal-800 transition-colors hover:underline"
                        >
                        Forgot Password?
                        </button>
                    </div>
                )}

                {error && (
                    <div className="text-red-600 text-xs bg-red-50 p-3 rounded-xl text-center font-bold border border-red-100 animate-pulse">
                    {error}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={isLoading || isGoogleLoading}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-teal-500/30 active:scale-[0.98] hover:shadow-teal-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 mt-4"
                >
                    {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                    </>
                    ) : (
                    <>
                        {isSignUp ? "Create Account" : "Sign In"} <ArrowRight className="w-5 h-5" />
                    </>
                    )}
                </button>
                </form>

                <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200"></div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Or continue with</span>
                <div className="h-px flex-1 bg-slate-200"></div>
                </div>

                <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading || isGoogleLoading}
                className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-all hover:bg-slate-50 active:scale-[0.98] hover:border-slate-300 hover:shadow-md flex items-center justify-center gap-3 hover:-translate-y-0.5"
                >
                {isGoogleLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                ) : (
                    <>
                    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.04-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Google
                    </>
                )}
                </button>

                <div className="mt-8 text-center">
                <p className="text-xs text-slate-400 font-medium">
                    {isSignUp ? "Already have an account? " : "Don't have an account? "}
                    <span 
                    onClick={toggleMode}
                    className="text-teal-600 font-bold cursor-pointer hover:underline select-none transition-colors hover:text-teal-700"
                    >
                    {isSignUp ? "Sign In" : "Register Now"}
                    </span>
                </p>
                </div>
            </>
            )}
        </div>

        {/* Features Footer - More subtle */}
        {!isForgotPassword && (
            <div className="mt-8 flex justify-center gap-6">
                 <div className="flex flex-col items-center gap-2 text-teal-100/80 hover:text-white transition-colors cursor-default group">
                    <div className="p-2 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors backdrop-blur-sm group-hover:scale-110 duration-300 shadow-sm">
                        <CheckCircle2 className="w-5 h-5 text-teal-300" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider group-hover:tracking-widest transition-all">AI Analysis</span>
                </div>
                 <div className="flex flex-col items-center gap-2 text-teal-100/80 hover:text-white transition-colors cursor-default group">
                    <div className="p-2 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors backdrop-blur-sm group-hover:scale-110 duration-300 shadow-sm">
                        <CheckCircle2 className="w-5 h-5 text-teal-300" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider group-hover:tracking-widest transition-all">Subsidies</span>
                </div>
                 <div className="flex flex-col items-center gap-2 text-teal-100/80 hover:text-white transition-colors cursor-default group">
                    <div className="p-2 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors backdrop-blur-sm group-hover:scale-110 duration-300 shadow-sm">
                        <CheckCircle2 className="w-5 h-5 text-teal-300" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider group-hover:tracking-widest transition-all">Compare</span>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
