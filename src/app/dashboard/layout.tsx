'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Menu } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-[#13225c]/30 bg-[#020512]/80 px-6 backdrop-blur-xl lg:hidden z-30">
          <div className="flex flex-col">
            <span className="text-sm font-black text-white uppercase italic tracking-tighter leading-none">
              Patterson Cheney
            </span>
            <span className="text-[8px] font-black text-primary uppercase tracking-[0.4em] mt-0.5">
              VMA Platform
            </span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-all active:scale-95 border border-white/5"
            aria-label="Open Sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="h-full px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
