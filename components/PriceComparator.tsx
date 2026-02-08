import React, { useState, useEffect } from 'react';
import { Search, TrendingDown, Store, ExternalLink, Loader2, ShoppingBag, AlertCircle, MapPin, CheckCircle2, Gavel, Navigation, X, Info, Scale, Globe, Truck, WifiOff, ArrowRight, Clock, Building2, Package, Tag } from 'lucide-react';
import { compareProductPrices } from '../services/gemini';
import { getPriceCatcherBenchmark, PriceCatcherItem } from '../services/gov';
import { ProductComparisonResponse, GroundingChunk, ProductListing } from '../types';

interface PriceComparatorProps {
  onNavigateToStore?: (storeName: string) => void;
  userAddress?: string;
  initialQuery?: string;
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

export const PriceComparator: React.FC<PriceComparatorProps> = ({ 
  onNavigateToStore, 
  userAddress,
  initialQuery = '' 
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [variant, setVariant] = useState('');
  const [compareMode, setCompareMode] = useState<CompareMode>('all');
  
  const [result, setResult] = useState<ProductComparisonResponse | null>(null);
  const [govBenchmark, setGovBenchmark] = useState<PriceCatcherItem | null>(null);
  const [chunks, setChunks] = useState<GroundingChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleDataTimestamp, setStaleDataTimestamp] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  
  // Navigation Modal State
  const [navModal, setNavModal] = useState<NavModalState | null>(null);

  // Effect to handle incoming initialQuery updates
  useEffect(() => {
    if (initialQuery && initialQuery.trim() !== '') {
      setQuery(initialQuery);
      handleSearch(undefined, initialQuery);
    }
  }, [initialQuery]);

  // Effect to clean up expired cache items on mount
  useEffect(() => {
    try {
        const now = Date.now();
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('bijak_price_')) {
                const item = localStorage.getItem(key);
                if (item) {
                    try {
                        const parsed = JSON.parse(item);
                        // If older than expiry, remove it to save space
                        if (now - parsed.timestamp > CACHE_EXPIRY_MS) {
                            localStorage.removeItem(key);
                        }
                    } catch (e) {
                         // Corrupt data, remove
                         localStorage.removeItem(key);
                    }
                }
            }
        });
    } catch (e) {
        console.warn("Cache cleanup failed", e);
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
    setChunks([]);
    setStaleDataTimestamp(null);
    setLastUpdated(null);

    // Parallel Fetch: Gov Data (Non-blocking visual update)
    // We don't cache gov data strictly or we cache it separately, but for simplicity we fetch fresh
    getPriceCatcherBenchmark(searchQuery).then(data => {
        if (data) setGovBenchmark(data);
    });

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
      const { data, groundingChunks } = await compareProductPrices(searchQuery, variant, compareMode);
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

    if (!result) return;
    
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
    
    if (lowerStore.includes('shopee')) return `https://shopee.com.my/search?keyword=${encoded}`;
    if (lowerStore.includes('lazada')) return `https://www.lazada.com.my/catalog/?q=${encoded}`;
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
    if (lower.includes('tiktok')) return { 
        bg: 'bg-black', 
        text: 'text-white', 
        ring: 'ring-gray-100', 
        icon: <ShoppingBag className="w-5 h-5" />,
        initial: 'T' 
    };
    
    // Physical Hypermarkets & Retail
    if (lower.includes('lotus')) return { 
        bg: 'bg-teal-600', 
        text: 'text-white', 
        ring: 'ring-teal-100', 
        icon: <Store className="w-5 h-5" />,
        initial: 'L' 
    };
    if (lower.includes('mydin')) return { 
        bg: 'bg-blue-800', 
        text: 'text-yellow-400', 
        ring: 'ring-blue-100', 
        icon: <Store className="w-5 h-5" />,
        initial: 'M' 
    };
    if (lower.includes('speedmart') || lower.includes('99')) return { 
        bg: 'bg-green-600', 
        text: 'text-white', 
        ring: 'ring-green-100', 
        icon: <Store className="w-5 h-5" />,
        initial: '99' 
    };
    if (lower.includes('kk') || lower.includes('mart')) return { 
        bg: 'bg-orange-600', 
        text: 'text-white', 
        ring: 'ring-orange-100', 
        icon: <Store className="w-5 h-5" />,
        initial: 'K' 
    };
    if (lower.includes('7-eleven') || lower.includes('7 eleven')) return { 
        bg: 'bg-green-700', 
        text: 'text-orange-500', 
        ring: 'ring-green-100', 
        icon: <Store className="w-5 h-5" />,
        initial: '7' 
    };
    if (lower.includes('family')) return { 
        bg: 'bg-blue-500', 
        text: 'text-green-400', 
        ring: 'ring-blue-100', 
        icon: <Store className="w-5 h-5" />,
        initial: 'F' 
    };
    if (lower.includes('econsave')) return { 
        bg: 'bg-red-600', 
        text: 'text-white', 
        ring: 'ring-red-100', 
        icon: <Store className="w-5 h-5" />,
        initial: 'E' 
    };
    if (lower.includes('nsk')) return { 
        bg: 'bg-red-700', 
        text: 'text-white', 
        ring: 'ring-red-100', 
        icon: <Package className="w-5 h-5" />,
        initial: 'NSK' 
    };
    if (lower.includes('gm')) return { 
        bg: 'bg-purple-800', 
        text: 'text-white', 
        ring: 'ring-purple-100', 
        icon: <Package className="w-5 h-5" />,
        initial: 'GM' 
    };
    
    // Fallback for wholesalers not listed
    if (lower.includes('borong') || lower.includes('wholesale')) return {
        bg: 'bg-slate-700',
        text: 'text-white',
        ring: 'ring-slate-100',
        icon: <Package className="w-5 h-5" />,
        initial: 'W'
    };

    // Default
    return { 
        bg: 'bg-gray-700', 
        text: 'text-white', 
        ring: 'ring-gray-100', 
        icon: <Store className="w-5 h-5" />,
        initial: storeName.charAt(0).toUpperCase() 
    };
  };

