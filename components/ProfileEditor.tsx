
import React, { useState } from 'react';
import { UserData, ShopperPersona } from '../types';
import { User, Mail, MapPin, Calendar, Save, Loader2, Phone, Edit3, ClipboardList, ChevronRight, ArrowLeft, Crown, Zap, HelpCircle, CreditCard, Brain, CheckCircle2, TrendingUp, Sparkles, Lock, Shield, Key, Smartphone, LogOut, Trash2, AlertTriangle, Eye, EyeOff, Laptop } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import { SubscriptionModal } from './SubscriptionModal';

interface ProfileEditorProps {
  user: UserData;
  onSave: (updatedUser: UserData) => void;
  onNavigateToPlan: () => void;
  onNavigateToSara: () => void;
  onReplayTutorial?: () => void;
}

export const ProfileEditor: React.FC<ProfileEditorProps> = ({ user, onSave, onNavigateToPlan, onNavigateToSara, onReplayTutorial }) => {
  // Mode: 'view' (Dashboard), 'edit' (Form), 'security' (Security Settings)
  const [mode, setMode] = useState<'view' | 'edit' | 'security'>('view');
  const [showSubModal, setShowSubModal] = useState(false);
  
  const [formData, setFormData] = useState<UserData>(user);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Security Logic States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [securityProcessing, setSecurityProcessing] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Simulate API delay
    setTimeout(() => {
      onSave(formData);
      setIsSaving(false);
      setMessage('Profile updated successfully!');
      setTimeout(() => {
        setMessage('');
        setMode('view');
      }, 1000);
    }, 1000);
  };

  const handleUpgradeSuccess = () => {
     const updatedUser: UserData = {
        ...user,
        subscription: {
           ...user.subscription,
           tier: 'premium',
           maxScans: 30
        }
     };
     onSave(updatedUser);
     setFormData(updatedUser);
  };

  // --- SECURITY FUNCTIONS ---
  const handleToggle2FA = () => {
      setSecurityProcessing('2fa');
      setTimeout(() => {
          const updatedSecurity = {
              ...user.security!,
              twoFactorEnabled: !user.security?.twoFactorEnabled
          };
          const updatedUser = { ...user, security: updatedSecurity };
          onSave(updatedUser);
          setFormData(updatedUser);
          setSecurityProcessing(null);
          setMessage(updatedSecurity.twoFactorEnabled ? '2FA Enabled!' : '2FA Disabled');
          setTimeout(() => setMessage(''), 2000);
      }, 1500);
  };

  const handleChangePassword = (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentPassword || !newPassword) return;
      
      setSecurityProcessing('pwd');
      setTimeout(() => {
          const updatedSecurity = {
              ...user.security!,
              lastPasswordChange: new Date().toISOString()
          };
          const updatedUser = { ...user, security: updatedSecurity };
          onSave(updatedUser);
          setFormData(updatedUser);
          
          setSecurityProcessing(null);
          setCurrentPassword('');
          setNewPassword('');
          setMessage('Password changed successfully!');
          setTimeout(() => setMessage(''), 2000);
      }, 1500);
  };

  const handleDeleteAccount = () => {
      if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
          alert("Account deletion request submitted. (Demo)");
      }
  };

  // --- DASHBOARD VIEW ---
  if (mode === 'view') {
    return (
      <div className="w-full space-y-6 animate-fade-in pb-24">
        {/* Profile Card */}
        <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-3xl p-6 text-white shadow-xl shadow-teal-900/10 relative overflow-hidden group transform hover:scale-[1.01] transition-transform duration-300">
          {/* Decorative Circles */}
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-[pulse_4s_infinite] group-hover:bg-white/15 transition-colors"></div>
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 bg-teal-400/20 rounded-full blur-xl group-hover:scale-125 transition-transform duration-700"></div>

          <div className="relative z-10 flex items-center gap-5">
             <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30 text-3xl font-bold shadow-lg relative group-hover:rotate-6 transition-transform duration-300">
                {user.name.charAt(0).toUpperCase()}
                {user.subscription.tier === 'premium' && (
                   <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1.5 border-2 border-teal-700 animate-bounce shadow-md">
                      <Crown className="w-4 h-4 text-teal-900 fill-current" />
                   </div>
                )}
             </div>
             <div>
                <h2 className="text-2xl font-bold tracking-tight">{user.name}</h2>
                <div className="flex items-center gap-2 mt-1.5">
                   <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border shadow-sm ${user.subscription.tier === 'premium' ? 'bg-yellow-400 text-teal-900 border-yellow-500' : 'bg-white/20 text-white border-white/30'}`}>
                      {user.subscription.tier} Plan
                   </span>
                </div>
                <p className="text-teal-100 text-sm flex items-center gap-1.5 opacity-90 mt-2 font-medium">
                   <Phone className="w-3.5 h-3.5" />
                   {user.phone || "No phone number"}
                </p>
             </div>
          </div>
        </div>
        
        {/* Subscription Status Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300 hover:border-teal-100">
           <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                 <Zap className="w-4 h-4 text-orange-500" />
                 Monthly Usage
              </h3>
              <span className="text-xs text-gray-400 font-medium">Resets {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
           </div>
           <div className="p-5">
              <div className="flex justify-between items-end mb-2">
                 <div>
                    <span className="text-3xl font-black text-teal-600 tracking-tight">{user.subscription.scanCount}</span>
                    <span className="text-sm text-gray-400 font-medium"> / {user.subscription.maxScans} Scans</span>
                 </div>
                 {user.subscription.tier === 'free' && (
                    <button 
                      onClick={() => setShowSubModal(true)}
                      className="text-xs font-bold text-white bg-gradient-to-r from-orange-400 to-red-500 px-3 py-1.5 rounded-lg shadow-md hover:shadow-lg hover:shadow-orange-500/30 transition-all active:scale-95 hover:scale-105 hover:-translate-y-0.5"
                    >
                       Upgrade Limit
                    </button>
                 )}
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                 <div 
                   className={`h-full rounded-full transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) ${user.subscription.scanCount >= user.subscription.maxScans ? 'bg-red-500' : 'bg-teal-500'}`}
                   style={{ width: `${(user.subscription.scanCount / user.subscription.maxScans) * 100}%` }}
                 ></div>
              </div>
              {user.subscription.scanCount >= user.subscription.maxScans && (
                 <p className="text-xs text-red-500 font-bold mt-2 flex items-center gap-1 animate-pulse">
                    Limit reached. Please upgrade to scan more.
                 </p>
              )}
           </div>
        </div>

        {/* Tools Section */}
        <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1 ml-1">My Tools</h3>
          <div className="grid grid-cols-1 gap-3">
             
             {/* MySARA Check Button */}
             <button 
               onClick={onNavigateToSara}
               className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-lg hover:shadow-blue-500/10 transition-all active:scale-[0.99] hover:border-blue-200 hover:-translate-y-1 duration-300"
             >
                <div className="flex items-center gap-4">
                   <div className="bg-blue-100 p-3.5 rounded-2xl text-blue-600 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shadow-sm">
                      <CreditCard className="w-6 h-6" />
                   </div>
                   <div className="text-left">
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">MySARA Status</h4>
                      <p className="text-xs text-gray-500 group-hover:text-gray-600">Check eligibility & balance</p>
                   </div>
                </div>
                <div className="bg-gray-50 p-2 rounded-xl group-hover:bg-blue-50 transition-colors">
                   <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                </div>
             </button>

             {/* Smart Planner Button */}
             <button 
               onClick={onNavigateToPlan}
               className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-lg hover:shadow-purple-500/10 transition-all active:scale-[0.99] hover:border-purple-200 hover:-translate-y-1 duration-300"
             >
                <div className="flex items-center gap-4">
                   <div className="bg-purple-100 p-3.5 rounded-2xl text-purple-600 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300 shadow-sm">
                      <ClipboardList className="w-6 h-6" />
                   </div>
                   <div className="text-left">
                      <h4 className="font-bold text-gray-900 group-hover:text-purple-700 transition-colors">Smart Planner</h4>
                      <p className="text-xs text-gray-500 group-hover:text-gray-600">Create optimized shopping lists</p>
                   </div>
                </div>
                <div className="bg-gray-50 p-2 rounded-xl group-hover:bg-purple-50 transition-colors">
                   <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500" />
                </div>
             </button>
          </div>
        </div>

        {/* Settings Section */}
        <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1 ml-1">Settings</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
             
             <button 
               onClick={() => setMode('edit')}
               className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left group"
             >
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-teal-50 transition-colors">
                      <Edit3 className="w-5 h-5 text-gray-500 group-hover:text-teal-600 transition-colors" />
                   </div>
                   <span className="font-medium text-gray-700 group-hover:text-gray-900">Edit Profile Information</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform group-hover:text-teal-500" />
             </button>
             
             <button 
               onClick={() => setMode('security')}
               className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left group"
             >
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                      <Shield className="w-5 h-5 text-gray-500 group-hover:text-indigo-600 transition-colors" />
                   </div>
                   <span className="font-medium text-gray-700 group-hover:text-gray-900">Account Security</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform group-hover:text-indigo-500" />
             </button>

             {onReplayTutorial && (
                <button 
                  onClick={onReplayTutorial}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left group"
                >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                          <HelpCircle className="w-5 h-5 text-gray-500 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <span className="font-medium text-gray-700 group-hover:text-gray-900">Replay Tutorial</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform group-hover:text-blue-500" />
                </button>
             )}

             {user.subscription.tier === 'free' && (
                <button 
                  onClick={() => setShowSubModal(true)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left group"
                >
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-orange-50 transition-colors">
                        <Crown className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="font-medium text-gray-700 group-hover:text-gray-900">Upgrade Subscription</span>
                   </div>
                   <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform group-hover:text-orange-500" />
                </button>
             )}

          </div>
        </div>

        <SubscriptionModal 
            isOpen={showSubModal} 
            onClose={() => setShowSubModal(false)} 
            onUpgrade={handleUpgradeSuccess}
            currentTier={user.subscription.tier}
        />
      </div>
    );
  }

  // --- SECURITY VIEW ---
  if (mode === 'security') {
      return (
        <div className="w-full space-y-6 animate-fade-in pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 sticky top-0 bg-slate-50/90 backdrop-blur-md z-10 py-2">
                <button 
                onClick={() => setMode('view')}
                className="bg-white p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all hover:-translate-x-1 shadow-sm hover:shadow-md"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        Account Security
                        <Shield className="w-5 h-5 text-indigo-600" />
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">Protect your data and privacy</p>
                </div>
            </div>

            {message && (
                <div className="mb-4 p-3 bg-teal-50 text-teal-700 text-sm rounded-xl font-medium text-center animate-bounce border border-teal-100 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {message}
                </div>
            )}

            {/* 1. Two-Factor Authentication */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
                <div className="p-5 flex items-center justify-between">
                    <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl ${user.security?.twoFactorEnabled ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-500'}`}>
                            <Smartphone className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">2-Factor Authentication</h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-[200px] leading-relaxed">Secure your account with an extra verification step via SMS.</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleToggle2FA}
                        disabled={!!securityProcessing}
                        className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 relative ${user.security?.twoFactorEnabled ? 'bg-teal-500' : 'bg-slate-200'} ${!!securityProcessing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${user.security?.twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'}`}>
                            {securityProcessing === '2fa' && <Loader2 className="w-3 h-3 text-teal-600 animate-spin m-1" />}
                        </div>
                    </button>
                </div>
            </div>

            {/* 2. Password Management */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600">
                        <Key className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Change Password</h3>
                        <p className="text-[10px] text-slate-400 font-medium">Last changed: {new Date(user.security?.lastPasswordChange || '').toLocaleDateString()}</p>
                    </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="space-y-3">
                        <input 
                            type={showPassword ? "text" : "password"}
                            placeholder="Current Password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                        />
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"}
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm pr-10"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        disabled={!currentPassword || !newPassword || !!securityProcessing}
                        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {securityProcessing === 'pwd' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                    </button>
                </form>
            </div>

            {/* 3. Login History */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <Laptop className="w-4 h-4 text-slate-500" /> Active Sessions
                    </h3>
                </div>
                <div className="divide-y divide-gray-100">
                    {user.security?.loginHistory.map((session) => (
                        <div key={session.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${session.isCurrent ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">
                                        {session.device} 
                                        {session.isCurrent && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">CURRENT</span>}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {session.location}</span>
                                        <span>•</span>
                                        <span>{new Date(session.date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            {!session.isCurrent && (
                                <button className="text-xs text-red-500 font-bold hover:bg-red-50 px-2 py-1 rounded transition-colors">
                                    Revoke
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. Danger Zone */}
            <div className="border border-red-100 bg-red-50/50 rounded-2xl p-5 mt-4">
                <h3 className="font-bold text-red-900 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" /> Danger Zone
                </h3>
                <p className="text-xs text-red-800/70 mb-4 leading-relaxed">
                    Deleting your account is permanent. All your saved lists, scan history, and SARA data will be wiped.
                </p>
                <button 
                    onClick={handleDeleteAccount}
                    className="w-full border-2 border-red-200 text-red-700 font-bold py-3 rounded-xl hover:bg-red-100 hover:border-red-300 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                    <Trash2 className="w-4 h-4" /> Delete Account
                </button>
            </div>
        </div>
      );
  }

  // --- EDIT FORM VIEW ---
  return (
    <div className="w-full space-y-6 animate-fade-in pb-24">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 mb-2">
         <button 
           onClick={() => setMode('view')}
           className="bg-white p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all hover:-translate-x-1 shadow-sm hover:shadow-md"
         >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
         </button>
         <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300">
        
        {message && (
            <div className="mb-4 p-3 bg-teal-50 text-teal-700 text-sm rounded-xl font-medium text-center animate-bounce border border-teal-100">
                {message}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Full Name</label>
                <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                    <input 
                        type="text" 
                        name="name"
                        value={formData.name} 
                        onChange={handleChange}
                        className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none text-base sm:text-sm font-medium hover:border-teal-400 transition-all shadow-sm focus:bg-white bg-gray-50/50"
                        placeholder="Your Name"
                    />
                </div>
            </div>

            {/* Phone Number */}
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Number</label>
                <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                       <Phone className="w-4 h-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                    </div>
                    <div className="w-full pl-8 py-1 border border-gray-200 rounded-xl focus-within:ring-4 focus-within:ring-teal-500/10 focus-within:border-teal-500 transition-all bg-gray-50/50 hover:border-teal-400 shadow-sm">
                        <PhoneInput
                            international
                            defaultCountry="MY"
                            value={formData.phone}
                            onChange={(value) => setFormData(prev => ({ ...prev, phone: value || '' }))}
                            className="px-2 py-2 text-base sm:text-sm font-medium"
                            placeholder="Enter phone number"
                        />
                    </div>
                </div>
            </div>

            {/* Email */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Email</label>
                <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                    <input 
                        type="email" 
                        name="email"
                        value={formData.email} 
                        onChange={handleChange}
                        className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none text-base sm:text-sm font-medium hover:border-teal-400 transition-all shadow-sm focus:bg-white bg-gray-50/50"
                        placeholder="email@example.com"
                    />
                </div>
            </div>

             {/* Birthday */}
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Birthday</label>
                <div className="relative group">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                    <input 
                        type="date" 
                        name="birthday"
                        value={formData.birthday || ''} 
                        onChange={handleChange}
                        className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none text-base sm:text-sm font-medium hover:border-teal-400 transition-all shadow-sm focus:bg-white bg-gray-50/50"
                    />
                </div>
            </div>

            {/* Address */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Address</label>
                <div className="relative group">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                    <textarea 
                        name="address"
                        value={formData.address || ''} 
                        onChange={handleChange}
                        className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none text-base sm:text-sm min-h-[100px] hover:border-teal-400 transition-all shadow-sm focus:bg-white bg-gray-50/50 font-medium"
                        placeholder="No 123, Jalan Bijak, Taman Budget, 56000 Kuala Lumpur..."
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={isSaving}
                className="w-full bg-teal-600 text-white font-bold py-3.5 rounded-xl hover:bg-teal-700 transition-all flex items-center justify-center gap-2 mt-4 hover:shadow-lg shadow-teal-600/20 active:scale-95 hover:-translate-y-0.5"
            >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save Changes
            </button>
        </form>
      </div>
    </div>
  );
};
