'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCustomer } from '@/hooks/useAutumnCustomer';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Bell, Sparkles, LogOut, User, CreditCard, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Separate component that only renders when Autumn is available
function UserCredits() {
  const { customer } = useCustomer();
  const messageUsage = customer?.features?.messages;
  const remainingMessages = messageUsage ? (messageUsage.balance || 0) : 0;

  return (
    <div className="hidden md:flex items-center px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full shadow-sm">
      <Sparkles className="w-3.5 h-3.5 text-amber-500 mr-2" />
      <span className="text-xs font-semibold text-slate-700">{remainingMessages}</span>
      <span className="ml-1 text-xs text-slate-500">credits</span>
    </div>
  );
}

function NotificationBell() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: unreadCountData } = useQuery({
    queryKey: ['unreadNotificationsCount'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/unread-count');
      if (!res.ok) throw new Error('Failed to fetch unread count');
      const data = await res.json();
      return data.count;
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/list');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      return data.notifications;
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/notifications/mark-as-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to mark notification as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to mark all as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const unreadCount = unreadCountData || 0;
  const notificationsList = notificationsData || [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 shadow-xl border-slate-200 rounded-xl overflow-hidden" align="end">
        <div className="bg-white">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">Notifications</h4>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
              >
                {markAllAsReadMutation.isPending ? 'Marking...' : 'Mark all read'}
              </button>
            )}
          </div>
          <div className="max-h-[24rem] overflow-y-auto">
            {notificationsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No new notifications</p>
              </div>
            ) : (
              notificationsList.map((notification: any) => (
                <div
                  key={notification.id}
                  className={`flex items-start p-4 border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-blue-50/40' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-1 space-y-1">
                    <p className={`text-sm leading-snug ${!notification.read ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.read && (
                    <span className="ml-3 mt-1.5 h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Navbar() {
  const { data: session, isPending } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      setTimeout(() => {
        router.refresh();
        setIsLoggingOut(false);
      }, 100);
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center gap-8">
            <Link
              href="/brand-profiles"
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
            >
              <Image
                src="/firecrawl-logo-with-fire.png"
                alt="CogNerd"
                width={100}
                height={60}
                priority
                className="h-12 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {session && (
                <>
                  {/* <Link
                    href="/plans"
                    className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    Pricing
                  </Link> */}
                </>
              )}
            </nav>
          </div>

          {/* Right Actions Section */}
          <div className="flex items-center gap-4">
            {session && <UserCredits />}
            
            {session && (
              <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />
            )}

            {session && <NotificationBell />}

            {isPending ? (
              <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse" />
            ) : session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1 pr-2 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-slate-200">
                    <UserAvatar size="sm" className="h-8 w-8" />
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-slate-200 p-2">
                  <DropdownMenuLabel className="font-normal px-2 py-1.5">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-slate-900">{session.user.name}</p>
                      <p className="text-xs leading-none text-slate-500 truncate">{session.user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-100 my-1" />
                  <DropdownMenuItem asChild className="rounded-lg focus:bg-slate-50 cursor-pointer">
                    <Link href="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4 text-slate-500" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem asChild className="rounded-lg focus:bg-slate-50 cursor-pointer">
                    <Link href="/plans" className="flex items-center">
                      <CreditCard className="mr-2 h-4 w-4 text-slate-500" />
                      <span>Subscription</span>
                    </Link>
                  </DropdownMenuItem> */}
                  <DropdownMenuSeparator className="bg-slate-100 my-1" />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 h-9 px-5 shadow-sm hover:shadow-md"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
