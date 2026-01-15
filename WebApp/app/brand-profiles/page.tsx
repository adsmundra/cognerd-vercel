'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Search, Trash2, ExternalLink, Globe, MapPin, Building2, ChevronDown, Check } from 'lucide-react';
import Link from 'next/link';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface BrandProfile {
  id: string;
  name: string;
  url: string;
  industry: string;
  location: string;
  email?: string;
  logo?: string;
  favicon?: string;
  description?: string;
  isScraped?: boolean;
  creatorEmail?: string;
}

export default function BrandProfilesPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [industrySearch, setIndustrySearch] = useState('');
  const [isIndustryOpen, setIsIndustryOpen] = useState(false);
  const [industries, setIndustries] = useState<string[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<BrandProfile[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    industry: '',
    location: '',
    email: '',
    competitors: '',
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch brands from database on mount
  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/brands');

      if (response.status === 401) {
        setBrands([]);
      } else if (!response.ok) {
        throw new Error('Failed to fetch brands');
      } else {
        const data = await response.json();
        setBrands(data.brands || []);
      }
    } catch (err) {
      console.error('Error fetching brands:', err);
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (brands.length > 0) {
      const uniqueIndustries = Array.from(new Set(brands.map(b => b.industry))).sort();
      setIndustries(uniqueIndustries);
    }
  }, [brands]);

  useEffect(() => {
    let result = brands;

    // Filter by industry
    if (selectedIndustry !== 'All') {
      result = result.filter(brand => brand.industry === selectedIndustry);
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (brand) =>
          brand.name.toLowerCase().includes(query) ||
          brand.industry.toLowerCase().includes(query) ||
          brand.url.toLowerCase().includes(query) ||
          brand.location.toLowerCase().includes(query)
      );
    }

    setFilteredBrands(result);
  }, [searchQuery, selectedIndustry, brands]);

  const handleDelete = (brandId: string, brandName: string) => {
    setBrandToDelete({ id: brandId, name: brandName });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!brandToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/brands/${brandToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete brand');
      }
      setBrands(brands.filter((b) => b.id !== brandToDelete.id));
      setFilteredBrands(filteredBrands.filter((b) => b.id !== brandToDelete.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete brand');
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setBrandToDelete(null);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.url || !formData.industry || !formData.location) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          url: formData.url,
          industry: formData.industry,
          location: formData.location,
          email: formData.email || null,
        }),
      });

      if (response.status === 401) {
        throw new Error('You must be logged in to create a brand');
      } else if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to create brand`);
      } else {
        const data = await response.json();
        setBrands([...brands, data.brand]);
      }

      setFormData({
        name: '',
        url: '',
        industry: '',
        location: '',
        email: '',
        competitors: '',
      });
      setShowAddModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create brand');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDomainColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-violet-500', 'bg-indigo-500', 'bg-sky-500',
      'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500', 'bg-rose-500'
    ];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((word) => word[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-slate-50/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-500 font-medium animate-pulse">Loading your brands...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 relative overflow-hidden bg-grid-zinc-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-blob" />
          <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-10">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-slate-200 pb-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Brand Profiles</h1>
            <p className="text-lg text-slate-500 max-w-2xl">
              Manage your brand assets, monitor presence, and analyze competitors all in one place.
            </p>
          </div>
          {brands.length > 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-sm shadow-blue-600/20 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              New Brand
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {error}
          </div>
        )}

        {/* Search & Filters */}
        {brands.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm hover:shadow-md"
              />
            </div>
            
            <div className="min-w-[250px]">
              <Popover open={isIndustryOpen} onOpenChange={setIsIndustryOpen}>
                <PopoverTrigger asChild>
                  <button
                    role="combobox"
                    aria-expanded={isIndustryOpen}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm hover:shadow-md text-left"
                  >
                    <span className={cn("block truncate", selectedIndustry === 'All' && "text-slate-500")}>
                      {selectedIndustry === 'All' ? 'All Industries' : selectedIndustry}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0 bg-white" align="start">
                  <div className="p-2 border-b border-slate-100">
                    <input
                      type="text"
                      placeholder="Search industry..."
                      value={industrySearch}
                      onChange={(e) => setIndustrySearch(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                    <div
                      className={cn(
                        "relative flex cursor-pointer select-none items-center rounded-lg px-2 py-2 text-sm outline-none transition-colors hover:bg-slate-100",
                        selectedIndustry === 'All' ? "text-blue-600 bg-blue-50 font-medium" : "text-slate-700"
                      )}
                      onClick={() => {
                        setSelectedIndustry('All');
                        setIsIndustryOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedIndustry === 'All' ? "opacity-100" : "opacity-0"
                        )}
                      />
                      All Industries
                    </div>
                    {industries
                      .filter((industry) =>
                        industry.toLowerCase().includes(industrySearch.toLowerCase())
                      )
                      .map((industry) => (
                        <div
                          key={industry}
                          className={cn(
                            "relative flex cursor-pointer select-none items-center rounded-lg px-2 py-2 text-sm outline-none transition-colors hover:bg-slate-100",
                            selectedIndustry === industry ? "text-blue-600 bg-blue-50 font-medium" : "text-slate-700"
                          )}
                          onClick={() => {
                            setSelectedIndustry(industry);
                            setIsIndustryOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedIndustry === industry ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {industry}
                        </div>
                      ))}
                      {industries.filter(i => i.toLowerCase().includes(industrySearch.toLowerCase())).length === 0 && (
                        <div className="py-6 text-center text-sm text-slate-500">
                          No industry found.
                        </div>
                      )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {/* Content Grid */}
        {brands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-300 rounded-3xl">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
              <Plus className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Add a New Brand</h2>
            <p className="text-slate-500 text-center max-w-md mb-8">
              Get started by adding your first brand profile. We'll help you track its performance and visibility across AI platforms.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-600/30 transition-all duration-200 hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Create Brand Profile
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBrands.map((brand) => (
              <div
                key={brand.id}
                className="group relative bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="relative">
                    {brand.logo ? (
                      <img
                        src={brand.logo}
                        alt={brand.name}
                        className="w-16 h-16 rounded-2xl object-contain bg-slate-50 border border-slate-100 p-2"
                      />
                    ) : (
                      <div className={`w-16 h-16 ${getDomainColor(brand.name)} rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-inner`}>
                        {getInitials(brand.name)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(brand.id, brand.name);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-all p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    title="Delete Brand"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Card Body */}
                <div className="space-y-4 mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {brand.name}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5 mt-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {brand.industry}
                    </p>
                    {brand.creatorEmail && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 mt-2">
                        Created by: {brand.creatorEmail}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      <MapPin className="w-3 h-3 mr-1" />
                      {brand.location}
                    </span>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                  <a
                    href={brand.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-blue-600 transition-colors truncate max-w-[50%]"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span className="truncate">{brand.url.replace(/^https?:\/\//, '')}</span>
                  </a>
                  
                  <button
                    onClick={() => router.push(`/brand-profiles/${brand.id}`)}
                    className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold shadow-sm shadow-blue-600/20 transition-all duration-200 hover:scale-105 active:scale-95 text-sm"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-panel-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">New Brand Profile</h2>
                <p className="text-sm text-slate-500 mt-1">Add details about the brand you want to monitor.</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto">
              <form onSubmit={handleAddBrand} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Brand Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="e.g. Acme Corp"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Website URL <span className="text-red-500">*</span></label>
                    <input
                      type="url"
                      name="url"
                      value={formData.url}
                      onChange={handleFormChange}
                      placeholder="https://..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Industry <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="industry"
                      value={formData.industry}
                      onChange={handleFormChange}
                      placeholder="e.g. SaaS"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Location <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleFormChange}
                      placeholder="e.g. New York, NY"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Email (Optional)</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder="contact@example.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Competitors (Optional)</label>
                  <textarea
                    name="competitors"
                    value={formData.competitors}
                    onChange={handleFormChange}
                    placeholder="Enter competitor names, separated by commas"
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none"
                  />
                </div>

                {/* Modal Footer */}
                <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-2.5 bg-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Brand'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Brand Profile"
        description={`Are you sure you want to delete "${brandToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Brand"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
