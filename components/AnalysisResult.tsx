
import React, { useEffect, useState } from 'react';
import { Check, AlertTriangle, Store, Calendar, ExternalLink, PiggyBank, TrendingDown, Info, ShoppingBasket, Search, ArrowRight, Wallet, CheckCircle2, Trophy, BarChart2 } from 'lucide-react';
import { BijakResponse, GroundingChunk } from '../types';

interface AnalysisResultProps {
  result: BijakResponse;
  groundingChunks: GroundingChunk[];
  onCompareProduct?: (productName: string) => void;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, groundingChunks, onCompareProduct }) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Trigger progress animation on mount
  useEffect(() => {
    setMounted(true);
    
    // SARA Progress Calculation
    const SARA_MONTHLY_LIMIT = 100;
    const targetPercent = Math.min((result.total_sara_spendable / SARA_MONTHLY_LIMIT) * 100, 100);
    
    // Small delay to ensure render before animating
    const timer = setTimeout(() => {
        setAnimatedProgress(targetPercent);
    }, 300);

    return () => clearTimeout(timer);
  }, [result]);

  // Filter and deduplicate web sources
  const uniqueSources: { uri: string; title: string }[] = [];
  const seenUris = new Set<string>();

  groundingChunks.forEach(chunk => {
    if (chunk.web && chunk.web.uri && chunk.web.title) {
      if (!seenUris.has(chunk.web.uri)) {
        seenUris.add(chunk.web.uri);
        uniqueSources.push({
          uri: chunk.web.uri,
          title: chunk.web.title
        });
      }
    }
  });

  // Check if this is a Single Product Visual Price Check
  const isVisualScan = result.items.length === 1 && result.items[0].competitor_prices && result.items[0].competitor_prices.length > 0;
  const singleItem = result.items[0];

  return (
    <div className="w-full space-y-6 animate-fade-in">
      
      {/* 1. VISUAL PRICE COMPARISON LEADERBOARD (Top Priority Feature) */}
      {isVisualScan && singleItem.competitor_prices && (
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-indigo-100 relative overflow-hidden animate-slide-up">
           {/* Header */}
           <div className="flex items-start justify-between mb-6 relative z-10">
              <div>
                 <div className="flex items-center gap-2 mb-1">
                    <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                       Visual Scan
                    </span>
                    <span className="text-xs text-gray-400 font-medium">Price Comparison</span>
                 </div>
                 <h2 className="text-xl font-black text-gray-900 leading-tight">{singleItem.item_name}</h2>
                 <p className="text-sm text-gray-500">{singleItem.unit !== 'N/A' ? singleItem.unit : ''}</p>
              </div>
              <div className="bg-indigo-50 p-2.5 rounded-2xl">
                 <BarChart2 className="w-6 h-6 text-indigo-600" />
              </div>
           </div>

           {/* Leaderboard Chart */}
           <div className="space-y-3 relative z-10">
              {singleItem.competitor_prices.sort((a, b) => a.price - b.price).map((comp, idx) => {
                 const pct = (singleItem.competitor_prices![singleItem.competitor_prices!.length - 1].price / comp.price) * 80;
                 
                 return (
                 <div key={idx} className="relative group hover:scale-[1.01] transition-transform duration-300">
                    <div className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${comp.is_cheapest ? 'bg-emerald-50 border-emerald-200 shadow-md z-10 relative' : 'bg-white border-gray-100 hover:border-indigo-100 group-hover:shadow-sm'}`}>
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${comp.is_cheapest ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                             {idx + 1}
                          </div>
                          <div>
                             <p className={`font-bold text-sm ${comp.is_cheapest ? 'text-emerald-800' : 'text-gray-700'}`}>{comp.store_name}</p>
                             {comp.is_cheapest && <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><Trophy className="w-3 h-3" /> Best Price</span>}
                          </div>
                       </div>
                       <p className={`font-black text-lg ${comp.is_cheapest ? 'text-emerald-600' : 'text-gray-800'}`}>RM {comp.price.toFixed(2)}</p>
                    </div>
                    {/* Bar visualization */}
                    <div className="absolute bottom-0 left-0 h-1 bg-gray-100 rounded-b-xl w-full overflow-hidden">
                        <div 
                           className={`h-full transition-all duration-[1500ms] ease-out ${comp.is_cheapest ? 'bg-emerald-500' : 'bg-indigo-200'}`} 
                           style={{ width: mounted ? `${pct}%` : '0%' }}
                        ></div>
                    </div>
                 </div>
              )})}
           </div>

           {/* Action */}
           <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400 mb-3">Prices sourced from online catalogs & user reports</p>
              {onCompareProduct && (
                 <button 
                   onClick={() => onCompareProduct(singleItem.item_name)}
                   className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                 >
                    View Full Market Report <ArrowRight className="w-4 h-4" />
                 </button>
              )}
           </div>
        </div>
      )}

      {/* 2. RECEIPT ANALYSIS (Legacy View) - Only show if NOT a visual scan or if user wants details */}
      {!isVisualScan && (
        <>
          {/* Summary Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Store / Date Info */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center hover:border-teal-200 transition-all hover:shadow-md hover:-translate-y-0.5 duration-300">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">Store / Product</p>
              <div className="flex items-center gap-2">
                <div className="bg-teal-50 p-1.5 rounded-lg">
                    <Store className="w-4 h-4 text-teal-600" />
                </div>
                <p className="font-bold text-gray-800 truncate text-sm">{result.store_detected || "Unknown"}</p>
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50 text-xs text-gray-500">
                 <Calendar className="w-3 h-3" />
                 <span>{result.scan_date || "Today"}</span>
              </div>
            </div>

            {/* Quick SARA Stat */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center relative z-20 hover:border-blue-200 transition-all hover:shadow-md hover:-translate-y-0.5 duration-300">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">SARA Eligible</p>
              <div className="flex items-center gap-2">
                <div className="bg-blue-50 p-1.5 rounded-lg">
                    <ShoppingBasket className="w-4 h-4 text-blue-600" />
                </div>
                <p className="font-bold text-xl text-gray-800">RM {result.total_sara_spendable.toFixed(2)}</p>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 font-medium">Items Detected</p>
            </div>
          </div>

          {/* Item Breakdown List */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4 px-1 flex items-center gap-2 text-lg">
                Item Breakdown
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{result.items.length}</span>
            </h3>
            
            <div className="space-y-4">
              {result.items.map((item, idx) => (
                <div 
                    key={idx} 
                    className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 transition-all duration-300 hover:shadow-lg hover:border-teal-100 hover:-translate-y-1 active:scale-[0.99] group/card animate-slide-up"
                    style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}
                >
                  
                  {/* Top Row: Name & Price */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 mr-3">
                        <h4 className="font-bold text-gray-900 text-base leading-tight group-hover/card:text-teal-700 transition-colors">{item.item_name}</h4>
                        {item.unit && item.unit !== 'N/A' && (
                            <p className="text-xs text-gray-500 mt-1 font-medium bg-gray-100 inline-block px-1.5 py-0.5 rounded">{item.unit}</p>
                        )}
                    </div>
                    <div className="text-right">
                         <p className="font-bold text-gray-900 text-lg whitespace-nowrap">RM {item.scanned_price.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Tags & Action Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                    <div className="flex gap-2">
                      {/* SARA Tag */}
                      {item.sara_eligible && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 tracking-wide uppercase shadow-sm">
                          <Check className="w-3 h-3" />
                          SARA Eligible
                        </div>
                      )}
                    </div>

                    {/* Compare Button */}
                    {onCompareProduct && (
                      <button 
                        onClick={() => onCompareProduct(item.item_name)}
                        className="flex items-center gap-1.5 text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors opacity-90 hover:opacity-100 hover:shadow-sm active:scale-95"
                      >
                        <Search className="w-3 h-3" />
                        Compare
                      </button>
                    )}
                  </div>

                  {/* Comparative Savings Card with Bar Chart */}
                  {item.market_price_comparison && 
                   item.market_price_comparison.cheapest_price < item.scanned_price && 
                   item.scanned_price > 0 && (
                       <div className="mt-4 bg-white rounded-xl p-4 border border-orange-100 shadow-sm overflow-hidden relative transition-all duration-300 hover:border-orange-200 group/savings hover:shadow-md">
                          
                          {/* Header */}
                          <div className="flex justify-between items-center mb-4">
                             <div className="flex items-center gap-2">
                                <div className="bg-orange-50 p-1.5 rounded-lg text-orange-600 group-hover/savings:rotate-12 transition-transform duration-300">
                                   <TrendingDown className="w-4 h-4" />
                                </div>
                                <div>
                                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Potential Savings</p>
                                   <p className="font-bold text-gray-800 text-sm leading-none mt-0.5">Found Cheaper Option</p>
                                </div>
                             </div>
                             <div className="text-right bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 group-hover/savings:scale-105 transition-transform">
                                <span className="block text-lg font-black text-emerald-600 leading-none">
                                  -{Math.round(((item.scanned_price - item.market_price_comparison.cheapest_price) / item.scanned_price) * 100)}%
                                </span>
                             </div>
                          </div>

                          {/* Visual Bar Chart */}
                          <div className="space-y-4">
                            
                            {/* Bar 1: Your Price (Reference) */}
                            <div className="relative">
                               <div className="flex justify-between text-xs font-medium text-gray-500 mb-1.5">
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                    Your Price
                                  </span>
                                  <span className="line-through decoration-red-400 decoration-1 text-gray-400">RM {item.scanned_price.toFixed(2)}</span>
                               </div>
                               <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-gray-300 w-full rounded-full" /> 
                               </div>
                            </div>

                            {/* Bar 2: Best Price with Tooltip */}
                            <div className="relative group/bar">
                               <div className="flex justify-between text-xs font-bold text-gray-800 mb-1.5">
                                  <span className="flex items-center gap-1.5 truncate max-w-[150px]">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    {item.market_price_comparison.cheapest_store}
                                  </span>
                                  <span className="text-emerald-600">RM {item.market_price_comparison.cheapest_price.toFixed(2)}</span>
                               </div>
                               <div className="h-2 w-full bg-emerald-50 rounded-full overflow-visible relative mt-1">
                                  <div className="absolute inset-0 bg-emerald-100/30 rounded-full"></div>
                                  <div 
                                    className="h-full bg-emerald-500 rounded-full shadow-sm relative z-10 transition-all duration-[1000ms] ease-out cursor-help"
                                    style={{ width: mounted ? `${Math.min((item.market_price_comparison.cheapest_price / item.scanned_price) * 100, 100)}%` : '0%' }}
                                  >
                                      {/* Tooltip showing percentage saving */}
                                      <div className="absolute bottom-full right-0 mb-2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap shadow-lg -mr-4 pointer-events-none z-20 transform translate-y-1 group-hover/bar:translate-y-0">
                                          Save {Math.round(((item.scanned_price - item.market_price_comparison.cheapest_price) / item.scanned_price) * 100)}%
                                          <div className="absolute top-full right-4 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                      </div>
                                  </div>
                               </div>
                            </div>
                          </div>

                          {/* Savings Summary Footer */}
                          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                             <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                               Estimated Savings
                             </p>
                             <div className="flex items-center gap-1 text-emerald-700 font-bold text-sm">
                               RM {(item.scanned_price - item.market_price_comparison.cheapest_price).toFixed(2)}
                             </div>
                          </div>

                       </div>
                  )}
                </div>
              ))}
            </div>
            
            {result.items.length === 0 && (
                <div className="py-12 px-6 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 mt-4 hover:border-gray-300 transition-colors">
                  <ShoppingBasket className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No items detected in this scan.</p>
                </div>
            )}
          </div>

          {/* SARA Subsidy Usage Summary */}
          {result.total_sara_spendable > 0 && (
            <div className="mt-8 bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-2xl border border-blue-100 p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
               {/* Decorative bg blur */}
               <div className="absolute top-0 right-0 w-48 h-48 bg-blue-100/40 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none"></div>
               
               <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-4">
                   <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 border border-blue-200 shadow-sm group-hover:scale-110 transition-transform duration-300">
                     <Wallet className="w-6 h-6" />
                   </div>
                   <div>
                      <h3 className="font-bold text-gray-900 text-lg leading-tight">SARA Subsidy Analysis</h3>
                      <p className="text-xs text-blue-600/80 font-medium">Sumbangan Asas Rahmah Eligibility</p>
                   </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   {/* Left: Total Eligible */}
                   <div className="flex flex-col justify-center">
                     <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
                       Eligible in this receipt
                     </p>
                     <div className="flex items-baseline gap-2">
                       <span className="text-4xl font-black text-blue-700 tracking-tight">RM {result.total_sara_spendable.toFixed(2)}</span>
                     </div>
                     <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                       These items are approved for purchase using your MyKasih SARA cashless balance.
                     </p>
                   </div>

                   {/* Right: Covered Items List */}
                   <div className="bg-white/60 rounded-xl p-4 border border-blue-100 backdrop-blur-sm">
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-blue-500" />
                        Detected Essentials
                     </p>
                     <ul className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                       {result.items.filter(i => i.sara_eligible).map((item, idx) => (
                         <li key={idx} className="flex justify-between items-center text-xs text-gray-700 p-1.5 rounded hover:bg-white transition-colors">
                           <span className="truncate pr-2 font-medium">{item.item_name}</span>
                           <span className="font-bold text-blue-800">RM {item.scanned_price.toFixed(2)}</span>
                         </li>
                       ))}
                     </ul>
                   </div>
                 </div>

                 {/* Usage Progress Bar */}
                 <div className="mt-6 pt-5 border-t border-blue-100">
                    <div className="flex justify-between items-end mb-2">
                       <div className="flex flex-col">
                           <span className="text-[10px] uppercase font-bold text-gray-400">Monthly Allowance Utilized</span>
                           <span className="text-xs font-bold text-gray-700">Typical Limit: RM 100</span>
                       </div>
                       <span className="text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                         {animatedProgress.toFixed(0)}%
                       </span>
                    </div>
                    
                    <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner border border-gray-100">
                       <div 
                         className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-sm transition-all duration-[1500ms] ease-out relative"
                         style={{ width: mounted ? `${animatedProgress}%` : '0%' }}
                       >
                         {/* Animated shine effect */}
                         <div className="absolute inset-0 bg-white/30 animate-[pulse_2s_infinite]"></div>
                         <div className="absolute top-0 right-0 h-full w-px bg-white/50 shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                       </div>
                    </div>
                    
                    <div className="flex items-start gap-2 mt-3 p-2 bg-blue-50/50 rounded-lg">
                      <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] text-blue-800/70 italic leading-snug">
                        Note: Actual claimable amount depends on your remaining balance in the MyKasih system.
                      </p>
                    </div>
                 </div>
               </div>
            </div>
          )}
        </>
      )}

      {/* Sources (Grounding) */}
      {uniqueSources.length > 0 && (
        <div className="mt-8 border-t border-gray-100 pt-6">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Check className="w-3 h-3" />
            Verified Sources
          </h4>
          <div className="flex flex-wrap gap-2">
            {uniqueSources.map((source, idx) => (
              <a 
                key={idx} 
                href={source.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] font-medium text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100 hover:bg-teal-100 hover:shadow-sm hover:border-teal-300 transition-all max-w-full truncate active:scale-95"
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="truncate max-w-[150px]">{source.title || "Source"}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
