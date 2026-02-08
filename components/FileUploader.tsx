import React, { useRef, useState } from 'react';
import { Camera, Upload, AlertCircle, ScanBarcode } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

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
  };

  const triggerUpload = () => {
    if (!isLoading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="w-full mb-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={isLoading}
      />
      
      <div 
        onClick={triggerUpload}
        className={`
          relative overflow-hidden rounded-2xl border-2 border-dashed 
          flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all duration-300 group
          ${isLoading 
            ? 'bg-gray-50 border-gray-300 cursor-not-allowed' 
            : 'bg-white border-teal-200 hover:border-teal-500 hover:bg-teal-50 shadow-sm hover:shadow-lg hover:-translate-y-1'
          }
        `}
      >
        <div className={`
          p-5 rounded-full mb-4 transition-all duration-500
          ${isLoading ? 'bg-teal-100' : 'bg-teal-50 group-hover:bg-teal-100 group-hover:scale-110 group-hover:shadow-md'}
        `}>
          {isLoading ? (
             <ScanBarcode className="w-10 h-10 text-teal-600 animate-pulse" />
          ) : (
             <Camera className="w-10 h-10 text-teal-600" />
          )}
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight group-hover:text-teal-800 transition-colors">
          {isLoading ? "Analyzing..." : "Scan Receipt or Product"}
        </h3>
        <p className="text-sm text-gray-500 max-w-[280px] mx-auto leading-relaxed group-hover:text-gray-600">
          {isLoading ? "Identifying items and checking prices..." : "Upload a grocery receipt OR a photo of a product to check prices."}
        </p>

        {!isLoading && (
          <button className="mt-6 px-6 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 group-hover:scale-105">
            <Upload className="w-4 h-4" />
            Select Image
          </button>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600 text-xs bg-red-50 px-4 py-3 rounded-lg border border-red-100 animate-fade-in">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
};