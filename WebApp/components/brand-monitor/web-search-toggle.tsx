'use client';

import React from 'react';
import { Globe, X } from 'lucide-react';

interface WebSearchToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function WebSearchToggle({ enabled, onChange, disabled }: WebSearchToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
        ${enabled 
          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      title={enabled ? 'Web search enabled - Click to disable' : 'Web search disabled - Click to enable'}
    >
      {enabled ? (
        <>
          <Globe className="w-4 h-4" />
          Web Search On
        </>
      ) : (
        <>
          <Globe className="w-4 h-4 opacity-50" />
          Web Search Off
        </>
      )}
    </button>
  );
}