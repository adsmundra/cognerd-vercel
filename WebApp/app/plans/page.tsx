'use client';

import PricingTable from '@/components/autumn/pricing-table';
import StaticPricingTable from '@/components/static-pricing-table';
import { useSession } from '@/lib/auth-client';

// Static product details for unauthenticated users
const staticProducts = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for trying out our service",
    price: {
      primaryText: "Free",
      secondaryText: "No credit card required"
    },
    items: [
      { 
        primaryText: "10 messages per month",
        secondaryText: "AI-powered chat responses"
      },
      {
        primaryText: "Community support",
        secondaryText: "Get help from our community"
      },
      {
        primaryText: "Basic features",
        secondaryText: "Essential tools to get started"
      }
    ]
  },
  {
    id: "pro",
    name: "Pro",
    description: "For all your messaging needs",
    recommendText: "Most Popular",
    price: {
      primaryText: "$10/month",
      secondaryText: "billed monthly"
    },
    items: [
      { 
        primaryText: "100 messages per month",
        secondaryText: "AI-powered chat responses"
      },
      {
        primaryText: "Premium support",
        secondaryText: "Get help from our team"
      },
      {
        primaryText: "Priority access",
        secondaryText: "Be first to try new features"
      }
    ]
  }
];

export default function PricingPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-[3rem] lg:text-[4.5rem] font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-tr from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Simple, transparent pricing
            </span>
          </h1>
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto">
            Choose the perfect plan for your needs. Always flexible to scale up or down.
          </p>
        </div>

        <div className="bg-white rounded-[20px] shadow-xl p-8 border border-zinc-200">
          {/* Use static component for unauthenticated users to avoid API calls */}
          {/* {session ? (
            <PricingTable />
          ) : (
            <StaticPricingTable products={staticProducts} />
          )} */}
        </div>
      </div>
    </div>
  );
}