
import React, { useState, useEffect } from 'react';
import { Search, TrendingDown, Store, ExternalLink, Loader2, ShoppingBag, AlertCircle, MapPin, CheckCircle2, Gavel, Navigation, X, Info, Scale, Globe, Truck, WifiOff, ArrowRight, Clock, Building2, Package, Tag, Heart, Boxes, History } from 'lucide-react';
import { compareProductPrices } from '../services/gemini';
import { getPriceCatcherBenchmark, getItemPriceComparison, PriceCatcherItem, PriceCatcherComparison } from '../services/gov';
import { ProductComparisonResponse, GroundingChunk, ProductListing } from '../types';

interface PriceComparatorProps {
  onNavigateToStore?: (storeName: string) => void;
  userAddress?: string;
  initialQuery?: string;
  onAddToWishlist?: (item: ProductListing) => void;
}

interface NavModalState {
  isOpen: boolean;
  storeName: string;
  isCheapest: boolean;
  priceDiff?: string;
  cheapestStoreName?: string;
}

type CompareMode = 'all' | 'retail' | 'online' | 'wholesale';

// Cache validity duration: 24 Hours
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

// Sub-component for rendering store image with fallback
const StoreImage = ({ src, alt, brand, size = 'small', isWholesale = false }: { src?: string, alt: string, brand: any, size?: 'small' | 'large', isWholesale?: boolean }) => {
  const [error, setError] = useState(false);
  const sizeClass = size === 'large' ? 'w-20 h-20 rounded-2xl' : 'w-12 h-12 rounded-xl';
  const iconSize = size === 'large' ? 'text-2xl' : 'text-base';

  if (src && !error) {
    return (
       <div className={`${sizeClass} bg-white border border-gray-100 flex items-center justify-center shadow-sm shrink-0 relative overflow-hidden group-hover:scale-105 transition-transform duration-300`}>
          <img 
            src={src} 
            alt={alt} 
            className="w-full h-full object-contain p-1" 
            onError={() => setError(true)}
          />
          
          {/* Store Brand Badge Overlay - Visible when product image is shown */}
          <div className={`absolute -bottom-1 -right-1 ${brand.bg} ${brand.text} ${size==='large' ? 'w-6 h-6 text-[10px]' : 'w-4 h-4 text-[8px]'} rounded-full flex items-center justify-center border border-white shadow-sm z-10`} title={brand.initial}>
             {brand.initial}
          </div>

          {isWholesale && (
            <div className="absolute top-0 right-0 bg-yellow-400 text-teal-900 text-[8px] font-bold px-1.5 py-0.5 rounded-bl-lg shadow-sm z-10">
               BULK
            </div>
          )}
       </div>
    );
  }

  return (
    <div className={`${sizeClass} ${brand.bg} ${brand.text} flex items-center justify-center shadow-sm shrink-0 relative transition-transform group-hover:scale-105 duration-300`}>
        <span className={`font-black ${iconSize}`}>{brand.initial}</span>
        {isWholesale && (
            <div className={`absolute -top-2 -right-2 bg-yellow-400 text-teal-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm border border-yellow-500 flex items-center gap-1 ${size === 'small' ? 'scale-75 origin-bottom-left' : ''}`}>
               <Boxes className="w-3 h-3" /> {size === 'large' ? 'BULK' : ''}
            </div>
        )}
    </div>
  );
};

