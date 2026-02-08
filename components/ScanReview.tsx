import React, { useState } from 'react';
import { BijakResponse, ScannedItem } from '../types';
import { Save, Trash2, Plus, ArrowLeft, Check, Edit2, ShoppingBasket } from 'lucide-react';

interface ScanReviewProps {
  data: BijakResponse;
  onConfirm: (editedData: BijakResponse) => void;
  onCancel: () => void;
}

export const ScanReview: React.FC<ScanReviewProps> = ({ data, onConfirm, onCancel }) => {
  const [storeName, setStoreName] = useState(data.store_detected);
  const [items, setItems] = useState<ScannedItem[]>(data.items);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  const handleItemChange = (index: number, field: keyof ScannedItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const handleDeleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    if (newItemName.trim()) {
      setItems([
        ...items, 
        { 
          item_name: newItemName, 
          scanned_price: parseFloat(newItemPrice) || 0, 
          unit: '1 unit', 
          sara_eligible: false 
        }
      ]);
      setNewItemName('');
      setNewItemPrice('');
    }
  };

  const handleConfirm = () => {
    // Recalculate totals
    const totalSara = items.reduce((acc, item) => item.sara_eligible ? acc + item.scanned_price : acc, 0);
    
    onConfirm({
      ...data,
      store_detected: storeName,
      items: items,
      total_sara_spendable: totalSara
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-slide-up pb-20">
      <div className="bg-teal-700 p-4 text-white flex justify-between items-center sticky top-0 z-10">
        <button onClick={onCancel} className="p-2 hover:bg-teal-600 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-lg">Review Scan</h2>
        <button 
          onClick={handleConfirm}
          className="bg-white text-teal-700 px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-100 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Store Name Input */}
        <div className="space-y-2">
           <label className="text-xs font-bold text-gray-500 uppercase">Store / Product Name</label>
           <div className="flex items-center gap-2 border-b-2 border-gray-100 pb-2 focus-within:border-teal-500 transition-colors">
              <ShoppingBasket className="w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                value={storeName} 
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full text-lg font-bold text-gray-800 focus:outline-none"
                placeholder="Store Name"
              />
              <Edit2 className="w-4 h-4 text-gray-300" />
           </div>
        </div>

        {/* Item List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-gray-500 uppercase">Items Detected ({items.length})</label>
            <span className="text-xs text-teal-600 font-medium bg-teal-50 px-2 py-0.5 rounded">Check Details</span>
          </div>
          
          <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
             {items.map((item, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200 group relative">
                   <div className="flex gap-3 mb-2">
                      <input 
                        type="text" 
                        value={item.item_name}
                        onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                        className="flex-1 bg-transparent border-b border-gray-200 focus:border-teal-500 focus:outline-none text-sm font-medium text-gray-800 pb-1"
                        placeholder="Item Name"
                      />
                      <div className="w-24 relative">
                         <span className="absolute left-0 top-0 text-gray-500 text-sm">RM</span>
                         <input 
                           type="number"
                           step="0.01"
                           value={item.scanned_price}
                           onChange={(e) => handleItemChange(idx, 'scanned_price', parseFloat(e.target.value) || 0)}
                           className="w-full bg-transparent border-b border-gray-200 focus:border-teal-500 focus:outline-none text-sm font-bold text-gray-800 pb-1 pl-7 text-right"
                         />
                      </div>
                   </div>
                   
                   <div className="flex justify-between items-center">
                      <label className={`flex items-center gap-2 text-xs cursor-pointer select-none px-2 py-1 rounded transition-colors ${item.sara_eligible ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-500'}`}>
                         <input 
                           type="checkbox" 
                           checked={item.sara_eligible}
                           onChange={(e) => handleItemChange(idx, 'sara_eligible', e.target.checked)}
                           className="hidden"
                         />
                         {item.sara_eligible ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-gray-400"></div>}
                         SARA Eligible
                      </label>
                      
                      <button 
                        onClick={() => handleDeleteItem(idx)}
                        className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded transition-colors"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
                </div>
             ))}
          </div>
        </div>

        {/* Add New Item */}
        <div className="bg-teal-50 p-3 rounded-lg border border-teal-100">
           <p className="text-xs font-bold text-teal-800 uppercase mb-2">Add Missing Item</p>
           <div className="flex gap-2">
              <input 
                 type="text" 
                 placeholder="Item Name"
                 value={newItemName}
                 onChange={(e) => setNewItemName(e.target.value)}
                 className="flex-1 px-3 py-2 text-sm border border-teal-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <input 
                 type="number" 
                 placeholder="RM"
                 value={newItemPrice}
                 onChange={(e) => setNewItemPrice(e.target.value)}
                 className="w-20 px-3 py-2 text-sm border border-teal-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <button 
                onClick={handleAddItem}
                className="bg-teal-600 text-white p-2 rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
              >
                 <Plus className="w-5 h-5" />
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};