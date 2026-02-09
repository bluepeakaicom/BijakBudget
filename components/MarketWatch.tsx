
import React, { useEffect, useState } from 'react';
import { TrendingUp, MapPin, Loader2, Info, ShoppingBasket, Egg, Droplet, Wheat, BarChart3, ArrowDown, Calendar, WifiOff, RefreshCw } from 'lucide-react';
import { getPriceCatcherBenchmark, PriceCatcherItem } from '../services/gov';

// Common daily essentials to track
const WATCHLIST = [
  { query: 'Ayam Bersih', label: 'Chicken', unit: 'kg', icon: <ShoppingBasket className="w-4 h-4 text-orange-500" /> },
  { query: 'Telur Gred A', label: 'Eggs (A)', unit: '30pcs', icon: <Egg className="w-4 h-4 text-yellow-500" /> },
  { query: 'Minyak Masak Sawit', label: 'Oil', unit: '5kg', icon: <Droplet className="w-4 h-4 text-amber-600" /> },
  { query: 'Cili Merah', label: 'Chilli', unit: 'kg', icon: <TrendingUp className="w-4 h-4 text-red-500" /> }
];

const CACHE_KEY = 'bijak_market_watch_v1';
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 Hours

export const MarketWatch: React.FC = () => {
  const [prices, setPrices] = useState<(PriceCatcherItem & { label: string, unit: string, icon: React.ReactNode })[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [dataDate, setDataDate] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const hydrateWithIcons = (data: any[]) => {
        return data.map((item: any) => {
             const original = WATCHLIST.find(w => w.label === item.label);
             return { ...item, icon: original?.icon };
        });
    };

    const loadData = async () => {
        // 1. Check Local Cache
        const cachedRaw = localStorage.getItem(CACHE_KEY);
        let cachedData = null;
        
        if (cachedRaw) {
            try {
                const parsed = JSON.parse(cachedRaw);
                if (Date.now() - parsed.timestamp < CACHE_DURATION) {
                    cachedData = parsed;
                }
            } catch (e) {
                localStorage.removeItem(CACHE_KEY);
            }
        }

        // If fresh cache exists, use it immediately
        if (cachedData) {
            setPrices(hydrateWithIcons(cachedData.data));
            setDataDate(cachedData.date);
            setIsCached(true);
            setLoading(false);
            return;
        }

        // 2. Fetch Fresh Data
        try {
            const results = await Promise.allSettled(
              WATCHLIST.map(async (item) => {
                const data = await getPriceCatcherBenchmark(item.query);
                // Save essential data only (no React nodes)
                return data ? { ...data, label: item.label, unit: item.unit } : null;
              })
            );
            
            const successful = results
                .filter(r => r.status === 'fulfilled')
                .map(r => (r as PromiseFulfilledResult<any>).value)
                .filter(Boolean);
                
            if (successful.length > 0) {
                setPrices(hydrateWithIcons(successful));
                
                // Find the most recent date from the data
                const dates = successful.map(p => p.date).sort();
                const latest = dates[dates.length - 1];
                setDataDate(latest);
                setIsCached(false);

                // Update Cache
                try {
                    localStorage.setItem(CACHE_KEY, JSON.stringify({
                        timestamp: Date.now(),
                        date: latest,
                        data: successful
                    }));
                } catch (e) {
                    console.warn("Storage full", e);
                }
            } else if (cachedRaw) {
                // If fetch returns empty (e.g. API down) but we have stale cache, use it
                const parsed = JSON.parse(cachedRaw);
                setPrices(hydrateWithIcons(parsed.data));
                setDataDate(parsed.date);
                setIsCached(true);
            }

        } catch (e) {
            console.error("Failed to load market prices", e);
            // Fallback to stale cache on error
            if (cachedRaw) {
                try {
                    const parsed = JSON.parse(cachedRaw);
                    setPrices(hydrateWithIcons(parsed.data));
                    setDataDate(parsed.date);
                    setIsCached(true);
                } catch (err) {}
            }
        } finally {
            setLoading(false);
        }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-48 bg-white rounded-3xl animate-pulse p-6 flex flex-col items-center justify-center border border-slate-100 mb-6 shadow-sm">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin mb-3" />
        <span className="text-slate-400 text-sm font-medium">Analyzing market trends...</span>
      </div>
    );
  }

  if (prices.length === 0) return null;

  return (
    <div className="mb-8 animate-fade-in">
      
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-teal-600" /> Market Pulse
        </h3>
        <div className="flex items-center gap-2">
            {isCached && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full" title="Showing cached data">
                    <WifiOff className="w-3 h-3" /> Offline
                </span>
            )}
            {dataDate && (
                <span className="text-[10px] text-slate-500 font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {dataDate}
                </span>
            )}
        </div>
      </div>

      {/* 1. NEW VISUAL CHART: PRICE SPREAD */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm mb-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
              <div>
                  <h4 className="font-bold text-slate-900 text-sm">Price Gap Analysis</h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Potential savings vs Market Average</p>
              </div>
              
              {/* Legend */}
              <div className="flex gap-3">
                  <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Lowest</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-indigo-100"></div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Average</span>
                  </div>
              </div>
          </div>

          <div className="flex items-end justify-between h-32 gap-3 sm:gap-6 px-2">
             {prices.map((item, idx) => {
                // Normalize relative to the item's MAX price recorded to show the spread range
                const maxReference = item.price_max > 0 ? item.price_max : item.price_avg * 1.2;
                
                const heightAvg = (item.price_avg / maxReference) * 100;
                const heightMin = (item.price_min / maxReference) * 100;
                
                // Calculate Savings %
                const savingsPct = Math.round(((item.price_avg - item.price_min) / item.price_avg) * 100);

                return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                         {/* Bar Column */}
                         <div className="w-full max-w-[40px] bg-slate-50 rounded-t-xl relative h-full flex items-end overflow-visible group-hover:bg-slate-100 transition-colors duration-300">
                              
                              {/* Average Price Bar (Background) */}
                              <div 
                                className="w-full bg-indigo-100 absolute bottom-0 rounded-t-lg transition-all duration-[1500ms] ease-out group-hover:bg-indigo-200"
                                style={{ height: mounted ? `${heightAvg}%` : '0%' }}
                              ></div>
                              
                              {/* Lowest Price Bar (Foreground) */}
                              <div 
                                className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 absolute bottom-0 rounded-t-lg transition-all duration-[1500ms] ease-out shadow-[0_-4px_10px_rgba(16,185,129,0.2)] group-hover:to-emerald-300"
                                style={{ height: mounted ? `${heightMin}%` : '0%' }}
                              >
                                  {/* Top Shine */}
                                  <div className="absolute top-0 w-full h-[1px] bg-white/50"></div>
                              </div>

                              {/* Floating Savings Badge */}
                              {savingsPct > 5 && (
                                <div 
                                    className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white border border-emerald-100 text-emerald-600 text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-10 whitespace-nowrap"
                                >
                                    -{savingsPct}%
                                </div>
                              )}
                         </div>

                         {/* Icon Label */}
                         <div className="text-center z-10">
                            <div className="bg-white border border-slate-100 p-1.5 rounded-full shadow-sm mb-1 mx-auto w-fit group-hover:scale-110 transition-transform duration-300 group-hover:border-emerald-200">
                                {item.icon}
                            </div>
                            <p className="text-[10px] font-bold text-slate-600 leading-tight">{item.label}</p>
                         </div>
                    </div>
                )
             })}
          </div>
      </div>

      {/* 2. EXISTING CARDS (Horizontal Scroll) */}
      <div className="flex overflow-x-auto gap-3 pb-4 custom-scrollbar snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
        {prices.map((item, idx) => (
          <div 
            key={idx} 
            className="min-w-[200px] bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all snap-center group relative overflow-hidden active:scale-[0.98] duration-200 hover:border-teal-200"
          >
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rounded-full -mr-6 -mt-6 z-0 group-hover:bg-teal-50 transition-colors"></div>

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-3">
                 <div className="text-left">
                    <p className="text-xs font-bold text-slate-700">{item.label}</p>
                    <p className="text-[10px] text-slate-400">{item.unit}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Avg</p>
                    <p className="text-sm font-black text-slate-800">RM {item.price_avg.toFixed(2)}</p>
                 </div>
              </div>

              {item.cheapest_premise && (
                <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100 group-hover:border-emerald-200 transition-colors">
                   <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold text-emerald-700 uppercase">Lowest Found</span>
                      <ArrowDown className="w-3 h-3 text-emerald-600" />
                   </div>
                   <div className="flex items-end justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                         <p className="text-[10px] text-emerald-800 font-medium truncate">
                           {item.cheapest_premise.premise}
                         </p>
                      </div>
                      <p className="text-sm font-black text-emerald-600 leading-none">
                         {item.cheapest_premise.price.toFixed(2)}
                      </p>
                   </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
