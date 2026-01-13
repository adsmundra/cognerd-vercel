import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import path from 'path';

// Suppress dotenv console output
const originalLog = console.log;
console.log = (...args: any[]) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('[dotenv@')) {
    return; // Skip dotenv messages
  }
  originalLog(...args);
};

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Restore console.log
console.log = originalLog;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

async function setupBillingPortal() {
  try {
    const configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'CogNerd - Manage your subscription',
        privacy_policy_url: `${process.env.NEXT_PUBLIC_APP_URL}/privacy`,
        terms_of_service_url: `${process.env.NEXT_PUBLIC_APP_URL}/terms`,
      },
      features: {
        customer_update: {
          enabled: true,
          allowed_updates: ['email', 'tax_id'],
        },
        invoice_history: {
          enabled: true,
        },
        payment_method_update: {
          enabled: true,
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other',
            ],
          },
        },
        subscription_pause: {
          enabled: false,
        },
        subscription_update: {
          enabled: false,
        },
      },
      default_return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    console.log('[OK] Billing portal configuration created');
    
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error('[ERROR] Stripe portal setup failed:', error.message);
    } else {
      console.error('[ERROR] Stripe portal setup failed');
    }
  }
}

// Run the setup
setupBillingPortal();