export const PriceComparator: React.FC<PriceComparatorProps> = ({ 
  onNavigateToStore, 
  userAddress,
  initialQuery = '',
  onAddToWishlist
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [variant, setVariant] = useState('');
  const [compareMode, setCompareMode] = useState<CompareMode>('all');
  
  const [result, setResult] = useState<ProductComparisonResponse | null>(null);
  const [govBenchmark, setGovBenchmark] = useState<PriceCatcherItem | null>(null);
  const [govComparison, setGovComparison] = useState<PriceCatcherComparison | null>(null);
  const [chunks, setChunks] = useState<GroundingChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleDataTimestamp, setStaleDataTimestamp] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  
  // Recent Searches
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // Navigation Modal State
  const [navModal, setNavModal] = useState<NavModalState | null>(null);

  // Effect to handle incoming initialQuery updates
  useEffect(() => {
    if (initialQuery && initialQuery.trim() !== '') {
      setQuery(initialQuery);
      handleSearch(undefined, initialQuery);
    }
  }, [initialQuery]);

  // Effect to clean up expired cache items and load recent searches on mount
  useEffect(() => {
    try {
        const now = Date.now();
        const history: { query: string, ts: number }[] = [];

        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('bijak_price_')) {
                const item = localStorage.getItem(key);
                if (item) {
                    try {
                        const parsed = JSON.parse(item);
                        // If older than expiry, remove it to save space
                        if (now - parsed.timestamp > CACHE_EXPIRY_MS) {
                            localStorage.removeItem(key);
                        } else if (parsed.data && parsed.data.product_query) {
                            // Collect for history
                            history.push({ 
                                query: parsed.data.product_query, 
                                ts: parsed.timestamp 
                            });
                        }
                    } catch (e) {
                         // Corrupt data, remove
                         localStorage.removeItem(key);
                    }
                }
            }
        });

        // Deduplicate and Sort
        const uniqueRecents = history
            .sort((a, b) => b.ts - a.ts)
            .map(h => h.query)
            .filter((v, i, a) => a.findIndex(t => t.toLowerCase() === v.toLowerCase()) === i)
            .slice(0, 5);
            
        setRecentSearches(uniqueRecents);

    } catch (e) {
        console.warn("Cache maintenance failed", e);
    }
  }, []);

  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const searchQuery = overrideQuery || query;
    if (!searchQuery.trim()) return;

    // Reset UI states
    setLoading(true);
    setError(null);
    setResult(null);
    setGovBenchmark(null);
    setGovComparison(null);
    setChunks([]);
    setStaleDataTimestamp(null);
    setLastUpdated(null);

    // Update query state if called via recent search click
    if (overrideQuery) setQuery(overrideQuery);

    // Parallel Fetch: Gov Data (Non-blocking visual update)
    const govPromises = [
        getPriceCatcherBenchmark(searchQuery).then(data => data && setGovBenchmark(data)),
        getItemPriceComparison(searchQuery).then(data => data && setGovComparison(data))
    ];
    Promise.all(govPromises).catch(console.warn);

    // Generate Cache Key (Include compareMode)
    const cacheKey = `bijak_price_${searchQuery.trim().toLowerCase()}_${variant.trim().toLowerCase()}_${compareMode}`;
    
    // Check Cache First
    const cachedRaw = localStorage.getItem(cacheKey);
    let cachedData: { timestamp: number; data: ProductComparisonResponse; groundingChunks: GroundingChunk[] } | null = null;

    if (cachedRaw) {
      try {
        cachedData = JSON.parse(cachedRaw);
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    // 1. If we have fresh cache, use it immediately
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_EXPIRY_MS)) {
      setResult(cachedData.data);
      setChunks(cachedData.groundingChunks);
      setLastUpdated(cachedData.timestamp);
      setLoading(false);
      return;
    }

    try {
      // Pass userAddress to service for location-aware results
      const { data, groundingChunks } = await compareProductPrices(searchQuery, variant, compareMode, userAddress);
      setResult(data);
      setChunks(groundingChunks);
      const now = Date.now();
      setLastUpdated(now);
      
      // Save successful result to cache
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          timestamp: now,
          data,
          groundingChunks
        }));
        
        // Update recent searches state dynamically without reload
        setRecentSearches(prev => {
            const newHistory = [data.product_query, ...prev.filter(q => q.toLowerCase() !== data.product_query.toLowerCase())];
            return newHistory.slice(0, 5);
        });

      } catch (storageErr) {
        console.warn("Local storage full, skipping cache save.");
      }

    } catch (err: any) {
      console.error(err);
      
      // 3. Fallback to stale cache if API fails (Offline Support)
      if (cachedData) {
        setResult(cachedData.data);
        setChunks(cachedData.groundingChunks);
        setStaleDataTimestamp(cachedData.timestamp);
        setLastUpdated(cachedData.timestamp);
      } else {
        const msg = err.message || "Could not find prices right now. Please try again later.";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStoreClick = (item: ProductListing) => {
    if (item.store_type === 'Online' || item.store_type === 'Wholesale') {
      const targetUrl = item.link || getSearchLink(item.store_name, query);
      window.open(targetUrl, '_blank');
      return;
    }

    if (!result || !result.listings) return;
    
    const cheapest = result.listings.find(l => l.is_cheapest);
    const minPrice = cheapest?.price || 0;
    const diff = item.price - minPrice;

    setNavModal({
        isOpen: true,
        storeName: item.store_name,
        isCheapest: item.is_cheapest,
        priceDiff: diff > 0 ? diff.toFixed(2) : undefined,
        cheapestStoreName: cheapest?.store_name
    });
  };

  const handleConfirmNavigation = () => {
    if (navModal && onNavigateToStore) {
        onNavigateToStore(navModal.storeName);
    }
    setNavModal(null);
  };

  const getSearchLink = (storeName: string, query: string) => {
    const encoded = encodeURIComponent(query);
    const lowerStore = storeName.toLowerCase();
    
    // Online Marketplaces
    if (lowerStore.includes('shopee')) return `https://shopee.com.my/search?keyword=${encoded}`;
    if (lowerStore.includes('lazada')) return `https://www.lazada.com.my/catalog/?q=${encoded}`;
    if (lowerStore.includes('tiktok')) return `https://www.tiktok.com/search?q=${encoded}%20shop`;
    
    // Online Grocers
    if (lowerStore.includes('lotus')) return `https://www.lotuss.com.my/en/search/${encoded}`;
    if (lowerStore.includes('jaya grocer')) return `https://www.jayagrocer.com/search?q=${encoded}`;
    if (lowerStore.includes('mydin')) return `https://app.mydin.my/search?q=${encoded}`; // Or their Shopee link, usually app.mydin is their online
    if (lowerStore.includes('aeon')) return `https://my.aeon.com.my/search?q=${encoded}`;
    if (lowerStore.includes('grab')) return `https://food.grab.com/my/en/restaurants?search=${encoded}`; // Rough fallback for grabmart
    if (lowerStore.includes('panda')) return `https://www.foodpanda.my/shops?q=${encoded}`;

    return `https://www.google.com/search?q=${encodeURIComponent(storeName + ' ' + query + ' price malaysia')}`;
  };

  // --- Brand Identity System ---
  const getStoreBranding = (storeName: string) => {
    const lower = storeName.toLowerCase();
    
    // Online Giants
    if (lower.includes('shopee')) return { 
        bg: 'bg-gradient-to-br from-orange-500 to-red-500', 
        text: 'text-white', 
        ring: 'ring-orange-100', 
        icon: <ShoppingBag className="w-5 h-5" />,
        initial: 'S'
    };
    if (lower.includes('lazada')) return { 
        bg: 'bg-gradient-to-br from-blue-600 to-indigo-700', 
        text: 'text-white', 
        ring: 'ring-blue-100', 
        icon: <Globe className="w-5 h-5" />,
        initial: 'L' 
    };
    // Physical Giants
    if (lower.includes('99')) return { 
        bg: 'bg-teal-500', 
        text: 'text-white', 
        ring: 'ring-teal-100', 
        icon: <Store className="w-5 h-5" />,
        initial: '99' 
    };
    if (lower.includes('lotus')) return { 
        bg: 'bg-emerald-600', 
        text: 'text-white', 
        ring: 'ring-emerald-100', 
        icon: <Store className="w-5 h-5" />,
        initial: 'L' 
    };
    // Wholesale
    if (lower.includes('nsk') || lower.includes('wholesale') || lower.includes('borong')) return {
        bg: 'bg-amber-500',
        text: 'text-white',
        ring: 'ring-amber-100',
        icon: <Boxes className="w-5 h-5" />,
        initial: 'W'
    };

    // Fallback
    return { 
        bg: 'bg-gray-700', 
        text: 'text-white', 
        ring: 'ring-gray-100', 
        icon: <Store className="w-5 h-5" />,
        initial: storeName.charAt(0).toUpperCase() 
    };
  };

  // --- Store Type Badge Helper ---
  const renderStoreTypeBadge = (type: string, isBulk: boolean) => {
      if (type === 'Online') {
          return (
              <span className="flex items-center gap-1.5 text-[10px] bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-bold border border-blue-100 shadow-sm whitespace-nowrap">
                  <Globe className="w-3 h-3" /> Online Marketplace
              </span>
          );
      }
      if (type === 'Wholesale' || isBulk) {
          return (
              <span className="flex items-center gap-1.5 text-[10px] bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-bold border border-amber-100 shadow-sm whitespace-nowrap">
                  <Boxes className="w-3 h-3" /> Wholesale Outlet
              </span>
          );
      }
      return (
          <span className="flex items-center gap-1.5 text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold border border-emerald-100 shadow-sm whitespace-nowrap">
              <Store className="w-3 h-3" /> Supermarket
          </span>
      );
  };

  return (
    <div className="w-full space-y-6 animate-fade-in pb-20 relative">
      
      {/* Search Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 transition-all hover:shadow-md">
        <div className="flex justify-between items-start mb-2">
            <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Scale className="w-6 h-6 text-teal-600" />
                  Price Check
                </h2>
                <p className="text-gray-500 text-sm mb-4">
                  Compare Retail & Wholesale prices across Malaysia.
                </p>
            </div>
            {lastUpdated && !staleDataTimestamp && (
                <div className="flex items-center gap-1.5 text-[10px] text-teal-600 bg-teal-50 px-2 py-1 rounded-full border border-teal-100 animate-fade-in">
                    <Clock className="w-3 h-3" />
                    <span>Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}</span>
                </div>
            )}
        </div>

        <form onSubmit={(e) => handleSearch(e)} className="space-y-4">
          
          {/* Comparison Mode Toggle - Scroll Snap for Mobile */}
          <div className="flex p-1 bg-gray-100 rounded-xl overflow-x-auto no-scrollbar snap-x snap-mandatory touch-pan-x">
             {(['all', 'retail', 'online', 'wholesale'] as CompareMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCompareMode(mode)}
                  className={`flex-1 min-w-[30%] py-2 text-xs font-bold rounded-lg transition-all capitalize whitespace-nowrap px-3 snap-center active:scale-95 ${
                    compareMode === mode 
                      ? 'bg-white text-teal-700 shadow-sm scale-100' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200 scale-95 opacity-70'
                  }`}
                >
                  {mode === 'wholesale' ? 'Wholesale/Bulk' : mode}
                </button>
             ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Product Name (e.g. Milo 1kg)"
                className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:bg-white transition-all text-sm font-medium hover:border-teal-300"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
            </div>
            
            <div className="relative w-full sm:w-1/3 group">
               <input
                type="text"
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                placeholder="Variant (e.g. 1 Carton)"
                className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:bg-white transition-all text-sm font-medium hover:border-teal-300"
              />
              <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || !query.trim()}
            className="w-full bg-teal-600 text-white px-4 py-3.5 rounded-xl font-bold hover:bg-teal-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 active:scale-95 active:shadow-none hover:-translate-y-0.5 hover:shadow-teal-500/30"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Check {compareMode === 'wholesale' ? 'Wholesale' : 'Best'} Prices
          </button>
        </form>

        {/* Recent Searches / Cached Access */}
        {recentSearches.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-50">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <History className="w-3 h-3" /> Recent & Cached
                </p>
                <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSearch(undefined, term)}
                            className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all active:scale-95"
                        >
                            {term}
                        </button>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* Offline/Stale Data Banner */}
      {staleDataTimestamp && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 animate-slide-up shadow-sm relative pr-10">
           <div className="bg-amber-100 p-2 rounded-full flex-shrink-0 animate-pulse">
             <WifiOff className="w-5 h-5 text-amber-600" />
           </div>
           <div>
              <h4 className="font-bold text-amber-900 text-sm">Offline Mode - Outdated Info</h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                 Showing cached results from <strong>{new Date(staleDataTimestamp).toLocaleString()}</strong>.
              </p>
           </div>
           <button 
             onClick={() => setStaleDataTimestamp(null)} 
             className="absolute top-2 right-2 p-1.5 text-amber-700 hover:bg-amber-100 rounded-full transition-colors active:scale-90"
           >
             <X className="w-4 h-4" />
           </button>
        </div>
      )}

      {error && !staleDataTimestamp && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-2 animate-fade-in shadow-sm">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* GOV DATA: PRICE CATCHER COMPARISON TABLE */}
      {govComparison && govComparison.comparison.length > 0 && (
         <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 animate-pop-in relative overflow-hidden active:scale-[0.99] transition-all hover:shadow-md hover:border-blue-200 duration-300">
             {/* Decorative */}
             <div className="absolute top-0 right-0 w-40 h-40 bg-blue-200/20 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none"></div>
             
             <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-4">
                     <div className="bg-blue-100 p-2 rounded-full text-blue-700 shadow-sm border border-blue-200">
                         <Building2 className="w-5 h-5" />
                     </div>
                     <div>
                         <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Official Records</p>
                         <h3 className="text-sm font-bold text-gray-900">Government Price Tracker</h3>
                     </div>
                 </div>

                 <div className="bg-white rounded-xl overflow-hidden border border-blue-100 shadow-sm">
                    {govComparison.comparison.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="bg-blue-50 text-blue-700 font-bold text-xs w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0">
                                    {idx + 1}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-800 truncate">{item.store_name}</p>
                                    <p className="text-[10px] text-gray-500 truncate">{item.address || "Address not available"}</p>
                                </div>
                            </div>
                            <div className="text-right pl-2">
                                <p className="text-sm font-black text-blue-700">RM {item.price.toFixed(2)}</p>
                                <p className="text-[9px] text-gray-400">{item.date}</p>
                            </div>
                        </div>
                    ))}
                 </div>
                 <p className="text-[9px] text-blue-400 mt-2 text-center">
                    Data sourced from OpenDOSM PriceCatcher
                 </p>
             </div>
         </div>
      )}

      {/* GOV DATA BENCHMARK (Fallback Summary) */}
      {!govComparison && govBenchmark && (
         <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 animate-pop-in flex flex-col gap-3 relative overflow-hidden active:scale-[0.99] transition-all hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 duration-300">
             {/* Decorative */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none"></div>
             
             <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center relative z-10">
                 <div className="flex items-center gap-3 flex-1">
                     <div className="bg-blue-100 p-2.5 rounded-full text-blue-700 shadow-sm border border-blue-200">
                         <Building2 className="w-5 h-5" />
                     </div>
                     <div>
                         <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Government Benchmark</p>
                         <p className="text-sm font-bold text-gray-900 leading-tight">PriceCatcher (KPDN)</p>
                         <p className="text-xs text-blue-800 mt-0.5 font-medium">{govBenchmark.item} ({govBenchmark.unit})</p>
                     </div>
                 </div>
                 
                 <div className="flex gap-4 items-center w-full sm:w-auto justify-between sm:justify-end">
                     <div className="text-right">
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Average</p>
                        <p className="text-xl font-black text-blue-700">RM {govBenchmark.price_avg.toFixed(2)}</p>
                     </div>
                     <div className="h-8 w-px bg-blue-200 hidden sm:block"></div>
                     <div className="text-right">
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Date</p>
                        <p className="text-xs font-medium text-gray-700">{govBenchmark.date}</p>
                     </div>
                 </div>
             </div>
         </div>
      )}

      {result && result.listings && (
        <div className="space-y-6">
          
          {/* 1. HERO CARD: Best Deal */}
          {result.listings.filter(l => l.is_cheapest).map((item, idx) => {
              const brand = getStoreBranding(item.store_name);
              const isWholesale = item.store_type === 'Wholesale' || (item.bulk_qty && item.bulk_qty > 1);
              
              return (
                <div key={idx} className="relative bg-white rounded-2xl shadow-xl border border-teal-100 overflow-hidden group active:scale-[0.98] transition-all duration-300 animate-slide-up hover:shadow-2xl hover:border-teal-300 hover:-translate-y-1">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-emerald-500"></div>
                    
                    <div className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
                        {/* Visual Avatar with Image Support */}
                        <StoreImage 
                           src={item.image_url} 
                           alt={item.store_name} 
                           brand={brand} 
                           size="large"
                           isWholesale={!!isWholesale} 
                        />

                        <div className="flex-1 text-center sm:text-left">
                            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2 flex-wrap">
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                    <TrendingDown className="w-3 h-3" /> Best Price
                                </span>
                                {renderStoreTypeBadge(item.store_type, !!isWholesale)}
                            </div>
                            
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">{item.store_name}</h3>
                            <p className="text-sm text-gray-500 mb-4 line-clamp-1">{item.product_variant || query}</p>
                            
                            <div className="flex items-center justify-center sm:justify-start gap-4">
                                <div className="text-left">
                                    <p className="text-xs text-gray-400 font-bold uppercase">Total Price</p>
                                    <p className="text-3xl font-black text-teal-600 tracking-tight">RM {item.price.toFixed(2)}</p>
                                </div>
                                
                                {item.unit_price && (
                                    <div className="text-left border-l border-gray-100 pl-4">
                                        <p className="text-xs text-gray-400 font-bold uppercase">Price / Unit</p>
                                        <p className="text-lg font-bold text-indigo-500">RM {item.unit_price.toFixed(2)}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                            {item.store_type === 'Online' || item.store_type === 'Wholesale' ? (
                                <button 
                                    onClick={() => window.open(item.link || getSearchLink(item.store_name, query), '_blank')}
                                    className="w-full sm:w-auto bg-teal-600 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg hover:shadow-teal-500/30 flex items-center justify-center gap-2 active:scale-95"
                                >
                                    Buy Now <ExternalLink className="w-4 h-4" />
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleStoreClick(item)}
                                    className="w-full sm:w-auto bg-white border-2 border-teal-600 text-teal-700 px-6 py-3.5 rounded-xl font-bold hover:bg-teal-50 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                                >
                                    Find Nearby <Navigation className="w-4 h-4" />
                                </button>
                            )}
                            
                            {onAddToWishlist && (
                                <button 
                                    onClick={() => onAddToWishlist(item)}
                                    className="w-full sm:w-auto bg-pink-50 text-pink-600 px-4 py-2.5 rounded-xl font-bold hover:bg-pink-100 transition-all flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Heart className="w-4 h-4" /> Save
                                </button>
                            )}
                        </div>
                    </div>
                </div>
              );
          })}

          {/* 2. PRICE COMPARISON LIST - Staggered */}
          <div>
            <div className="flex items-center justify-between px-2 mb-3">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Other Options</h3>
                <span className="text-xs font-medium text-gray-400">Sorted by Price</span>
            </div>
            
            <div className="grid gap-3">
                {result.listings
                    .sort((a, b) => a.price - b.price)
                    .filter(l => !l.is_cheapest)
                    .map((item, idx) => {
                        const brand = getStoreBranding(item.store_name);
                        const cheapestPrice = result.listings.find(l => l.is_cheapest)?.price || 0;
                        const cheapestUnitPrice = result.listings.find(l => l.is_cheapest)?.unit_price || cheapestPrice;
                        
                        const diffPercent = ((item.price - cheapestPrice) / cheapestPrice) * 100;
                        const isWholesale = item.store_type === 'Wholesale' || (item.bulk_qty && item.bulk_qty > 1);
                        const isPhysical = item.store_type !== 'Online' && item.store_type !== 'Wholesale';

                        // Calculate Bulk Savings vs Retail Benchmark (Rough calc based on cheapest available unit price)
                        const benchmarkUnitPrice = result.average_market_price > 0 ? result.average_market_price : cheapestUnitPrice * 1.2;
                        const savings = item.unit_price ? (benchmarkUnitPrice - item.unit_price) * (item.bulk_qty || 1) : 0;

                        return (
                            <div 
                                key={idx}
                                style={{ animationDelay: `${idx * 50}ms` }}
                                className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-teal-300 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between active:scale-[0.98] duration-200 animate-slide-up relative overflow-hidden hover:shadow-md hover:-translate-y-0.5"
                                onClick={() => handleStoreClick(item)}
                            >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    {/* Brand Visual with Image Support */}
                                    <StoreImage 
                                       src={item.image_url} 
                                       alt={item.store_name} 
                                       brand={brand} 
                                       size="small"
                                       isWholesale={!!isWholesale} 
                                    />
                                    
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-gray-900 group-hover:text-teal-700 transition-colors truncate pr-2">
                                            {item.store_name}
                                        </h4>
                                        
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            {renderStoreTypeBadge(item.store_type, !!isWholesale)}
                                            <span className="text-xs text-gray-500 truncate border-l border-gray-200 pl-2 ml-1">
                                                {item.product_variant || 'Standard'}
                                            </span>
                                        </div>
                                        
                                        {/* Bulk Savings Badge (Logic: If unit price < average market unit price) */}
                                        {isWholesale && item.unit_price && savings > 0 && (
                                            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 w-fit px-2 py-0.5 rounded-lg border border-emerald-100">
                                                <TrendingDown className="w-3 h-3" />
                                                Est. Savings: RM {savings.toFixed(2)} vs Retail
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-3 sm:mt-0 text-right pl-3 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 border-t sm:border-t-0 border-gray-50 pt-2 sm:pt-0">
                                    <div>
                                        <p className="font-bold text-lg text-gray-800 whitespace-nowrap transition-colors group-hover:text-teal-700">RM {item.price.toFixed(2)}</p>
                                        {item.unit_price && (
                                            <p className="text-[10px] text-slate-400 font-medium">RM {item.unit_price.toFixed(2)} / unit</p>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        {!isWholesale && diffPercent > 0 && (
                                            <span className="inline-block text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                                                +{diffPercent.toFixed(0)}%
                                            </span>
                                        )}
                                        {onAddToWishlist && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onAddToWishlist(item); }}
                                                className="p-1.5 text-slate-300 hover:text-pink-500 hover:bg-pink-50 rounded-full transition-all active:scale-90 hover:scale-110"
                                            >
                                                <Heart className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* NEW: Find Nearby Button for Physical Stores */}
                                    {isPhysical && onNavigateToStore && (
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                onNavigateToStore(item.store_name); 
                                            }}
                                            className="hidden sm:flex mt-2 text-[10px] font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg items-center gap-1.5 hover:bg-teal-100 transition-colors border border-teal-100 hover:border-teal-200 shadow-sm active:scale-95 z-10"
                                        >
                                            <MapPin className="w-3 h-3" /> Find Nearby
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {navModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-pop-in relative">
                <button 
                    onClick={() => setNavModal(null)}
                    className="absolute top-4 right-4 p-1.5 bg-gray-100 rounded-full text-gray-500 transition-colors hover:bg-gray-200"
                >
                    <X className="w-5 h-5" />
                </button>
                
                <h3 className="text-xl font-bold text-gray-900 mb-4">Locate Store</h3>
                
                {navModal.priceDiff && (
                    <div className="bg-red-50 p-3 rounded-xl mb-4 border border-red-100 flex items-center gap-3">
                        <div className="bg-red-100 p-2 rounded-full text-red-600">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-red-800 uppercase">Price Warning</p>
                            <p className="text-sm font-medium text-red-700">
                                This item is <span className="font-bold">RM {navModal.priceDiff} more expensive</span> here than at {navModal.cheapestStoreName}.
                            </p>
                        </div>
                    </div>
                )}
                
                <div className="bg-gray-50 p-4 rounded-xl mb-6 flex items-center gap-3 border border-gray-100">
                    <div className="bg-teal-100 p-2.5 rounded-full text-teal-700">
                         <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900">{navModal.storeName}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">Near {userAddress || "your location"}</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => setNavModal(null)}
                        className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold text-sm transition-colors active:scale-95"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirmNavigation}
                        className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-bold flex items-center justify-center gap-2 text-sm shadow-md transition-colors active:scale-95 hover:shadow-lg"
                    >
                        Find Nearby <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
