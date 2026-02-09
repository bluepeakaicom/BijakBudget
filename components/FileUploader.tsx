
import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Camera, AlertCircle, Scan, Image as ImageIcon, Search, Zap, Aperture } from 'lucide-react';

export interface FileUploaderHandle {
  openCamera: () => void;
  openGallery: () => void;
}

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export const FileUploader = forwardRef<FileUploaderHandle, FileUploaderProps>(({ onFileSelect, isLoading }, ref) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<PermissionState | 'unknown'>('unknown');

  useEffect(() => {
    checkCameraPermission();
  }, []);

  useImperativeHandle(ref, () => ({
    openCamera: () => {
        if (!isLoading) triggerCamera();
    },
    openGallery: () => {
        if (!isLoading) galleryInputRef.current?.click();
    }
  }));

  const checkCameraPermission = async () => {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setCameraPermission(result.state);
        result.onchange = () => {
            setCameraPermission(result.state);
            if (result.state === 'granted') setError(null);
        };
      } catch (e) {
        setCameraPermission('unknown');
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setError(null);
        onFileSelect(file);
      } else {
        setError("Please upload a valid image file (JPG, PNG).");
      }
    }
    event.target.value = '';
  };

  const triggerCamera = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isLoading) return;

    if (navigator.vibrate) navigator.vibrate(10); // Haptic feedback

    if (cameraPermission === 'denied') {
      setError("Camera access is blocked. Please enable permissions in your browser settings.");
      return;
    }

    cameraInputRef.current?.click();
  };

  const triggerGallery = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading) return;
    if (navigator.vibrate) navigator.vibrate(10);
    galleryInputRef.current?.click();
  };

  return (
    <div className="w-full mb-6 relative z-10">
      {/* Hidden Inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={isLoading}
      />
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={isLoading}
      />
      
      {/* Visual Scanner Interface (Mobile-First Camera Look) */}
      <div 
        className={`relative w-full h-[420px] rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-500 group select-none ${isLoading ? 'ring-2 ring-indigo-500/50' : 'ring-1 ring-white/10 hover:ring-indigo-400/30'}`}
        onClick={triggerCamera}
      >
        {/* Dark Background Base */}
        <div className="absolute inset-0 bg-slate-900"></div>
        
        {/* Ambient Gradient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#312e81_0%,#0f172a_60%,#000000_100%)] opacity-80"></div>
        
        {/* High-Tech Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)] pointer-events-none"></div>

        {/* Animated Laser Scanner */}
        {!isLoading && (
            <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.8),0_0_10px_rgba(34,211,238,0.5)] animate-[scan_3s_ease-in-out_infinite] z-20 opacity-80"></div>
        )}

        {/* Central Viewfinder Area */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none pb-16">
            
            {/* Reticle Box */}
            <div className={`relative w-64 h-64 border border-white/10 rounded-3xl flex items-center justify-center transition-all duration-300 ${isLoading ? 'scale-90 opacity-50' : 'group-active:scale-95'}`}>
                {/* Corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-cyan-400 -mt-[2px] -ml-[2px] rounded-tl-xl shadow-[0_0_10px_rgba(34,211,238,0.3)]"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-cyan-400 -mt-[2px] -mr-[2px] rounded-tr-xl shadow-[0_0_10px_rgba(34,211,238,0.3)]"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-cyan-400 -mb-[2px] -ml-[2px] rounded-bl-xl shadow-[0_0_10px_rgba(34,211,238,0.3)]"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-cyan-400 -mb-[2px] -mr-[2px] rounded-br-xl shadow-[0_0_10px_rgba(34,211,238,0.3)]"></div>

                {/* Central Feedback */}
                {isLoading ? (
                    <div className="flex flex-col items-center animate-pulse">
                        <div className="relative">
                            <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl animate-ping"></div>
                            <Search className="w-16 h-16 text-cyan-300 relative z-10" />
                        </div>
                        <p className="text-cyan-300 font-mono text-xs tracking-[0.2em] uppercase mt-4">Analysing...</p>
                    </div>
                ) : (
                    <div className="text-center opacity-60">
                        <Scan className="w-12 h-12 text-white mx-auto mb-2" strokeWidth={1} />
                    </div>
                )}
            </div>

            {/* Instruction Badge */}
            <div className={`mt-6 px-4 py-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                <p className="text-white/90 text-xs font-medium tracking-wide flex items-center gap-2">
                    <Aperture className="w-3.5 h-3.5 text-cyan-400" />
                    Snap Product or Receipt
                </p>
            </div>
        </div>

        {/* Bottom Control Deck (Camera UI) */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-30 flex items-center justify-between px-8 pb-4">
            
            {/* Gallery Button */}
            <button 
                onClick={triggerGallery}
                className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center active:scale-90 transition-all hover:bg-white/20 group/gallery"
                title="Open Gallery"
            >
                <ImageIcon className="w-5 h-5 text-white group-hover/gallery:scale-110 transition-transform" />
            </button>

            {/* Shutter Button (Visual trigger for main container click) */}
            <div className="relative group/shutter">
                <div className="w-20 h-20 rounded-full border-[4px] border-white/30 flex items-center justify-center transition-all group-active/shutter:border-white/50">
                    <div className="w-[68px] h-[68px] bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.4)] group-active/shutter:scale-90 transition-transform duration-100"></div>
                </div>
            </div>

            {/* Placeholder/Flash (Visual Balance) */}
            <div className="w-12 h-12 flex items-center justify-center opacity-40">
                <Zap className="w-5 h-5 text-white" />
            </div>
        </div>

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md z-40 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
             <div className="bg-red-500/20 p-4 rounded-full mb-4 ring-1 ring-red-500/50">
                <AlertCircle className="w-10 h-10 text-red-500" />
             </div>
             <p className="text-white font-bold text-lg mb-2">Access Required</p>
             <p className="text-slate-400 text-sm mb-6 leading-relaxed max-w-xs">{error}</p>
             <button 
                onClick={(e) => { e.stopPropagation(); setError(null); }}
                className="bg-white text-slate-900 px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors shadow-lg active:scale-95"
             >
                Dismiss
             </button>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes scan {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
});

FileUploader.displayName = 'FileUploader';