  return (
    <div className="w-full space-y-6 animate-fade-in pb-20 relative">
      
      {/* Search Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
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
                <div className="flex items-center gap-1.5 text-[10px] text-teal-600 bg-teal-50 px-2 py-1 rounded-full border border-teal-100">
                    <Clock className="w-3 h-3" />
                    <span>Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}</span>
                </div>
            )}
        </div>

        <form onSubmit={(e) => handleSearch(e)} className="space-y-4">
          
          {/* Comparison Mode Toggle */}
          <div className="flex p-1 bg-gray-100 rounded-xl overflow-x-auto custom-scrollbar">
             {(['all', 'retail', 'online', 'wholesale'] as CompareMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCompareMode(mode)}
                  className={`flex-1 min-w-[80px] py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all capitalize whitespace-nowrap px-2 ${
                    compareMode === mode 
                      ? 'bg-white text-teal-700 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
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
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all text-sm font-medium hover:border-teal-300"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
            </div>
            
            <div className="relative w-full sm:w-1/3 group">
               <input
                type="text"
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                placeholder="Variant (e.g. 1 Carton)"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all text-sm font-medium hover:border-teal-300"
              />
              <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || !query.trim()}
            className="w-full bg-teal-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-md shadow-teal-600/20 active:scale-[0.98] hover:-translate-y-0.5"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Check {compareMode === 'wholesale' ? 'Wholesale' : 'Best'} Prices
          </button>
        </form>
      </div>

      {/* Offline/Stale Data Banner */}
      {staleDataTimestamp && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 animate-slide-up shadow-sm relative pr-10">
           <div className="bg-amber-100 p-2 rounded-full flex-shrink-0">
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
             className="absolute top-2 right-2 p-1.5 text-amber-700 hover:bg-amber-100 rounded-full transition-colors"
           >
             <X className="w-4 h-4" />
           </button>
        </div>
      )}

      {error && !staleDataTimestamp && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* GOV DATA BENCHMARK (PriceCatcher) */}
      {govBenchmark && (
         <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 animate-fade-in flex flex-col sm:flex-row gap-4 items-center">
             <div className="flex items-center gap-3 flex-1">
                 <div className="bg-blue-100 p-2.5 rounded-full text-blue-700">
                     <Building2 className="w-5 h-5" />
                 </div>
                 <div>
                     <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Government Benchmark</p>
                     <p className="text-sm font-bold text-gray-900 leading-tight">PriceCatcher Data (KPDN)</p>
                     <p className="text-xs text-blue-800 mt-0.5">{govBenchmark.item} ({govBenchmark.unit})</p>
                 </div>
             </div>
             
             <div className="flex gap-4 items-center w-full sm:w-auto justify-between sm:justify-end">
                 <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Average</p>
                    <p className="text-xl font-black text-blue-700">RM {govBenchmark.price_avg.toFixed(2)}</p>
                 </div>
                 <div className="h-8 w-px bg-blue-200"></div>
                 <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Range</p>
                    <p className="text-xs font-medium text-gray-700">RM {govBenchmark.price_min.toFixed(2)} - {govBenchmark.price_max.toFixed(2)}</p>
                 </div>
             </div>
         </div>
      )}

      {result && (
        <div className="space-y-6 animate-slide-up">
          
          {/* 1. HERO CARD: Best Deal */}
          {result.listings.filter(l => l.is_cheapest).map((item, idx) => {
              const brand = getStoreBranding(item.store_name);
              const isWholesale = item.store_type === 'Wholesale' || (item.bulk_qty && item.bulk_qty > 1);
              
              return (
                <div key={idx} className="relative bg-white rounded-2xl shadow-xl border border-teal-100 overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-emerald-500"></div>
                    
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                    
                    <div className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
                        {/* Visual Avatar */}
                        <div className={`w-20 h-20 rounded-2xl ${brand.bg} ${brand.text} flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform duration-300 relative`}>
                            <span className="text-2xl font-black">{brand.initial}</span>
                            {isWholesale && (
                                <div className="absolute -top-2 -right-2 bg-yellow-400 text-teal-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm border border-yellow-500">
                                   BULK
                                </div>
                            )}
                        </div>

                        <div className="flex-1 text-center sm:text-left">
                            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                    <TrendingDown className="w-3 h-3" /> Best Price
                                </span>
                                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                                    {item.store_type}
                                </span>
                            </div>
                            
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">{item.store_name}</h3>
                            <p className="text-sm text-gray-500 mb-4 line-clamp-1">{item.product_variant || query}</p>
                            
                            <div className="flex items-center justify-center sm:justify-start gap-4">
                                <div className="text-left">
                                    <p className="text-xs text-gray-400 font-bold uppercase">Total Price</p>
                                    <p className="text-3xl font-black text-teal-600 tracking-tight">RM {item.price.toFixed(2)}</p>
                                </div>
                                
                                {/* Unit Price Analysis for Wholesale */}
                                {item.unit_price && (
                                    <div className="text-left border-l border-gray-100 pl-4">
                                        <p className="text-xs text-gray-400 font-bold uppercase">Price / Unit</p>
                                        <p className="text-lg font-bold text-indigo-500">RM {item.unit_price.toFixed(2)}</p>
                                    </div>
                                )}

                                {!item.unit_price && result.best_deal_savings > 0 && (
                                    <div className="text-left border-l border-gray-100 pl-4">
                                        <p className="text-xs text-gray-400 font-bold uppercase">Savings</p>
                                        <p className="text-lg font-bold text-emerald-500">RM {result.best_deal_savings.toFixed(2)}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="w-full sm:w-auto mt-4 sm:mt-0">
                            {item.store_type === 'Online' || item.store_type === 'Wholesale' ? (
                                <button 
                                    onClick={() => window.open(item.link || getSearchLink(item.store_name, query), '_blank')}
                                    className="w-full sm:w-auto bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg hover:shadow-teal-500/30 flex items-center justify-center gap-2 active:scale-95"
                                >
                                    Buy Now <ExternalLink className="w-4 h-4" />
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleStoreClick(item)}
                                    className="w-full sm:w-auto bg-white border-2 border-teal-600 text-teal-700 px-6 py-3 rounded-xl font-bold hover:bg-teal-50 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                                >
                                    Navigate <Navigation className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
              );
          })}

          {/* 2. PRICE COMPARISON LIST */}
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
                        const diffPercent = ((item.price - cheapestPrice) / cheapestPrice) * 100;
                        const isWholesale = item.store_type === 'Wholesale' || (item.bulk_qty && item.bulk_qty > 1);

                        return (
                            <div 
                                key={idx}
                                onClick={() => handleStoreClick(item)}
                                className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-teal-200 transition-all cursor-pointer group flex items-center justify-between hover:translate-x-1 duration-200 relative overflow-hidden"
                            >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    {/* Brand Visual */}
                                    <div className={`w-12 h-12 rounded-xl ${brand.bg} ${brand.text} flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 transition-transform relative`}>
                                        <span className="font-bold">{brand.initial}</span>
                                        {isWholesale && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border border-yellow-500 flex items-center justify-center">
                                                <Package className="w-2.5 h-2.5 text-black" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-gray-900 group-hover:text-teal-700 transition-colors truncate pr-2">
                                            {item.store_name}
                                        </h4>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-gray-500 mt-0.5">
                                            {item.store_type === 'Online' ? (
                                                <span className="flex items-center gap-1 flex-shrink-0"><Truck className="w-3 h-3" /> Delivery</span>
                                            ) : item.store_type === 'Wholesale' ? (
                                                <span className="flex items-center gap-1 flex-shrink-0 text-purple-600 font-bold"><Package className="w-3 h-3" /> Wholesale</span>
                                            ) : (
                                                <span className="flex items-center gap-1 flex-shrink-0"><MapPin className="w-3 h-3" /> In-Store</span>
                                            )}
                                            <span className="hidden sm:inline w-1 h-1 bg-gray-300 rounded-full"></span>
                                            <span className="truncate">{item.product_variant || 'Standard'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right pl-3 flex flex-col items-end">
                                    <p className="font-bold text-lg text-gray-800 whitespace-nowrap">RM {item.price.toFixed(2)}</p>
                                    
                                    {item.unit_price ? (
                                        <p className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                            RM {item.unit_price.toFixed(2)}/unit
                                        </p>
                                    ) : (
                                        <span className="inline-block text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full group-hover:bg-red-100 transition-colors">
                                            +{diffPercent.toFixed(0)}%
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                })}
            </div>
          </div>

          {/* 3. Buying Tip */}
          {result.buying_tip && (
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex gap-3 items-start">
               <div className="bg-white p-1.5 rounded-full text-indigo-500 shadow-sm shrink-0">
                  <Info className="w-4 h-4" />
               </div>
               <div>
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-1">AI Buying Tip</p>
                  <p className="text-sm text-indigo-900 italic">"{result.buying_tip}"</p>
               </div>
            </div>
          )}

        </div>
      )}

      {/* Confirmation Modal (Physical Stores) */}
      {navModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl transform transition-all scale-100 border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-teal-500"></div>
                
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Locate Store</h3>
                        <p className="text-xs text-gray-500">Open Maps to navigate</p>
                    </div>
                    <button 
                        onClick={() => setNavModal(null)}
                        className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-xl mb-6 flex items-center gap-3 border border-gray-100">
                    <div className="bg-teal-100 p-2.5 rounded-full text-teal-700">
                         <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900">{navModal.storeName}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">Near {userAddress || "your location"}</p>
                    </div>
                </div>

                {!navModal.isCheapest && navModal.priceDiff && (
                    <div className="mb-6 flex gap-3 items-start p-3 bg-orange-50 rounded-lg border border-orange-100">
                        <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-orange-800 leading-relaxed">
                            <strong>Note:</strong> This option is 
                            <span className="font-bold text-red-600 mx-1">RM {navModal.priceDiff}</span> 
                            more expensive than the best deal at {navModal.cheapestStoreName}.
                        </div>
                    </div>
                )}

                <div className="flex gap-3">
                    <button 
                        onClick={() => setNavModal(null)}
                        className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold text-sm transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirmNavigation}
                        className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-bold flex items-center justify-center gap-2 text-sm shadow-md transition-colors"
                    >
                        Navigate <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
      )}

      <style>{`
         @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
         }
      `}</style>
    </div>
  );
};
