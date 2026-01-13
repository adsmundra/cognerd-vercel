import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface AddCompetitorModalProps {
  isOpen: boolean;
  competitorName: string;
  competitorUrl: string;
  onNameChange: (name: string) => void;
  onUrlChange: (url: string) => void;
  onAdd: () => void;
  onClose: () => void;
}

export function AddCompetitorModal({
  isOpen,
  competitorName,
  competitorUrl,
  onNameChange,
  onUrlChange,
  onAdd,
  onClose
}: AddCompetitorModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && competitorName.trim()) {
      e.preventDefault();
      onAdd();
    }
  };
  
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
       {/* Backdrop */}
       <div 
         className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" 
         onClick={onClose}
       />
       
       {/* Modal Content */}
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 animate-fade-in relative z-10 border border-gray-100">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
             <h3 className="text-xl font-bold text-gray-900">Add Competitor</h3>
             <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Competitor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={competitorName}
                onChange={(e) => onNameChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., Anthropic"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent bg-gray-50/50"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Website URL <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={competitorUrl}
                onChange={(e) => onUrlChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., anthropic.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent bg-gray-50/50"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Providing a URL improves accuracy for analysis.
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              className="px-5 h-11 rounded-xl text-sm font-semibold transition-all duration-200 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={onAdd}
              disabled={!competitorName.trim()}
              className="flex-1 h-11 px-4 rounded-xl text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 bg-[#155DFC] text-white hover:bg-[#090376] shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              Add Competitor
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}