"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Menu } from "lucide-react";
import Image from "next/image";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-border/40 bg-card/80 px-6 backdrop-blur-xl lg:hidden z-30">
          <Image
            src="/images/logo.png"
            alt="Patterson Cheney Logo"
            width={140}
            height={44}
            className="object-contain h-10 w-auto"
            priority
          />
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-xl p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all active:scale-95 border border-border"
            aria-label="Open Sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="h-full px-4 sm:px-6 lg:px-8 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
