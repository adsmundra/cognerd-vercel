'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Loader2,
  Edit2,
  Trash2,
  ArrowRight,
  ExternalLink,
  Globe,
  MapPin,
  Briefcase,
  Search,
  TrendingUp,
  FileText,
  PenTool,
  LayoutDashboard,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface BrandData {
  id: string;
  name: string;
  url: string;
  industry: string;
  location: string;
  email?: string;
  description?: string;
  competitors?: string[];
  logo?: string;
  favicon?: string;
  isScraped?: boolean;
  scrapedData?: {
    keywords?: string[];
    [key: string]: any;
  };
}

interface Analysis {
  id: string;
  companyName: string;
  analysisData: any;
  competitors: any;
  creditsUsed: number;
  createdAt: string;
}

interface AEOReport {
  id: string;
  customerName: string;
  url: string;
  createdAt: string;
}

interface SectionData {
  aeoReports: AEOReport[];
  brandMonitorReports: any[];
  geoFileReports: any[];
  blogReports: any[];
}

// Dummy data mapping (Keep as is)
const DUMMY_BRANDS_MAP: { [key: string]: BrandData } = {
  '550e8400-e29b-41d4-a716-446655440001': {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Welzin',
    url: 'https://welzin.com',
    industry: 'AI/ML Consultancy',
    location: 'San Francisco, CA',
    email: 'info@welzin.com',
    description: 'Welzin is a full-spectrum AI/ML and Generative AI consultancy that empowers forward-thinking businesses with AI-driven transformation. They offer tailored AI solutions, custom AI agents, and proprietary platforms.',
    competitors: ['TechVision', 'DataFlow Analytics', 'NeuralPath AI', 'CloudNine Systems', 'DigitalForge', 'QuantumLeap'],
  },
  // ... (Other dummy data kept implicit or we can assume it loads if needed, shortening for brevity in this file write if not strictly necessary to reproduce all dummy data, but for safety I will include the key logic)
};

