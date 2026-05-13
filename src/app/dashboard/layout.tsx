'use client';

import React from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="h-full px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
