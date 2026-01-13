"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useRefreshCustomer } from "@/hooks/useAutumnCustomer";
import { CREDITS_PER_FILE_GENERATION } from "@/config/constants";
import { 
  FileText, 
  Code, 
  Settings, 
  HelpCircle, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Bot,
  ChevronRight,
  Terminal,
  Play
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilesTabPrefill } from "@/types/files";

type AssetType = "llm" | "schema" | "robots" | "faq";

export function FilesTab({ prefill }: { prefill?: FilesTabPrefill | null }) {
  const { data: session } = useSession();
  const refreshCustomer = useRefreshCustomer();
  const userEmail = session?.user?.email || "";
  const searchParams = useSearchParams();
  const brandId = searchParams.get("brandId");

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [hasSent, setHasSent] = useState(false);
  const [activeAsset, setActiveAsset] = useState<AssetType>("llm");
  const [started, setStarted] = useState(false);

  const signature = useMemo(() => {
    if (!prefill) return null;
    const competitors = Array.isArray(prefill.competitors) ? prefill.competitors : [];
    return JSON.stringify({
      url: prefill.url?.trim(),
      brand: prefill.customerName?.trim(),
      industry: prefill.industry?.trim(),
      competitors,
    });
  }, [prefill]);

  useEffect(() => {
    const run = async () => {
      if (!prefill || !signature) return;
      if (!started) return;
      
      if (!prefill.url || !prefill.customerName || !prefill.industry) {
        setError("Brand profile is missing required data.");
        return;
      }
      if (signature === lastSignature) return;

      setSending(true);
      setError(null);
      try {
        const competitors = Array.isArray(prefill.competitors)
          ? prefill.competitors
              .map((c) => (typeof c === "string" ? c.trim() : ""))
              .filter(Boolean)
          : [];

        let res;
        if (brandId) {
          res = await fetch("/api/geo-files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ brandId }),
          });
        } else {
          res = await fetch("/api/files/jobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: prefill.url,
              brand: prefill.customerName,
              category: prefill.industry,
              competitors,
              prompts: "",
            }),
          });
        }

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          const apiMessage =
            data?.error?.message ||
            (typeof data?.error === "string" ? data.error : null) ||
            "Failed to trigger GEO Files webhook.";
          throw new Error(apiMessage);
        }

        setHasSent(true);
        setLastSignature(signature);
        await refreshCustomer();
      } catch (err: any) {
        setError(err?.message || "Unexpected error while sending GEO Files.");
      } finally {
        setSending(false);
      }
    };

    run();
  }, [prefill, signature, lastSignature, refreshCustomer, started]);

  // Dynamic Mock Content Generator
  const getPreviewContent = (type: AssetType) => {
    const brand = prefill?.customerName || "Acme Corp";
    const url = prefill?.url || "https://acme.com";
    const industry = prefill?.industry || "Technology";

    switch (type) {
      case "llm":
        return `# ${brand} Context File
# Generated for Large Language Models

## Brand Identity
${brand} is a leading provider in the ${industry} space.
We specialize in delivering high-quality solutions...

## Core Offerings
- Enterprise Analytics
- Cloud Infrastructure
- Security Compliance

## Tone & Voice
Professional, authoritative, yet accessible.`;

      case "schema":
        return `{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "${brand}",
  "url": "${url}",
  "industry": "${industry}",
  "sameAs": [
    "https://twitter.com/${brand.replace(/\s+/g, '')}",
    "https://linkedin.com/company/${brand.replace(/\s+/g, '')}"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support"
  }
}`;

      case "robots":
        return `# Robots.txt for ${brand}
# Optimized for AI Search Agents

User-agent: GPTBot
Allow: /
Disallow: /private/

User-agent: CCBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: ${url}/sitemap.xml`;

      case "faq":
        return `Q: What is ${brand}?
A: ${brand} is a ${industry} company focused on innovation...

Q: How does ${brand} handle data security?
A: We adhere to strict enterprise security standards including SOC2...

Q: What is the pricing model?
A: We offer flexible tiers suitable for startups to enterprises...`;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-fade-in-up pb-12">
      
      {/* Hero / Status Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 opacity-50 rounded-3xl -z-10" />
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            
            {/* Status Icon Ring */}
            <div className="relative flex-shrink-0">
               <div className={cn(
                 "w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-500",
                 error ? "bg-red-100 text-red-600" :
                 hasSent ? "bg-gradient-to-br from-green-400 to-emerald-600 text-white" :
                 sending ? "bg-white text-blue-600 border-4 border-blue-50" : "bg-slate-100 text-slate-400"
               )}>
                  {error ? <AlertCircle className="w-10 h-10" /> :
                   hasSent ? <CheckCircle2 className="w-10 h-10" /> :
                   sending ? <Loader2 className="w-10 h-10 animate-spin" /> :
                   <Bot className="w-10 h-10" />}
               </div>
               {/* Pulse Ring */}
               {sending && (
                 <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" />
               )}
            </div>

            {/* Text Content */}
            <div className="flex-1 text-center md:text-left space-y-2">
               <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                 {error ? "Generation Failed" :
                  hasSent ? "Files generated successfully!" :
                  sending ? "Generating easy-to-deploy fixes to improve AI visibility…" :
                  "Ready to Generate"}
               </h1>
               <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
                 {error ? error :
                  hasSent ? `We've emailed the zip folder to ${userEmail}. It contains the four critical files below, customized for ${prefill?.customerName || "your brand"}.` :
                  sending ? "Analyzing your brand profile, structuring schema data, and optimizing for LLM retrieval.." :
                  "Generate rapid fixes to optimize AI visibility."}
               </p>
               
               {!sending && !hasSent && !error && (
                   <div className="pt-2">
                       <button 
                         onClick={() => setStarted(true)}
                         className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 transition-all hover:scale-105"
                       >
                         <Play className="w-5 h-5 mr-2 fill-current" />
                         Start Generation
                       </button>
                   </div>
               )}
            </div>

            {/* Stats / Badge */}
            {hasSent && (
              <div className="hidden md:block bg-green-50 border border-green-100 rounded-2xl p-4 min-w-[140px] text-center">
                <div className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">You Will Receive</div>
                <div className="text-xl font-bold text-green-700">In 30 Mins</div>
              </div>
            )}
          </div>
          
          {/* Progress Line */}
          {sending && (
            <div className="absolute bottom-0 left-8 right-8 h-1 bg-slate-100 overflow-hidden rounded-full">
               <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-indeterminate-bar" />
            </div>
          )}
        </div>
      </div>

      {/* Interactive Features Split View */}
      {prefill && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Interactive File List */}
          <div className="lg:col-span-5 space-y-4">
             <h2 className="text-xl font-semibold text-slate-900 px-2 mb-6">Included Files</h2>
             
             <div className="space-y-3">
                <FeatureCard 
                  active={activeAsset === "llm"} 
                  onClick={() => setActiveAsset("llm")}
                  icon={<FileText className="w-5 h-5" />}
                  title="llm.txt"
                  description="Optimized markdown context for LLM training."
                />
                <FeatureCard 
                  active={activeAsset === "schema"} 
                  onClick={() => setActiveAsset("schema")}
                  icon={<Code className="w-5 h-5" />}
                  title="schema.json"
                  description="Rich snippet structured data for search engines."
                />
                <FeatureCard 
                  active={activeAsset === "robots"} 
                  onClick={() => setActiveAsset("robots")}
                  icon={<Settings className="w-5 h-5" />}
                  title="robots.txt"
                  description="Crawler directives for AI bots (GPTBot, etc)."
                />
                <FeatureCard 
                  active={activeAsset === "faq"} 
                  onClick={() => setActiveAsset("faq")}
                  icon={<HelpCircle className="w-5 h-5" />}
                  title="faq.txt"
                  description="High-value Q&A pairs for answer engines."
                />
             </div>
          </div>

          {/* Right: Live Preview Window */}
          <div className="lg:col-span-7 space-y-4">
             <h2 className="text-xl font-semibold text-slate-900 px-2 mb-6">File Preview</h2>
             <div className="bg-[#0f172a] rounded-2xl shadow-2xl overflow-hidden border border-slate-800 min-h-[400px] flex flex-col transition-all duration-500 hover:shadow-blue-900/20">
                
                {/* Mac-style Window Header */}
                <div className="bg-[#1e293b] px-4 py-3 flex items-center justify-between border-b border-slate-700">
                   <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                   </div>
                   <div className="flex items-center gap-2 text-slate-400 text-xs font-mono bg-slate-900/50 px-3 py-1 rounded-md border border-slate-700/50">
                      <Terminal className="w-3 h-3" />
                      <span>Preview: {activeAsset === 'schema' ? 'schema.json' : activeAsset + '.txt'}</span>
                   </div>
                   <div className="w-12" /> {/* Spacer for balance */}
                </div>

                {/* Code Area */}
                <div className="p-6 font-mono text-sm leading-relaxed overflow-auto custom-scrollbar flex-1">
                   <div className="animate-fade-in-up key={activeAsset}"> 
                      {/* Using key forces re-animation on change */}
                      <pre className="text-slate-300 whitespace-pre-wrap">
                        {getPreviewContent(activeAsset)
                          .split('\n')
                          .map((line, i) => (
                            <div key={i} className="table-row">
                               <span className="table-cell text-slate-600 select-none pr-4 w-8">{i + 1}</span>
                               <span className="table-cell">{highlightSyntax(line, activeAsset)}
                               </span>
                            </div>
                          ))
                        }
                      </pre>
                   </div>
                </div>

                {/* Footer status bar */}
                <div className="bg-[#1e293b] px-4 py-2 border-t border-slate-800 flex justify-between text-[10px] text-slate-500 uppercase font-medium tracking-wider">
                   <span>UTF-8</span>
                   <span>Generated for {prefill.customerName}</span>
                   <span>{activeAsset === 'schema' ? 'JSON' : 'Markdown'}</span>
                </div>
             </div>
          </div>

        </div>
      )}

    </div>
  );
}