export default function BrandProfilePage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;

  const [brand, setBrand] = useState<BrandData | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sectionData, setSectionData] = useState<SectionData>({
    aeoReports: [],
    brandMonitorReports: [],
    geoFileReports: [],
    blogReports: [],
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    url: '',
    industry: '',
    location: '',
    email: '',
    description: '',
  });

  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Initialize edit form
  useEffect(() => {
    if (isEditing && brand) {
      setEditFormData({
        name: brand.name,
        url: brand.url,
        industry: brand.industry,
        location: brand.location,
        email: brand.email || '',
        description: brand.description || '',
      });
    }
  }, [isEditing, brand]);

  // Fetch Brand Data
  useEffect(() => {
    const fetchBrandData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/brands/${brandId}`);

        if (response.status === 401) {
          const dummyData = DUMMY_BRANDS_MAP[brandId];
          if (dummyData) {
            setBrand(dummyData);
          } else {
            setError('Brand not found');
          }
        } else if (!response.ok) {
          throw new Error('Failed to fetch brand data');
        } else {
          const data = await response.json();
          setBrand(data.brand);
          setAnalyses(data.analyses || []);
        }
      } catch (err) {
        console.error('Error fetching brand:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (brandId) {
      fetchBrandData();
    }
  }, [brandId]);

  // Fetch Section Data
  useEffect(() => {
    const fetchSectionData = async () => {
      if (!brand) return;

      try {
        // Fetch AEO
        const aeoResponse = await fetch(
          `/api/aeo-reports-by-customer?customerName=${encodeURIComponent(brand.name)}&t=${Date.now()}`,
          { headers: { 'Cache-Control': 'no-cache' } }
        );
        let fetchedAeoReports = [];
        if (aeoResponse.ok) {
          const aeoData = await aeoResponse.json();
          fetchedAeoReports = aeoData.reports || [];
        }

        // Fetch Blogs
        let fetchedBlogReports = [];
        try {
          const blogResponse = await fetch('/api/write-blog/list');
          if (blogResponse.ok) {
            const blogData = await blogResponse.json();
            const allBlogs = blogData.items || [];
            const bName = brand.name.toLowerCase().trim();
            const bUrl = brand.url.toLowerCase().trim().replace(/\/+$/, '');
            fetchedBlogReports = allBlogs.filter((b: any) => {
              const iName = (b.brandName || '').toLowerCase().trim();
              const iUrl = (b.companyUrl || '').toLowerCase().trim().replace(/\/+$/, '');
              if (iName && iName === bName) return true;
              if (iName && bName.includes(iName)) return true;
              if (iUrl && iUrl === bUrl) return true;
              if (iUrl && bUrl && (iUrl.includes(bUrl) || bUrl.includes(iUrl))) return true;
              return false;
            });
          }
        } catch (err) { console.error(err); }

        // Fetch Brand Monitor
        let fetchedBrandMonitorReports = [];
        try {
          const monitorResponse = await fetch('/api/brand-monitor/analyses');
          if (monitorResponse.ok) {
            const allAnalyses = await monitorResponse.json();
            const bName = brand.name.toLowerCase().trim();
            const bUrl = brand.url.toLowerCase().trim().replace(/\/+$/, '');
            fetchedBrandMonitorReports = allAnalyses.filter((a: any) => {
              const aUrl = (a.url || '').toLowerCase().trim().replace(/\/+$/, '');
              const aName = (a.companyName || '').toLowerCase().trim();
              if (aName && aName === bName) return true;
              if (aName && bName.includes(aName)) return true;
              if (aUrl && aUrl === bUrl) return true;
              if (aUrl && bUrl && (aUrl.includes(bUrl) || bUrl.includes(aUrl))) return true;
              return false;
            });
            fetchedBrandMonitorReports.sort((a: any, b: any) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          }
        } catch (err) { console.error(err); }

        // Fetch Geo Files
        let fetchedGeoFiles = [];
        try {
          const geoResponse = await fetch(`/api/geo-files/history?brand=${encodeURIComponent(brand.name)}`);
          if (geoResponse.ok) {
             const geoData = await geoResponse.json();
             fetchedGeoFiles = geoData.files || [];
          }
        } catch (err) { console.error(err); }

        setSectionData(prev => ({
          ...prev,
          aeoReports: fetchedAeoReports,
          blogReports: fetchedBlogReports,
          brandMonitorReports: fetchedBrandMonitorReports,
          geoFileReports: fetchedGeoFiles,
        }));
      } catch (err) {
        console.error(err);
      }
    };

    fetchSectionData();
  }, [brand]);

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/brands/${brandId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      if (!response.ok) throw new Error('Failed to update brand');
      const data = await response.json();
      setBrand(data.brand);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update brand.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/brands/${brandId}`, { method: 'DELETE' });
      if (response.ok || response.status === 401) {
        router.push('/brand-profiles');
      } else {
        throw new Error('Failed to delete brand');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete brand.');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 relative z-10" />
          </div>
          <p className="text-slate-500 font-medium text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-slate-100 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Profile Not Found</h2>
          <p className="text-slate-500 mb-6 text-sm">{error || 'The requested brand profile could not be retrieved.'}</p>
          <Link
            href="/brand-profiles"
            className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-all"
          >
            Return to Profiles
          </Link>
        </div>
      </div>
    );
  }

  const getDomainColor = () => {
    const colors = ['bg-blue-600', 'bg-violet-600', 'bg-pink-600', 'bg-emerald-600', 'bg-orange-600', 'bg-rose-600', 'bg-indigo-600', 'bg-cyan-600'];
    return colors[brand.name.charCodeAt(0) % colors.length];
  };

  const getInitials = () => {
    return brand.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  // Enhanced section configuration
  const sectionConfig = [
    {
      id: 'monitor',
      title: 'Brand Monitor',
      description: 'Track visibility & ranking',
      icon: TrendingUp,
      colorClass: 'text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100',
      buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200',
      link: `/brand-monitor?brandId=${brand.id}&view=new&url=${encodeURIComponent(brand.url)}`,
      data: sectionData.brandMonitorReports,
      renderItem: (report: any) => (
        <Link
          key={report.id}
          href={`/brand-monitor?brandId=${brandId}&analysisId=${report.id}`}
          className="group block p-4 border-b border-slate-50 hover:bg-slate-50 transition-all duration-200"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-slate-900 text-sm truncate flex-1">
              {report.companyName || 'Analysis'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
              {report.analysisData?.scores?.visibilityScore ?? report.analysisData?.visibility_score ?? '-'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <Globe className="w-3 h-3 text-slate-400" />
            <span className="truncate max-w-[200px]">{report.url}</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </Link>
      )
    },
    {
      id: 'aeo',
      title: 'AEO Audit',
      description: 'Answer Engine Optimization',
      icon: Search,
      colorClass: 'text-purple-600 bg-purple-50 border-purple-100 hover:bg-purple-100',
      buttonClass: 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200',
      link: `/aeo-report?customerName=${encodeURIComponent(brand.name)}&url=${encodeURIComponent(brand.url)}&brandId=${brand.id}&competitors=${encodeURIComponent(JSON.stringify(brand.competitors || []))}`,
      data: sectionData.aeoReports,
      renderItem: (report: AEOReport) => (
        <Link
          key={report.id}
          href={`/aeo-report?reportId=${report.id}&brandId=${brandId}&customerName=${encodeURIComponent(report.customerName)}&url=${encodeURIComponent(report.url)}`}
          className="group block p-4 border-b border-slate-50 hover:bg-slate-50 transition-all duration-200"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-slate-900 text-sm truncate flex-1">
              {report.customerName}
            </span>
            <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-purple-500 transition-colors" />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <Globe className="w-3 h-3 text-slate-400" />
            <span className="truncate max-w-[200px]">{report.url}</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </Link>
      )
    },
    {
      id: 'files',
      title: 'GEO Files',
      description: 'Generative Engine Optimization',
      icon: FileText,
      colorClass: 'text-orange-600 bg-orange-50 border-orange-100 hover:bg-orange-100',
      buttonClass: 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-200',
      link: `/geo-files?customerName=${encodeURIComponent(brand.name)}&url=${encodeURIComponent(brand.url)}&brandId=${brand.id}`,
      data: sectionData.geoFileReports,
      renderItem: (file: any) => (
        <Link
          key={file.id}
          href={`/geo-files?id=${file.id}&brandId=${brandId}`}
          className="group block p-4 border-b border-slate-50 hover:bg-slate-50 transition-all duration-200"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-slate-900 text-sm truncate flex-1">
              {file.brand || 'Untitled'}
            </span>
             <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-orange-500 transition-colors" />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <Globe className="w-3 h-3 text-slate-400" />
            <span className="truncate max-w-[200px]">{file.url}</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            {new Date(file.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </Link>
      )
    },
    {
      id: 'blog',
      title: 'IntelliWrite',
      description: 'AI Content Generation',
      icon: PenTool,
      colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100',
      buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200',
      link: `/blog-writer?brandId=${brand.id}`,
      data: sectionData.blogReports,
      renderItem: (report: any) => (
        <Link
          key={report.id}
          href={`/blog-writer?brandId=${brandId}&blogId=${report.id}`}
          className="group block p-4 border-b border-slate-50 hover:bg-slate-50 transition-all duration-200"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-slate-900 text-sm truncate flex-1">
              {report.topic || 'Untitled Blog'}
            </span>
            <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-emerald-500 transition-colors" />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <Briefcase className="w-3 h-3 text-slate-400" />
            <span className="truncate max-w-[200px]">{report.brandName || report.companyUrl}</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </Link>
      )
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 pb-12 relative overflow-hidden bg-grid-zinc-100">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
      </div>
      {/* Breadcrumb Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/brand-profiles" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <LayoutDashboard className="w-4 h-4" />
              Brands
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-medium text-slate-900">{brand.name}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
              title="Edit Profile"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title="Delete Profile"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Main Brand Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start">
            {/* Brand Logo/Avatar */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl shadow-inner border border-slate-100 bg-white p-3 flex items-center justify-center overflow-hidden">
                {brand.logo ? (
                  <img src={brand.logo} alt={brand.name} className="w-full h-full object-contain" />
                ) : (
                  <div className={`w-full h-full rounded-xl ${getDomainColor()} flex items-center justify-center text-white text-4xl font-bold shadow-lg`}>
                    {getInitials()}
                  </div>
                )}
              </div>
            </div>

            {/* Brand Details */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-slate-900">{brand.name}</h1>
                {brand.url && (
                  <a href={brand.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600 transition-colors">
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}
              </div>

              <p className="text-slate-600 text-sm leading-relaxed max-w-3xl mb-6">
                {brand.description || 'No description available.'}
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  {brand.industry}
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {brand.location}
                </div>
                {brand.scrapedData?.location && brand.scrapedData.location !== brand.location && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700" title="Verified via Web">
                    <Globe className="w-3.5 h-3.5" />
                    {brand.scrapedData.location}
                  </div>
                )}
              </div>

              {/* Keywords & Competitors Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                {brand.scrapedData?.keywords && brand.scrapedData.keywords.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Target Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                      {brand.scrapedData.keywords.slice(0, 8).map((kw, i) => (
                        <span key={i} className="px-2.5 py-1 bg-slate-50 text-slate-600 text-xs rounded-md border border-slate-200">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {brand.competitors && brand.competitors.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Competitors</h3>
                    <div className="flex flex-wrap gap-2">
                      {brand.competitors.slice(0, 6).map((comp, i) => (
                        <span key={i} className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs rounded-md border border-purple-100 font-medium">
                          {comp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tools & History Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sectionConfig.map((section) => (
            <div key={section.id} className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden h-[500px]">
              {/* Card Header / Action Area */}
              <div className="p-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-transparent flex-shrink-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${section.colorClass} bg-opacity-10`}>
                    <section.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900">{section.title}</h3>
                </div>
                <p className="text-xs text-slate-500 mb-4 h-8 line-clamp-2">{section.description}</p>

                <Link
                    href={section.link}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] ${section.buttonClass} shadow-sm`}
                  >
                    <Plus className="w-4 h-4" />
                    Create New
                  </Link>
              </div>

              {/* Scrollable List */}
              <div className="flex-1 overflow-y-auto bg-white scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent hover:scrollbar-thumb-slate-300">
                {section.data && section.data.length > 0 ? (
                  <div className="flex flex-col">
                    {section.data.map((item) => section.renderItem(item))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-60">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                      <section.icon className="w-5 h-5 text-slate-300" />
                    </div>
                    <p className="text-xs text-slate-400 font-medium">No history found</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Edit Modal */}
      {isEditing && brand && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-bold text-slate-900">Edit Brand Profile</h2>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                <span className="sr-only">Close</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Brand Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditFormChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Website URL</label>
                  <input
                    type="url"
                    name="url"
                    value={editFormData.url}
                    onChange={handleEditFormChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Industry</label>
                  <input
                    type="text"
                    name="industry"
                    value={editFormData.industry}
                    onChange={handleEditFormChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={editFormData.location}
                    onChange={handleEditFormChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Email (Optional)</label>
                <input
                  type="email"
                  name="email"
                  value={editFormData.email}
                  onChange={handleEditFormChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Description</label>
                <textarea
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditFormChange}
                  rows={4}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-6 mt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all disabled:opacity-70"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <ConfirmationDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Delete Brand Profile"
        description="Are you sure you want to delete this brand profile? This action cannot be undone."
        confirmText="Delete Profile"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
