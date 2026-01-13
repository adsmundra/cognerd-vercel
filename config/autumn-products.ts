/**
 * Autumn Products Configuration
 * Defines the products and pricing for Autumn billing integration
 */

export interface AutumnProduct {
  id: string;
  name: string;
  type: 'product' | 'addon';
  properties?: {
    is_free?: boolean;
  };
  items: Array<{
    id: string;
    type: 'flat' | 'unit';
    flat?: {
      amount: number;
    };
    unit?: {
      amount: number;
      quantity?: number;
    };
  }>;
}

// Main products
export const AUTUMN_PRODUCTS: AutumnProduct[] = [
  {
    id: 'free',
    name: 'Free Plan',
    type: 'product',
    properties: {
      is_free: true,
    },
    items: [
      {
        id: 'messages',
        type: 'unit',
        unit: {
          amount: 0,
          quantity: 10,
        },
      },
    ],
  },
  {
    id: 'starter',
    name: 'Starter Plan',
    type: 'product',
    items: [
      {
        id: 'messages',
        type: 'unit',
        unit: {
          amount: 999, // $9.99
          quantity: 100,
        },
      },
    ],
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    type: 'product',
    items: [
      {
        id: 'messages',
        type: 'flat',
        flat: {
          amount: 2999, // $29.99
        },
      },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    type: 'product',
    items: [
      {
        id: 'messages',
        type: 'flat',
        flat: {
          amount: 99900, // $999.00
        },
      },
    ],
  },
];

// Add-on products
export const AUTUMN_ADDONS: AutumnProduct[] = [
  {
    id: 'extra-credits',
    name: 'Extra Credits',
    type: 'addon',
    items: [
      {
        id: 'messages',
        type: 'unit',
        unit: {
          amount: 100, // $1.00 per 10 credits
          quantity: 10,
        },
      },
    ],
  },
];