
import React, { useState, useMemo, useEffect } from 'react';
import { MapPin, Search, Navigation, ExternalLink, Loader2, Store, Star, Compass, LocateFixed, ShoppingBasket, Coffee, Clock, Target, ArrowRight } from 'lucide-react';
import { findNearbyStores, cleanAndParseJson } from '../services/gemini';
import { getReadableAddress } from '../services/location';
import { GroundingChunk, UserData } from '../types';

interface StoreFinderProps {
  initialQuery?: string;
  userLocation?: UserData | null;
}

interface DetailedStore {
  name: string;
  address: string;
  rating: string;
  distance: string;
  status: string;
  hours: string;
  location?: { lat: number; lng: number };
  uri?: string; // from matching chunk
  snippet?: string;
}

const POPULAR_CHAINS = [
  "99 Speedmart",
  "KK Super Mart",
  "Lotus's",
  "Mydin",
  "Econsave",
  "Jaya Grocer",
  "Giant",
  "7-Eleven"
];

// Refined Nearby Suggestion Chips based on user request
const NEARBY_SUGGESTIONS = [
    { label: "Grocery", query: "Grocery Stores" },
    { label: "Convenience", query: "Convenience Stores" },
    { label: "Mini Market", query: "Mini Markets" },
    { label: "Supermarket", query: "Supermarkets" }
];

