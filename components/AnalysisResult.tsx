
import React from 'react';
import { Check, AlertTriangle, Store, Calendar, ExternalLink, PiggyBank, TrendingDown, Info, ShoppingBasket, Search, ArrowRight, Wallet, CheckCircle2 } from 'lucide-react';
import { BijakResponse, GroundingChunk } from '../types';

interface AnalysisResultProps {
  result: BijakResponse;
  groundingChunks: GroundingChunk[];
  onCompareProduct?: (productName: string) => void;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, groundingChunks, onCompareProduct }) => {
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

  // Calculate total potential savings
  const totalSavings = result.items.reduce((acc, item) => {
    if (item.market_price_comparison && item.market_price_comparison.cheapest_price < item.scanned_price && item.scanned_price > 0) {
      return acc + (item.scanned_price - item.market_price_comparison.cheapest_price);
    }
    return acc;
  }, 0);

  // Basket Insight: Find the store that appears most frequently as the "Cheapest"
  const savingsByStore: Record<string, number> = {};
  result.items.forEach(item => {
    if (item.market_price_comparison && item.market_price_comparison.cheapest_price < item.scanned_price) {
      const store = item.market_price_comparison.cheapest_store;
      // Simple normalization
      const normalizedStore = store.replace(/'s/g, '').replace(/\s+/g, ' ').trim(); 
      const saving = item.scanned_price - item.market_price_comparison.cheapest_price;
      savingsByStore[store] = (savingsByStore[store] || 0) + saving;
    }
  });

  let bestStore = '';
  let maxStoreSavings = 0;
  Object.entries(savingsByStore).forEach(([store, amount]) => {
    if (amount > maxStoreSavings) {
      maxStoreSavings = amount;
      bestStore = store;
    }
  });

  // SARA Progress Calculation
  const SARA_MONTHLY_LIMIT = 100;
  const saraUsagePercent = Math.min((result.total_sara_spendable / SARA_MONTHLY_LIMIT) * 100, 100);

  return (
    <div className="w-full space-y-6 animate-fade-in">
      
      {/* Smart Recommendation Card (Basket Comparison) */}
      {maxStoreSavings > 0 && bestStore && (
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-5 shadow-lg text-white border border-indigo-500 relative overflow-hidden transform hover:scale-[1.01] transition-transform duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShoppingBasket className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                Smart Recommendation
              </span>
            </div>
            <h3 className="text-xl font-bold leading-tight mb-1">
              Consider shopping at {bestStore}?
            </h3>
            <p className="text-indigo-100 text-sm mb-3">
              You could save roughly <span className="font-bold text-white">RM {maxStoreSavings.toFixed(2)}</span> on this basket.
            </p>
            {onCompareProduct && (
               <button 
                 onClick={() => onCompareProduct(`${bestStore} vs ${result.store_detected} prices`)}
                 className="bg-white text-indigo-600 text-xs font-bold px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95"
               >
                 Check {bestStore} Prices <ArrowRight className="w-3 h-3" />
               </button>
            )}
          </div>
        </div>
      )}

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        
        {/* Total Savings Card - Only shows if savings exist and not redundant with recommendation above */}
        {totalSavings > 0 && totalSavings !== maxStoreSavings && (
          <div className="col-span-2 bg-emerald-600 rounded-xl p-5 shadow-lg text-white border border-emerald-500 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-white/15 transition-colors"></div>
             
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-emerald-100 text-xs uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                  <PiggyBank className="w-4 h-4" />
                  Potential Savings
                </p>
                <div className="flex items-baseline gap-2">
                   <p className="font-bold text-4xl tracking-tight">RM {totalSavings.toFixed(2)}</p>
                </div>
              </div>
              <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm shadow-sm group-hover:scale-110 transition-transform">
                 <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="mt-2 text-xs text-emerald-50/80 font-medium relative z-10 flex items-center gap-1">
              <Check className="w-3 h-3" /> across all stores found
            </p>
          </div>
        )}

        {/* Store / Date Info */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center hover:border-teal-200 transition-colors">
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
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center relative z-20 hover:border-blue-200 transition-colors">
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
            <div key={idx} className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 transition-all duration-300 hover:shadow-lg hover:border-teal-100 hover:-translate-y-1 group/card">
              
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
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 tracking-wide uppercase">
                      <Check className="w-3 h-3" />
                      SARA Eligible
                    </div>
                  )}
                </div>

                {/* Compare Button */}
                {onCompareProduct && (
                  <button 
                    onClick={() => onCompareProduct(item.item_name)}
                    className="flex items-center gap-1.5 text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors opacity-90 hover:opacity-100 hover:shadow-sm"
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
                   <div className="mt-4 bg-white rounded-xl p-4 border border-orange-100 shadow-sm overflow-hidden relative transition-colors hover:border-orange-200">
                      
                      {/* Header */}
                      <div className="flex justify-between items-center mb-4">
                         <div className="flex items-center gap-2">
                            <div className="bg-orange-50 p-1.5 rounded-lg text-orange-600">
                               <TrendingDown className="w-4 h-4" />
                            </div>
                            <div>
                               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Potential Savings</p>
                               <p className="font-bold text-gray-800 text-sm leading-none mt-0.5">Found Cheaper Option</p>
                            </div>
                         </div>
                         <div className="text-right bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 group-hover/card:scale-105 transition-transform">
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
                                className="h-full bg-emerald-500 rounded-full shadow-sm relative z-10 transition-all duration-1000 cursor-help"
                                style={{ width: `${Math.min((item.market_price_comparison.cheapest_price / item.scanned_price) * 100, 100)}%` }}
                              >
                                  {/* Tooltip showing percentage saving */}
                                  <div className="absolute bottom-full right-0 mb-2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap shadow-lg -mr-4 pointer-events-none z-20">
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
        <div className="mt-8 bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-2xl border border-blue-100 p-6 shadow-sm relative overflow-hidden">
           {/* Decorative bg blur */}
           <div className="absolute top-0 right-0 w-48 h-48 bg-blue-100/40 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none"></div>
           
           <div className="relative z-10">
             <div className="flex items-center gap-2 mb-4">
               <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 border border-blue-200 shadow-sm">
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
                       <span className="text-xs font-bold text-gray-700">Typical Limit: RM {SARA_MONTHLY_LIMIT}</span>
                   </div>
                   <span className="text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                     {saraUsagePercent.toFixed(0)}%
                   </span>
                </div>
                
                <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner border border-gray-100">
                   <div 
                     className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-sm transition-all duration-1000 ease-out relative"
                     style={{ width: `${saraUsagePercent}%` }}
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
                className="flex items-center gap-1.5 text-[10px] font-medium text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100 hover:bg-teal-100 hover:shadow-sm hover:border-teal-300 transition-all max-w-full truncate"
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