// Sub-component for list items
function FeatureCard({
  active,
  onClick,
  icon,
  title,
  description
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-xl border transition-all duration-300 group relative overflow-hidden",
        active 
          ? "bg-white border-blue-500 shadow-md ring-1 ring-blue-500/20 scale-[1.01]" 
          : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm"
      )}
    >
       {/* Active Indicator Bar */}
       {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />}
       
       <div className="flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-lg transition-colors duration-300",
            active ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-500"
          )}>
             {icon}
          </div>
          <div className="flex-1">
             <h4 className={cn(
               "font-semibold text-sm transition-colors",
               active ? "text-blue-900" : "text-slate-900"
             )}>
               {title}
             </h4>
             <p className="text-xs text-slate-500 mt-0.5 pr-4">
               {description}
             </p>
          </div>
          <ChevronRight className={cn(
            "w-4 h-4 text-slate-300 transition-transform duration-300",
            active ? "text-blue-500 translate-x-1" : "group-hover:text-blue-400 group-hover:translate-x-0.5"
          )} />
       </div>
    </button>
  )
}

// Simple syntax highlighter helper
function highlightSyntax(line: string, type: string) {
   // Basic JSON highlighting
   if (type === 'schema') {
      if (line.includes(':')) {
         const [key, val] = line.split(/:(.+)/);
         return (
            <>
              <span className="text-sky-300">{key}:</span>
              <span className="text-amber-300">{val}</span>
            </>
         )
      }
      if (line.includes('{') || line.includes('}')) return <span className="text-purple-400">{line}</span>;
   }
   
   // Markdown Headers
   if (line.startsWith('#')) return <span className="text-purple-400 font-bold">{line}</span>;
   // Lists
   if (line.trim().startsWith('-')) return <span className="text-amber-300">{line}</span>;
   // Key-Value pairs in text
   if (line.includes(':')) return (
       <>
         <span className="text-sky-300">{line.split(':')[0]}:</span>
         <span>{line.split(':')[1]}</span>
       </>
   );

   return line;
}