import React, { useState } from 'react';
import { Plus, Trash2, MapPin, Car, Bike, Sparkles, ShoppingCart, Loader2, ArrowRight, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { optimizeShoppingList } from '../services/gemini';
import { OptimizationResult } from '../types';

interface SmartPlannerProps {
  userAddress?: string;
  onBack?: () => void;
}

export const SmartPlanner: React.FC<SmartPlannerProps> = ({ userAddress, onBack }) => {
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [transport, setTransport] = useState<'Car' | 'Motorcycle'>('Car');
  const [location, setLocation] = useState(userAddress || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddItem = () => {
    if (newItem.trim()) {
      setItems([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleOptimize = async () => {
    if (items.length === 0) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data } = await optimizeShoppingList(
        items, 
        location || "Kuala Lumpur", // Fallback
        transport
      );
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong optimizing your list.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-fade-in pb-20">
      
      {/* Header with Back Button */}
      <div className="flex items-center gap-3">
         {onBack && (
           <button 
             onClick={onBack}
             className="bg-white p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all hover:-translate-x-1 shadow-sm"
           >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
           </button>
         )}
         <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-teal-600" />
            <h2 className="text-xl font-bold text-gray-900">Smart Planner</h2>
         </div>
      </div>
      
      {/* Input Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300">
        
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
              <Car className="w-4 h-4" /> Car
            </button>
            <button
              onClick={() => setTransport('Motorcycle')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                transport === 'Motorcycle' 
                  ? 'bg-white text-teal-700 shadow-sm transform scale-[1.02]' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Bike className="w-4 h-4" /> Motor
            </button>
          </div>
        </div>

        {/* List Builder */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-gray-500 uppercase">Shopping List</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              placeholder="Add item (e.g. Beras 5kg)"
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-teal-400 transition-colors"
            />
            <button 
              onClick={handleAddItem}
              className="bg-gray-100 hover:bg-teal-100 hover:text-teal-700 text-gray-700 p-2 rounded-lg transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {items.length > 0 ? (
            <ul className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {items.map((item, idx) => (
                <li key={idx} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 hover:bg-white hover:border-teal-100 hover:shadow-sm transition-all group">
                  <span className="text-sm font-medium text-gray-700 group-hover:text-teal-900">{item}</span>
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
          className="w-full mt-6 bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-600/20 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          Generate Plan
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="animate-slide-up space-y-4">
          
          {/* Summary Card */}
          <div className="bg-gradient-to-r from-teal-700 to-teal-900 rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <h3 className="font-bold text-lg">{result.strategies.best_option.display_title}</h3>
                  <p className="text-teal-200 text-sm mt-1">{result.strategies.best_option.display_summary}</p>
               </div>
               <div className="bg-white/10 p-2 rounded-lg backdrop-blur-md">
                 <ShoppingCart className="w-6 h-6 text-white" />
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
               <div>
                  <p className="text-xs text-teal-300 uppercase font-semibold">Total Cost</p>
                  <p className="text-2xl font-bold">RM {result.strategies.best_option.total_estimated_cost.toFixed(2)}</p>
               </div>
               {result.strategies.best_option.total_savings > 0 && (
                  <div>
                    <p className="text-xs text-teal-300 uppercase font-semibold">Savings</p>
                    <p className="text-2xl font-bold text-emerald-300">RM {result.strategies.best_option.total_savings.toFixed(2)}</p>
                  </div>
               )}
            </div>
          </div>

          {/* Itinerary Steps */}
          <div className="space-y-4">
            {result.shopping_plan.map((step, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative hover:border-teal-200 transition-colors">
                {/* Step Header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <div className="bg-teal-100 text-teal-700 font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm">
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
                             {item.name}
                             {item.is_sara_eligible && (
                               <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">SARA</span>
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

          {result.strategies.best_option.type === "Split Trip" && (
            <div className="text-center text-xs text-gray-500 flex items-center justify-center gap-1 bg-gray-50 py-2 rounded-lg">
               <ArrowRight className="w-3 h-3" />
               Split trip recommended because savings > RM 8.00
            </div>
          )}

        </div>
      )}

    </div>
  );
};