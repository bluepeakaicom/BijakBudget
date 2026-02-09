
import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Lock, Mail, Loader2, CheckCircle2, User, Smartphone, ShoppingBag } from 'lucide-react';
import { UserData } from '../types';
import PhoneInput from 'react-phone-number-input';

interface LandingPageProps {
  onLogin: (user: UserData, isNewUser: boolean) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  
  // Auth Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [error, setError] = useState('');

  // Consolidated loading check to prevent multiple concurrent requests
  const isAnyLoading = isLoading || isGoogleLoading || isAppleLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnyLoading) return;
    setError('');
    
    if (authMethod === 'email' && !email) { setError("Please enter your email."); return; }
    if (authMethod === 'phone' && !phoneNumber) { setError("Please enter your phone number."); return; }
    if (!password) { setError("Please enter your password."); return; }
    if (isSignUp && !name) { setError("Please enter your full name."); return; }

    setIsLoading(true);

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
      
      // Pass isSignUp flag to trigger correct flow in App.tsx
      onLogin(userData, isSignUp);
    }, 1500);
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnyLoading) return;
    setError('');
    if (!email) { setError("Please enter your email."); return; }
    setIsLoading(true);
    setTimeout(() => { setIsLoading(false); setResetSent(true); }, 1500);
  };

  const handleGoogleLogin = () => {
    if (isAnyLoading) return;
    setIsGoogleLoading(true);
    setTimeout(() => {
      setIsGoogleLoading(false);
      onLogin({
        name: 'Google User',
        email: 'user@gmail.com',
        subscription: { tier: 'free', scanCount: 0, maxScans: 10, lastResetDate: new Date().toISOString() }
      }, true); 
    }, 2000);
  };

  const handleAppleLogin = () => {
    if (isAnyLoading) return;
    setIsAppleLoading(true);
    setTimeout(() => {
      setIsAppleLoading(false);
      onLogin({
        name: 'Apple User',
        email: 'user@icloud.com',
        subscription: { tier: 'free', scanCount: 0, maxScans: 10, lastResetDate: new Date().toISOString() }
      }, true); 
    }, 2000);
  };

  const toggleMode = () => { setIsSignUp(!isSignUp); setError(''); setIsForgotPassword(false); };
  const resetView = () => { setIsForgotPassword(false); setResetSent(false); setError(''); };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center px-4 py-8 font-inter relative overflow-hidden">
      
      {/* Parallax / Floating Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-[10%] -right-[10%] w-[500px] h-[500px] bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full blur-[100px] opacity-30 animate-float"></div>
          <div className="absolute top-[40%] -left-[20%] w-[400px] h-[400px] bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full blur-[80px] opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-[10%] right-[10%] w-[300px] h-[300px] bg-purple-500 rounded-full blur-[90px] opacity-20 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Brand Header - Pop-in animation */}
        <div className="text-center mb-10 animate-pop-in">
            <div className="inline-flex items-center justify-center p-5 bg-white/10 rounded-[2rem] backdrop-blur-md border border-white/20 shadow-2xl mb-5 hover:scale-105 transition-transform duration-500 hover:rotate-3 cursor-pointer group">
                <ShoppingBag className="w-12 h-12 text-teal-300 drop-shadow-md group-hover:animate-bounce" />
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight drop-shadow-sm">BijakBudget</h1>
            <p className="text-teal-100/80 text-lg leading-relaxed font-medium">
                Smart savings for every Malaysian.
            </p>
        </div>

        {/* Auth Card - Glassmorphism */}
        <div className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] p-6 sm:p-8 animate-slide-up border border-white/20">
            
            {isForgotPassword ? (
            <div className="animate-fade-in">
                <button 
                onClick={resetView}
                disabled={isAnyLoading}
                className="text-slate-500 hover:text-teal-700 transition-colors mb-6 flex items-center gap-1.5 text-sm font-bold active:scale-95 duration-200"
                >
                <ArrowLeft className="w-4 h-4" /> Back
                </button>
                
                <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">Reset Password</h2>

                {resetSent ? (
                <div className="text-center py-6 animate-pop-in">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100 shadow-sm">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Check your inbox!</h3>
                    <p className="text-sm text-slate-500 mb-6">We've sent a password reset link to your email.</p>
                    <button 
                    onClick={resetView}
                    className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95"
                    >
                    Return to Login
                    </button>
                </div>
                ) : (
                <>
                    <p className="text-sm text-slate-500 mb-6 text-center px-4">Enter your registered email address.</p>
                    <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email Address"
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all font-bold text-slate-800 placeholder:text-slate-400 focus:scale-[1.02] origin-left"
                        />
                    </div>
                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-teal-500/30 active:scale-95 flex items-center justify-center gap-2 mt-2"
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
                    <h2 className="text-2xl font-bold text-slate-800">{isSignUp ? "Create Account" : "Welcome Back"}</h2>
                </div>

                {/* Toggle */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 shadow-inner">
                <button
                    type="button"
                    disabled={isAnyLoading}
                    onClick={() => { setAuthMethod('email'); setError(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                    authMethod === 'email' ? 'bg-white text-teal-700 shadow-md scale-100' : 'text-slate-500 scale-95 opacity-70'
                    }`}
                >
                    <Mail className="w-4 h-4" /> Email
                </button>
                <button
                    type="button"
                    disabled={isAnyLoading}
                    onClick={() => { setAuthMethod('phone'); setError(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                    authMethod === 'phone' ? 'bg-white text-teal-700 shadow-md scale-100' : 'text-slate-500 scale-95 opacity-70'
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
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all font-bold text-slate-800 placeholder:text-slate-400 focus:scale-[1.02] origin-center"
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
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all font-bold text-slate-800 placeholder:text-slate-400 focus:scale-[1.02] origin-center"
                        />
                    </div>
                )}

                {authMethod === 'phone' && (
                    <div className="animate-fade-in w-full border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-teal-500 focus-within:bg-white transition-all bg-slate-50 overflow-hidden focus-within:scale-[1.02] origin-center">
                        <PhoneInput
                            international
                            defaultCountry="MY"
                            value={phoneNumber}
                            onChange={(val) => setPhoneNumber(val || '')}
                            className="px-4 py-4 text-base font-bold text-slate-800"
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
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all font-bold text-slate-800 placeholder:text-slate-400 focus:scale-[1.02] origin-center"
                    />
                </div>

                {!isSignUp && authMethod === 'email' && (
                    <div className="flex justify-end pt-1">
                        <button
                        type="button"
                        disabled={isAnyLoading}
                        onClick={() => { setIsForgotPassword(true); setError(''); setResetSent(false); }}
                        className="text-xs font-bold text-teal-600 active:text-teal-800 transition-colors p-1"
                        >
                        Forgot Password?
                        </button>
                    </div>
                )}

                {error && (
                    <div className="text-red-600 text-xs bg-red-50 p-3 rounded-xl text-center font-bold border border-red-100 animate-pop-in">
                    {error}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={isAnyLoading}
                    className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-teal-500/30 active:scale-95 flex items-center justify-center gap-2 mt-4 hover:bg-teal-700 hover:shadow-teal-500/50 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{isSignUp ? "Create Account" : "Sign In"} <ArrowRight className="w-5 h-5" /></>}
                </button>
                </form>

                <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200"></div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Or continue with</span>
                <div className="h-px flex-1 bg-slate-200"></div>
                </div>

                <div className="space-y-3">
                    {/* Google Button */}
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isAnyLoading}
                        className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-all hover:bg-slate-50 active:scale-[0.98] flex items-center justify-center gap-3 hover:border-slate-300 disabled:opacity-70 disabled:cursor-not-allowed"
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

                    {/* Apple Button */}
                    <button
                        type="button"
                        onClick={handleAppleLogin}
                        disabled={isAnyLoading}
                        className="w-full bg-black text-white font-bold py-3.5 rounded-xl transition-all hover:bg-gray-900 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
                    >
                        {isAppleLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin text-white" />
                        ) : (
                            <>
                            <svg className="w-5 h-5 text-white" viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z"/>
                            </svg>
                            Continue with Apple
                            </>
                        )}
                    </button>
                </div>

                <div className="mt-8 text-center">
                <p className="text-xs text-slate-400 font-medium">
                    {isSignUp ? "Already have an account? " : "New here? "}
                    <span 
                    onClick={toggleMode}
                    className="text-teal-600 font-bold cursor-pointer hover:underline"
                    >
                    {isSignUp ? "Sign In" : "Create Account"}
                    </span>
                </p>
                </div>
            </>
            )}
        </div>
      </div>
    </div>
  );
};
