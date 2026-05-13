'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Video, 
  Calendar, 
  Users, 
  Settings, 
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'My Meetings', icon: Video, href: '/dashboard/meetings' },
    { name: 'Schedule', icon: Calendar, href: '/dashboard/schedule' },
    ...(user?.role === 'admin' ? [{ name: 'Admin', icon: ShieldCheck, href: '/admin' }] : []),
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-slate-900/50 backdrop-blur-xl">
      <div className="flex h-16 items-center px-6">
        <span className="text-xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
          VMA Platform
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {user?.name?.[0] || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-2 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-slate-400 hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );
};
