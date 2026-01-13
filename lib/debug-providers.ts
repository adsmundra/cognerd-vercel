/**
 * Debug utility to check provider configuration
 */

import { getConfiguredProviders, getEnabledProviders, PROVIDER_CONFIGS, PROVIDER_PRIORITY } from './provider-config';

export function debugProviders() {
  console.log('=== PROVIDER DEBUG INFO ===');
  
  // Check all providers
  Object.entries(PROVIDER_CONFIGS).forEach(([id, config]) => {
    const envValue = process.env[config.envKey];
    const priority = PROVIDER_PRIORITY[id] || 999;
    console.log(`\n${config.name} (${id}) - Priority: ${priority}:`);
    console.log(`  - Enabled: ${config.enabled}`);
    console.log(`  - API Key Set: ${!!envValue}`);
    console.log(`  - API Key Value: ${envValue ? `${envValue.substring(0, 10)}...` : 'NOT SET'}`);
    console.log(`  - Is Configured: ${config.isConfigured()}`);
    console.log(`  - Model Available: ${!!config.getModel()}`);
  });
  
  console.log('\n=== SUMMARY ===');
  const enabledProviders = getEnabledProviders();
  const configuredProviders = getConfiguredProviders();
  
  console.log(`Enabled Providers: ${enabledProviders.length}`);
  enabledProviders.forEach(p => console.log(`  - ${p.name}`));
  
  console.log(`Configured Providers (in priority order): ${configuredProviders.length}`);
  configuredProviders.forEach((p, index) => {
    const priority = PROVIDER_PRIORITY[p.id] || 999;
    console.log(`  ${index + 1}. ${p.name} (Priority: ${priority})`);
  });
  
  console.log('=== END DEBUG ===\n');
  
  return {
    enabled: enabledProviders,
    configured: configuredProviders,
  };
}