"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  Calendar,
  Users,
  Settings,
  LogOut,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, logout } = useAuthStore();

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { name: "My Meetings", icon: Video, href: "/dashboard/meetings" },
    { name: "Calendar", icon: Calendar, href: "/dashboard/calendar" },
    { name: "Profile", icon: User, href: "/dashboard/profile" },
    ...(user?.role === "admin"
      ? [{ name: "Admin", icon: ShieldCheck, href: "/admin" }]
      : []),
  ];

  const handleLogout = () => {
    if (onClose) onClose();
    logout();
    router.push("/login");
  };

  return (
    <>
      {/* Backdrop for Mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300 animate-in fade-in"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-border bg-white shadow-sm transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between px-6">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center cursor-pointer"
          >
            <Image
              src="/images/logo.png"
              alt="Patterson Cheney Logo"
              width={160}
              height={52}
              className="object-contain h-12 w-auto"
              priority
            />
          </Link>

          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-foreground/70 hover:bg-muted hover:text-primary"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/40 p-4">
          {token && (
            <>
              <Link
                href="/dashboard/profile"
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-all group"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black italic shadow-lg shadow-primary/5 group-hover:border-primary/40 transition-all">
                  {user?.name?.[0] || "U"}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {user?.name}
                  </p>
                  <p className="truncate text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    {user?.role}
                  </p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all uppercase tracking-tighter"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};
