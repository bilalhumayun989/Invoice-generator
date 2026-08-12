import React, { useCallback, useState } from 'react';
import { UploadCloud, AlertCircle, Loader2 } from 'lucide-react';
import { parseJSON, parsePDF, parseImage } from '../utils/invoiceParser';
import type { InvoiceData } from '../types/invoice';

interface DropZoneProps {
  onDataExtracted: (data: Partial<InvoiceData>) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onDataExtracted }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      let extractedData: Partial<InvoiceData> = {};
      const fileType = file.type;
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.json') || fileType === 'application/json') {
        extractedData = await parseJSON(file);
      } else if (fileName.endsWith('.pdf') || fileType === 'application/pdf') {
        extractedData = await parsePDF(file);
      } else if (fileName.match(/\.(jpeg|jpg|png|webp)$/) || fileType.startsWith('image/')) {
        extractedData = await parseImage(file);
      } else {
        throw new Error('Unsupported file format. Please upload JSON, PDF, or Image.');
      }

      const keys = Object.keys(extractedData).filter(k => (extractedData as any)[k] !== undefined && (extractedData as any)[k] !== '');
      
      if (keys.length === 0) {
        setError('Parsed file, but no matching invoice fields were detected. Check browser console (F12) to see extracted text.');
      } else {
        setSuccessMsg(`Extracted ${keys.length} field(s): ${keys.join(', ')}`);
        onDataExtracted(extractedData);
      }
    } catch (err: any) {
      console.error('Extraction error:', err);
      setError(err.message || 'Failed to extract data from file.');
    } finally {
      setIsLoading(false);
    }
  }, [onDataExtracted]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  }, [processFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  return (
    <div className="w-full mb-8">
      <div
        className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-[1.25rem] transition-colors duration-200 ease-in-out cursor-pointer overflow-hidden ${
          isDragActive ? 'border-slate-900 bg-slate-100' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".json,application/pdf,image/*"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          disabled={isLoading}
        />
        
        <div className="flex flex-col items-center justify-center p-6 text-center z-0 pointer-events-none">
          {isLoading ? (
             <div className="flex flex-col items-center gap-3">
               <Loader2 className="w-10 h-10 text-slate-900 animate-spin" />
               <p className="text-sm font-medium text-slate-900">Extracting local data securely...</p>
             </div>
          ) : (
            <>
              <div className="p-3 bg-white rounded-full shadow-sm mb-3">
                <UploadCloud className="w-8 h-8 text-slate-700" />
              </div>
              <p className="mb-2 text-sm font-semibold text-slate-900">
                <span className="font-bold underline">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-slate-500">
                JSON, PDF, PNG, JPG (100% Client-Side Processing)
              </p>
            </>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="mt-3 p-3 text-sm text-emerald-800 bg-emerald-100 rounded-lg flex items-center gap-2 font-medium">
          ✓ {successMsg}
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 text-sm text-red-700 bg-red-100 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
};
