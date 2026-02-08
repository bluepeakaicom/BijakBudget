
import React, { useState, useEffect } from 'react';
import { NavBar } from './components/NavBar';
import { FileUploader } from './components/FileUploader';
import { AnalysisResult } from './components/AnalysisResult';
import { ChatBot } from './components/ChatBot';
import { StoreFinder } from './components/StoreFinder';
import { LandingPage } from './components/LandingPage';
import { ProfileEditor } from './components/ProfileEditor';
import { PriceComparator } from './components/PriceComparator';
import { SmartPlanner } from './components/SmartPlanner';
import { MySaraCheck } from './components/MySaraCheck';
import { SubscriptionModal } from './components/SubscriptionModal';
import { ScanReview } from './components/ScanReview';
import { OnboardingGuide } from './components/OnboardingGuide';
import { LocationPermissionModal } from './components/LocationPermissionModal';
import { processReceiptImage, getDailyTip, resetChatSession } from './services/gemini';
import { BijakResponse, GroundingChunk, NavTab, UserData } from './types';
import { ScanLine, RotateCcw, MessageCircle, Map as MapIcon, Home, Zap, ShoppingBag } from 'lucide-react';

function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('scan');
  
  // Scan State
  const [result, setResult] = useState<BijakResponse | null>(null);
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  
  // Daily Tip
  const [dailyTip, setDailyTip] = useState<string>('');

  // Cross-component Navigation State
  const [storeFinderQuery, setStoreFinderQuery] = useState<string>('');
  const [priceCompareQuery, setPriceCompareQuery] = useState<string>('');

  // Subscription Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Onboarding & Location State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  useEffect(() => {
    // Check local storage for session
    const storedUser = localStorage.getItem('bijak_user');
    if (storedUser) {
      try {
        let parsedUser: UserData = JSON.parse(storedUser);
        
        // --- Migration Logic for Existing Users ---
        if (!parsedUser.subscription) {
            parsedUser.subscription = {
                tier: 'free',
                scanCount: 0,
                maxScans: 10,
                lastResetDate: new Date().toISOString()
            };
        }
        
        // --- Monthly Reset Logic ---
        const lastReset = new Date(parsedUser.subscription.lastResetDate);
        const now = new Date();
        
        if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
            parsedUser.subscription.scanCount = 0;
            parsedUser.subscription.lastResetDate = now.toISOString();
            console.log("Monthly scan count reset!");
        }

        setUser(parsedUser);
        localStorage.setItem('bijak_user', JSON.stringify(parsedUser));
        
        // Check if user has seen onboarding
        const hasSeenOnboarding = localStorage.getItem('bijak_onboarding_seen');
        if (!hasSeenOnboarding) {
            setShowOnboarding(true);
        } else if (!parsedUser.address && !parsedUser.latitude) {
            // If onboarding done but no location, prompt for it
            setShowLocationPrompt(true);
        }

      } catch (e) {
        console.error("Invalid user session");
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      // Get fast tip on load only after login
      getDailyTip().then(setDailyTip);
    }
  }, [user]);

  const handleFileSelect = async (file: File) => {
    // Check Subscription Limit
    if (user && user.subscription.scanCount >= user.subscription.maxScans) {
        setShowUpgradeModal(true);
        return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setGroundingChunks([]);
    setIsReviewing(false);

    const objectUrl = URL.createObjectURL(file);
    setSelectedImage(objectUrl);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // AI service defaults to English
      const { data, groundingChunks: chunks } = await processReceiptImage(base64Data, file.type);
      setResult(data);
      setGroundingChunks(chunks);
      setIsReviewing(true); // Enable review mode before showing final results

      // Increment Usage Count on Success
      if (user) {
          const updatedUser = {
              ...user,
              subscription: {
                  ...user.subscription,
                  scanCount: user.subscription.scanCount + 1
              }
          };
          setUser(updatedUser);
          localStorage.setItem('bijak_user', JSON.stringify(updatedUser));
      }

    } catch (err: any) {
      console.error(err);
      const msg = err.message || "Oops! Had a bit of trouble analyzing that. Please try again or use a clearer image.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReview = (editedResult: BijakResponse) => {
      setResult(editedResult);
      setIsReviewing(false);
  };

  const handleReset = () => {
    setResult(null);
    setGroundingChunks([]);
    setSelectedImage(null);
    setError(null);
    setIsReviewing(false);
  };

  const handleLogin = (basicUserData: UserData) => {
    // Initialize new user with Free Tier defaults if not present
    const userData: UserData = {
        ...basicUserData,
        subscription: basicUserData.subscription || {
            tier: 'free',
            scanCount: 0,
            maxScans: 10,
            lastResetDate: new Date().toISOString()
        }
    };

    localStorage.setItem('bijak_user', JSON.stringify(userData));
    setUser(userData);
    
    // Check onboarding for new login
    if (!localStorage.getItem('bijak_onboarding_seen')) {
        setShowOnboarding(true);
    } else {
        // If they skipped onboarding or it's a re-login, ensure we ask for location
        setShowLocationPrompt(true);
    }
  };

  const handleUpdateProfile = (updatedUser: UserData) => {
    setUser(updatedUser);
    localStorage.setItem('bijak_user', JSON.stringify(updatedUser));
  };

  const handleLogout = () => {
    localStorage.removeItem('bijak_user');
    setUser(null);
    setActiveTab('scan');
    handleReset();
    resetChatSession(); 
  };

  const handleUpgradeSubscription = () => {
     if (!user) return;
     const updatedUser: UserData = {
         ...user,
         subscription: {
             ...user.subscription,
             tier: 'premium',
             maxScans: 30
         }
     };
     handleUpdateProfile(updatedUser);
  };
  
  const handleCloseOnboarding = () => {
      localStorage.setItem('bijak_onboarding_seen', 'true');
      setShowOnboarding(false);
      // After onboarding, check location
      if (!user?.address && !user?.latitude) {
          setShowLocationPrompt(true);
      }
  };

  const handleLocationDetected = (lat: number, lng: number, address: string) => {
      if (user) {
          const updatedUser: UserData = {
              ...user,
              latitude: lat,
              longitude: lng,
              address: address // Populate address with reverse geocoded string
          };
          handleUpdateProfile(updatedUser);
      }
      setShowLocationPrompt(false);
  };

  const handleReplayTutorial = () => {
      setShowOnboarding(true);
      setActiveTab('scan'); 
  };

  // Navigate to Store Finder with a specific query
  const handleNavigateToStore = (storeName: string) => {
    const query = user?.address 
      ? `${storeName} near ${user.address}` 
      : `${storeName} near me`;
    
    setStoreFinderQuery(query);
    setActiveTab('stores');
  };

  const handleCompareProduct = (productName: string) => {
    setPriceCompareQuery(productName);
    setActiveTab('compare');
  };

  if (!user) {
    return <LandingPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-inter text-slate-900 selection:bg-teal-500 selection:text-white">
      
      {/* Onboarding Overlay */}
      {showOnboarding && <OnboardingGuide onComplete={handleCloseOnboarding} />}

      {/* Location Permission Overlay */}
      {showLocationPrompt && !showOnboarding && (
         <LocationPermissionModal 
            onLocationDetected={handleLocationDetected}
            onSkip={() => setShowLocationPrompt(false)}
         />
      )}

      <NavBar 
        user={user} 
        onLogout={handleLogout} 
        onProfileClick={() => setActiveTab('profile')}
      />

      <main className="max-w-xl mx-auto px-4 pt-6 transition-all duration-300">
        
        {/* Daily Tip Banner - Only on Home */}
        {activeTab === 'scan' && dailyTip && !isReviewing && !result && (
          <div className="mb-6 bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-5 text-white shadow-lg shadow-teal-900/10 flex items-start gap-4 animate-fade-in hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 border border-teal-500/30 group cursor-default relative overflow-hidden">
            {/* Shimmer Effect on Hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm group-hover:rotate-12 transition-transform duration-300">
               <Zap className="w-6 h-6 text-yellow-300" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-xs font-bold text-teal-200 uppercase tracking-widest mb-1.5">Bijak Tip of the Day</p>
              <p className="font-medium text-base leading-relaxed text-white/95">"{dailyTip}"</p>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'scan' && (
          <>
             {/* Intro & Dashboard Widgets */}
            {!result && !loading && !selectedImage && (
              <div className="mb-8 animate-slide-up space-y-8 mt-4">
                
                {/* Intro Header */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center p-4 bg-white rounded-3xl shadow-sm mb-6 transform hover:scale-110 transition-transform duration-300 border border-slate-100 ring-4 ring-slate-50 group">
                    <ScanLine className="w-10 h-10 text-teal-600 group-hover:text-teal-500 transition-colors" />
                  </div>
                  <h1 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Scan & Save</h1>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
                    Upload your grocery receipt or snap a product photo to maximize your SARA subsidies.
                  </p>
                </div>

                {/* Usage Stats */}
                <div className="text-center">
                   <div className="inline-flex items-center gap-2 bg-white border border-slate-200 pl-4 pr-1 py-1 rounded-full text-xs font-medium text-slate-600 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                      <span>Monthly Limit: <span className="text-teal-600 font-bold">{user.subscription.scanCount}</span> / {user.subscription.maxScans} Scans</span>
                      {user.subscription.tier === 'free' && (
                         <button onClick={() => setShowUpgradeModal(true)} className="bg-teal-50 text-teal-700 hover:bg-teal-100 px-3 py-1.5 rounded-full font-bold transition-colors">
                            Upgrade
                         </button>
                      )}
                   </div>
                </div>

              </div>
            )}

            {/* Upload */}
            {!result && !isReviewing && (
              <FileUploader 
                onFileSelect={handleFileSelect} 
                isLoading={loading} 
              />
            )}

            {/* Preview (Only when loading) */}
            {selectedImage && loading && (
              <div className="mb-6 rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white animate-fade-in relative group">
                <div className="aspect-[4/3] w-full relative bg-slate-100">
                  <img src={selectedImage} alt="Receipt Preview" className="absolute inset-0 w-full h-full object-contain blur-sm scale-105 transition-transform duration-[20s]" />
                  <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/30 border-t-white mb-4"></div>
                    <p className="font-bold text-lg animate-pulse tracking-wide">Analyzing Image...</p>
                    <p className="text-xs text-white/80 mt-2">Checking prices & subsidies</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-700 p-5 rounded-2xl border border-red-100 mb-6 text-center animate-fade-in shadow-sm">
                <p className="font-semibold">{error}</p>
                <button 
                  onClick={handleReset}
                  className="mt-3 text-sm font-bold text-red-600 hover:text-red-800 transition-colors bg-white/50 px-4 py-2 rounded-lg hover:bg-white active:scale-95 transform"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Review Step */}
            {result && isReviewing && (
               <ScanReview 
                 data={result} 
                 onConfirm={handleConfirmReview} 
                 onCancel={handleReset} 
               />
            )}

            {/* Final Results */}
            {result && !isReviewing && (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xl font-bold text-slate-900">Scan Results</h2>
                  <button 
                    onClick={handleReset}
                    className="flex items-center gap-2 text-sm font-bold text-teal-600 hover:text-white hover:bg-teal-600 px-4 py-2 rounded-xl border border-teal-100 hover:border-teal-600 transition-all duration-200 shadow-sm active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4" />
                    New Scan
                  </button>
                </div>
                <AnalysisResult 
                  result={result} 
                  groundingChunks={groundingChunks} 
                  onCompareProduct={handleCompareProduct}
                />
              </div>
            )}
          </>
        )}

        {activeTab === 'compare' && (
          <PriceComparator 
            onNavigateToStore={handleNavigateToStore} 
            userAddress={user.address}
            initialQuery={priceCompareQuery}
          />
        )}

        {activeTab === 'plan' && (
          <SmartPlanner 
            userAddress={user.address}
            onBack={() => setActiveTab('profile')}
          />
        )}
        
        {activeTab === 'sara' && (
          <MySaraCheck 
             onBack={() => setActiveTab('profile')} 
          />
        )}

        {activeTab === 'chat' && <ChatBot user={user} />}
        
        {activeTab === 'stores' && (
          <StoreFinder 
            initialQuery={storeFinderQuery} 
            userLocation={user} // Pass user location for improved UX
          />
        )}

        {activeTab === 'profile' && (
          <ProfileEditor 
            user={user} 
            onSave={handleUpdateProfile} 
            onNavigateToPlan={() => setActiveTab('plan')}
            onNavigateToSara={() => setActiveTab('sara')} 
            onReplayTutorial={handleReplayTutorial}
          />
        )}

      </main>

      <SubscriptionModal 
         isOpen={showUpgradeModal}
         onClose={() => setShowUpgradeModal(false)}
         onUpgrade={handleUpgradeSubscription}
         currentTier={user.subscription.tier}
      />

      {/* Modern Floating Dock Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center pb-4 sm:pb-6">
        <div className="pointer-events-auto bg-white/90 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl mx-4 sm:mx-auto max-w-sm w-full flex justify-between px-3 py-2.5 relative ring-1 ring-slate-900/5 transition-all hover:scale-[1.01] hover:shadow-[0_8px_40px_rgb(0,0,0,0.15)]">
           
          <NavButton 
            active={activeTab === 'scan'} 
            onClick={() => setActiveTab('scan')} 
            icon={<Home className="w-6 h-6" />} 
            label="Home" 
          />
          
          <NavButton 
            active={activeTab === 'compare'} 
            onClick={() => setActiveTab('compare')} 
            icon={<ShoppingBag className="w-6 h-6" />} 
            label="Compare" 
          />
          
          <NavButton 
            active={activeTab === 'chat'} 
            onClick={() => setActiveTab('chat')} 
            icon={<MessageCircle className="w-6 h-6" />} 
            label="Chat" 
          />
          
          <NavButton 
            active={activeTab === 'stores'} 
            onClick={() => setActiveTab('stores')} 
            icon={<MapIcon className="w-6 h-6" />} 
            label="Nearby" 
          />
        </div>
      </div>

      <style>{`
         @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
         }
      `}</style>
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 group w-full active:scale-90 ${active ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'}`}
  >
    {active && (
      <div className="absolute inset-x-2 top-1 bottom-1 bg-teal-50/80 rounded-xl -z-10 animate-fade-in shadow-sm"></div>
    )}
    
    <div className={`transition-transform duration-300 ${active ? 'scale-110 -translate-y-0.5' : 'group-hover:scale-110 group-hover:-translate-y-1'}`}>
       {React.cloneElement(icon as React.ReactElement, { className: `w-6 h-6 ${active ? 'fill-current stroke-[2.5px]' : 'stroke-[2px]'}` })}
    </div>
    <span className={`text-[10px] font-bold mt-1 transition-all duration-300 ${active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}`}>
      {label}
    </span>
  </button>
);

export default App;
