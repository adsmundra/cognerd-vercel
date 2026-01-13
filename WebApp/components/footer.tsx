'use client';

import Link from "next/link";
import Image from "next/image";
import { Twitter, Github, Linkedin, Mail, ArrowRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
          {/* Brand & Newsletter Column */}
          <div className="col-span-1 lg:col-span-4 flex flex-col space-y-8">
            <div className="space-y-4">
              <Link href="/" className="inline-block">
                <Image
                  src="/firecrawl-logo-with-fire.png"
                  alt="CogNerd"
                  width={200}
                  height={60}
                  className="h-12 w-auto"
                />
              </Link>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                Boost your Brand's AI Visibility
                Move beyond analysis - deploy actionable fixes instantly
              </p>
            </div>

            {/* Newsletter */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900">Subscribe to our newsletter</h4>
              <form className="flex gap-2 max-w-sm" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 min-w-0 px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
              <p className="text-xs text-slate-400">
                We respect your privacy. Unsubscribe at any time.
              </p>
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="col-span-1 lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Product */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-900">Product</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link href="/plans" className="text-slate-500 hover:text-blue-600 transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">
                    Integrations
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">
                    Changelog
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-900">Resources</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">
                    API Reference
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">
                    Community
                  </Link>
                </li>
              </ul>
            </div> */}

            {/* Company */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-900">Company</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">
                    Partners
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-900">Legal</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">
                    Security
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} CogNerd. All rights reserved.
          </p>
          
          {/* Social Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all"
              aria-label="Twitter"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
              aria-label="GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
            <a
              href="https://www.linkedin.com/company/CogNerdai/ "
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-all"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href="mailto:contact@CogNerd.com"
              className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-all"
              aria-label="Email"
            >
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
