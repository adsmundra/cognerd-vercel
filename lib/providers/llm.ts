import { NextRequest } from 'next/server';

function getEnv(name: string) {
  try { return process.env[name]; } catch { return undefined; }
}

export type LLMProvider = 'openrouter';

export interface LLMResponse {
  ok: boolean;
  content: string;
  error?: string;
}

export function detectProvider(): LLMProvider | null {
  const key = getEnv('OPENROUTER_API_KEY');
  if (key) return 'openrouter';
  return null;
}

export async function callLLMJSON(prompt: string, modelHint?: string): Promise<LLMResponse> {
  const apiKey = getEnv('OPENROUTER_API_KEY');
  if (!apiKey) return { ok: false, content: '', error: 'Missing OPENROUTER_API_KEY' };

  // Default to a good balance of speed/quality if no hint provided
  // using gemini 2.0 flash as it is often free/cheap on OpenRouter and very fast
  const model = modelHint || 'google/gemini-2.0-flash-001';

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Optional: Add site URL and name for OpenRouter rankings/stats
        'HTTP-Referer': getEnv('NEXT_PUBLIC_APP_URL') || 'https://CogNerd.ai', 
        'X-Title': 'CogNerd',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a strict JSON generator. Always output only valid JSON with no extra commentary.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, content: '', error: `OpenRouter error: ${res.status} ${text}` };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    return { ok: true, content };
  } catch (e: any) {
    return { ok: false, content: '', error: String(e?.message || e) };
  }
}