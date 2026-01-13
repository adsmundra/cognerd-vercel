/**
 * Utilities for highlighting brand mentions in text
 */

import React from 'react';
import { BrandDetectionResult } from './brand-detection-utils';

export interface HighlightedSegment {
  text: string;
  highlighted: boolean;
  brandName?: string;
  confidence?: number;
}

/**
 * Highlights brand mentions in text by breaking it into segments
 * @param text The text to highlight
 * @param detectionResults Map of brand names to detection results
 * @returns Array of text segments with highlight information
 */
export function highlightBrandMentions(
  text: string,
  detectionResults: Map<string, BrandDetectionResult>
): HighlightedSegment[] {
  // Collect all matches with their positions
  const allMatches: Array<{
    start: number;
    end: number;
    brandName: string;
    matchText: string;
    confidence: number;
  }> = [];
  
  detectionResults.forEach((result, brandName) => {
    result.matches.forEach(match => {
      allMatches.push({
        start: match.index,
        end: match.index + match.text.length,
        brandName,
        matchText: match.text,
        confidence: match.confidence
      });
    });
  });
  
  // Sort matches by position
  allMatches.sort((a, b) => a.start - b.start);
  
  // Remove overlapping matches (keep the one with higher confidence)
  const nonOverlappingMatches = allMatches.reduce((acc, match) => {
    const lastMatch = acc[acc.length - 1];
    if (!lastMatch || match.start >= lastMatch.end) {
      // No overlap
      acc.push(match);
    } else if (match.confidence > lastMatch.confidence) {
      // Overlap but this match has higher confidence
      acc[acc.length - 1] = match;
    }
    // Otherwise keep the existing match
    return acc;
  }, [] as typeof allMatches);
  
  // Build segments
  const segments: HighlightedSegment[] = [];
  let lastEnd = 0;
  
  nonOverlappingMatches.forEach(match => {
    // Add non-highlighted segment before this match
    if (match.start > lastEnd) {
      segments.push({
        text: text.substring(lastEnd, match.start),
        highlighted: false
      });
    }
    
    // Add highlighted segment
    segments.push({
      text: match.matchText,
      highlighted: true,
      brandName: match.brandName,
      confidence: match.confidence
    });
    
    lastEnd = match.end;
  });
  
  // Add remaining text
  if (lastEnd < text.length) {
    segments.push({
      text: text.substring(lastEnd),
      highlighted: false
    });
  }
  
  return segments;
}

/**
 * Converts highlighted segments to HTML
 * @param segments Array of highlighted segments
 * @param highlightClass CSS class for highlighted text
 * @returns HTML string
 */
export function segmentsToHtml(
  segments: HighlightedSegment[],
  highlightClass: string = 'bg-yellow-200'
): string {
  return segments.map(segment => {
    if (segment.highlighted) {
      const tooltip = segment.brandName ? ` title="${segment.brandName} (confidence: ${Math.round((segment.confidence || 0) * 100)}%)"` : '';
      return `<span class="${highlightClass}"${tooltip}>${escapeHtml(segment.text)}</span>`;
    }
    return escapeHtml(segment.text);
  }).join('');
}

/**
 * Converts highlighted segments to React elements
 * @param segments Array of highlighted segments
 * @param highlightClassName CSS class for highlighted text
 * @returns Array of React elements
 */
export function segmentsToReactElements(
  segments: HighlightedSegment[],
  highlightClassName: string = 'bg-yellow-200 px-0.5 rounded'
): React.ReactElement[] {
  return segments.map((segment, index) => {
    if (segment.highlighted) {
      return (
        <span
          key={index}
          className={highlightClassName}
          title={`${segment.brandName} (${Math.round((segment.confidence || 0) * 100)}% confidence)`}
        >
          {segment.text}
        </span>
      );
    }
    return <span key={index}>{segment.text}</span>;
  });
}

/**
 * Escapes HTML special characters
 * @param text The text to escape
 * @returns Escaped text
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Gets a summary of brand mentions in text
 * @param detectionResults Map of brand names to detection results
 * @returns Summary object
 */
export function getBrandMentionSummary(
  detectionResults: Map<string, BrandDetectionResult>
): {
  totalMentions: number;
  brandsMentioned: string[];
  highConfidenceMentions: number;
  averageConfidence: number;
} {
  let totalMentions = 0;
  let totalConfidence = 0;
  let highConfidenceMentions = 0;
  const brandsMentioned: string[] = [];
  
  detectionResults.forEach((result, brandName) => {
    if (result.mentioned) {
      brandsMentioned.push(brandName);
      totalMentions += result.matches.length;
      
      result.matches.forEach(match => {
        totalConfidence += match.confidence;
        if (match.confidence >= 0.8) {
          highConfidenceMentions++;
        }
      });
    }
  });
  
  return {
    totalMentions,
    brandsMentioned,
    highConfidenceMentions,
    averageConfidence: totalMentions > 0 ? totalConfidence / totalMentions : 0
  };
}