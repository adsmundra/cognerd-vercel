import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { getProviderModel } from '@/lib/provider-config';

export async function GET() {
  try {
    console.log('[TEST] Testing Google provider...');
    
    // Check if Google is configured
    const googleModel = getProviderModel('google');
    if (!googleModel) {
      return NextResponse.json({
        success: false,
        error: 'Google provider not configured',
        hasApiKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
    }

    console.log('[TEST] Google model obtained, testing simple prompt...');

    // Test with a simple prompt
    const testPrompt = 'List 3 popular web browsers. Keep it short.';
    
    const { text } = await generateText({
      model: googleModel,
      prompt: testPrompt,
      temperature: 0.7,
      maxTokens: 200,
    });

    console.log('[TEST] Google response:', text);

    return NextResponse.json({
      success: true,
      prompt: testPrompt,
      response: text,
      responseLength: text.length,
      hasApiKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[TEST] Google test failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        hasApiKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}