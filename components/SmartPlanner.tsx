
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, MapPin, Car, Bike, Sparkles, ShoppingCart, Loader2, ArrowRight, CheckCircle2, AlertCircle, ArrowLeft, Fuel, TrendingDown, Clock, MousePointer2, Brain, UserCircle2 } from 'lucide-react';
import { optimizeShoppingList, predictShoppingNeeds } from '../services/gemini';
import { OptimizationResult, ShoppingStrategy, UserData } from '../types';

interface SmartPlannerProps {
  user?: UserData | null; // Changed to accept full user object
  onBack?: () => void;
}

export const SmartPlanner: React.FC<SmartPlannerProps> = ({ user, onBack }) => {
  const [items, setItems] = useState<{name: string, qty: number}[]>([]);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState(1);
  
  const [transport, setTransport] = useState<'Car' | 'Motorcycle'>('Car');
  const [location, setLocation] = useState(user?.address || '');
  
  // Logic State
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0); // 0: Init, 1: Inventory, 2: Fuel, 3: Finalizing
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [activeStrategyId, setActiveStrategyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Predictive State
  const [suggestions, setSuggestions] = useState<{item: string, reason: string}[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Load predictions on mount
  useEffect(() => {
    if (user && items.length === 0) {
        setLoadingSuggestions(true);
        predictShoppingNeeds(user).then((preds) => {
            setSuggestions(preds);
            setLoadingSuggestions(false);
        });
    }
  }, [user]);

  const handleAddItem = (name?: string) => {
    const finalName = name || itemName;
    if (finalName.trim()) {
      setItems([...items, { name: finalName.trim(), qty: itemQty }]);
      setItemName('');
      setItemQty(1);
      // Remove from suggestions if added
      if (name) {
          setSuggestions(prev => prev.filter(s => s.item !== name));
      }
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleOptimize = async () => {
    if (items.length === 0) return;
    
    setLoading(true);
    setLoadingStep(0);
    setError(null);
    setResult(null);

    // Simulate multi-step thinking process
    const stepTimer = setInterval(() => {
        setLoadingStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 1500);

    try {
      // Pass the persona to the backend for tailored logic
      const { data } = await optimizeShoppingList(
        items, 
        location || "Kuala Lumpur", 
        transport,
        user?.shopperPersona
      );
      
      clearInterval(stepTimer);
      setResult(data);
      // Auto-select recommended strategy
      setActiveStrategyId(data.meta.recommended_strategy_id);
    } catch (err: any) {
      clearInterval(stepTimer);
      console.error(err);
      setError(err.message || "Something went wrong optimizing your list.");
    } finally {
      setLoading(false);
    }
  };

  const activeStrategy: ShoppingStrategy | undefined = result?.strategies.find(s => s.id === activeStrategyId);

  return (
    <div className="w-full space-y-6 animate-fade-in pb-20">
      
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            {onBack && (
            <button 
                onClick={onBack}
                className="bg-white p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all hover:-translate-x-1 shadow-sm active:scale-95"
            >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            )}
            <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-teal-600" />
                <h2 className="text-xl font-bold text-gray-900">Smart Planner</h2>
            </div>
         </div>
         {user?.shopperPersona && (
             <div className="hidden sm:flex items-center gap-2 text-[10px] bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold border border-indigo-100">
                 <UserCircle2 className="w-3.5 h-3.5" />
                 Optimizing for: {user.shopperPersona.archetype}
             </div>
         )}
      </div>
      
      {/* Input Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300 relative overflow-hidden">
        
        {/* Loading Overlay */}
        {loading && (
            <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center text-center p-6 backdrop-blur-sm animate-fade-in">
                <div className="w-16 h-16 relative mb-4">
                    <div className="absolute inset-0 border-4 border-teal-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-teal-500 rounded-full border-t-transparent animate-spin"></div>
                    <Sparkles className="absolute inset-0 m-auto text-teal-500 w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">
                    {loadingStep === 0 && "Analyzing your list..."}
                    {loadingStep === 1 && "Checking store inventories..."}
                    {loadingStep === 2 && "Calculating fuel costs..."}
                    {loadingStep === 3 && (user?.shopperPersona ? `Applying "${user.shopperPersona.archetype}" Logic...` : "Finding best routes...")}
                </h3>
                <p className="text-sm text-gray-500">Checking 99 Speedmart, Lotus's, and more.</p>
            </div>
        )}

        {/* AI Predictions */}
        {suggestions.length > 0 && !loading && (
            <div className="mb-6 animate-slide-up">
                <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-gray-500 uppercase">Suggested for you</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {suggestions.map((s, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleAddItem(s.item)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 transition-all active:scale-95 group"
                            title={s.reason}
                        >
                            <Plus className="w-3 h-3 group-hover:scale-125 transition-transform" />
                            {s.item}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* Location Input */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Your Location</label>
          <div className="relative group">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
            <input 
              type="text" 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Cheras, Kuala Lumpur"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-teal-400 transition-colors"
            />
          </div>
        </div>

        {/* Transport Toggle */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Transport Mode</label>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setTransport('Car')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                transport === 'Car' 
                  ? 'bg-white text-teal-700 shadow-sm transform scale-[1.02]' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Car className="w-4 h-4" /> Car (RM 0.20/km)
            </button>
            <button
              onClick={() => setTransport('Motorcycle')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                transport === 'Motorcycle' 
                  ? 'bg-white text-teal-700 shadow-sm transform scale-[1.02]' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Bike className="w-4 h-4" /> Motor (RM 0.08/km)
            </button>
          </div>
        </div>

        {/* List Builder */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-gray-500 uppercase">Shopping List</label>
          <div className="flex gap-2">
            <div className="relative w-20">
                <input 
                    type="number" 
                    min="1"
                    value={itemQty}
                    onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                    className="w-full pl-3 pr-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-center"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">x</span>
            </div>
            <input 
              type="text" 
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              placeholder="Add item (e.g. Beras 5kg)"
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-teal-400 transition-colors"
            />
            <button 
              onClick={() => handleAddItem()}
              className="bg-gray-100 hover:bg-teal-100 hover:text-teal-700 text-gray-700 p-2 rounded-lg transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {items.length > 0 ? (
            <ul className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {items.map((item, idx) => (
                <li key={idx} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 hover:bg-white hover:border-teal-100 hover:shadow-sm transition-all group animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-teal-900">
                    <span className="font-bold text-teal-600 mr-2">{item.qty}x</span> 
                    {item.name}
                  </span>
                  <button onClick={() => handleRemoveItem(idx)} className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 italic text-center py-2 border border-dashed border-gray-200 rounded-lg">List is empty.</p>
          )}
        </div>

        <button 
          onClick={handleOptimize}
          disabled={loading || items.length === 0}
          className="w-full mt-6 bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-600/20 hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
        >
          {loading ? "Calculating..." : <><Sparkles className="w-5 h-5" /> Generate Smart Plan</>}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Results Section */}
      {result && activeStrategy && (
        <div className="animate-slide-up space-y-4">
          
          {/* Strategy Toggle */}
          {result.strategies.length > 1 && (
              <div className="flex bg-gray-200 p-1 rounded-xl">
                  {result.strategies.map((strategy) => (
                      <button
                        key={strategy.id}
                        onClick={() => setActiveStrategyId(strategy.id)}
                        className={`flex-1 py-2.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                            activeStrategyId === strategy.id 
                                ? 'bg-white text-teal-700 shadow-sm scale-[1.02]' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                          {strategy.id === 'max_savings' ? <TrendingDown className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          {strategy.id === 'max_savings' ? 'Max Savings' : 'Best Convenience'}
                          {strategy.id === result.meta.recommended_strategy_id && (
                              <span className="bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded text-[9px] ml-1">AI Pick</span>
                          )}
                      </button>
                  ))}
              </div>
          )}

          {/* Strategy Summary Card */}
          <div className={`bg-gradient-to-r rounded-xl p-5 text-white shadow-lg transition-all duration-500 transform ${activeStrategyId === 'max_savings' ? 'from-emerald-700 to-teal-800' : 'from-blue-700 to-indigo-800'}`}>
            <div className="flex justify-between items-start mb-4">
               <div>
                  <h3 className="font-bold text-lg">{activeStrategy.display_title}</h3>
                  <p className="text-white/80 text-sm mt-1 leading-snug max-w-[250px]">{activeStrategy.display_summary}</p>
               </div>
               <div className="bg-white/10 p-2 rounded-lg backdrop-blur-md">
                 {activeStrategyId === 'max_savings' ? <TrendingDown className="w-6 h-6 text-white" /> : <Clock className="w-6 h-6 text-white" />}
               </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
               <div>
                  <p className="text-[10px] text-white/60 uppercase font-semibold">Groceries</p>
                  <p className="text-xl font-bold">RM {activeStrategy.total_grocery_cost.toFixed(2)}</p>
               </div>
               <div className="relative">
                  <p className="text-[10px] text-white/60 uppercase font-semibold flex items-center gap-1"><Fuel className="w-3 h-3" /> Fuel</p>
                  <p className="text-xl font-bold">RM {activeStrategy.estimated_fuel_cost.toFixed(2)}</p>
                  <div className="absolute top-0 right-4 h-full w-px bg-white/10"></div>
               </div>
               <div className="text-right">
                  <p className="text-[10px] text-white/60 uppercase font-semibold">Total Trip</p>
                  <p className="text-xl font-black text-yellow-300">RM {activeStrategy.total_trip_cost.toFixed(2)}</p>
               </div>
            </div>
          </div>

          {/* Itinerary Visualization */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Your Route</h4>
              <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
                  <div className="flex flex-col items-center min-w-[60px]">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 mb-1">
                          <MapPin className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-600 text-center leading-tight">Start</span>
                  </div>
                  
                  {activeStrategy.shopping_plan.map((step, idx) => (
                      <React.Fragment key={idx}>
                          <div className="h-0.5 w-8 bg-gray-200 flex-shrink-0 relative top-[-10px]"></div>
                          <div className="flex flex-col items-center min-w-[80px]">
                              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold mb-1 shadow-sm">
                                  {step.step_number}
                              </div>
                              <span className="text-[10px] font-bold text-gray-800 text-center leading-tight">{step.store_name}</span>
                          </div>
                      </React.Fragment>
                  ))}
              </div>
              <p className="text-center text-xs text-gray-400 mt-2 flex items-center justify-center gap-1">
                  <Car className="w-3 h-3" /> Total Distance: {activeStrategy.distance_km} km
              </p>
          </div>

          {/* Detailed Steps */}
          <div className="space-y-4">
            {activeStrategy.shopping_plan.map((step, idx) => (
              <div 
                key={idx} 
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative hover:border-teal-200 transition-colors animate-slide-up"
                style={{ animationDelay: `${idx * 150}ms` }}
              >
                {/* Step Header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <div className="bg-white border border-gray-200 text-gray-600 font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm">
                        {step.step_number}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{step.store_name}</h4>
                        <p className="text-xs text-gray-500 uppercase font-semibold">{step.action_type}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="font-bold text-gray-800">RM {step.subtotal.toFixed(2)}</p>
                   </div>
                </div>

                {/* Items List */}
                <div className="p-4 space-y-3">
                   {step.items_to_buy.map((item, i) => (
                     <div key={i} className="flex justify-between items-start text-sm hover:bg-gray-50 p-1.5 rounded-lg transition-colors">
                        <div>
                           <div className="font-medium text-gray-800 flex items-center gap-2">
                             <span className="text-teal-600 font-bold text-xs">{item.quantity}x</span>
                             {item.name}
                             {item.is_sara_eligible && (
                               <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold shadow-sm">SARA</span>
                             )}
                           </div>
                           <p className="text-xs text-gray-500 italic">{item.notes}</p>
                        </div>
                        <p className="font-semibold text-gray-700">RM {item.price.toFixed(2)}</p>
                     </div>
                   ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
};