export const StoreFinder: React.FC<StoreFinderProps> = ({ initialQuery = '', userLocation }) => {
  const [query, setQuery] = useState(initialQuery);
  const [locationMode, setLocationMode] = useState<'gps' | 'manual'>('gps');
  const [manualLocation, setManualLocation] = useState('');
  
  const [result, setResult] = useState<string | null>(null);
  const [parsedStores, setParsedStores] = useState<DetailedStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New state for user feedback on detected location
  const [detectedAddress, setDetectedAddress] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Use Effect to handle initial search based on props
  useEffect(() => {
    // If we have an initial query, run it
    if (initialQuery) {
        setQuery(initialQuery);
        handleSearch(initialQuery);
    } 
    // If we don't have a query but we DO have a user location (and no stores yet), 
    // maybe run a default "Nearby Stores" search or just set the address state
    else if (userLocation?.latitude && userLocation?.longitude && parsedStores.length === 0) {
        // Just set visual state, don't auto-search unless user clicks something
        if (userLocation.address) {
            setDetectedAddress(userLocation.address);
        }
    }
  }, [initialQuery, userLocation]);

  const handleSearch = async (overrideQuery?: string) => {
    const searchQuery = overrideQuery !== undefined ? overrideQuery : query;
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setParsedStores([]);
    setDetectedAddress(null);
    setGpsAccuracy(null);

    const performSearch = async (lat?: number, lng?: number, locationSuffix?: string) => {
      try {
        let finalQuery = searchQuery;
        let addressLabel = locationSuffix;
        
        // If searching by manual location, append it to query for better context
        if (locationSuffix && !lat) {
           finalQuery = `${searchQuery}`; // let the findNearbyStores construct the full prompt
           addressLabel = locationSuffix;
        } else if (!lat && !lng) {
           // Fallback if no location provided at all
           finalQuery = searchQuery;
           addressLabel = "Malaysia";
        }

        const { text, groundingChunks } = await findNearbyStores(finalQuery, lat, lng, addressLabel);
        
        if (text) {
           try {
             const stores = cleanAndParseJson(text) as DetailedStore[];
             // Enhance with Grounding Metadata URI if available
             const enhancedStores = stores.map(store => {
                const matchedChunk = groundingChunks.find(c => 
                    (c.maps?.title && store.name.toLowerCase().includes(c.maps.title.toLowerCase())) || 
                    (c.maps?.title && c.maps.title.toLowerCase().includes(store.name.toLowerCase()))
                );
                
                const snippet = matchedChunk?.maps?.placeAnswerSources?.[0]?.reviewSnippets?.[0]?.reviewText;
                
                return {
                    ...store,
                    uri: matchedChunk?.maps?.uri,
                    snippet: snippet
                };
             });
             setParsedStores(enhancedStores);
           } catch (e) {
             console.error("Parse error", e);
             setResult(text); // Fallback to raw text if it's not JSON
           }
        } else {
             setResult("No details found.");
        }
        
      } catch (err: any) {
        console.error(err);
        const msg = err.message || "Failed to find stores. Please try again.";
        setError(msg);
      } finally {
        setLoading(false);
        setLocating(false);
      }
    };

    if (locationMode === 'gps') {
      // PRIORITY 1: Use Global User Location Prop if available
      if (userLocation?.latitude && userLocation?.longitude) {
          if (userLocation.address) setDetectedAddress(userLocation.address);
          performSearch(userLocation.latitude, userLocation.longitude, userLocation.address);
          return;
      }

      // PRIORITY 2: Request Local GPS (Fallback)
      if (!navigator.geolocation) {
        setError("Geolocation is not supported. Please use Manual Location mode.");
        setLoading(false);
        return;
      }
      
      setLocating(true);
      
      // Request High Accuracy GPS with longer timeout for better lock
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setGpsAccuracy(accuracy); // Store accuracy in state
          
          let readableAddress = "";
          try {
             readableAddress = await getReadableAddress(latitude, longitude);
             if (readableAddress) {
                setDetectedAddress(readableAddress);
             }
          } catch (e) {
             console.warn("Reverse geocoding failed, using coordinates only.");
          }

          performSearch(latitude, longitude, readableAddress);
        },
        (err) => {
          console.error("Geolocation Error: ", err);
          let errorMsg = "Unable to retrieve location.";
          if (err.code === 1) errorMsg = "Location permission denied.";
          else if (err.code === 2) errorMsg = "Location unavailable (Signal weak).";
          else if (err.code === 3) errorMsg = "Location request timed out.";

          setError(`${errorMsg} Please switch to 'Manual Location' or try again outside.`);
          setLoading(false);
          setLocating(false);
        },
        { 
            enableHighAccuracy: true, // Force GPS
            timeout: 20000, // Increased timeout to 20s
            maximumAge: 0 
        }
      );
    } else {
      // Manual Mode
      if (!manualLocation.trim()) {
        setError("Please enter a location (e.g. 'Bangsar', 'Penang').");
        setLoading(false);
        return;
      }
      performSearch(undefined, undefined, manualLocation);
    }
  };

  const handleQuickNearMe = (category: string) => {
      setLocationMode('gps');
      setQuery(category);
      handleSearch(category);
  };

  const setCategorySearch = (catQuery: string) => {
    setQuery(catQuery);
    handleSearch(catQuery);
  };

  return (
    <div className="w-full space-y-6 animate-fade-in pb-20">
      
      {/* Smart Locator (Quick Buttons) */}
      <div className="bg-gradient-to-br from-teal-600 to-teal-800 p-6 rounded-3xl shadow-xl shadow-teal-900/10 text-white relative overflow-hidden group hover:shadow-2xl transition-shadow duration-500">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-white/15 transition-colors"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-400/20 rounded-full -ml-8 -mb-8 blur-xl group-hover:scale-125 transition-transform duration-700"></div>
          
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 relative z-10">
             <LocateFixed className="w-5 h-5 text-teal-200 animate-pulse" />
             Smart Location Search
          </h2>
          
          <div className="grid grid-cols-3 gap-3 relative z-10">
              <button 
                onClick={() => handleQuickNearMe("Supermarkets")}
                disabled={loading}
                className="bg-white/10 hover:bg-white/20 border border-white/20 p-3 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 hover:-translate-y-1 hover:shadow-lg backdrop-blur-sm group/btn touch-manipulation duration-300"
              >
                  <div className="bg-orange-100 p-2.5 rounded-full shadow-sm transform group-hover/btn:rotate-6 transition-transform">
                      <ShoppingBasket className="w-6 h-6 text-orange-600" />
                  </div>
                  <span className="text-[11px] font-bold text-center leading-tight">Super<br/>Markets</span>
              </button>

              <button 
                onClick={() => handleQuickNearMe("Mini Markets")}
                disabled={loading}
                className="bg-white/10 hover:bg-white/20 border border-white/20 p-3 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 hover:-translate-y-1 hover:shadow-lg backdrop-blur-sm group/btn touch-manipulation duration-300"
              >
                  <div className="bg-blue-100 p-2.5 rounded-full shadow-sm transform group-hover/btn:-rotate-6 transition-transform">
                      <Store className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-[11px] font-bold text-center leading-tight">Mini<br/>Markets</span>
              </button>

              <button 
                onClick={() => handleQuickNearMe("Convenience Stores")}
                disabled={loading}
                className="bg-white/10 hover:bg-white/20 border border-white/20 p-3 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 hover:-translate-y-1 hover:shadow-lg backdrop-blur-sm group/btn touch-manipulation duration-300"
              >
                  <div className="bg-purple-100 p-2.5 rounded-full shadow-sm transform group-hover/btn:scale-110 transition-transform">
                      <Coffee className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-[11px] font-bold text-center leading-tight">Convenience<br/>Stores</span>
              </button>
          </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        
        {/* Location Mode Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
          <button
            onClick={() => setLocationMode('gps')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
              locationMode === 'gps' ? 'bg-white text-teal-700 shadow-sm transform scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <LocateFixed className="w-3.5 h-3.5" /> 
            {userLocation?.latitude ? 'Using GPS (Saved)' : 'Use GPS'}
          </button>
          <button
            onClick={() => setLocationMode('manual')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
              locationMode === 'manual' ? 'bg-white text-teal-700 shadow-sm transform scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <Compass className="w-3.5 h-3.5" /> Manual Search
          </button>
        </div>

        {/* Manual Location Input (Conditional) */}
        {locationMode === 'manual' && (
           <div className="mb-4 animate-fade-in">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Search Area</label>
              <input
                type="text"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                placeholder="e.g. Cheras, Penang, Johor Bahru"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-base sm:text-sm hover:border-teal-400 transition-all bg-slate-50 focus:bg-white"
              />
           </div>
        )}

        {/* Search Input */}
        <div className="flex gap-2 mb-5">
          <div className="relative flex-1 group">
             <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search specific store (e.g. 99 Speedmart)"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-base sm:text-sm hover:border-teal-400 transition-all bg-slate-50 focus:bg-white"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="bg-teal-600 text-white px-4 py-2 rounded-xl hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 font-bold shadow-lg shadow-teal-600/20 transition-all hover:scale-105 active:scale-95 hover:-translate-y-0.5"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
          </button>
        </div>
           
           <div>
              <div className="flex justify-between items-center mb-3">
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Popular Chains</p>
                 <span className="text-[10px] text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full font-bold border border-teal-100">NEAREST</span>
              </div>
              <div className="flex flex-wrap gap-2">
                 {POPULAR_CHAINS.map((chain, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCategorySearch(chain)}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 active:translate-y-0"
                    >
                       {chain}
                    </button>
                 ))}
              </div>
           </div>

           {/* Nearby Suggestions (Quick Chips) */}
           <div className="mt-5 pt-4 border-t border-slate-100">
               <p className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wide">Quick Filters</p>
               <div className="flex flex-wrap gap-2">
                  {NEARBY_SUGGESTIONS.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickNearMe(suggestion.query)}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-xs font-bold hover:bg-indigo-100 hover:text-indigo-800 transition-all hover:shadow-sm hover:-translate-y-0.5 active:scale-95 hover:scale-105"
                      >
                         {suggestion.label}
                      </button>
                  ))}
               </div>
           </div>
      </div>

      {/* Loading Status */}
      {loading && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
            <Loader2 className="w-10 h-10 text-teal-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-bold animate-pulse">
                {locating ? "Pinpointing your location..." : "Scanning area for stores..."}
            </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 animate-fade-in flex items-center gap-3 shadow-sm">
          <MapPin className="w-6 h-6 text-red-500 bg-red-100 p-1 rounded-full" />
          <span className="font-medium text-sm">{error}</span>
        </div>
      )}

      {!loading && (
        <div className="space-y-6">

          {/* Detected Address & Accuracy Feedback */}
          {(detectedAddress || gpsAccuracy !== null) && (
             <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-slide-up shadow-sm">
                {detectedAddress && (
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="text-xs text-emerald-900">
                           Near: <strong className="font-bold">{detectedAddress}</strong>
                        </span>
                    </div>
                )}
                {gpsAccuracy !== null && (
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-emerald-100 shadow-sm self-start sm:self-auto">
                       <Target className="w-3 h-3 text-emerald-500" />
                       <span className="text-[10px] font-bold text-emerald-700">
                           ±{Math.round(gpsAccuracy)}m GPS Accuracy
                       </span>
                    </div>
                )}
             </div>
          )}
          
          {/* Detailed Cards (Parsed from AI JSON) */}
          {parsedStores.length > 0 ? (
             <div>
               <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 px-1 flex items-center justify-between">
                 <span>Results</span>
                 <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">{parsedStores.length}</span>
               </h3>
               <div className="grid gap-4">
                 {parsedStores.map((store, idx) => (
                    <div 
                      key={idx}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:shadow-teal-500/10 hover:border-teal-300 transition-all duration-300 group relative overflow-hidden hover:-translate-y-1 animate-slide-up"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                       {/* Status Badge */}
                       {store.status && (
                         <div className={`absolute top-0 right-0 rounded-bl-xl px-3 py-1 text-[10px] font-bold uppercase tracking-wide z-10 ${
                             store.status.toLowerCase().includes('open') 
                               ? 'bg-emerald-100 text-emerald-700' 
                               : 'bg-red-100 text-red-700'
                         }`}>
                             {store.status}
                         </div>
                       )}

                       <div className="flex items-start gap-4 mt-2">
                          <div className="bg-slate-50 p-3.5 rounded-2xl group-hover:bg-teal-50 transition-colors border border-slate-100 group-hover:border-teal-100 group-hover:scale-105 duration-300">
                             <Store className="w-6 h-6 text-slate-400 group-hover:text-teal-600 transition-colors" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                             <h4 className="font-bold text-slate-900 text-lg mb-1 truncate pr-16 group-hover:text-teal-700 transition-colors">{store.name}</h4>
                             
                             <div className="flex items-start gap-2 text-sm text-slate-600 mb-3">
                                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                <span className="leading-snug text-xs font-medium">{store.address}</span>
                             </div>

                             {store.hours && store.hours !== 'Hours not available' && (
                               <div className="flex items-center gap-2 text-xs text-slate-500 mb-3 bg-slate-50 px-2 py-1 rounded-md w-fit border border-slate-100">
                                  <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                  <span>{store.hours}</span>
                               </div>
                             )}

                             <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                                {store.rating && store.rating !== 'N/A' && (
                                   <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 text-amber-700 font-bold">
                                      <Star className="w-3 h-3 text-amber-500 fill-current" />
                                      <span>{store.rating}</span>
                                   </div>
                                )}
                                {store.distance && store.distance !== 'N/A' && (
                                   <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md font-bold text-slate-600">
                                      <Navigation className="w-3 h-3 text-slate-500" />
                                      <span>{store.distance}</span>
                                   </div>
                                )}
                             </div>

                             {store.snippet && (
                                <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100 leading-relaxed relative">
                                   <span className="absolute top-1 left-2 text-slate-300 text-lg font-serif">“</span>
                                   <span className="pl-2">{store.snippet}</span>
                                </p>
                             )}

                             <div className="flex gap-2">
                                {store.uri || (store.location && store.location.lat && store.location.lng) ? (
                                    <a 
                                    href={store.uri || `https://www.google.com/maps/search/?api=1&query=${store.location!.lat},${store.location!.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 inline-flex items-center justify-center gap-2 bg-teal-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-teal-700 transition-colors shadow-md shadow-teal-600/20 active:scale-[0.98] hover:-translate-y-0.5"
                                    >
                                    <Navigation className="w-3 h-3" />
                                    Navigate
                                    </a>
                                ) : (
                                    <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.name + ' ' + store.address)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 text-slate-600 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-200 transition-colors active:scale-[0.98] hover:-translate-y-0.5"
                                    >
                                    <Search className="w-3 h-3" />
                                    Search Maps
                                    </a>
                                )}
                             </div>
                          </div>
                       </div>
                    </div>
                 ))}
               </div>
             </div>
          ) : result ? (
             // Fallback to RAW Text if parsing fails
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                   <MapPin className="w-4 h-4 text-slate-400" />
                   AI Summary
                </h3>
                <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {result}
                </div>
             </div>
          ) : null}

          {/* Empty State */}
          {parsedStores.length === 0 && !result && (
             <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">No locations found yet. Try searching!</p>
             </div>
          )}
          
        </div>
      )}
    </div>
  );
};
