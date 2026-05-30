"use client";
import React, { useState, useRef } from "react";
import { UploadCloud, Loader2, FileImage } from "lucide-react";

interface OcrUploadProps {
  onDataExtracted: (data: { vendorName: string; total: number; items: any[] }) => void;
}

export default function OcrUpload({ onDataExtracted }: OcrUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        
        const res = await fetch("/api/ai/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mimeType: file.type,
            data: base64String
          })
        });

        const data = await res.json();
        
        if (!res.ok) {
          setError(data.error || "Failed to extract data");
        } else {
          onDataExtracted(data);
        }
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      };
      
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || "Error reading file");
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full mb-6">
      <div 
        className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors ${
          isUploading ? 'bg-base-200 border-base-300' : 'border-primary/50 hover:bg-primary/5 cursor-pointer'
        }`}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*,application/pdf"
          onChange={handleFileChange}
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center gap-3 text-primary">
            <Loader2 className="animate-spin" size={32} />
            <p className="font-medium">AI is scanning receipt...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-base-content/70">
            <div className="bg-primary/10 p-3 rounded-full text-primary mb-2">
              <UploadCloud size={28} />
            </div>
            <h3 className="font-semibold text-base-content">Auto-fill via OCR</h3>
            <p className="text-sm text-center">Click or drag a receipt image to auto-fill invoice details</p>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-2 text-error text-sm flex items-center gap-1">
          <FileImage size={14} /> {error}
        </div>
      )}
    </div>
  );
}
