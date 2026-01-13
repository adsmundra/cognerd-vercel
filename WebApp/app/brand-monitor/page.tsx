"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sparkles, Loader2, ArrowLeft, Globe } from "lucide-react";
import { useCustomer, useRefreshCustomer } from "@/hooks/useAutumnCustomer";
import {
  useBrandAnalyses,
  useBrandAnalysis,
  useDeleteBrandAnalysis,
} from "@/hooks/useBrandAnalyses";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FilesTabPrefill } from "@/types/files";
import { assignUrlToCompetitor } from '@/lib/brand-monitor-utils';
import { IdentifiedCompetitor } from '@/lib/brand-monitor-reducer';

const BrandMonitor = dynamic(() => import("@/components/brand-monitor/brand-monitor").then(m => m.BrandMonitor), { ssr: false });
const FilesTab = dynamic(() => import("@/components/brand-monitor/files-tab").then(m => m.FilesTab), { ssr: false });

/**
 * Tabbed Brand Monitor Page
 *
 * - Hero header unchanged
 * - Tab bar sits below hero (in the light/grey area)
 * - Tab 1: Brand Monitor (renders your existing BrandMonitorContent)
 * - Tab 2: AEO Report (placeholder)
 * - Tab 3: Files (placeholder)
 * - Tab 4: UGC (placeholder)
 *
 * You can later replace placeholders with real components.
 */

