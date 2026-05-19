'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((state) => state.token);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Wait until store is hydrated from localStorage
    const checkHydration = () => {
      if (useAuthStore.persist.hasHydrated()) {
        setIsHydrated(true);
      } else {
        const unsub = useAuthStore.persist.onFinishHydration(() => {
          setIsHydrated(true);
        });
        return unsub;
      }
    };

    const unsub = checkHydration();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    // Define public routes that don't need auth (e.g. login, signup, etc.)
    const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-otp'];
    
    // Check if current route is public
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    // Redirect logic:
    // If not authenticated and trying to access a protected route (excluding home which redirects to login anyway)
    if (!token && !isPublicRoute && pathname !== '/') {
      router.push('/login');
    } 
    // If authenticated and trying to access a public route (like login)
    else if (token && isPublicRoute) {
      router.push('/dashboard');
    }
  }, [token, isHydrated, pathname, router]);

  // Prevent flash of protected/unprotected content during hydration
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] animate-pulse">
          Validating Security Credentials...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
