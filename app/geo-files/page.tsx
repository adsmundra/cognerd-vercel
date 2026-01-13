'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileText, 
  Code, 
  Settings, 
  HelpCircle, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Bot,
  ChevronRight,
  Terminal,
  Play,
  Download,
  Search,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

type AssetType = "llm" | "schema" | "robots" | "faq";

interface GeoFile {
  id: string;
  brand: string;
  url: string;
  createdAt: string;
}

interface GeoFileDetails extends GeoFile {
  llms: string;
  site_schema: string;
  robots: string;
  faqs: string;
}

export default function GeoFilesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
      <GeoFilesContent />
    </Suspense>
  );
}

function GeoFilesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Prefill data from URL if available
  const prefillBrand = searchParams.get('customerName');
  const prefillUrl = searchParams.get('url');
  const paramFileId = searchParams.get('id');
  const brandId = searchParams.get('brandId');

  const [selectedFileId, setSelectedFileId] = useState<string | null>(paramFileId);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch Selected File Details
  const { data: fileDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['geo-file', selectedFileId],
    queryFn: async () => {
      if (!selectedFileId) return null;
      const res = await fetch(`/api/geo-files/${selectedFileId}`);
      if (!res.ok) throw new Error('Failed to fetch file details');
      const data = await res.json();
      return data.file as GeoFileDetails;
    },
    enabled: !!selectedFileId,
  });

  // Create New Mutation
  const createMutation = useMutation({
    mutationFn: async (data: { brand: string; url: string; competitors?: string[] }) => {
       const res = await fetch("/api/geo-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: data.url,
          brandName: data.brand,
          competitors: data.competitors || [],
          // Pass brandId if available to link the record to the brand profile
          brandId: brandId || undefined
        }),
      });
      if (!res.ok) {
         const err = await res.json();
         throw new Error(err.error || 'Failed to start generation');
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast.success('Generation started! You will be notified when files are ready.');
      if (data?.fileId) {
        setSelectedFileId(data.fileId);
      }
      setIsCreating(false);
      // Removed refetchHistory as sidebar is gone.
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to start generation');
    }
  });

  // Handle Create Form Submit
  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const brand = formData.get('brand') as string;
    const url = formData.get('url') as string;
    
    if (brand && url) {
      createMutation.mutate({ brand, url });
    }
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // If user came with params, maybe show create form automatically?
  useEffect(() => {
    if (prefillBrand && prefillUrl && !selectedFileId && !paramFileId) {
      setIsCreating(true);
    }
  }, [prefillBrand, prefillUrl, selectedFileId, paramFileId]);

  return (
    <div className="min-h-screen bg-slate-50 relative flex flex-col">
      
      {/* Background Decorative Elements (Consistent with other pages) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Back Button (Only visible when viewing a file or creating) */}
      <div className="absolute top-4 left-4 sm:left-6 lg:left-8 z-50">
        {brandId ? (
            <Link 
                href={`/brand-profiles/${brandId}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-all bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200/60 hover:bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Profile
            </Link>
        ) : (
             <Link 
                href={`/brand-profiles`}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-all bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200/60 hover:bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
            </Link>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 z-10 w-full">
        
        {isCreating ? (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up mt-12">
             {/* Back Button for Create Mode if context exists */}
             {brandId && (
                <div className="mb-4">
                     <Link 
                        href={`/brand-profiles/${brandId}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                     >
                        <ArrowLeft className="h-4 w-4" /> Back to Profile
                     </Link>
                </div>
             )}

             {prefillBrand && prefillUrl ? (
                /* Hero / Status Section (Restored from FilesTab) */
                <>
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 opacity-50 rounded-3xl -z-10" />
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-3xl p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                        
                        {/* Status Icon Ring */}
                        <div className="relative flex-shrink-0">
                            <div className={cn(
                                "w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-500",
                                createMutation.isError ? "bg-red-100 text-red-600" :
                                createMutation.isPending ? "bg-white text-blue-600 border-4 border-blue-50" : "bg-slate-100 text-slate-400"
                            )}>
                                {createMutation.isError ? <AlertCircle className="w-10 h-10" /> :
                                createMutation.isPending ? <Loader2 className="w-10 h-10 animate-spin" /> :
                                <Bot className="w-10 h-10" />}
                            </div>
                            {/* Pulse Ring */}
                            {createMutation.isPending && (
                                <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" />
                            )}
                        </div>

                        {/* Text Content */}
                        <div className="flex-1 text-center md:text-left space-y-2">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                                {createMutation.isError ? "Generation Failed" :
                                createMutation.isPending ? "Generating easy-to-deploy fixes to improve AI visibility…" :
                                "Ready to Generate"}
                            </h1>
                            <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
                                {createMutation.isError ? (createMutation.error as Error).message :
                                createMutation.isPending ? `Analyzing ${prefillBrand}'s profile, structuring schema data, and optimizing for LLM retrieval..` :
                                `Generate rapid fixes to optimize AI visibility for ${prefillBrand}.`}
                            </p>
                            
                            {!createMutation.isPending && !createMutation.isError && (
                                <div className="pt-2">
                                    <button 
                                        onClick={() => createMutation.mutate({ brand: prefillBrand, url: prefillUrl })}
                                        className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 transition-all hover:scale-105"
                                    >
                                        <Play className="w-5 h-5 mr-2 fill-current" />
                                        Start Generation
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Progress Line */}
                    {createMutation.isPending && (
                        <div className="absolute bottom-0 left-8 right-8 h-1 bg-slate-100 overflow-hidden rounded-full">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-indeterminate-bar" />
                        </div>
                    )}
                    </div>
                </div>

                {/* Preview Section */}
                <div className="animate-fade-in-up delay-100">
                    <h2 className="text-xl font-semibold text-slate-900 mb-6 px-1">Preview of Generated Files</h2>
                    <CreateFilePreview brand={prefillBrand} url={prefillUrl} />
                </div>
                </>
             ) : (
                /* Manual Form (Fallback) */
                <>
                    <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Generate Geo Files</h1>
                    <p className="text-slate-600">
                        Create optimized assets (LLM Context, Schema, Robots.txt, FAQ) for AI visibility.
                        The process takes about 10 minutes.
                    </p>
                    </div>

                    <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6">
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Brand Name</label>
                            <input 
                                name="brand" 
                                defaultValue={prefillBrand || ''}
                                required
                                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g. Acme Corp"
                            />
                            </div>
                            <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Website URL</label>
                            <input 
                                name="url" 
                                defaultValue={prefillUrl || ''}
                                required
                                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g. https://acme.com"
                            />
                            </div>
                            
                            <Button 
                            type="submit" 
                            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={createMutation.isPending}
                            >
                            {createMutation.isPending ? (
                                <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...
                                </>
                            ) : (
                                <>
                                <Play className="w-4 h-4 mr-2" /> Start Generation
                                </>
                            )}
                            </Button>
                        </form>
                    </CardContent>
                    </Card>
                </>
             )}
          </div>
        ) : selectedFileId && fileDetails ? (
           <div className="mt-12">
              <FileViewer file={fileDetails} />
           </div>
        ) : selectedFileId && isLoadingDetails ? (
           <div className="flex items-center justify-center h-full">
             <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
           </div>
        ) : (
           <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
             <div className="p-4 bg-slate-100 rounded-full">
                <FileText className="w-8 h-8" />
             </div>
             <p>Select a file from history or start a new generation.</p>
             <Button onClick={() => setIsCreating(true)} className="mt-4">
               <Play className="w-4 h-4 mr-2" /> Create New File
             </Button>
           </div>
        )}
      </div>
    </div>
  );
}