/* --------------------- BrandMonitorContent (unchanged logic) --------------------- */
function BrandMonitorContent({ 
  session, 
  onOpenAeoForUrl, 
  onOpenFilesForUrl, 
  prefillBrand,
  initialAnalysisId,
  forceNew 
}: { 
  session: any; 
  onOpenAeoForUrl: (url: string, customerName?: string, competitors?: any[]) => void; 
  onOpenFilesForUrl: (payload: FilesTabPrefill) => void; 
  prefillBrand?: { url: string; customerName: string } | null; 
  initialAnalysisId?: string | null;
  forceNew?: boolean;
}) {
  const router = useRouter();
  const { customer, isLoading, error } = useCustomer();
  const refreshCustomer = useRefreshCustomer();
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(
    initialAnalysisId || null
  );


  // Queries and mutations
  const { data: analyses, isLoading: analysesLoading } = useBrandAnalyses();
  const { data: currentAnalysis } = useBrandAnalysis(selectedAnalysisId);
  const deleteAnalysis = useDeleteBrandAnalysis(); // kept for now if used elsewhere (no delete UI)

  // Get credits from customer data
  const messageUsage = customer?.features?.messages;
  const credits = messageUsage ? (messageUsage.balance || 0) : 0;

  useEffect(() => {
    // If there's an auth error, redirect to login
    if (error?.code === "UNAUTHORIZED" || error?.code === "AUTH_ERROR") {
      router.push("/login");
    }
  }, [error, router]);

  // If prefillBrand is provided, try to open existing analysis by exact URL
  useEffect(() => {
    if (forceNew) return;
    if (initialAnalysisId) return; // prioritized

    if (prefillBrand?.url && analyses && analyses.length > 0) {
      const found = analyses.find(a => a.url === prefillBrand.url);
      if (found) {
        setSelectedAnalysisId(found.id);
      }
    }
  }, [prefillBrand?.url, analyses, forceNew, initialAnalysisId]);

  const handleCreditsUpdate = async () => {
    // Use the global refresh to update customer data everywhere
    await refreshCustomer();
  };

  return (
    <div className="flex h-full relative flex-col">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 sm:px-8 lg:px-12 py-8">
          <BrandMonitor
            creditsAvailable={credits}
            onCreditsUpdate={handleCreditsUpdate}
            selectedAnalysis={selectedAnalysisId ? currentAnalysis : null}
            onSaveAnalysis={(analysis) => {}}
            initialUrl={prefillBrand?.url || null}
            lockUrl={!!prefillBrand?.url && !selectedAnalysisId}
            autoRun={!!prefillBrand?.url && !selectedAnalysisId && !forceNew}
            onRequireCreditsConfirm={(required, balance, proceed) => {
              // Use native confirm for simplicity here; can swap to ConfirmationDialog if preferred
              const ok = window.confirm(`Starting a brand analysis may use up to ${required} credits. Your balance is ${balance}. Proceed?`);
              if (ok) proceed();
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* --------------------- Tabbed Page wrapper --------------------- */

function AeoReportTab({ prefill, onOpenBrandForUrl, onOpenFilesForUrl }: { prefill: { url: string; customerName: string; competitors?: any[] } | null; onOpenBrandForUrl: (url: string, customerName?: string, competitors?: any[]) => void; onOpenFilesForUrl: (payload: FilesTabPrefill) => void; }) {
  const [customerName, setCustomerName] = useState('');
  const [url, setUrl] = useState('');
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<{ htmlContent: string; customerName: string; reportType: string; generatedAt: string; read: boolean } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reports, setReports] = useState<Array<{ id: string; customerName: string; url: string; createdAt: string }>>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [handledPrefillKey, setHandledPrefillKey] = useState<string | null>(null);
  const [prefillLookupState, setPrefillLookupState] = useState<'idle' | 'looking' | 'no-match'>('idle');

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetch('/api/aeo-report/list');
      const data = await res.json();
      if (res.ok && Array.isArray(data.reports)) {
        setReports(data.reports);
      }
    } catch (e) {
      // silent fail
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  // Helper: normalize URL for robust matching (ignores trailing slash and lowercases hostname)
  const normalizeUrl = (u?: string | null) => {
    if (!u) return '';
    try {
      const urlObj = new URL(u);
      // lowercase hostname
      urlObj.hostname = urlObj.hostname.toLowerCase();
      let normalized = urlObj.toString();
      // remove trailing slash (but keep single slash after origin)
      if (normalized.endsWith('/') && !/^[a-zA-Z]+:\/\/$/.test(normalized)) {
        normalized = normalized.replace(/\/+$/, '');
      }
      return normalized;
    } catch {
      // fallback: trim, remove trailing slashes
      return String(u).trim().replace(/\/+$/, '');
    }
  };

  // prefill from cross-tab trigger
  useEffect(() => {
    if (!prefill) return;

    // Set inputs and show lookup state immediately
    setCustomerName(prefill.customerName || 'autouser');
    setUrl(prefill.url || '');
    if (prefill.competitors) setCompetitors(prefill.competitors);
    setPrefillLookupState('looking');

    // Wait until reports are fetched
    if (loadingReports) return;

    // Once loaded, decide using a key that includes current reports length to avoid stale skips
    const decisionKey = `${prefill.url || ''}::${reports.length}`;
    if (handledPrefillKey === decisionKey) return;

    if (prefill.url) {
      const prefillNorm = normalizeUrl(prefill.url);
      const sameUrlReports = reports.filter(r => normalizeUrl(r.url) === prefillNorm);
      const match = sameUrlReports.length > 0 ? sameUrlReports[0] : null;

      if (match) {
        handleOpenReport(match.id);
        setPrefillLookupState('idle');
      } else {
        setPrefillLookupState('no-match');
      }
      setHandledPrefillKey(decisionKey);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill, reports, loadingReports]);

  const generateReport = async () => {
    if (!customerName.trim() || !url.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/aeo-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: customerName.trim(), url: url.trim(), reportType: 'combined', competitors })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate report');
      setReportData(data);
      fetchReports();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenReport = async (id: string) => {
    try {
      const res = await fetch(`/api/aeo-report/view?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load report');
      setReportData({ htmlContent: data.html, customerName: data.customerName, reportType: 'combined-ai', generatedAt: data.createdAt, read: data.read });
      setSidebarOpen(false);
    } catch (e) {
      // no-op
    }
  };

  const downloadPDF = async () => {
    if (!reportData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = `<!DOCTYPE html><html><head><title>AEO Report - ${reportData.customerName}</title>
      <style>@page{size:A3 landscape;margin:12mm}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.card{page-break-inside:avoid}}</style>
    </head><body>
      <div class="header" style="text-align:center;margin-bottom:20px;border-bottom:2px solid #004d99;padding-bottom:10px">
        <h1 style="margin:0">AEO Report</h1>
        <p style="margin:6px 0 0">Customer: ${reportData.customerName} | Generated: ${new Date(reportData.generatedAt).toLocaleString()}</p>
      </div>
      ${reportData.htmlContent}
    </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => { setTimeout(() => { printWindow.print(); printWindow.close(); }, 500); };
  };

  return (
    <div className="flex h-full relative flex-col">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 sm:px-8 lg:px-12 py-8 max-w-7xl mx-auto">
          {/* Use shared Inputs/Labels/Buttons for consistency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="aeoCustomer" className="text-sm font-medium">Customer Name *</Label>
              <Input id="aeoCustomer" placeholder="Enter customer name" value={customerName} onChange={e=>setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aeoUrl" className="text-sm font-medium">Website URL *</Label>
              <Input id="aeoUrl" placeholder="https://example.com" value={url} onChange={e=>setUrl(e.target.value)} />
            </div>
          </div>
          <Button onClick={generateReport} disabled={isGenerating} className="btn-firecrawl-default h-9 px-4">
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </Button>

          {/* Lookup status messages when coming from Brand Monitor button */}
          {!reportData && prefillLookupState === 'looking' && (
            <div className="mt-6 text-sm text-gray-600">Looking up existing report…</div>
          )}
          {!reportData && prefillLookupState === 'no-match' && (
            <div className="mt-6 text-sm text-blue-700">No matching report found for the selected URL.</div>
          )}

          {reportData && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-gray-600">Generated on {new Date(reportData.generatedAt).toLocaleString()} | Type: {reportData.reportType}</p>
                </div>
                <Button variant="outline" onClick={downloadPDF}>Download PDF</Button>
              </div>
              <div className="report-content border rounded-lg p-4 bg-white" dangerouslySetInnerHTML={{ __html: reportData.htmlContent }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UGCTab({ prefill, prefillBlogId }: { prefill?: { url: string; brandName: string } | null; prefillBlogId?: string | null }) {
  const searchParams = useSearchParams();
  const brandId = searchParams.get("brandId");
  const [companyUrl, setCompanyUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [brandName, setBrandName] = useState("");
  const [emailId, setEmailId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blogContent, setBlogContent] = useState<string>("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [suggestingTopics, setSuggestingTopics] = useState(false);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);

  const fetchSuggestions = async (bName: string) => {
    if (!bName) return;
    try {
      const res = await fetch(`/api/topic-suggestion?brand_name=${encodeURIComponent(bName)}`);
      const data = await res.json();
      if (data.topics) setSuggestedTopics(data.topics);
    } catch {}
  };

  useEffect(() => {
    if (brandName) fetchSuggestions(brandName);
  }, [brandName]);

  const handleSuggest = async () => {
    if (!brandName.trim()) {
      setError("Please enter a Brand Name first to generate suggestions.");
      return;
    }
    setSuggestingTopics(true);
    setError(null);
    try {
      const res = await fetch("/api/topic-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_name: brandName }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.topics) setSuggestedTopics(data.topics);
    } catch (e: any) {
      setError(e.message || "Failed to suggest topics");
    } finally {
      setSuggestingTopics(false);
    }
  };

  const canSubmit = companyUrl.trim() && topic.trim();

  useEffect(() => {
    if (prefill) {
      if (prefill.url) setCompanyUrl(prefill.url);
      if (prefill.brandName) setBrandName(prefill.brandName);
    }
  }, [prefill]);

  useEffect(() => {
    const loadBlog = async () => {
      if (!prefillBlogId) return;
      try {
        const res = await fetch(`/api/write-blog/view?id=${encodeURIComponent(prefillBlogId)}`);
        const data = await res.json();
        if (res.ok) {
          setCompanyUrl(data.company_url || '');
          setTopic(data.topic || '');
          setBrandName(data.brand_name || '');
          setBlogContent(data.blog || '');
          setSelectedId(Number(prefillBlogId));
        }
      } catch (e) {
        console.error("Failed to load prefilled blog", e);
      }
    };
    loadBlog();
  }, [prefillBlogId]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        const email = data?.session?.user?.email || '';
        if (email) setEmailId(email);
      } catch {}
    };
    load();
  }, []);

  const handleSubmit = async () => {
    setError(null);
    if (!canSubmit) {
      setError("Please fill at least Company URL and Topic.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        company_url: companyUrl.trim(),
        topic: topic.trim(),
        brand_name: brandName.trim() || undefined,
        email_id: emailId.trim() || undefined,
      } as any;

      const res = await fetch("/api/write-blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to generate blog");
      }
      setBlogContent(data.blog || "");
      setSelectedId(data.id || null);
    } catch (e: any) {
      setError(e.message || "Request failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(blogContent || '');
    } catch {}
  };

  const downloadMarkdown = () => {
    const blob = new Blob([blogContent || ''], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (brandName?.trim() ? brandName.trim() + '-' : '') + 'blog.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full relative flex-col">
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">IntelliWrite Content Studio</h2>
              <p className="text-slate-500 mt-1">Generate SEO-AEO optimized, professional blog content tailored to your brand voice.</p>
            </div>
          </div>

          {/* Configuration Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Blog Parameters
              </h3>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="ugc-company-url" className="text-xs font-bold text-slate-700 uppercase tracking-wide">Company URL <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Globe className="w-4 h-4" />
                      </div>
                      <Input 
                        id="ugc-company-url" 
                        placeholder="https://example.com" 
                        value={companyUrl} 
                        onChange={e=>setCompanyUrl(e.target.value)} 
                        className="pl-10 bg-slate-50 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ugc-brand-name" className="text-xs font-bold text-slate-700 uppercase tracking-wide">Brand Name</Label>
                    <div className="relative">
                       <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                       </div>
                       <Input 
                         id="ugc-brand-name" 
                         placeholder="e.g., Acme Corp" 
                         value={brandName} 
                         onChange={e=>setBrandName(e.target.value)}
                         className="pl-10 bg-slate-50 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
                       />
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-5">
                   <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ugc-topic" className="text-xs font-bold text-slate-700 uppercase tracking-wide">Topic <span className="text-red-500">*</span></Label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 font-medium transition-colors"
                        onClick={handleSuggest}
                        disabled={suggestingTopics}
                      >
                        {suggestingTopics ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Sparkles className="w-3 h-3 mr-1.5" />}
                        Suggest Topics
                      </Button>
                    </div>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                      </div>
                      <Input 
                        id="ugc-topic" 
                        placeholder="Enter a topic for your blog post..." 
                        value={topic} 
                        onChange={e=>setTopic(e.target.value)}
                        className="pl-10 bg-slate-50 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    {suggestedTopics.length > 0 && (
                      <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">AI Suggestions</p>
                        <div className="flex flex-wrap gap-2">
                          {suggestedTopics.slice(0, 5).map((t, i) => (
                            <button
                              key={i}
                              className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs rounded-lg border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 transition-all text-left shadow-sm"
                              onClick={() => setTopic(t)}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ugc-email-id" className="text-xs font-bold text-slate-700 uppercase tracking-wide">Notification Email</Label>
                    <div className="relative">
                       <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                       </div>
                       <Input 
                         id="ugc-email-id" 
                         value={emailId} 
                         disabled 
                         className="pl-10 bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
                       />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
                 {error ? (
                   <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md border border-red-100 w-full sm:w-auto">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     {error}
                   </div>
                 ) : <div></div>}
                 
                 <Button 
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all px-8 py-2 h-10 font-semibold" 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || !canSubmit}
                 >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Crafting Content...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Blog Post
                      </>
                    )}
                 </Button>
              </div>
            </div>
          </div>

          {/* Editor Area */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
             {/* Toolbar */}
             <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
               <div className="flex items-center gap-2">
                 <span className="text-sm font-semibold text-slate-700">Editor</span>
                 {selectedId && <span className="px-2 py-0.5 text-[10px] bg-green-100 text-green-700 rounded-full border border-green-200 font-medium">Saved</span>}
               </div>
               
               <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard} className="h-8 text-xs bg-white hover:bg-slate-50 border-slate-200 text-slate-700">
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadMarkdown} className="h-8 text-xs bg-white hover:bg-slate-50 border-slate-200 text-slate-700">
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download .md
                  </Button>
                  <Button size="sm" onClick={async () => {
                    if (!selectedId) return;
                    const res = await fetch('/api/write-blog/update', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: selectedId, company_url: companyUrl, brand_name: brandName || null, topic: topic || null, blog: blogContent })
                    });
                    const data = await res.json();
                    if (res.ok) {
                      // success toast could go here
                    } else {
                      console.error('Failed to save', data?.error);
                    }
                  }} className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white border-slate-900">
                    Save Changes
                  </Button>
               </div>
             </div>

             {/* Textarea */}
             <div className="flex-1 relative bg-white">
               {blogContent ? (
                 <textarea
                   id="ugc-editor"
                   className="w-full h-full p-6 resize-none focus:outline-none font-mono text-sm text-slate-800 leading-relaxed"
                   placeholder="Generated blog content will appear here..."
                   value={blogContent}
                   onChange={(e) => setBlogContent(e.target.value)}
                   spellCheck={false}
                 />
               ) : (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 select-none">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                      <Sparkles className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-sm font-medium">Ready to create content</p>
                    <p className="text-xs mt-1">Fill in the details above and hit Generate</p>
                 </div>
               )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function BrandMonitorPageContent() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandProfileIdFromQuery = searchParams.get("brandId");
  const blogIdFromQuery = searchParams.get("blogId");
  const analysisIdFromQuery = searchParams.get("analysisId");
  const viewMode = searchParams.get("view");
  const urlFromQuery = searchParams.get("url");

  // tabs: 'brand' | 'aeo' | 'files' | 'ugc'
  const [activeTab, setActiveTab] = useState<"brand" | "aeo" | "files" | "ugc">(
    "brand"
  );
  const [prefillAeo, setPrefillAeo] = useState<{ url: string; customerName: string; competitors?: any[] } | null>(null);
  const [prefillBrand, setPrefillBrand] = useState<{ url: string; customerName: string } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<FilesTabPrefill | null>(null);
  const [prefillUgc, setPrefillUgc] = useState<{ url: string; brandName: string } | null>(null);
  const [appliedBrandPrefill, setAppliedBrandPrefill] = useState<string | null>(null);
  const [currentBrand, setCurrentBrand] = useState<{ id: string; name: string; logo?: string } | null>(null);

  // Handle URL query param for "Create New" flow
  useEffect(() => {
    if (urlFromQuery && viewMode === 'new') {
      setPrefillBrand({ 
        url: urlFromQuery, 
        customerName: "autouser" 
      });
    }
  }, [urlFromQuery, viewMode]);

  // Auto-select tab from hash or params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#','');
      if (hash === 'files') setActiveTab('files');
      if (hash === 'aeo') setActiveTab('aeo');
      if (hash === 'brand') setActiveTab('brand');
      if (hash === 'ugc') setActiveTab('ugc');
      
      if (blogIdFromQuery) setActiveTab('ugc');
    }
  }, [blogIdFromQuery]);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (!session || !brandProfileIdFromQuery) return;
    if (appliedBrandPrefill === brandProfileIdFromQuery) return;

    let isCancelled = false;

    const hydrateFromBrandProfile = async () => {
      try {
        const response = await fetch(`/api/brands/${brandProfileIdFromQuery}`);
        if (!response.ok) {
          console.error(`[BrandMonitor] Failed to fetch brand profile ${brandProfileIdFromQuery}`);
          return;
        }
        const data = await response.json();
        if (isCancelled) return;

        const brandRecord = data?.brand;
        if (!brandRecord?.url) return;

        setCurrentBrand({
            id: brandRecord.id,
            name: brandRecord.name,
            logo: brandRecord.logo
        });

        const scrapedCompetitors = Array.isArray(brandRecord?.scrapedData?.competitors)
          ? brandRecord.scrapedData.competitors
              .map((entry: any) => {
                const name = typeof entry === "string" ? entry : entry?.name;
                if (!name) return null;
                return {
                  name,
                  url: assignUrlToCompetitor(name)
                };
              })
              .filter((c: any) => Boolean(c))
          : [];

        setPendingFiles({
          url: brandRecord.url,
          customerName: brandRecord.name,
          industry: brandRecord.industry,
          competitors: scrapedCompetitors.map((c: any) => c.name), // FilesTab still expects strings
        });
        setPrefillUgc({
          url: brandRecord.url,
          brandName: brandRecord.name,
        });
        setPrefillBrand({
          url: brandRecord.url,
          customerName: brandRecord.name,
        });
        // Pass full objects to AEO prefill logic if needed, but setPrefillAeo is not called here directly.
        // We need to store it in a way that AeoReportTab can use if we auto-switch.
        
        // Wait, prefillAeo is local state. We only set it via handleOpenAeoForUrl.
        // But we want to pre-populate it?
        // Actually, AeoReportTab uses `prefill` prop.
        // `prefillAeo` is state.
        // If the user manually navigates, `prefillAeo` is null.
        // If we want to support `competitors` in `AeoReportTab`, we need to update `handleOpenAeoForUrl` usage or hydration.
        
        // Let's just update setPendingFiles to use scrapedCompetitors names as before (to avoid breaking FilesTab),
        // BUT ALSO update `handleOpenAeoForUrl` call sites if any.
        // But wait, hydration doesn't set `prefillAeo`.
        // If we want `AeoReportTab` to have competitors from hydration, we need to set it.
        // The current code doesn't set `prefillAeo` on hydration. It just sets `pendingFiles`, `prefillUgc`, `prefillBrand`.
        // So `AeoReportTab` won't have competitors populated from brand profile unless we explicitly set it.
        
        setPrefillAeo({
            url: brandRecord.url,
            customerName: brandRecord.name,
            competitors: scrapedCompetitors
        });

        setAppliedBrandPrefill(brandProfileIdFromQuery);

        // Respect hash or params if present
        if (blogIdFromQuery) {
          setActiveTab("ugc");
        } else if (typeof window !== 'undefined') {
          const h = window.location.hash;
          if (h === '#files') setActiveTab("files");
          else if (h === '#ugc') setActiveTab("ugc");
          else if (h === '#aeo') setActiveTab("aeo");
          else setActiveTab("brand");
        } else {
          setActiveTab("brand");
        }
      } catch (err) {
        console.error("[BrandMonitor] Unable to hydrate Files tab from brand profile", err);
      }
    };

    hydrateFromBrandProfile();

    return () => {
      isCancelled = true;
    };
  }, [appliedBrandPrefill, brandProfileIdFromQuery, session, blogIdFromQuery]);

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access the brand monitor</p>
        </div>
      </div>
    );
  }

        const handleOpenAeoForUrl = (url: string, customerName?: string, competitors?: any[]) => {
    setPrefillAeo({ url, customerName: (customerName && customerName.trim()) ? customerName : "autouser", competitors });
    setActiveTab("aeo");
  };
  const handleOpenFilesForUrl = (payload: FilesTabPrefill) => {
    if (!payload?.url) return;
    setPendingFiles({
      url: payload.url,
      customerName: payload.customerName && payload.customerName.trim() ? payload.customerName : "autouser",
      industry: payload.industry,
      competitors: payload.competitors,
    });
    setActiveTab("files");
  };

  const isBrandTab = activeTab === "brand";

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden bg-grid-zinc-100">
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-blob" />
          <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
      </div>
      
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {currentBrand && (
            <div className="absolute top-4 left-4 sm:left-6 lg:left-8 z-50">
                <Link 
                    href={`/brand-profiles/${currentBrand.id}`} 
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-all bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200/60 hover:bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Profile
                </Link>
            </div>
        )}
        <div className="mt-12"> {/* Add margin top to prevent overlap with the absolute button */}
        {activeTab === "brand" && (
          <BrandMonitorContent 
            session={session} 
            onOpenAeoForUrl={handleOpenAeoForUrl} 
            onOpenFilesForUrl={handleOpenFilesForUrl} 
            prefillBrand={prefillBrand} 
            initialAnalysisId={analysisIdFromQuery}
            forceNew={viewMode === 'new'}
          />
        )}
        {activeTab === "aeo" && <AeoReportTab prefill={prefillAeo} onOpenBrandForUrl={(url, customerName, competitors) => { setPrefillBrand({ url, customerName: (customerName && customerName.trim()) ? customerName : "autouser" }); setActiveTab("brand"); }} onOpenFilesForUrl={handleOpenFilesForUrl} />}
        {activeTab === "files" && (
          <FilesTab prefill={pendingFiles} />
        )}
        {activeTab === "ugc" && (
          <UGCTab prefill={prefillUgc} prefillBlogId={blogIdFromQuery} />
        )}
        </div>
      </div>
    </div>
  );
}

export default function BrandMonitorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    }>
      <BrandMonitorPageContent />
    </Suspense>
  );
}


