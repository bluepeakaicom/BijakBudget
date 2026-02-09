
import React, { useState, useRef, useEffect } from 'react';
import { UserData } from '../types';
import { ArrowLeft, BarChart3, TrendingUp, DollarSign, Lightbulb, Loader2, Save, Upload, CheckCircle2, ShieldAlert, Store, LayoutDashboard, UserCircle, FileText, BadgeCheck, Eye, MousePointer2, Users, Radio, Mail, Phone, MapPin, Briefcase } from 'lucide-react';
import { analyzeMerchantMetrics, verifyBusinessDocument } from '../services/gemini';

interface BusinessPartnerProps {
  user: UserData;
  onSave: (user: UserData) => void;
  onBack: () => void;
}

type Tab = 'dashboard' | 'profile' | 'verify';

export const BusinessPartner: React.FC<BusinessPartnerProps> = ({ user, onSave, onBack }) => {
  const [activeTab, setActiveTab] = useState<Tab>(user.merchantProfile?.isVerified ? 'dashboard' : 'profile');
  
  // Profile State
  const [businessName, setBusinessName] = useState(user.merchantProfile?.businessName || '');
  const [rocNo, setRocNo] = useState(user.merchantProfile?.rocNo || '');
  const [storeType, setStoreType] = useState(user.merchantProfile?.storeType || 'Mini Market');
  const [address, setAddress] = useState(user.merchantProfile?.address || '');
  const [contact, setContact] = useState(user.merchantProfile?.contact || '');
  const [email, setEmail] = useState(user.merchantProfile?.email || '');
  
  // Dashboard Mock Data (With Real-time simulation)
  const [liveViewers, setLiveViewers] = useState(12);
  const [metrics, setMetrics] = useState({
      impressions: 12450,
      clicks: 892,
      reach: 5430,
      ctr: 7.2
  });
  
  // AI Analysis State
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  // Verification State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('');

  // Live Activity Simulation
  useEffect(() => {
      if (activeTab === 'dashboard') {
          const interval = setInterval(() => {
              setLiveViewers(prev => {
                  const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
                  return Math.max(0, prev + change);
              });
          }, 3000);
          return () => clearInterval(interval);
      }
  }, [activeTab]);

  // --- ACTIONS ---

  const handleAnalyze = async () => {
    if (!businessName) return;
    setAnalyzing(true);
    try {
        const result = await analyzeMerchantMetrics(businessName, { ...metrics, storeType });
        setAiAnalysis(result);
    } catch (e) {
        console.error(e);
    } finally {
        setAnalyzing(false);
    }
  };

  const handleSaveProfile = () => {
      if (!businessName || !rocNo || !email || !contact) {
          alert("Please fill in all required fields.");
          return;
      }

      const updatedUser: UserData = {
          ...user,
          merchantProfile: {
              ...user.merchantProfile,
              businessName,
              rocNo,
              storeType,
              address,
              contact,
              email,
              isVerified: user.merchantProfile?.isVerified || false,
              joinedDate: user.merchantProfile?.joinedDate || new Date().toISOString(),
              state: user.merchantProfile?.state || ''
          }
      };
      onSave(updatedUser);
      // Feedback UI
      const btn = document.getElementById('save-btn');
      if (btn) {
          const originalText = btn.innerText;
          btn.innerText = "Saved!";
          setTimeout(() => btn.innerText = originalText, 2000);
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setFileType(file.type);
          const reader = new FileReader();
          reader.onload = (ev) => {
              setUploadedImage(ev.target?.result as string);
              setVerifyResult(null); // Reset previous result
          };
          reader.readAsDataURL(file);
      }
  };

  const handleVerify = async () => {
      if (!uploadedImage || !businessName || !rocNo) {
          alert("Please verify your Business Name and ROC No in 'Business Profile' tab are correct before verifying document.");
          return;
      }
      
      setVerifying(true);
      try {
          const base64 = uploadedImage.split(',')[1];
          // Pass mimetype explicitly for PDF support
          const result = await verifyBusinessDocument(base64, fileType, businessName, rocNo);
          setVerifyResult(result);
          
          if (result.verified) {
              const updatedUser: UserData = {
                  ...user,
                  merchantProfile: {
                      ...user.merchantProfile!,
                      businessName, 
                      rocNo,
                      isVerified: true
                  }
              };
              onSave(updatedUser);
          }
      } catch (e) {
          console.error(e);
          setVerifyResult({ verified: false, reason: "Verification process failed. Please check your internet or try a clearer image." });
      } finally {
          setVerifying(false);
      }
  };

  // --- SUB-COMPONENTS ---

  const StatCard = ({ label, value, icon: Icon, color, trend }: any) => (
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                  <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
              </div>
              {trend && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> {trend}
                  </span>
              )}
          </div>
          <div>
              <p className="text-2xl font-black text-gray-900">{value}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
          </div>
      </div>
  );

  const renderDashboard = () => (
      <div className="space-y-6 animate-slide-up">
           
           {/* Live Activity Banner */}
           <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-2xl p-5 text-white flex items-center justify-between shadow-lg relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-10 -mt-10 animate-pulse"></div>
               
               <div className="flex items-center gap-3 relative z-10">
                   <div className="relative">
                       <div className="w-3 h-3 bg-red-500 rounded-full absolute -top-1 -right-1 animate-ping"></div>
                       <Radio className="w-6 h-6 text-white" />
                   </div>
                   <div>
                       <h3 className="font-bold text-lg">Live Store Activity</h3>
                       <p className="text-xs text-indigo-200">Real-time shopper engagement</p>
                   </div>
               </div>
               <div className="text-right relative z-10">
                   <p className="text-3xl font-black">{liveViewers}</p>
                   <p className="text-[10px] uppercase font-bold text-indigo-300">Active Viewers</p>
               </div>
           </div>

           {/* Metrics Grid */}
           <div className="grid grid-cols-2 gap-3">
               <StatCard label="Total Impressions" value={metrics.impressions.toLocaleString()} icon={Eye} color="bg-blue-500" trend="+12%" />
               <StatCard label="Profile Clicks" value={metrics.clicks.toLocaleString()} icon={MousePointer2} color="bg-indigo-500" trend="+5%" />
               <StatCard label="Unique Reach" value={metrics.reach.toLocaleString()} icon={Users} color="bg-purple-500" />
               <StatCard label="Conversion Rate" value={`${metrics.ctr}%`} icon={TrendingUp} color="bg-emerald-500" trend="+0.4%" />
           </div>

           {/* AI Analysis Section */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
               <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                   <BarChart3 className="w-5 h-5 text-indigo-600" />
                   Performance Intelligence
               </h3>
               
               <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                   Generate AI-powered insights based on your current traffic and sales data.
               </p>

               <button 
                 onClick={handleAnalyze}
                 disabled={analyzing}
                 className="w-full bg-indigo-50 text-indigo-700 font-bold py-3 rounded-xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
               >
                 {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                 Analyze Trends
               </button>

               {aiAnalysis && (
                   <div className="mt-4 pt-4 border-t border-gray-100 animate-pop-in space-y-3">
                       <div className="flex justify-between items-center">
                           <span className="text-xs font-bold text-gray-500 uppercase">Efficiency Grade</span>
                           <span className={`text-sm font-black px-2 py-0.5 rounded ${aiAnalysis.efficiency_grade?.includes('A') ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                               {aiAnalysis.efficiency_grade || 'N/A'}
                           </span>
                       </div>
                       <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                           <p className="text-xs text-slate-700 font-medium leading-relaxed">
                               "{aiAnalysis.behavior_summary}"
                           </p>
                       </div>
                       <div className="flex items-start gap-2">
                           <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                           <p className="text-xs text-slate-600 italic">{aiAnalysis.optimization_tip}</p>
                       </div>
                   </div>
               )}
           </div>
      </div>
  );

  const renderProfile = () => (
      <div className="space-y-5 animate-slide-up">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-600" /> Business Profile
              </h3>
              
              <div className="space-y-4">
                  {/* Business Name */}
                  <div>
                      <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                          Business Name <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                        placeholder="e.g. Kedai Runcit Ali Sdn Bhd"
                      />
                  </div>

                  {/* ROC */}
                  <div>
                      <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                          Registration No. (SSM) <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={rocNo}
                        onChange={(e) => setRocNo(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                        placeholder="e.g. 202301001234 (12345-X)"
                      />
                  </div>

                  {/* Contact Info Group */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                              Email <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-9 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                placeholder="biz@example.com"
                              />
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                              Contact No. <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input 
                                type="tel" 
                                value={contact}
                                onChange={(e) => setContact(e.target.value)}
                                className="w-full pl-9 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                placeholder="012-3456789"
                              />
                          </div>
                      </div>
                  </div>

                  {/* Store Type */}
                  <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1">Store Type</label>
                      <select 
                        value={storeType}
                        onChange={(e) => setStoreType(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                      >
                          <option value="Mini Market">Mini Market</option>
                          <option value="Grocery Store">Grocery Store</option>
                          <option value="Restaurant">Restaurant / Cafe</option>
                          <option value="Wholesale">Wholesale</option>
                          <option value="Online">Online Business</option>
                      </select>
                  </div>

                  {/* Address */}
                  <div>
                      <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                          Business Address
                      </label>
                      <div className="relative">
                          <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                          <textarea 
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full pl-9 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px] text-sm"
                            placeholder="Full business address..."
                          />
                      </div>
                  </div>
              </div>

              <button 
                id="save-btn"
                onClick={handleSaveProfile}
                className="w-full mt-6 bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg"
              >
                <Save className="w-4 h-4" /> Save Business Profile
              </button>
          </div>
      </div>
  );

  const renderVerification = () => (
      <div className="space-y-6 animate-slide-up">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center">
              {user.merchantProfile?.isVerified ? (
                  <div className="py-8">
                      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                          <BadgeCheck className="w-10 h-10 text-emerald-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Verified Merchant</h3>
                      <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
                          Your business is fully verified. You now have the <strong>Trusted Badge</strong> and access to advanced analytics.
                      </p>
                  </div>
              ) : (
                  <>
                      <div className="mb-6">
                          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                              <FileText className="w-8 h-8 text-indigo-600" />
                          </div>
                          <h3 className="font-bold text-gray-900 text-lg">SSM Verification</h3>
                          <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed">
                              Upload your SSM Certificate, ROB, or ROC. Our AI will verify if it matches your profile details:
                          </p>
                          <div className="mt-3 bg-slate-50 p-2 rounded-lg text-xs text-slate-700 font-mono inline-block border border-slate-200">
                              {businessName || "No Name Set"} <br/> {rocNo || "No ROC Set"}
                          </div>
                      </div>

                      <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*,.pdf" 
                          className="hidden"
                      />

                      {!uploadedImage ? (
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-2xl py-8 hover:border-indigo-400 hover:bg-indigo-50 transition-all group flex flex-col items-center gap-2"
                          >
                              <Upload className="w-8 h-8 text-indigo-300 group-hover:text-indigo-500" />
                              <span className="text-sm font-bold text-indigo-400 group-hover:text-indigo-600">Upload PDF or Image</span>
                              <span className="text-[10px] text-slate-400">Max size 5MB</span>
                          </button>
                      ) : (
                          <div className="relative rounded-xl overflow-hidden border border-gray-200 mb-6 bg-slate-100 p-4">
                              {fileType.includes('pdf') ? (
                                  <div className="flex flex-col items-center py-4">
                                      <FileText className="w-12 h-12 text-red-500 mb-2" />
                                      <p className="text-xs font-bold text-slate-600">PDF Document Selected</p>
                                  </div>
                              ) : (
                                  <img src={uploadedImage} alt="Document" className="w-full h-40 object-contain" />
                              )}
                              
                              <button 
                                onClick={() => { setUploadedImage(null); setVerifyResult(null); }}
                                className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors"
                              >
                                  <ShieldAlert className="w-4 h-4" />
                              </button>
                          </div>
                      )}

                      {uploadedImage && !verifyResult && (
                          <button 
                            onClick={handleVerify}
                            disabled={verifying}
                            className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 mt-4"
                          >
                              {verifying ? (
                                  <><Loader2 className="w-5 h-5 animate-spin" /> Verifying with AI...</>
                              ) : (
                                  <><ShieldAlert className="w-5 h-5" /> Verify Document</>
                              )}
                          </button>
                      )}

                      {verifyResult && (
                          <div className={`mt-6 p-4 rounded-xl text-left border ${verifyResult.verified ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'} animate-pop-in`}>
                              <div className="flex items-start gap-3">
                                  {verifyResult.verified ? <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" /> : <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />}
                                  <div>
                                      <h4 className={`font-bold ${verifyResult.verified ? 'text-emerald-800' : 'text-red-800'}`}>
                                          {verifyResult.verified ? "Verification Successful" : "Verification Failed"}
                                      </h4>
                                      <p className={`text-xs mt-1 leading-relaxed ${verifyResult.verified ? 'text-emerald-700' : 'text-red-700'}`}>
                                          {verifyResult.reason}
                                      </p>
                                      
                                      <div className="mt-2 text-[10px] bg-white/50 p-2 rounded border border-black/5 space-y-1">
                                          <div className="flex justify-between">
                                              <span className="text-slate-500">AI Confidence:</span>
                                              <span className="font-bold">{verifyResult.confidence_score}%</span>
                                          </div>
                                          {verifyResult.extracted_roc && (
                                              <div className="flex justify-between">
                                                  <span className="text-slate-500">Extracted ROC:</span>
                                                  <span className="font-mono">{verifyResult.extracted_roc}</span>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}
                  </>
              )}
          </div>
      </div>
  );

  return (
    <div className="w-full space-y-4 animate-fade-in pb-24">
       
       {/* Top Nav */}
       <div className="flex items-center justify-between sticky top-0 bg-slate-50/90 backdrop-blur-md z-20 py-2">
          <div className="flex items-center gap-3">
            <button 
                onClick={onBack}
                className="bg-white p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all hover:-translate-x-1 shadow-sm"
            >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">Merchant Portal</h2>
                <div className="flex items-center gap-1.5">
                    {user.merchantProfile?.isVerified ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-emerald-100">
                            <BadgeCheck className="w-3 h-3" /> Verified
                        </span>
                    ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            Unverified
                        </span>
                    )}
                </div>
            </div>
          </div>
       </div>

       {/* Tab Switcher */}
       <div className="flex p-1 bg-white border border-gray-200 rounded-xl shadow-sm mb-4">
           {(['profile', 'dashboard', 'verify'] as Tab[]).map((tab) => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 disabled={tab === 'dashboard' && !user.merchantProfile?.isVerified} // Disable dashboard if unverified? Optional.
                 className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all capitalize flex items-center justify-center gap-2 ${
                     activeTab === tab 
                        ? 'bg-slate-900 text-white shadow-md' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                 } ${tab === 'dashboard' && !user.merchantProfile?.isVerified ? 'opacity-50 cursor-not-allowed' : ''}`}
               >
                   {tab === 'dashboard' && <LayoutDashboard className="w-3.5 h-3.5" />}
                   {tab === 'profile' && <Briefcase className="w-3.5 h-3.5" />}
                   {tab === 'verify' && <ShieldAlert className="w-3.5 h-3.5" />}
                   {tab === 'dashboard' ? 'Overview' : tab}
               </button>
           ))}
       </div>

       {/* Content Area */}
       <div className="min-h-[400px]">
           {activeTab === 'dashboard' && renderDashboard()}
           {activeTab === 'profile' && renderProfile()}
           {activeTab === 'verify' && renderVerification()}
       </div>

    </div>
  );
};
