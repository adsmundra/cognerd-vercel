'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signUp, useSession } from '@/lib/auth-client';
import { GoogleSignInButton } from '@/components/ui/google-signin-button';
import { Zap, BarChart3, LineChart } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showExistingAccountOptions, setShowExistingAccountOptions] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && session) {
      setIsRedirecting(true);
      if (typeof window !== 'undefined') {
        window.location.replace('/brand-profiles');
      } else {
        router.replace('/brand-profiles');
      }
    }
  }, [session, isPending, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setShowExistingAccountOptions(false);

    try {
      const response = await signUp.email({
        name,
        email,
        password,
      });
      
      // Only redirect if signup was successful
      if (!response.error) {
        // Wait a moment for the session to be properly set
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Force a hard navigation to ensure cookies are sent
        if (typeof window !== 'undefined') {
          window.location.href = '/brand-profiles';
        }
      } else {
        throw response.error;
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to register';
      setError(errorMessage);
      
      // Check if the error is about existing account
      // Better Auth returns 422 status for existing accounts
      if (err.status === 422 ||
          errorMessage.toLowerCase().includes('already exists') || 
          errorMessage.toLowerCase().includes('already registered') ||
          errorMessage.toLowerCase().includes('existing email') ||
          errorMessage.toLowerCase().includes('email already') ||
          errorMessage.toLowerCase().includes('user already exists')) {
        setShowExistingAccountOptions(true);
      }
      setLoading(false);
    }
  };

  if (isRedirecting || (!isPending && session)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
           <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
           <p className="text-slate-600 font-medium">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left side - Feature Showcase */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-b from-blue-600 to-blue-800 p-12 items-center justify-center relative overflow-hidden">
        {/* Abstract shapes/gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(255,255,255,0.1),_transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,_rgba(255,255,255,0.05),_transparent_70%)]"></div>
        
        <div className="relative z-10 max-w-lg text-white">
          <div className="mb-12">
             <h1 className="text-5xl font-bold mb-6 leading-tight tracking-tight">
               Join the future of brand intelligence
             </h1>
             <p className="text-xl text-blue-100 leading-relaxed">
               Get started today to unlock powerful insights, monitor your digital footprint, and outpace the competition.
             </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm">
              <div className="p-2 bg-white/10 rounded-lg text-white">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Real-Time AI Monitoring</h3>
                <p className="text-sm text-blue-100 mt-1">Track how often your brand is mentioned across AI platforms.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm">
              <div className="p-2 bg-white/10 rounded-lg text-white">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Actionable Visibility Insights</h3>
                <p className="text-sm text-blue-100 mt-1">Get clear recommendations to boost your AI presence.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm">
              <div className="p-2 bg-white/10 rounded-lg text-white">
                <LineChart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Competitor Benchmarking</h3>
                <p className="text-sm text-blue-100 mt-1">See how you stack up against competitors instantly.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Register Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-[400px] w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-100">
          <div className="text-center">
            <div className="lg:hidden mb-8 flex justify-center">
              <Image
                src="/firecrawl-logo-with-fire.png"
                alt="CogNerd"
                width={200}
                height={50}
                priority
                className="h-10 w-auto"
              />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Start your free trial today. No credit card required.
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleRegister}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all sm:text-sm bg-slate-50/50"
                  placeholder="John Doe"
                />
              </div>
              
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all sm:text-sm bg-slate-50/50"
                  placeholder="name@company.com"
                />
              </div>
              
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all sm:text-sm bg-slate-50/50"
                  placeholder="At least 8 characters"
                />
                <p className="text-[10px] text-slate-400 text-right">Must be at least 8 characters long</p>
              </div>
            </div>

            {error && (
              <div className={`border px-4 py-3 rounded-lg text-sm ${showExistingAccountOptions ? 'bg-slate-800 border-slate-700 text-white' : 'bg-red-50 border-red-200 text-red-600'}`}>
                <div className="flex items-start gap-2">
                  <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${showExistingAccountOptions ? 'text-slate-400' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <div>
                    <p className="font-medium">{error}</p>
                    {showExistingAccountOptions && (
                      <div className="mt-3 space-y-3">
                        <p className="text-xs text-slate-300">
                          It looks like you already have an account with this email.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Link 
                            href={`/login?email=${encodeURIComponent(email)}`}
                            className="inline-flex items-center justify-center px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-md transition-colors"
                          >
                            Sign in instead
                          </Link>
                          <Link 
                            href="/forgot-password"
                            className="inline-flex items-center justify-center px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-md transition-colors"
                          >
                            Forgot password?
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-2">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="terms" className="text-xs text-slate-500 leading-relaxed cursor-pointer select-none">
                  By creating an account, I agree to the{' '}
                  <Link href="#" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="#" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">Privacy Policy</Link>.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                     <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                     Creating account...
                  </div>
                ) : 'Create account'}
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-2 bg-white text-slate-400 font-medium tracking-wider">Or join with</span>
                </div>
              </div>
              
              <GoogleSignInButton
                onError={(error) => setError(error)}
                onSuccess={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/brand-profiles';
                  }
                }}
                disabled={loading}
              />
            </div>
          </form>

          <p className="text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-all">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}