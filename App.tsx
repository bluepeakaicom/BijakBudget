
import React, { useState, useEffect, useRef } from 'react';
import { NavBar } from './components/NavBar';
import { FileUploader, FileUploaderHandle } from './components/FileUploader';
import { AnalysisResult } from './components/AnalysisResult';
import { ChatBot } from './components/ChatBot';
import { StoreFinder } from './components/StoreFinder';
import { LandingPage } from './components/LandingPage';
import { ProfileEditor } from './components/ProfileEditor';
import { PriceComparator } from './components/PriceComparator';
import { SmartPlanner } from './components/SmartPlanner';
import { MySaraCheck } from './components/MySaraCheck';
import { BusinessPartner } from './components/BusinessPartner';
import { SubscriptionModal } from './components/SubscriptionModal';
import { ScanReview } from './components/ScanReview';
import { OnboardingGuide } from './components/OnboardingGuide';
import { LocationPermissionModal } from './components/LocationPermissionModal';
import { MarketWatch } from './components/MarketWatch'; 
import { BirthdayOverlay } from './components/BirthdayOverlay'; // New Import
import { analyzeImage, resetChatSession, generateNotificationContent, analyzeUserBehavior, generateDailyInsight, generateBirthdayWish } from './services/gemini';
import { BijakResponse, GroundingChunk, NavTab, UserData, WishlistItem, ProductListing, ActivityLog } from './types';
import { ScanLine, RotateCcw, MessageCircle, Map as MapIcon, Home, Zap, ShoppingBag, Store, Heart, Trash2, ArrowDown, Search, CreditCard, ClipboardList, ChevronRight, LayoutGrid, Camera, Image as ImageIcon, Bell, Scan, Tag, Sparkles, Lightbulb } from 'lucide-react';

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
  
  // Notification State
  const [notification, setNotification] = useState<{message: string, type: 'price-drop' | 'info' | 'ai'} | null>(null);

  // Cross-component Navigation State
  const [storeFinderQuery, setStoreFinderQuery] = useState<string>('');
  const [priceCompareQuery, setPriceCompareQuery] = useState<string>('');

  // Modals & Flow State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [showBirthday, setShowBirthday] = useState(false); // New Birthday State

  // Refs
  const fileUploaderRef = useRef<FileUploaderHandle>(null);

  // --- INITIAL LOAD: CHECK SESSION & FETCH DATA ---
  useEffect(() => {
    const storedUser = localStorage.getItem('bijak_user');
    if (storedUser) {
      try {
        let parsedUser: UserData = JSON.parse(storedUser);
        
        // Data Migration & Monthly Reset Logic
        if (!parsedUser.subscription) {
            parsedUser.subscription = { tier: 'free', scanCount: 0, maxScans: 10, lastResetDate: new Date().toISOString() };
        }
        if (!parsedUser.wishlist) parsedUser.wishlist = [];
        if (!parsedUser.activityHistory) parsedUser.activityHistory = [];
        
        // Security Settings Migration
        if (!parsedUser.security) {
            parsedUser.security = {
                twoFactorEnabled: false,
                lastPasswordChange: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // ~30 days ago
                loginHistory: [
                    { id: '1', device: 'iPhone 13 Pro', location: 'Kuala Lumpur, MY', date: new Date().toISOString(), isCurrent: true },
                    { id: '2', device: 'Chrome (Windows)', location: 'Petaling Jaya, MY', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), isCurrent: false },
                    { id: '3', device: 'Safari (Mac OS)', location: 'Subang Jaya, MY', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), isCurrent: false }
                ]
            };
        }
        
        const lastReset = new Date(parsedUser.subscription.lastResetDate);
        const now = new Date();
        if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
            parsedUser.subscription.scanCount = 0;
            parsedUser.subscription.lastResetDate = now.toISOString();
        }

        setUser(parsedUser);
        localStorage.setItem('bijak_user', JSON.stringify(parsedUser));
        
        const hasSeenOnboarding = localStorage.getItem('bijak_onboarding_seen');
        if (!hasSeenOnboarding) {
            setShowOnboarding(true);
        } else if (!parsedUser.address && !parsedUser.latitude) {
            setShowLocationPrompt(true);
        }

        // Daily Insight Check
        if (parsedUser.shopperPersona && !parsedUser.dailyInsight) {
            generateDailyInsight(parsedUser).then(insight => {
                if (insight) {
                    const updated = { ...parsedUser, dailyInsight: insight };
                    setUser(updated);
                    localStorage.setItem('bijak_user', JSON.stringify(updated));
                }
            });
        }

        // --- BIRTHDAY CHECK ---
        if (parsedUser.birthday) {
            const today = new Date();
            // Parse YYYY-MM-DD manually to avoid UTC issues
            const [y, m, d] = parsedUser.birthday.split('-').map(Number);
            
            // Check if today matches birthday (Month is 0-indexed in JS Date, but input 1-12)
            if (today.getDate() === d && today.getMonth() + 1 === m) {
                const todayStr = today.toDateString();
                
                // If wish not generated for THIS year yet
                if (!parsedUser.birthdayWish || parsedUser.birthdayWish.dateGenerated !== todayStr) {
                    generateBirthdayWish(parsedUser).then(message => {
                        if (message) {
                            const updatedUser = {
                                ...parsedUser,
                                birthdayWish: {
                                    message,
                                    dateGenerated: todayStr
                                }
                            };
                            setUser(updatedUser);
                            localStorage.setItem('bijak_user', JSON.stringify(updatedUser));
                            setShowBirthday(true);
                        }
                    });
                } else {
                    // Wish already exists for today, show it
                    setShowBirthday(true);
                }
            }
        }

      } catch (e) {
        console.error("Invalid user session", e);
        localStorage.removeItem('bijak_user'); 
      }
    }
  }, []);

  // Auto-hide notification
  useEffect(() => {
      if (notification) {
          const timer = setTimeout(() => setNotification(null), 6000);
          return () => clearTimeout(timer);
      }
  }, [notification]);

  // --- HELPER: BEHAVIOR TRACKING & AUTO-ANALYSIS ---
  const trackAction = (action: ActivityLog['action'], detail: string) => {
      if (!user) return;
      const newLog: ActivityLog = { action, detail, timestamp: new Date().toISOString() };
      
      // Limit history to last 50 items to prevent bloat
      const updatedHistory = [newLog, ...(user.activityHistory || [])].slice(0, 50);
      
      const updatedUser = { ...user, activityHistory: updatedHistory };
      setUser(updatedUser);
      localStorage.setItem('bijak_user', JSON.stringify(updatedUser));

      // --- SERVICE LAYER: BACKGROUND AI ANALYSIS ---
      // Trigger analysis automatically every 5 actions to keep insights fresh but not spam API
      if (updatedHistory.length > 0 && updatedHistory.length % 5 === 0) {
          console.log("Triggering cognitive engine analysis...");
          analyzeUserBehavior(updatedUser)
            .then((persona) => {
                setUser(prev => {
                    if (!prev) return null;
                    const newUserWithPersona = { ...prev, shopperPersona: persona };
                    localStorage.setItem('bijak_user', JSON.stringify(newUserWithPersona));
                    return newUserWithPersona;
                });
                // Once persona is updated, check if we should update insight
                setNotification({ type: 'ai', message: "Shopper DNA Updated: " + persona.archetype });
            })
            .catch(err => {
                console.warn("Background analysis skipped:", err);
            });
      }
  };

  // --- AUTH FLOW HANDLERS ---
  const handleLogin = (basicUserData: UserData, isNewUser: boolean) => {
    const userData: UserData = {
        ...basicUserData,
        subscription: basicUserData.subscription || {
            tier: 'free',
            scanCount: 0,
            maxScans: 10,
            lastResetDate: new Date().toISOString()
        },
        wishlist: [],
        activityHistory: [],
        security: {
            twoFactorEnabled: false,
            lastPasswordChange: new Date().toISOString(),
            loginHistory: [
                { id: '1', device: 'Mobile App', location: 'Malaysia', date: new Date().toISOString(), isCurrent: true }
            ]
        }
    };
    localStorage.setItem('bijak_user', JSON.stringify(userData));
    setUser(userData);
    
    if (isNewUser) {
        setShowOnboarding(true);
    } else {
        const hasSeenOnboarding = localStorage.getItem('bijak_onboarding_seen');
        if (!hasSeenOnboarding) {
            setShowOnboarding(true);
        } else if (!userData.address && !userData.latitude) {
            setShowLocationPrompt(true);
        }
    }
  };

  const handleCloseOnboarding = () => {
      localStorage.setItem('bijak_onboarding_seen', 'true');
      setShowOnboarding(false);
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
              address: address
          };
          handleUpdateProfile(updatedUser);
      }
      setShowLocationPrompt(false);
      setNotification({ type: 'info', message: 'Location updated successfully!' });
  };

  const handleSkipLocation = () => {
      setShowLocationPrompt(false);
      setNotification({ type: 'info', message: 'You can set your location later in Profile.' });
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

  const handleReplayTutorial = () => {
      setShowOnboarding(true);
      setActiveTab('scan'); 
  };

  const handleActionClick = (insight: any) => {
      if (!insight) return;
      if (insight.action_type === 'compare' && insight.action_payload) {
          handleCompareProduct(insight.action_payload);
      } else if (insight.action_type === 'navigate' && insight.action_payload) {
          handleNavigateToStore(insight.action_payload);
      }
  };

  // --- CORE APP FEATURES ---

  const handleFileSelect = async (file: File) => {
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

      const { data, groundingChunks: chunks } = await analyzeImage(base64Data, file.type);
      setResult(data);
      setGroundingChunks(chunks);
      setIsReviewing(true); 
      
      // Track Action
      trackAction('scan_product', data.items.map(i => i.item_name).join(', ') || 'Receipt Scan');

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
  
  const handleNavigateToStore = (storeName: string) => {
    trackAction('view_store', storeName);
    const query = user?.address 
      ? `${storeName} near ${user.address}` 
      : `${storeName} near me`;
    setStoreFinderQuery(query);
    setActiveTab('stores');
  };

  const handleCompareProduct = (productName: string) => {
    trackAction('search_price', productName);
    setPriceCompareQuery(productName);
    setActiveTab('compare');
  };

  const handleAddToWishlist = (product: ProductListing) => {
      if (!user) return;
      
      const newItem: WishlistItem = {
          id: Date.now().toString(),
          productName: product.product_variant || "Product",
          storeName: product.store_name,
          initialPrice: product.price,
          currentPrice: product.price,
          storeType: product.store_type,
          addedDate: new Date().toISOString()
      };

      const exists = user.wishlist?.some(w => w.productName === newItem.productName && w.storeName === newItem.storeName);
      
      if (!exists) {
          const updatedWishlist = [...(user.wishlist || []), newItem];
          const updatedUser = { ...user, wishlist: updatedWishlist };
          handleUpdateProfile(updatedUser);
          setNotification({ type: 'info', message: 'Added to your Price Watchlist!' });
      } else {
          setNotification({ type: 'info', message: 'Item is already in your Watchlist.' });
      }
  };

  const handleRemoveFromWishlist = (id: string) => {
      if (!user) return;
      const updatedWishlist = user.wishlist?.filter(item => item.id !== id) || [];
      const updatedUser = { ...user, wishlist: updatedWishlist };
      handleUpdateProfile(updatedUser);
  };

  const handleScanClick = () => {
      if (activeTab === 'scan' && !result && !loading && !selectedImage) {
          fileUploaderRef.current?.openCamera();
      } else {
          setActiveTab('scan');
          handleReset();
      }
  };

  // Helper for Quick Action Grid
  const QuickAction = ({ icon, label, onClick, color, delay }: { icon: React.ReactNode, label: string, onClick: () => void, color: string, delay: string }) => (
    <button 
        onClick={onClick} 
        className="flex flex-col items-center gap-2 group animate-slide-up"
        style={{ animationDelay: delay }}
    >
        <div className={`p-4 rounded-2xl ${color} shadow-sm group-active:scale-95 group-hover:scale-105 group-hover:shadow-md transition-all duration-300 relative overflow-hidden`}>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
            {icon}
        </div>
        <span className="text-[11px] font-bold text-slate-600 leading-tight text-center">{label}</span>
    </button>
  );

  if (!user) {
    return <LandingPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28 font-inter text-slate-900 selection:bg-teal-500 selection:text-white">
      
      {/* Notifications Toast */}
      {notification && (
          <div className="fixed top-24 left-4 right-4 z-[110] animate-slide-up flex justify-center pointer-events-none">
              <div className={`pointer-events-auto shadow-2xl shadow-slate-900/10 rounded-2xl px-5 py-4 flex items-start gap-4 border backdrop-blur-md transform transition-all hover:scale-105 max-w-sm ${
                  notification.type === 'ai' 
                    ? 'bg-indigo-900/95 text-white border-indigo-500' 
                    : notification.type === 'price-drop' 
                        ? 'bg-red-600/95 text-white border-red-500' 
                        : 'bg-slate-800/95 text-white border-slate-700'
              }`}>
                  {notification.type === 'ai' ? (
                      <div className="bg-white/20 p-1.5 rounded-full animate-pulse">
                          <Sparkles className="w-5 h-5 text-yellow-300 fill-current" />
                      </div>
                  ) : notification.type === 'price-drop' ? (
                      <Bell className="w-6 h-6 animate-bounce" />
                  ) : (
                      <Heart className="w-6 h-6 text-pink-400 fill-current" />
                  )}
                  <div>
                      {notification.type === 'ai' && <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 mb-0.5">Smart Alert</p>}
                      <span className="text-sm font-bold leading-snug block">{notification.message}</span>
                  </div>
              </div>
          </div>
      )}

      {/* Onboarding Overlay - Strict Render */}
      {showOnboarding && <OnboardingGuide onComplete={handleCloseOnboarding} />}

      {/* Location Permission Overlay - Contextual Render */}
      {showLocationPrompt && !showOnboarding && (
         <LocationPermissionModal 
            onLocationDetected={handleLocationDetected}
            onSkip={handleSkipLocation}
         />
      )}

      {/* BIRTHDAY OVERLAY */}
      {showBirthday && user.birthdayWish && (
          <BirthdayOverlay 
             name={user.name}
             message={user.birthdayWish.message}
             onClose={() => setShowBirthday(false)}
          />
      )}

      <NavBar 
        user={user} 
        onLogout={handleLogout} 
        onProfileClick={() => setActiveTab('profile')}
      />

      <main className="max-w-xl mx-auto px-4 pt-24 transition-all duration-300">
        
        <div key={activeTab} className="animate-fade-in">
          {activeTab === 'scan' && (
            <>
               {/* Dashboard Content */}
              {!result && !loading && !selectedImage && (
                <div className="space-y-8">
                  
                  {/* Invisible FileUploader to maintain ref access for FAB */}
                  <div className="hidden">
                    <FileUploader 
                        ref={fileUploaderRef}
                        onFileSelect={handleFileSelect} 
                        isLoading={loading} 
                    />
                  </div>

                  {/* HERO: Savings Dashboard Overview */}
                  <section className="animate-slide-up" style={{ animationDelay: '0ms' }}>
                     <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl shadow-slate-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/20 rounded-full blur-3xl -mr-10 -mt-10 animate-pulse"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -ml-10 -mb-10"></div>
                        
                        <div className="relative z-10">
                           <div className="flex justify-between items-start mb-6">
                              <div>
                                 <h1 className="text-2xl font-black tracking-tight mb-1">My Dashboard</h1>
                                 <p className="text-slate-300 text-sm font-medium">Maximize your purchasing power.</p>
                              </div>
                              <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/10">
                                 <LayoutGrid className="w-5 h-5 text-teal-300" />
                              </div>
                           </div>

                           <div className="flex gap-4">
                              <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
                                 <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Eligible Subsidy</p>
                                 <p className="text-2xl font-black text-teal-400 tracking-tight">Check</p>
                                 <p className="text-[10px] text-slate-400 mt-1">SARA / STR Status</p>
                              </div>
                              <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
                                 <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Wishlist</p>
                                 <p className="text-2xl font-black text-white tracking-tight">{user.wishlist?.length || 0}</p>
                                 <p className="text-[10px] text-slate-400 mt-1">Items Tracked</p>
                              </div>
                           </div>
                        </div>
                     </div>
                  </section>

                  {/* COGNITIVE ENGINE: Daily Insight Widget */}
                  {user.dailyInsight && (
                      <section className="animate-slide-up" style={{ animationDelay: '25ms' }}>
                          <div 
                            onClick={() => handleActionClick(user.dailyInsight)}
                            className="bg-white rounded-3xl p-5 shadow-sm border border-indigo-100 flex items-start gap-4 relative overflow-hidden group cursor-pointer hover:shadow-md transition-all hover:border-indigo-200"
                          >
                              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-[4rem] -mr-4 -mt-4 z-0"></div>
                              
                              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0 relative z-10 group-hover:scale-110 transition-transform duration-300">
                                  <Lightbulb className="w-6 h-6" />
                              </div>
                              
                              <div className="relative z-10 flex-1">
                                  <div className="flex justify-between items-start">
                                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">Bijak Insight</p>
                                      {user.shopperPersona && <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{user.shopperPersona.archetype}</span>}
                                  </div>
                                  <p className="text-sm font-bold text-slate-800 leading-snug pr-2 group-hover:text-indigo-700 transition-colors">
                                      {user.dailyInsight.message}
                                  </p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-slate-300 mt-4 group-hover:text-indigo-400 group-hover:translate-x-1 transition-transform" />
                          </div>
                      </section>
                  )}

                  {/* FEATURE: Visual Product Pricing */}
                  <section className="animate-slide-up" style={{ animationDelay: '50ms' }}>
                      <button 
                        onClick={handleScanClick}
                        className="w-full bg-white rounded-3xl p-1 shadow-sm border border-slate-200 group active:scale-[0.98] transition-all hover:shadow-md hover:border-indigo-200 relative overflow-hidden"
                      >
                         <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                             <Scan className="w-24 h-24 text-indigo-600 rotate-12" />
                         </div>
                         
                         <div className="p-5 flex items-center justify-between relative z-10">
                             <div className="flex items-center gap-4">
                                 <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                                     <Camera className="w-7 h-7" />
                                 </div>
                                 <div className="text-left">
                                     <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-slate-900 text-lg leading-none">Visual Price Check</h3>
                                        <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm">AI</span>
                                     </div>
                                     <p className="text-xs text-slate-500 font-medium max-w-[180px] leading-relaxed">Snap a product to instantly compare prices at 99 Speedmart, Lotus's & more.</p>
                                 </div>
                             </div>
                             
                             <div className="bg-slate-50 p-2 rounded-full border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                 <ChevronRight className="w-5 h-5 text-slate-400" />
                             </div>
                         </div>
                      </button>
                  </section>

                  {/* Quick Features Grid */}
                  <section className="grid grid-cols-4 gap-3 px-1">
                    <QuickAction 
                        icon={<Search className="w-6 h-6 text-blue-600" />} 
                        label="Check Price" 
                        color="bg-blue-50 border border-blue-100 hover:border-blue-300" 
                        onClick={() => setActiveTab('compare')}
                        delay="100ms"
                    />
                    <QuickAction 
                        icon={<CreditCard className="w-6 h-6 text-purple-600" />} 
                        label="MySARA" 
                        color="bg-purple-50 border border-purple-100 hover:border-purple-300" 
                        onClick={() => setActiveTab('sara')}
                        delay="150ms"
                    />
                    <QuickAction 
                        icon={<ClipboardList className="w-6 h-6 text-emerald-600" />} 
                        label="Planner" 
                        color="bg-emerald-50 border border-emerald-100 hover:border-emerald-300" 
                        onClick={() => setActiveTab('plan')}
                        delay="200ms"
                    />
                    <QuickAction 
                        icon={<MapIcon className="w-6 h-6 text-orange-600" />} 
                        label="Near Me" 
                        color="bg-orange-50 border border-orange-100 hover:border-orange-300" 
                        onClick={() => setActiveTab('stores')}
                        delay="250ms"
                    />
                  </section>

                  {/* Market Watch (Horizontal Scroll) */}
                  <section className="animate-slide-up" style={{ animationDelay: '300ms' }}>
                      <MarketWatch />
                  </section>

                  {/* Wishlist Section */}
                  {user.wishlist && user.wishlist.length > 0 && (
                      <section className="animate-slide-up" style={{ animationDelay: '400ms' }}>
                          <div className="flex items-center justify-between mb-3 px-1">
                              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                  <Heart className="w-4 h-4 text-pink-500 fill-current" /> Watchlist
                              </h3>
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{user.wishlist.length} Items</span>
                          </div>
                          <div className="flex gap-3 overflow-x-auto pb-6 -mx-4 px-4 custom-scrollbar snap-x snap-mandatory">
                              {user.wishlist.map((item) => (
                                  <div key={item.id} className="min-w-[160px] bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-pink-100 transition-all duration-300 snap-center relative group active:scale-[0.98]">
                                      <button 
                                        onClick={() => handleRemoveFromWishlist(item.id)}
                                        className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors p-1 bg-slate-50 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100"
                                      >
                                          <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                      
                                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 truncate pr-6">{item.storeName}</p>
                                      <p className="text-xs font-bold text-slate-800 line-clamp-1 mb-2" title={item.productName}>{item.productName}</p>
                                      
                                      <div className="flex items-end gap-1">
                                          <span className="text-sm font-black text-teal-600">RM {item.currentPrice.toFixed(2)}</span>
                                          {item.currentPrice < item.initialPrice && (
                                              <span className="text-[10px] text-red-500 font-bold flex items-center animate-pulse">
                                                  <ArrowDown className="w-2.5 h-2.5" />
                                              </span>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </section>
                  )}

                  {/* Business Banner */}
                  <section className="animate-slide-up" style={{ animationDelay: '500ms' }}>
                    <div 
                        onClick={() => setActiveTab('business')}
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer hover:border-indigo-200 hover:shadow-md"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 group-hover:scale-110 transition-transform">
                                <Store className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">Merchant Portal</h4>
                                <p className="text-xs text-slate-500">Manage your store presence</p>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </section>

                </div>
              )}

              {/* Preview */}
              {selectedImage && loading && (
                <div className="mb-6 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200 bg-white animate-fade-in relative group">
                  <div className="aspect-[3/4] w-full relative bg-slate-900">
                    <img src={selectedImage} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50 blur-md scale-110 transition-transform duration-[20s]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white backdrop-blur-sm p-6 text-center">
                      <div className="relative mb-6">
                         <div className="absolute inset-0 bg-teal-500/30 rounded-full animate-ping blur-xl"></div>
                         <div className="bg-white/10 p-4 rounded-full border border-white/20 backdrop-blur-md relative z-10 animate-bounce">
                             <ScanLine className="w-8 h-8 text-teal-300" />
                         </div>
                      </div>
                      <p className="font-bold text-xl animate-pulse tracking-tight">Analyzing...</p>
                      <p className="text-sm text-slate-300 mt-2 max-w-[200px]">Identifying products & finding best market prices</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-100 mb-6 text-center animate-fade-in shadow-sm">
                  <p className="font-bold text-lg mb-1">Scan Failed</p>
                  <p className="text-sm opacity-90 mb-4">{error}</p>
                  <button 
                    onClick={handleReset}
                    className="text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors px-6 py-3 rounded-xl active:scale-95 shadow-lg shadow-red-500/20"
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
                    <h2 className="text-xl font-bold text-slate-900">Analysis Results</h2>
                    <button 
                      onClick={handleReset}
                      className="flex items-center gap-2 text-sm font-bold text-teal-600 hover:text-white hover:bg-teal-600 px-4 py-2 rounded-xl border border-teal-100 hover:border-teal-600 transition-all duration-200 shadow-sm active:scale-95"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Scan Another
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
              onAddToWishlist={handleAddToWishlist}
            />
          )}

          {activeTab === 'plan' && (
            <SmartPlanner 
              user={user}
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
              userLocation={user}
            />
          )}

          {activeTab === 'business' && (
            <BusinessPartner 
              user={user}
              onSave={handleUpdateProfile}
              onBack={() => setActiveTab('scan')} 
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
        </div>

      </main>

      <SubscriptionModal 
         isOpen={showUpgradeModal}
         onClose={() => setShowUpgradeModal(false)}
         onUpgrade={handleUpgradeSubscription}
         currentTier={user.subscription.tier}
      />

      {/* DOCK NAVIGATION */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-6 pt-10 bg-gradient-to-t from-slate-50/90 via-slate-50/50 to-transparent">
        <div className="pointer-events-auto mx-auto max-w-sm px-4">
          <div className="bg-white/90 backdrop-blur-xl border border-white/60 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] rounded-[2rem] p-1.5 relative ring-1 ring-slate-900/5 transition-transform active:scale-[0.99] duration-200 flex items-end justify-between gap-1">
             
             <div className="flex-1 flex justify-evenly">
                <NavButton 
                  active={activeTab === 'stores'} 
                  onClick={() => setActiveTab('stores')} 
                  icon={<MapIcon className="w-6 h-6" />} 
                  label="Nearby" 
                />
                <NavButton 
                  active={activeTab === 'compare'} 
                  onClick={() => setActiveTab('compare')} 
                  icon={<ShoppingBag className="w-6 h-6" />} 
                  label="Price" 
                />
             </div>

             <div className="relative -top-6 -mb-4 z-10 group">
                <button
                  onClick={handleScanClick}
                  className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl shadow-blue-500/30 transition-all duration-300 active:scale-90 ${activeTab === 'scan' ? 'bg-gradient-to-br from-blue-500 to-indigo-600 scale-110 ring-4 ring-white shadow-blue-500/50' : 'bg-slate-800 hover:bg-slate-700 hover:shadow-lg hover:-translate-y-1'}`}
                >
                   {activeTab === 'scan' ? (
                      <ScanLine className="w-8 h-8 text-white animate-pulse" />
                   ) : (
                      <Home className="w-7 h-7 text-white" />
                   )}
                </button>
             </div>

             <div className="flex-1 flex justify-evenly">
                <NavButton 
                  active={activeTab === 'chat'} 
                  onClick={() => setActiveTab('chat')} 
                  icon={<MessageCircle className="w-6 h-6" />} 
                  label="Chat" 
                />
                <NavButton 
                  active={activeTab === 'profile'} 
                  onClick={() => setActiveTab('profile')} 
                  icon={<Zap className="w-6 h-6" />} 
                  label="MyBijak" 
                />
             </div>

          </div>
        </div>
      </div>
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 w-16 h-14 group ${active ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'}`}
  >
    <div className={`transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${active ? '-translate-y-2 scale-110 drop-shadow-md' : 'group-hover:scale-105 group-hover:-translate-y-0.5'}`}>
       {React.cloneElement(icon as React.ReactElement, { className: `w-6 h-6 ${active ? 'fill-current stroke-[2.5px]' : 'stroke-[2px]'}` })}
    </div>
    
    <span className={`text-[9px] font-bold absolute bottom-1 transition-all duration-300 ${active ? 'opacity-100 translate-y-0 text-teal-700' : 'opacity-0 translate-y-2'}`}>
      {label}
    </span>
    {active && (
       <div className="absolute top-1 w-1 h-1 bg-teal-500 rounded-full animate-ping"></div>
    )}
  </button>
);

export default App;
