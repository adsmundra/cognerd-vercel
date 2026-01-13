import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/db/utils';
import { getConfiguredProviders, PROVIDER_CONFIGS } from '@/lib/provider-config';

export async function GET() {
  try {
    const checks = {
      database: false,
      aiProviders: [],
      timestamp: new Date().toISOString(),
    };

    // Test database connection
    try {
      checks.database = await testConnection();
    } catch (error) {
      console.error('Database health check failed:', error);
      checks.database = false;
    }

    // Check AI providers
    const configuredProviders = getConfiguredProviders();
    checks.aiProviders = Object.values(PROVIDER_CONFIGS).map(provider => ({
      id: provider.id,
      name: provider.name,
      configured: provider.isConfigured(),
      enabled: provider.enabled,
      hasApiKey: !!process.env[provider.envKey],
      apiKeyPreview: process.env[provider.envKey] ? `${process.env[provider.envKey]?.substring(0, 10)}...` : 'NOT SET',
    }));

    const allHealthy = checks.database && checks.aiProviders.length > 0;

    return NextResponse.json(
      {
        status: allHealthy ? 'healthy' : 'degraded',
        checks,
      },
      { status: allHealthy ? 200 : 503 }
    );
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}