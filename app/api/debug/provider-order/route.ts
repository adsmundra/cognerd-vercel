import { NextResponse } from 'next/server';
import { getConfiguredProviders, PROVIDER_PRIORITY } from '@/lib/provider-config';

export async function GET() {
  try {
    const configuredProviders = getConfiguredProviders();
    
    const providerOrder = configuredProviders.map((provider, index) => ({
      position: index + 1,
      id: provider.id,
      name: provider.name,
      priority: PROVIDER_PRIORITY[provider.id] || 999,
      enabled: provider.enabled,
      configured: provider.isConfigured(),
    }));
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Provider order (as they will be tried)',
      totalConfigured: configuredProviders.length,
      providerOrder,
    });
  } catch (error) {
    console.error('Provider order debug error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get provider order',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}