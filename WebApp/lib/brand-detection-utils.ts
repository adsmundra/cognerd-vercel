/**
 * Enhanced brand detection utilities for accurate brand mention matching
 */

import { getBrandDetectionConfig } from './brand-detection-config';

/**
 * Normalizes a brand name for consistent matching
 * @param name The brand name to normalize
 * @returns Normalized brand name
 */
export function normalizeBrandName(name: string): string {
  const config = getBrandDetectionConfig();
  const suffixPattern = new RegExp(`\\b(${config.ignoredSuffixes.join('|')})\\b\\.?$`, 'gi');
  
  return name
    .toLowerCase()
    .trim()
    // Preserve important punctuation but normalize spacing
    .replace(/\s+/g, ' ')
    // Remove possessive forms
    .replace(/'s\b/g, '')
    // Remove configured suffixes
    .replace(suffixPattern, '')
    .trim();
}

/**
 * Generates variations of a brand name for matching
 * @param brandName The original brand name
 * @returns Array of possible variations
 */
export function generateBrandVariations(brandName: string): string[] {
  const normalized = normalizeBrandName(brandName);
  const variations = new Set<string>();
  
  // Add original and normalized
  variations.add(brandName.toLowerCase());
  variations.add(normalized);
  
  // Without spaces
  variations.add(normalized.replace(/\s+/g, ''));
  
  // With dashes instead of spaces
  variations.add(normalized.replace(/\s+/g, '-'));
  
  // With underscores instead of spaces
  variations.add(normalized.replace(/\s+/g, '_'));
  
  // With dots instead of spaces (e.g., "open.ai")
  variations.add(normalized.replace(/\s+/g, '.'));
  
  // Camel case variations
  const words = normalized.split(' ');
  if (words.length > 1) {
    // PascalCase
    variations.add(words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(''));
    // camelCase
    variations.add(words[0] + words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(''));
    // lowercase with no separators
    variations.add(words.join('').toLowerCase());
    // Each word capitalized with space
    variations.add(words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ').toLowerCase());
  }
  
  // Handle special characters
  if (brandName.includes('&')) {
    variations.add(normalized.replace(/&/g, 'and'));
    variations.add(normalized.replace(/&/g, 'n'));
    variations.add(normalized.replace(/&/g, ''));
  }
  
  if (brandName.includes('+')) {
    variations.add(normalized.replace(/\+/g, 'plus'));
    variations.add(normalized.replace(/\+/g, 'and'));
    variations.add(normalized.replace(/\+/g, ''));
  }
  
  // Handle numbers written as words
  const numberMap: Record<string, string> = {
    '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five',
    '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '0': 'zero'
  };
  
  let hasNumbers = false;
  Object.entries(numberMap).forEach(([num, word]) => {
    if (normalized.includes(num)) {
      hasNumbers = true;
      variations.add(normalized.replace(new RegExp(num, 'g'), word));
    }
  });
  
  // Common abbreviations
  const abbrevMap: Record<string, string[]> = {
    'artificial intelligence': ['ai'],
    'machine learning': ['ml'],
    'natural language': ['nl', 'nlp'],
    'technologies': ['tech'],
    'laboratories': ['labs'],
    'solutions': ['sol'],
    'systems': ['sys'],
    'software': ['sw'],
    'hardware': ['hw'],
    'incorporated': ['inc'],
    'corporation': ['corp'],
    'limited': ['ltd'],
  };
  
  Object.entries(abbrevMap).forEach(([full, abbrevs]) => {
    if (normalized.includes(full)) {
      abbrevs.forEach(abbrev => {
        variations.add(normalized.replace(full, abbrev));
      });
    }
  });
  
  // Add variations with common TLDs if the brand name looks like a domain
  if (!brandName.includes('.') && brandName.length > 2) {
    const commonTlds = ['com', 'io', 'ai', 'dev', 'co', 'net', 'org', 'app'];
    commonTlds.forEach(tld => {
      variations.add(`${normalized.replace(/\s+/g, '')}.${tld}`);
    });
  }
  
  return Array.from(variations);
}

/**
 * Creates regex patterns for brand detection with word boundaries
 * @param brandName The brand name
 * @param variations Optional additional variations
 * @returns Array of regex patterns
 */
export function createBrandRegexPatterns(brandName: string, variations?: string[]): RegExp[] {
  const allVariations = new Set([
    ...generateBrandVariations(brandName),
    ...(variations || [])
  ]);
  
  const patterns: RegExp[] = [];
  
  allVariations.forEach(variation => {
    // Escape special regex characters
    const escaped = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create patterns with word boundaries
    // Basic word boundary pattern
    patterns.push(new RegExp(`\\b${escaped}\\b`, 'i'));
    
    // Pattern for hyphenated compounds (e.g., "brand-name-based")
    patterns.push(new RegExp(`\\b${escaped}(?:-\\w+)*\\b`, 'i'));
    
    // Pattern for possessive forms
    patterns.push(new RegExp(`\\b${escaped}'s?\\b`, 'i'));
    
    // Pattern allowing for common suffixes
    patterns.push(new RegExp(`\\b${escaped}(?:\\s+(?:inc|llc|ltd|corp|corporation|company|co)\\.?)?\\b`, 'i'));
  });
  
  return patterns;
}

/**
 * Detects if a brand is mentioned in text using multiple strategies
 * @param text The text to search in
 * @param brandName The brand name to search for
 * @param options Detection options
 * @returns Detection result with details
 */
export interface BrandDetectionResult {
  mentioned: boolean;
  matches: {
    text: string;
    index: number;
    pattern: string;
    confidence: number;
  }[];
  confidence: number;
}

export interface BrandDetectionOptions {
    caseSensitive?: boolean;
    wholeWordOnly?: boolean;
    includeVariations?: boolean;
    customVariations?: string[];
    excludeNegativeContext?: boolean;
    includeUrlDetection?: boolean;
    brandUrls?: string[];
    minConfidenceThreshold?: number;
}

/**
 * Detects if a brand is mentioned in text using multiple strategies
 * Enhanced to reduce false positives
 */
export function detectBrandMention(
    text: string,
    brandName: string,
    options: BrandDetectionOptions = {}
): BrandDetectionResult {
    const {
        caseSensitive = false,
        wholeWordOnly = true,
        includeVariations = true,
        customVariations = [],
        excludeNegativeContext = true,
        includeUrlDetection: includeUrlDetectionOption,
        brandUrls = [],
        minConfidenceThreshold = 0.65  // Minimum confidence to consider a match
    } = options;

    const includeUrlDetection = includeUrlDetectionOption ?? (brandUrls.length > 0);
    const normalizedBrand = normalizeBrandName(brandName);
    const compactBrand = normalizedBrand.replace(/[^a-z0-9]/g, '');
    const searchText = caseSensitive ? text : text.toLowerCase();
    const originalText = text;
    const matches: BrandDetectionResult['matches'] = [];
    const negativePatterns = [
        /\bnot\s+(?:recommended|good|worth|reliable)\b/i,
        /\bavoid\b/i,
        /\bworse\s+than\b/i,
        /\binferior\s+to\b/i,
        /\bdon't\s+(?:use|recommend|like)\b/i
    ];

    const getContext = (start: number, length: number) => {
        const contextStart = Math.max(0, start - 50);
        const contextEnd = Math.min(searchText.length, start + length + 50);
        return searchText.substring(contextStart, contextEnd);
    };

    const pushMatch = (textMatch: string, index: number, pattern: string, confidence: number) => {
        if (confidence < minConfidenceThreshold) {
            return;
        }
        matches.push({
            text: textMatch,
            index,
            pattern,
            confidence
        });
    };

    // Generate patterns - but limit variations
    const patterns = wholeWordOnly
        ? createBrandRegexPatterns(brandName, customVariations)
        : [new RegExp(brandName, caseSensitive ? 'g' : 'gi')];

    // Search with each pattern
    patterns.forEach(pattern => {
        const regex = new RegExp(pattern.source, pattern.flags + 'g');
        let match;

        while ((match = regex.exec(searchText)) !== null) {
            const matchText = match[0];
            const matchIndex = match.index;

            // Check if match is within another word (false positive)
            const beforeChar = matchIndex > 0 ? searchText[matchIndex - 1] : ' ';
            const afterChar = matchIndex + matchText.length < searchText.length
                ? searchText[matchIndex + matchText.length]
                : ' ';

            // Skip if the match is part of a larger word
            if (/[a-zA-Z0-9]/.test(beforeChar) || /[a-zA-Z0-9]/.test(afterChar)) {
                continue;
            }

            // Check for negative context if requested
            if (excludeNegativeContext) {
                const context = getContext(matchIndex, matchText.length);
                const hasNegativeContext = negativePatterns.some(np => np.test(context));
                if (hasNegativeContext) continue;
            }

            const originalMatch = originalText.substring(matchIndex, matchIndex + matchText.length);
            const normalizedMatch = caseSensitive ? matchText.toLowerCase() : matchText;
            const cleanedMatch = normalizedMatch
                .replace(/['’]s\b/, '')
                .replace(/^[^a-z0-9]+/, '')
                .replace(/[^a-z0-9]+$/, '')
                .trim();
            const compactMatch = cleanedMatch.replace(/[^a-z0-9]/g, '');

            // Calculate confidence based on match quality
            let confidence = 0.45; // Base confidence

            if (cleanedMatch === normalizedBrand || (compactMatch && compactMatch === compactBrand)) {
                confidence = 1.0;
            }
            else if (compactMatch && compactBrand && (compactMatch.startsWith(compactBrand) || compactBrand.startsWith(compactMatch))) {
                confidence = Math.max(confidence, 0.92);
            }
            else if (cleanedMatch && normalizedBrand && (cleanedMatch.startsWith(normalizedBrand) || normalizedBrand.startsWith(cleanedMatch))) {
                confidence = Math.max(confidence, 0.85);
            }
            else if (includeVariations && compactMatch && compactBrand && (compactMatch.includes(compactBrand) || compactBrand.includes(compactMatch))) {
                confidence = Math.max(confidence, 0.72);
            }
            else if (includeVariations) {
                confidence = Math.max(confidence, 0.65);
            }

            pushMatch(originalMatch, matchIndex, pattern.source, confidence);
        }
    });

    if (includeUrlDetection && brandUrls.length > 0) {
        const domainVariants = new Set<string>();

        brandUrls.forEach(url => {
            if (!url) return;
            let candidate = url.trim();
            if (!candidate) return;
            if (!/^https?:\/\//i.test(candidate)) {
                candidate = `https://${candidate}`;
            }
            try {
                const parsed = new URL(candidate);
                const host = parsed.hostname.toLowerCase();
                if (host) {
                    domainVariants.add(host);
                    domainVariants.add(host.replace(/^www\./, ''));
                }
            } catch {
                const fallback = candidate
                    .replace(/^https?:\/\//i, '')
                    .replace(/^www\./i, '')
                    .replace(/\/.*$/, '')
                    .toLowerCase();
                if (fallback) {
                    domainVariants.add(fallback);
                }
            }
        });

        domainVariants.forEach(domain => {
            if (!domain) return;
            const escaped = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const flags = caseSensitive ? 'g' : 'gi';
            const domainRegex = new RegExp(`\\b${escaped}\\b`, flags);

            let match;
            while ((match = domainRegex.exec(searchText)) !== null) {
                const matchIndex = match.index;
                const matchedText = originalText.substring(matchIndex, matchIndex + match[0].length);

                if (excludeNegativeContext) {
                    const context = getContext(matchIndex, match[0].length);
                    const hasNegativeContext = negativePatterns.some(np => np.test(context));
                    if (hasNegativeContext) continue;
                }

                pushMatch(matchedText, matchIndex, `url:${domain}`, Math.max(0.88, minConfidenceThreshold));
            }
        });
    }

    // Remove duplicate matches at the same position
    const uniqueMatches = matches.reduce((acc, match) => {
        const existing = acc.find(m => m.index === match.index);
        if (!existing || match.confidence > existing.confidence) {
            return [...acc.filter(m => m.index !== match.index), match];
        }
        return acc;
    }, [] as typeof matches);

    // Calculate overall confidence
    const overallConfidence = uniqueMatches.length > 0
        ? Math.max(...uniqueMatches.map(m => m.confidence))
        : 0;

    return {
        mentioned: uniqueMatches.length > 0 && overallConfidence >= minConfidenceThreshold,
        matches: uniqueMatches.sort((a, b) => b.confidence - a.confidence),
        confidence: overallConfidence
    };
}

// export function detectBrandMention(
//   text: string,
//   brandName: string,
//   options: BrandDetectionOptions = {}
// ): BrandDetectionResult {
//   const {
//     caseSensitive = false,
//     wholeWordOnly = true,
//     includeVariations = true,
//     customVariations = [],
//     excludeNegativeContext = false
//   } = options;
//
//   const searchText = caseSensitive ? text : text.toLowerCase();
//   const matches: BrandDetectionResult['matches'] = [];
//
//   // Generate patterns
//   const patterns = wholeWordOnly
//     ? createBrandRegexPatterns(brandName, customVariations)
//     : [new RegExp(brandName, caseSensitive ? 'g' : 'gi')];
//
//   // Search with each pattern
//   patterns.forEach(pattern => {
//     const regex = new RegExp(pattern.source, pattern.flags + 'g');
//     let match;
//
//     while ((match = regex.exec(searchText)) !== null) {
//       const matchText = match[0];
//       const matchIndex = match.index;
//
//       // Check for negative context if requested
//       if (excludeNegativeContext) {
//         const contextStart = Math.max(0, matchIndex - 50);
//         const contextEnd = Math.min(searchText.length, matchIndex + matchText.length + 50);
//         const context = searchText.substring(contextStart, contextEnd);
//
//         const negativePatterns = [
//           /\bnot\s+(?:recommended|good|worth|reliable)/i,
//           /\bavoid\b/i,
//           /\bworse\s+than\b/i,
//           /\binferior\s+to\b/i,
//           /\bdon't\s+(?:use|recommend|like)\b/i
//         ];
//
//         const hasNegativeContext = negativePatterns.some(np => np.test(context));
//         if (hasNegativeContext) continue;
//       }
//
//       // Calculate confidence based on match quality
//       let confidence = 0.5; // Base confidence
//
//       // Exact match (case-insensitive)
//       if (matchText.toLowerCase() === brandName.toLowerCase()) {
//         confidence = 1.0;
//       }
//       // Exact match with suffix
//       else if (matchText.toLowerCase().startsWith(brandName.toLowerCase() + ' ')) {
//         confidence = 0.9;
//       }
//       // Variation match
//       else if (includeVariations) {
//         confidence = 0.7;
//       }
//
//       matches.push({
//         text: matchText,
//         index: matchIndex,
//         pattern: pattern.source,
//         confidence
//       });
//     }
//   });
//
//   // Remove duplicate matches at the same position
//   const uniqueMatches = matches.reduce((acc, match) => {
//     const existing = acc.find(m => m.index === match.index);
//     if (!existing || match.confidence > existing.confidence) {
//       return [...acc.filter(m => m.index !== match.index), match];
//     }
//     return acc;
//   }, [] as typeof matches);
//
//   // Calculate overall confidence
//   const overallConfidence = uniqueMatches.length > 0
//     ? Math.max(...uniqueMatches.map(m => m.confidence))
//     : 0;
//
//   return {
//     mentioned: uniqueMatches.length > 0,
//     matches: uniqueMatches.sort((a, b) => b.confidence - a.confidence),
//     confidence: overallConfidence
//   };
// }

/**
 * Detects multiple brands in text
 * @param text The text to search in
 * @param brands Array of brand names
 * @param options Detection options
 * @returns Map of brand names to detection results
 */
export function detectMultipleBrands(
  text: string,
  brands: string[],
  options: BrandDetectionOptions = {}
): Map<string, BrandDetectionResult> {
  const results = new Map<string, BrandDetectionResult>();
  
  brands.forEach(brand => {
    results.set(brand, detectBrandMention(text, brand, options));
  });
  
  return results;
}

/**
 * Extracts context around brand mentions
 * @param text The full text
 * @param match The match details
 * @param contextWords Number of words to include on each side
 * @returns Context string with the match highlighted
 */
export function extractMatchContext(
  text: string,
  match: BrandDetectionResult['matches'][0],
  contextWords: number = 10
): string {
  const words = text.split(/\s+/);
  const matchStart = text.substring(0, match.index).split(/\s+/).length - 1;
  const matchEnd = matchStart + match.text.split(/\s+/).length;
  
  const contextStart = Math.max(0, matchStart - contextWords);
  const contextEnd = Math.min(words.length, matchEnd + contextWords);
  
  const contextWords_arr = words.slice(contextStart, contextEnd);
  
  // Highlight the match
  const matchWordIndices = Array.from(
    { length: matchEnd - matchStart },
    (_, i) => matchStart - contextStart + i
  );
  
  const highlighted = contextWords_arr.map((word, idx) => {
    if (matchWordIndices.includes(idx)) {
      return `**${word}**`;
    }
    return word;
  }).join(' ');
  
  const prefix = contextStart > 0 ? '...' : '';
  const suffix = contextEnd < words.length ? '...' : '';
  
  return `${prefix}${highlighted}${suffix}`;
}
