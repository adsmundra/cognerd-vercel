import { useRef, useEffect } from 'react';
import { BrandMonitorState, BrandMonitorAction } from '@/lib/brand-monitor-reducer';
import { SSEParser } from '@/lib/sse-parser';
import { 
  ProgressData, 
  CompetitorFoundData, 
  PromptGeneratedData, 
  AnalysisProgressData, 
  PartialResultData 
} from '@/lib/types';

interface UseSSEHandlerProps {
  state: BrandMonitorState;
  dispatch: React.Dispatch<BrandMonitorAction>;
  onCreditsUpdate?: () => void;
  onAnalysisComplete?: (analysis: any) => void;
}

export function useSSEHandler({ state, dispatch, onCreditsUpdate, onAnalysisComplete }: UseSSEHandlerProps) {
  // Use ref to track current prompt status to avoid closure issues in SSE handler
  const promptCompletionStatusRef = useRef(state.promptCompletionStatus);
  const analyzingPromptsRef = useRef(state.analyzingPrompts);
  
  useEffect(() => {
    promptCompletionStatusRef.current = state.promptCompletionStatus;
  }, [state.promptCompletionStatus]);
  
  useEffect(() => {
    analyzingPromptsRef.current = state.analyzingPrompts;
  }, [state.analyzingPrompts]);

  const handleSSEEvent = (eventData: any) => {
    console.log('[SSE] Received event:', eventData.type, eventData.data);
    
    switch (eventData.type) {
      case 'credits':
        // Handle credit update event
        if (onCreditsUpdate) {
          onCreditsUpdate();
        }
        break;
        
      case 'progress':
        const progressData = eventData.data as ProgressData;
        dispatch({
          type: 'UPDATE_ANALYSIS_PROGRESS',
          payload: {
            stage: progressData.stage,
            progress: progressData.progress,
            message: progressData.message
          }
        });
        break;

      case 'competitor-found':
        const competitorData = eventData.data as CompetitorFoundData;
        dispatch({
          type: 'UPDATE_ANALYSIS_PROGRESS',
          payload: {
            competitors: [...(state.analysisProgress.competitors || []), competitorData.competitor]
          }
        });
        break;

      case 'prompt-generated':
        const promptData = eventData.data as PromptGeneratedData;
        const existingPrompts = analyzingPromptsRef.current || [];
        const analysisPrompts = state.analysisProgress.prompts || [];
        
        // If prompts are already set (from custom prompts), don't process prompt-generated events
        // This prevents overwriting the initial prompts set in handleAnalyze
        if (existingPrompts.length > 0) {
          
          // Still update analysis progress prompts to keep them in sync
          if (!analysisPrompts.includes(promptData.prompt)) {
            dispatch({
              type: 'UPDATE_ANALYSIS_PROGRESS',
              payload: {
                prompts: [...analysisPrompts, promptData.prompt]
              }
            });
          }
          break;
        }
        
        // Only process if this is truly a new prompt being generated
        if (!existingPrompts.includes(promptData.prompt)) {
          dispatch({
            type: 'UPDATE_ANALYSIS_PROGRESS',
            payload: {
              prompts: [...analysisPrompts, promptData.prompt]
            }
          });
          dispatch({
            type: 'SET_ANALYZING_PROMPTS',
            payload: [...existingPrompts, promptData.prompt]
          });
          
          // Initialize prompt completion status
          const newStatus = { ...promptCompletionStatusRef.current };
          const normalizedPrompt = promptData.prompt.trim();
          newStatus[normalizedPrompt] = {};
          state.availableProviders.forEach(provider => {
            newStatus[normalizedPrompt][provider] = 'pending';
          });
          dispatch({
            type: 'SET_PROMPT_COMPLETION_STATUS',
            payload: newStatus
          });
        }
        break;

      case 'analysis-start':
        const analysisStartData = eventData.data as AnalysisProgressData;
        const normalizedStartPrompt = analysisStartData.prompt.trim();
        
        dispatch({
          type: 'UPDATE_ANALYSIS_PROGRESS',
          payload: {
            currentProvider: analysisStartData.provider,
            currentPrompt: normalizedStartPrompt,
          }
        });
        
        dispatch({
          type: 'UPDATE_PROMPT_STATUS',
          payload: {
            prompt: normalizedStartPrompt,
            provider: analysisStartData.provider,
            status: 'running'
          }
        });
        
        // Update tile status to running
        const tileIndex = state.analysisTiles.findIndex(tile => tile.prompt === analysisStartData.prompt);
        if (tileIndex !== -1) {
          const updatedTile = { ...state.analysisTiles[tileIndex] };
          const providerIndex = updatedTile.providers.findIndex(p => p.name === analysisStartData.provider);
          if (providerIndex !== -1) {
            updatedTile.providers[providerIndex].status = 'running';
            dispatch({
              type: 'UPDATE_ANALYSIS_TILE',
              payload: { index: tileIndex, tile: updatedTile }
            });
          }
        }
        break;

      case 'partial-result':
        const partialData = eventData.data as PartialResultData;
        const normalizedPartialPrompt = partialData.prompt.trim();
        
        dispatch({
          type: 'UPDATE_ANALYSIS_PROGRESS',
          payload: {
            partialResults: [...(state.analysisProgress.partialResults || []), partialData],
          }
        });
        
        dispatch({
          type: 'UPDATE_PROMPT_STATUS',
          payload: {
            prompt: normalizedPartialPrompt,
            provider: partialData.provider,
            status: 'completed'
          }
        });
        
        // Update tile with result
        const partialTileIndex = state.analysisTiles.findIndex(tile => tile.prompt === partialData.prompt);
        if (partialTileIndex !== -1) {
          const updatedTile = { ...state.analysisTiles[partialTileIndex] };
          const providerIndex = updatedTile.providers.findIndex(p => p.name === partialData.provider);
          if (providerIndex !== -1) {
            updatedTile.providers[providerIndex] = {
              ...updatedTile.providers[providerIndex],
              status: 'completed',
              result: {
                brandMentioned: partialData.response.brandMentioned || false,
                brandPosition: partialData.response.brandPosition,
                sentiment: partialData.response.sentiment || 'neutral'
              }
            };
            dispatch({
              type: 'UPDATE_ANALYSIS_TILE',
              payload: { index: partialTileIndex, tile: updatedTile }
            });
          }
        }
        break;

      case 'analysis-complete':
        const analysisCompleteData = eventData.data as AnalysisProgressData;
        
        if (!analysisCompleteData.prompt || !analysisCompleteData.provider) {
          console.error('[ERROR] Missing prompt or provider in analysis-complete event');
          break;
        }
        
        const normalizedCompletePrompt = analysisCompleteData.prompt.trim();
        
        if (analysisCompleteData.status === 'failed') {
          dispatch({
            type: 'UPDATE_PROMPT_STATUS',
            payload: {
              prompt: normalizedCompletePrompt,
              provider: analysisCompleteData.provider,
              status: 'failed'
            }
          });
          
          // Update tile status to failed
          const failedTileIndex = state.analysisTiles.findIndex(tile => tile.prompt === analysisCompleteData.prompt);
          if (failedTileIndex !== -1) {
            const updatedTile = { ...state.analysisTiles[failedTileIndex] };
            const providerIndex = updatedTile.providers.findIndex(p => p.name === analysisCompleteData.provider);
            if (providerIndex !== -1) {
              updatedTile.providers[providerIndex].status = 'failed';
              dispatch({
                type: 'UPDATE_ANALYSIS_TILE',
                payload: { index: failedTileIndex, tile: updatedTile }
              });
            }
          }
        } /* else if ('status' in analysisCompleteData && analysisCompleteData.status === 'skipped') {
          dispatch({
            type: 'UPDATE_PROMPT_STATUS',
            payload: {
              prompt: normalizedCompletePrompt,
              provider: analysisCompleteData.provider,
              status: 'skipped'
            }
          });
        } else */ {
          dispatch({
            type: 'UPDATE_PROMPT_STATUS',
            payload: {
              prompt: normalizedCompletePrompt,
              provider: analysisCompleteData.provider,
              status: 'completed'
            }
          });
        }
        break;

      case 'complete':
        const completeData = eventData.data as { analysis: any };
        console.log('[SSE] Analysis complete event received:', completeData);
        dispatch({
          type: 'ANALYSIS_COMPLETE',
          payload: completeData.analysis
        });
        // Update credits after analysis is complete
        if (onCreditsUpdate) {
          onCreditsUpdate();
        }
        // Call the completion callback
        console.log('[SSE] Calling onAnalysisComplete callback...');
        if (onAnalysisComplete) {
          onAnalysisComplete(completeData.analysis);
        } else {
          console.log('[SSE] No onAnalysisComplete callback provided');
        }
        break;

      case 'error':
        const errorData = eventData.data as { message?: string };
        dispatch({
          type: 'SET_ERROR',
          payload: errorData.message || 'Analysis failed'
        });
        console.error('Analysis error:', eventData.data);
        break;
    }
  };

  const startSSEConnection = async (url: string, options?: RequestInit) => {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const parser = new SSEParser();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const events = parser.parse(chunk);

        for (const event of events) {
          if (event.data) {
            try {
              const eventData = JSON.parse(event.data);
              handleSSEEvent(eventData);
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          }
        }
      }
    } catch (error) {
      // Check if it's a connection error
      if (error instanceof TypeError && error.message.includes('network')) {
        dispatch({
          type: 'SET_ERROR',
          payload: 'Connection lost. Please check your internet connection and try again.'
        });
      } else {
        dispatch({
          type: 'SET_ERROR',
          payload: 'Failed to analyze brand visibility'
        });
      }
      console.error(error);
      
      // Reset progress
      dispatch({
        type: 'SET_ANALYSIS_PROGRESS',
        payload: {
          stage: 'initializing',
          progress: 0,
          message: '',
          competitors: [],
          prompts: [],
          partialResults: []
        }
      });
    }
  };

  return { startSSEConnection };
}