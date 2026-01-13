import { AUTUMN_PRODUCTS, AUTUMN_ADDONS, AutumnProduct } from '../config/autumn-products';
import * as dotenv from 'dotenv';

// Suppress dotenv console output
const originalLog = console.log;
console.log = (...args: any[]) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('[dotenv@')) {
    return; // Skip dotenv messages
  }
  originalLog(...args);
};

// Load environment variables
dotenv.config({ path: '.env.local' });

// Restore console.log
console.log = originalLog;

const AUTUMN_API_URL = 'https://api.useautumn.com/v1';
const AUTUMN_SECRET_KEY = process.env.AUTUMN_SECRET_KEY;

if (!AUTUMN_SECRET_KEY || AUTUMN_SECRET_KEY === 'your_autumn_secret_key_here') {
  console.log('Autumn billing integration not configured.');
  console.log('   To enable Autumn:');
  console.log('   1. Sign up at https://useautumn.com');
  console.log('   2. Add your AUTUMN_SECRET_KEY to .env.local');
  console.log('   3. Run: npm run setup:autumn\n');
  process.exit(0); // Exit gracefully
}

async function createProduct(product: AutumnProduct) {
  try {
    // First, check if product exists
    const checkResponse = await fetch(`${AUTUMN_API_URL}/products/${product.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AUTUMN_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (checkResponse.ok) {
      return { skipped: true };
    }

    // Transform product for Autumn API requirements
    // Only include items with actual pricing for Autumn
    const pricedItems = product.items.filter(item => {
      if (item.type === 'flat' && item.flat?.amount && item.flat.amount > 0) {
        return true;
      }
      if (item.type === 'unit' && item.unit?.amount && item.unit.amount > 0) {
        return true;
      }
      return false;
    });

    // If no priced items, use the first item with a nominal price
    const itemsToSend = pricedItems.length > 0 ? pricedItems : [product.items[0]];

    const autumnProduct = {
      id: product.id,
      name: product.name,
      is_add_on: product.type === 'addon',
      is_default: product.properties?.is_free || false,
      items: itemsToSend.map(item => {
        // Extract price from the item
        let price = 0;
        let included_usage = undefined;
        
        if (item.type === 'flat' && item.flat?.amount !== undefined) {
          price = item.flat.amount;
        } else if (item.type === 'unit' && item.unit?.amount !== undefined) {
          price = item.unit.amount;
          included_usage = item.unit.quantity;
        }

        // Ensure price is at least 1 cent
        if (price === 0) {
          price = 1; // Minimum price for Autumn
        }

        // Build the Autumn item structure
        const autumnItem = {
          feature_id: item.id,
          feature_type: 'static' as const, // Use 'static' for flat pricing items
          price: price,
          included_usage: included_usage,
          usage_model: 'prepaid' as const,
        };

        return autumnItem;
      }),
    };

    // Special handling for enterprise pricing
    if (product.id.includes('enterprise') && autumnProduct.items.length > 0) {
      const hasRealPrice = autumnProduct.items.some(item => item.price > 1);
      if (!hasRealPrice) {
        console.log(`   [INFO] Enterprise product detected, setting nominal price`);
        autumnProduct.items[0].price = 99900; // $999 as placeholder
      }
    }

    const response = await fetch(`${AUTUMN_API_URL}/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTUMN_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(autumnProduct),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
}

async function setupAutumnProducts() {
  const allProducts = [...AUTUMN_PRODUCTS, ...AUTUMN_ADDONS];
  
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const product of allProducts) {
    try {
      const result = await createProduct(product);
      if (result?.skipped) {
        skipCount++;
      } else {
        successCount++;
      }
    } catch (error) {
      failCount++;
    }
  }

  if (successCount > 0) {
    console.log(`[OK] Created ${successCount} products`);
  }
  if (skipCount > 0) {
    console.log(`[OK] ${skipCount} products already exist`);
  }
  if (failCount > 0) {
    console.log(`[WARN] ${failCount} products failed`);
  }
  
  if (failCount === 0) {
    console.log('[OK] All products synced successfully!');
  }
}

// Run the setup
setupAutumnProducts().catch(error => {
  console.error('\n[ERROR] Autumn setup failed:', error);
  console.log('\nTip: You can configure Autumn products manually at https://useautumn.com');
  // Exit with success to allow the main setup to continue
  process.exit(0);
});
