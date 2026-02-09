
import React, { useState } from 'react';
import { MapPin, Navigation, Loader2, AlertCircle, Check, X } from 'lucide-react';
import { getReadableAddress } from '../services/location';

interface LocationPermissionModalProps {
  onLocationDetected: (lat: number, lng: number, address: string) => void;
  onSkip: () => void;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({ onLocationDetected, onSkip }) => {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'detecting_address' | 'denied' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleRequestLocation = () => {
    setStatus('requesting');

    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMessage("Not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setStatus('detecting_address');

        try {
          const addressText = await getReadableAddress(latitude, longitude);
          onLocationDetected(latitude, longitude, addressText);
        } catch (error) {
          onLocationDetected(latitude, longitude, `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
        }
      },
      (error) => {
        console.error("Geo Error:", error);
        if (error.code === 1) {
          setStatus('denied');
        } else {
          setStatus('error');
          setErrorMessage("Signal weak");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md transition-all duration-300">
      <div className="w-full max-w-[320px] sm:max-w-sm bg-white rounded-[2rem] p-6 shadow-2xl animate-pop-in relative overflow-hidden border border-white/20">
        
        {/* Close Button */}
        <button 
            onClick={onSkip}
            className="absolute top-4 right-4 p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 active:scale-95 transition-all z-20 hover:bg-slate-100"
        >
            <X className="w-4 h-4" />
        </button>

        {/* Dynamic Header Visual */}
        <div className="flex flex-col items-center text-center mb-6 relative z-10 pt-2">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-xl transition-all duration-500 ${
                status === 'denied' ? 'bg-red-50 text-red-500 ring-4 ring-red-50' :
                status === 'error' ? 'bg-orange-50 text-orange-500 ring-4 ring-orange-50' :
                'bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-teal-500/30 ring-4 ring-teal-50'
            }`}>
                {status === 'requesting' || status === 'detecting_address' ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                ) : status === 'denied' ? (
                    <MapPin className="w-8 h-8" />
                ) : (
                    <Navigation className="w-8 h-8" />
                )}
            </div>
            
            <h2 className="text-xl font-black text-slate-900 leading-tight mb-2">
                {status === 'denied' ? 'Permission Needed' : 'Enable Location'}
            </h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-[260px]">
                {status === 'denied' 
                    ? 'Please enable location in your browser settings to see nearby deals.' 
                    : 'Find the cheapest groceries near you instantly.'}
            </p>
        </div>

        {/* Compact Benefits List */}
        {status === 'idle' && (
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center text-center gap-2 hover:bg-slate-100 transition-colors">
                    <div className="bg-white p-1.5 rounded-full shadow-sm text-teal-600">
                        <MapPin className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 leading-tight">Nearest Stores</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center text-center gap-2 hover:bg-slate-100 transition-colors">
                    <div className="bg-white p-1.5 rounded-full shadow-sm text-teal-600">
                        <Check className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 leading-tight">Accurate Prices</span>
                </div>
            </div>
        )}

        {/* Status Messages */}
        {status === 'denied' && (
             <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs rounded-2xl border border-red-100 flex gap-3 items-start leading-relaxed">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Browser blocked access. Tap the lock icon in your URL bar to reset permissions.</span>
             </div>
        )}

        {status === 'error' && (
             <div className="mb-6 p-4 bg-orange-50 text-orange-600 text-xs rounded-2xl border border-orange-100 text-center font-bold">
                {errorMessage || "Location unavailable."}
             </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
            <button
                onClick={handleRequestLocation}
                disabled={status === 'requesting' || status === 'detecting_address'}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-black disabled:opacity-70 text-sm"
            >
                {status === 'requesting' ? 'Requesting...' : 
                 status === 'detecting_address' ? 'Locating...' : 
                 status === 'denied' ? 'Retry Access' :
                 'Allow Access'}
            </button>
            
            {status !== 'denied' && (
                <button
                    onClick={onSkip}
                    className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                    Enter Manually Instead
                </button>
            )}
        </div>
      </div>
    </div>
  );
};
