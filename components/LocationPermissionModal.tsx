
import React, { useState } from 'react';
import { MapPin, Navigation, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
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
      setErrorMessage("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setStatus('detecting_address');

        try {
          // Use the robust Malaysian address parser
          const addressText = await getReadableAddress(latitude, longitude);
          onLocationDetected(latitude, longitude, addressText);
        } catch (error) {
          // Fallback
          onLocationDetected(latitude, longitude, `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
        }
      },
      (error) => {
        console.error("Geo Error:", error);
        if (error.code === 1) {
          setStatus('denied'); // Permission denied
        } else {
          setStatus('error');
          setErrorMessage("Unable to retrieve location. Signal might be weak.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up relative overflow-hidden">
        
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 to-blue-500"></div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-50 rounded-full blur-2xl"></div>

        <div className="relative z-10 text-center">
          
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-teal-100 shadow-sm">
             {status === 'requesting' || status === 'detecting_address' ? (
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
             ) : status === 'denied' ? (
                <MapPin className="w-8 h-8 text-red-500" />
             ) : (
                <Navigation className="w-8 h-8 text-teal-600 fill-teal-100" />
             )}
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">Enable Location Services</h2>
          
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            BijakBudget works best when we know where you are. We use your location to find:
          </p>
          
          <div className="space-y-3 mb-6 text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
             <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-700">Cheapest stores nearby</span>
             </div>
             <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-700">Accurate route planning</span>
             </div>
             <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-700">Local subsidy eligibility</span>
             </div>
          </div>

          {status === 'denied' && (
             <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 text-left flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <div>
                   <span className="font-bold">Access Denied.</span> Please enable location permissions in your browser settings to continue.
                </div>
             </div>
          )}

          {status === 'error' && (
             <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100">
                {errorMessage}
             </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleRequestLocation}
              disabled={status === 'requesting' || status === 'detecting_address'}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-teal-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {status === 'requesting' ? 'Requesting Access...' : 
               status === 'detecting_address' ? 'Identifying Address...' : 
               'Allow Location Access'}
            </button>
            
            <button
              onClick={onSkip}
              className="text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors py-2"
            >
              Enter Location Manually Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
