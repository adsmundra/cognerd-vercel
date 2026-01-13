'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { redirect, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Link as LinkIcon, 
  FileText, 
  Mail, 
  Calendar, 
  Hash, 
  Save,
  Loader2,
  Camera,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface UserProfile {
  id: string;
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserProfileData {
  profile: UserProfile | null;
  user: {
    id: string;
    email: string;
    name?: string;
    image?: string;
  };
}

export default function ProfilePage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    phone: '',
    avatarUrl: '',
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      redirect('/login');
    }
  }, [session, isPending]);

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      // Try sync (silent fail)
      try {
        await fetch('/api/auth/sync-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) { /* ignore */ }
      
      const response = await fetch('/api/user/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      
      const data = await response.json();
      setProfileData(data);
      
      if (data.profile) {
        setFormData({
          displayName: data.profile.displayName || '',
          bio: data.profile.bio || '',
          phone: data.profile.phone || '',
          avatarUrl: data.profile.avatarUrl || '',
        });
      } else if (data.user) {
        setFormData({
          displayName: data.user.name || '',
          bio: '',
          phone: '',
          avatarUrl: data.user.image || '',
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to update profile');

      setSuccess('Changes saved successfully');
      await fetchProfile();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
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

  if (!session?.user) return null;

  // Derived display values
  const displayAvatar = formData.avatarUrl || session.user.image;
  const displayInitials = (formData.displayName || session.user.name || session.user.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-slate-900 pb-20">
      {/* Decorative Header Background */}
      <div className="h-64 bg-gradient-to-b from-white to-[#F0F4FF] border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-between py-8">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/brand-profiles')}
            className="self-start pl-0 hover:bg-transparent hover:text-blue-600 text-slate-500 group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Back to Dashboard
          </Button>
          
          <div className="pb-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Account Settings</h1>
            <p className="text-slate-500 mt-1">Manage your personal details and workspace preferences.</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: User Card */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] rounded-2xl overflow-hidden bg-white">
              <div className="h-24 bg-slate-100 relative">
                <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
              </div>
              <CardContent className="relative pt-0 pb-8 px-6 text-center">
                <div className="relative -mt-12 mb-4 inline-block">
                  <div className="h-24 w-24 rounded-full ring-4 ring-white bg-white shadow-sm overflow-hidden relative flex items-center justify-center">
                    {displayAvatar ? (
                      <Image
                        src={displayAvatar}
                        alt="Profile"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-medium">
                        {displayInitials}
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-sm border border-slate-100 text-slate-400">
                    <Camera className="w-3 h-3" />
                  </div>
                </div>
                
                <h2 className="text-xl font-bold text-slate-900 mb-1">
                  {formData.displayName || session.user.name || 'User'}
                </h2>
                <p className="text-sm text-slate-500 mb-6">{session.user.email}</p>

                <div className="flex items-center justify-center gap-2">
                  <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100 flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3" />
                    Verified Account
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Info Card */}
            <Card className="border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] rounded-2xl bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">System Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-slate-400" /> User ID
                  </span>
                  <span className="font-mono text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">
                    {session.user.id.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" /> Member Since
                  </span>
                  <span className="text-slate-900 font-medium">
                    {profileData?.profile?.createdAt 
                      ? new Date(profileData.profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
                      : 'Just now'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Edit Form */}
          <div className="lg:col-span-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Public Profile Section */}
              <Card className="border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] rounded-2xl bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-50 bg-slate-50/30 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-900">Public Profile</CardTitle>
                      <CardDescription className="text-slate-500">Details visible to other users.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-slate-700 font-medium">Display Name</Label>
                    <Input
                      id="displayName"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleInputChange}
                      className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                      placeholder="e.g. Jane Doe"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-slate-700 font-medium">Bio</Label>
                    <textarea
                      id="bio"
                      name="bio"
                      rows={4}
                      value={formData.bio}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all resize-none focus:bg-white"
                      placeholder="Write a short bio about yourself..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatarUrl" className="text-slate-700 font-medium">Avatar Image URL</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="avatarUrl"
                        name="avatarUrl"
                        value={formData.avatarUrl}
                        onChange={handleInputChange}
                        className="h-11 pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                        placeholder="https://..."
                      />
                    </div>
                    <p className="text-xs text-slate-500">Leave blank to use your Google profile picture.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Private Details Section */}
              <Card className="border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] rounded-2xl bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-50 bg-slate-50/30 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-900">Contact Information</CardTitle>
                      <CardDescription className="text-slate-500">Private details used for notifications and billing.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <Input
                          id="email"
                          value={session.user.email}
                          disabled
                          className="h-11 pl-10 bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-slate-700 font-medium">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="h-11 pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Bar */}
              <div className="sticky bottom-6 flex items-center justify-between bg-white/80 backdrop-blur-lg p-4 rounded-2xl border border-white/20 shadow-lg shadow-slate-200/50">
                <div className="flex items-center gap-2">
                  {success && (
                    <span className="text-sm font-medium text-emerald-600 animate-in fade-in slide-in-from-left-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      {success}
                    </span>
                  )}
                  {error && (
                    <span className="text-sm font-medium text-red-600 animate-in fade-in slide-in-from-left-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      {error}
                    </span>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => window.location.reload()}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all px-8 rounded-xl"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}