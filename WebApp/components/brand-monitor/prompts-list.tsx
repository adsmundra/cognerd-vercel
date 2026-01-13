'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Check, X, Plus, Trash2 } from 'lucide-react';
import { BrandPrompt, AIProvider } from '@/lib/types';

interface PromptAnalysisState {
  promptId: string;
  providers: {
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
  }[];
}

interface PromptsListProps {
  prompts: BrandPrompt[];
  onAddPrompt: (prompt: string) => void;
  onDeletePrompt: (promptId: string) => void;
  analysisStates: PromptAnalysisState[];
  availableProviders: AIProvider[];
  isAnalyzing: boolean;
}

// Provider icons
const providerIcons: Record<string, React.ReactNode> = {
  OpenAI: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
    </svg>
  ),
  Anthropic: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
    </svg>
  ),
  Google: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
  Perplexity: (
    <div className="w-4 h-4 flex items-center justify-center bg-gray-900 rounded-sm">
      <span className="text-white font-bold text-[8px]">P</span>
    </div>
  ),
  DeepSeek: (
    <img src="/logos/deepseek.jpeg" alt="DeepSeek" className="w-4 h-4" />
  ),
  Grok: (
    <img src="/logos/grok.jpeg" alt="Grok" className="w-4 h-4" />
  ),
  xAI: (
    <img src="/logos/grok.jpeg" alt="Grok" className="w-4 h-4" />
  ),
  'Grok (xAI)': (
    <img src="/logos/grok.jpeg" alt="Grok" className="w-4 h-4" />
  ),
};

// Default prompts
const defaultPrompts: string[] = [
  "What are the top 10 {industry} tools in 2024?",
  "List the best {industry} platforms available today",
  "Compare the top 5 {industry} tools including {brand}",
  "What are the best alternatives to {brand}?",
  "Which {industry} tool would you recommend for businesses?",
  "What are the most popular {industry} solutions?",
  "How do the major {industry} platforms compare?",
  "List similar tools to {brand} for {industry}",
  "What's the best {industry} solution for enterprise use?",
  "Which {industry} platform offers the best value?",
];

export function PromptsList({
  prompts,
  onAddPrompt,
  onDeletePrompt,
  analysisStates,
  availableProviders,
  isAnalyzing,
}: PromptsListProps) {
  const [newPrompt, setNewPrompt] = useState('');
  const [showAddPrompt, setShowAddPrompt] = useState(false);

  const handleAddPrompt = () => {
    if (newPrompt.trim()) {
      onAddPrompt(newPrompt.trim());
      setNewPrompt('');
      setShowAddPrompt(false);
    }
  };

  const getPromptStatus = (promptId: string, providerName: string) => {
    const state = analysisStates.find(s => s.promptId === promptId);
    if (!state) return 'pending';
    
    const providerState = state.providers.find(p => p.name === providerName);
    return providerState?.status || 'pending';
  };

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-200" />;
    }
  };

  return (
    <Card className="p-2 bg-card text-card-foreground gap-6 rounded-xl border py-6 shadow-sm border-gray-200 h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium">Analysis Prompts</CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Prompts used to analyze brand visibility across AI providers
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddPrompt(!showAddPrompt)}
            disabled={isAnalyzing}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Prompt
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add prompt input */}
        {showAddPrompt && (
          <div className="flex gap-2 p-4 bg-gray-50 rounded-lg">
            <Input
              placeholder="Enter a custom prompt (use {brand} and {industry} as placeholders)"
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddPrompt();
                }
              }}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleAddPrompt}
              disabled={!newPrompt.trim()}
            >
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowAddPrompt(false);
                setNewPrompt('');
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Prompts list */}
        <div className="space-y-2">
          {prompts.length === 0 && !isAnalyzing ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4">No prompts added yet.</p>
              <p className="text-sm">Default prompts will be used during analysis.</p>
            </div>
          ) : (
            prompts.map((prompt) => (
              <div
                key={prompt.id}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {/* Prompt text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{prompt.prompt}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Category: {prompt.category}
                  </p>
                </div>

                {/* Provider status indicators */}
                <div className="flex items-center gap-3">
                  {availableProviders.map((provider) => (
                    <div
                      key={provider.name}
                      className="flex items-center gap-1"
                      title={provider.name}
                    >
                      <span className="text-gray-600">
                        {providerIcons[provider.name] || provider.icon}
                      </span>
                      {renderStatusIcon(getPromptStatus(prompt.id, provider.name))}
                    </div>
                  ))}
                </div>

                {/* Delete button */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeletePrompt(prompt.id)}
                  disabled={isAnalyzing}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Provider legend */}
        {availableProviders.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500 mb-2">Available providers:</p>
            <div className="flex flex-wrap gap-3">
              {availableProviders.map((provider) => (
                <div key={provider.name} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">
                    {providerIcons[provider.name] || provider.icon}
                  </span>
                  <span className="text-gray-700">{provider.name}</span>
                  <span className="text-xs text-gray-500">({provider.model})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}