function FileViewer({ file }: { file: GeoFileDetails }) {
  const [activeAsset, setActiveAsset] = useState<AssetType>("llm");

  const getContent = () => {
    switch (activeAsset) {
      case 'llm': return file.llms;
      case 'schema': return file.site_schema;
      case 'robots': return file.robots;
      case 'faq': return file.faqs;
      default: return null;
    }
  };

  const getFilename = () => {
    switch (activeAsset) {
      case 'llm': return 'llm.txt';
      case 'schema': return 'schema.json';
      case 'robots': return 'robots.txt';
      case 'faq': return 'faq.txt';
    }
  };

  const rawContent = getContent();
  const isGenerating = !rawContent || (activeAsset === 'schema' && rawContent === '{}');

  const handleDownload = () => {
    if (isGenerating || !rawContent) return;
    const blob = new Blob([rawContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getFilename();
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up">
       <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{file.brand}</h1>
            <p className="text-slate-500 text-sm">
                {file.url} • {file.createdAt ? new Date(file.createdAt).toLocaleString() : 'Just now'}
            </p>
          </div>
          <div className="flex gap-3">
             <Button 
                onClick={handleDownload} 
                disabled={isGenerating}
                className={cn(
                    "transition-all",
                    isGenerating ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg"
                )}
             >
               <Download className="w-4 h-4 mr-2" /> Download {getFilename()}
             </Button>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tabs */}
          <div className="lg:col-span-3 space-y-2">
             <FileTab 
               active={activeAsset === "llm"} 
               onClick={() => setActiveAsset("llm")}
               icon={<FileText className="w-4 h-4" />}
               label="llm.txt" 
             />
             <FileTab 
               active={activeAsset === "schema"} 
               onClick={() => setActiveAsset("schema")}
               icon={<Code className="w-4 h-4" />}
               label="schema.json" 
             />
             <FileTab 
               active={activeAsset === "robots"} 
               onClick={() => setActiveAsset("robots")}
               icon={<Settings className="w-4 h-4" />}
               label="robots.txt" 
             />
             <FileTab 
               active={activeAsset === "faq"} 
               onClick={() => setActiveAsset("faq")}
               icon={<HelpCircle className="w-4 h-4" />}
               label="faq.txt" 
             />
          </div>

          {/* Editor/Viewer */}
          <div className="lg:col-span-9">
             <div className="bg-[#0f172a] rounded-xl shadow-lg border border-slate-800 overflow-hidden flex flex-col h-[400px]">
                <div className="bg-[#1e293b] px-4 py-2 border-b border-slate-700 flex items-center justify-between">
                   <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                   </div>
                   <span className="text-xs text-slate-400 font-mono">{getFilename()}</span>
                   <div className="w-8" />
                </div>
                <div className="flex-1 overflow-auto p-4 custom-scrollbar relative">
                   {isGenerating ? (
                       <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-3">
                           <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                           <p className="font-medium text-sm">Files are being generated...</p>
                           <p className="text-xs text-slate-500">This usually takes about 10-20 minutes.</p>
                       </div>
                   ) : (
                       <pre className="font-mono text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                         {rawContent}
                       </pre>
                   )}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

function CreateFilePreview({ brand, url }: { brand: string, url: string }) {
  const [activeAsset, setActiveAsset] = useState<AssetType>("llm");

  const getMockContent = (type: AssetType) => {
    switch (type) {
      case "llm":
        return `# ${brand} Context File
# Generated for Large Language Models

## Brand Identity
${brand} is a leading provider in the industry.
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
A: ${brand} is a company focused on innovation...

Q: How does ${brand} handle data security?
A: We adhere to strict enterprise security standards including SOC2...

Q: What is the pricing model?
A: We offer flexible tiers suitable for startups to enterprises...`;
    }
  };

  const getFilename = () => {
    switch (activeAsset) {
      case 'llm': return 'llm.txt';
      case 'schema': return 'schema.json';
      case 'robots': return 'robots.txt';
      case 'faq': return 'faq.txt';
    }
  };

  const content = getMockContent(activeAsset);

  return (
       <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tabs */}
          <div className="lg:col-span-3 space-y-2">
             <FileTab 
               active={activeAsset === "llm"} 
               onClick={() => setActiveAsset("llm")}
               icon={<FileText className="w-4 h-4" />}
               label="llm.txt" 
             />
             <FileTab 
               active={activeAsset === "schema"} 
               onClick={() => setActiveAsset("schema")}
               icon={<Code className="w-4 h-4" />}
               label="schema.json" 
             />
             <FileTab 
               active={activeAsset === "robots"} 
               onClick={() => setActiveAsset("robots")}
               icon={<Settings className="w-4 h-4" />}
               label="robots.txt" 
             />
             <FileTab 
               active={activeAsset === "faq"} 
               onClick={() => setActiveAsset("faq")}
               icon={<HelpCircle className="w-4 h-4" />}
               label="faq.txt" 
             />
          </div>

          {/* Editor/Viewer */}
          <div className="lg:col-span-9">
             <div className="bg-[#0f172a] rounded-xl shadow-lg border border-slate-800 overflow-hidden flex flex-col h-[400px]">
                <div className="bg-[#1e293b] px-4 py-2 border-b border-slate-700 flex items-center justify-between">
                   <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                   </div>
                   <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono italic">Preview: {getFilename()}</span>
                   </div>
                   <div className="w-8" />
                </div>
                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                   <pre className="font-mono text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                     {content}
                   </pre>
                </div>
             </div>
          </div>
       </div>
  );
}

function FileTab({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all",
        active 
          ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm" 
          : "bg-white text-slate-600 border border-transparent hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      {icon}
      {label}
      {active && <ChevronRight className="w-4 h-4 ml-auto" />}
    </button>
  );
}
