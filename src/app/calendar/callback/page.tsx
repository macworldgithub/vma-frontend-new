'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { calendarService } from '@/services/calendarService';
import { Loader2 } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (!code || !state) {
        setError('Missing authorization data');
        return;
      }

      try {
        await calendarService.connectGoogle(code, state);
        router.push('/dashboard/calendar?status=success');
      } catch (err: any) {
        console.error('Calendar connection failed:', err);
        setError(err.response?.data?.message || 'Failed to connect Google Calendar');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <div className="glass p-8 rounded-2xl max-w-md w-full">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-destructive/20">
            <span className="text-destructive text-2xl font-black">!</span>
          </div>
          <h1 className="text-2xl font-black text-white uppercase mb-2">Connection Failed</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button 
            onClick={() => router.push('/dashboard/calendar')}
            className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary/90 transition-all uppercase"
          >
            Back to Calendar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="glass p-10 rounded-2xl max-w-md w-full relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary shimmer" />
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-6" />
        <h1 className="text-2xl font-black text-white uppercase mb-2">Connecting Account</h1>
        <p className="text-muted-foreground uppercase tracking-widest text-xs font-bold">
          Finalizing secure handshake with Google...
        </p>
      </div>
    </div>
  );
}

export default function CalendarCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
