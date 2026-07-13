'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { calendarService } from '@/services/calendarService';
import { Button } from '@/components/ui/Button';
import { RefreshCw, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { CalendarPageSkeleton } from '@/components/ui/skeletons/PageSkeletons';

interface CalendarEvent {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  meetingLink?: string;
  platform: string;
  participants: string[];
  provider?: string;
}

const MicrosoftIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 23 23" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="10.5" height="10.5" fill="#F25022" />
    <rect x="11.5" y="0" width="10.5" height="10.5" fill="#7FBA00" />
    <rect x="0" y="11.5" width="10.5" height="10.5" fill="#00A4EF" />
    <rect x="11.5" y="11.5" width="10.5" height="10.5" fill="#FFB900" />
  </svg>
);

export default function CalendarPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const response = await calendarService.getEvents();
      setEvents(response.data || []);

      const providers = response.connectedProviders || [];
      if (providers.length === 0 && response.data?.length > 0) {
        const detected = new Set<string>();
        response.data.forEach((evt: any) => {
          if (evt.provider === 'google' || evt.provider === 'microsoft') {
            detected.add(evt.provider);
          }
        });
        setConnectedProviders(Array.from(detected));
        setIsConnected(detected.size > 0);
      } else {
        setConnectedProviders(providers);
        setIsConnected(providers.length > 0);
      }
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.data?.message?.includes('No calendar')) {
        setIsConnected(false);
        setConnectedProviders([]);
        setEvents([]);
      } else {
        setError('Failed to load calendar events.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('status') === 'success') {
        setSuccessMessage('Microsoft Teams connected successfully!');
        router.replace('/dashboard/calendar');
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    }
  }, [router]);

  const handleConnectMicrosoft = async () => {
    try {
      const authUrl = await calendarService.getMicrosoftAuthUrl();
      window.location.href = authUrl;
    } catch (err) {
      alert('Failed to initialize Microsoft connection.');
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await calendarService.syncCalendar();
      await fetchEvents();
    } catch (err) {
      alert('Sync failed. Please try again later.');
    } finally {
      setIsSyncing(false);
    }
  };

  const isMicrosoftConnected = connectedProviders.includes('microsoft');

  const filteredEvents = events.filter((event) => event.provider === 'microsoft');

  if (isLoading) {
    return <CalendarPageSkeleton />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter">
            Staff <span className="text-primary">Schedule</span>
          </h1>
          <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-xs mt-1">
            Microsoft Teams Integration
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isMicrosoftConnected ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                <CheckCircle2 className="h-3 w-3" />
                Linked to Teams
              </div>
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                variant="outline"
                className="gap-2 bg-white border-border text-foreground hover:bg-muted shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleConnectMicrosoft}
              className="gap-2 bg-[#464EB8] border-[#464EB8]/20 hover:bg-[#5b65e8]"
            >
              <MicrosoftIcon className="h-4 w-4" />
              Connect Teams Calendar
            </Button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between text-emerald-600 text-sm font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            {successMessage}
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Provider */}
      <div className="flex border-b border-border">
        <span className="pb-3 text-xs font-black uppercase tracking-widest border-b-2 border-primary text-primary">
          Teams Calendar
        </span>
      </div>

      {/* Main content Area */}
      {!isMicrosoftConnected ? (
        <div className="glass-card p-12 rounded-3xl text-center space-y-6 relative overflow-hidden bg-card border-border">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/20" />
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto border-2 mb-2 bg-indigo-500/5 border-indigo-500/10">
            <div className="scale-120"><MicrosoftIcon className="h-8 w-8" /></div>
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-black text-foreground uppercase">
              Teams Calendar Not Connected
            </h2>
            <p className="text-muted-foreground font-medium mt-2">
              Link your Microsoft Teams staff account to automatically ingest Teams calendar meetings into the VMA platform.
            </p>
          </div>
          <Button
            onClick={handleConnectMicrosoft}
            size="lg"
            className="px-10 bg-[#464EB8] border-[#464EB8]/20 hover:bg-[#5b65e8]"
          >
            Connect Now
          </Button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl text-center space-y-4 bg-card border-border">
          <p className="text-muted-foreground font-medium">
            No upcoming meetings found in your Teams calendar.
          </p>
          <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
            Force Refresh
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">
              Upcoming Teams Events ({filteredEvents.length})
            </h3>
          </div>

          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <div
                key={event._id}
                className="glass-card p-6 rounded-2xl group border-border bg-card hover-float flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex gap-6 items-start">
                  <div className="flex flex-col items-center justify-center bg-muted rounded-xl px-4 py-3 border border-border min-w-[80px]">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                      {new Date(event.startTime).toLocaleDateString('en-AU', { month: 'short' })}
                    </span>
                    <span className="text-2xl font-black text-foreground leading-none">
                      {new Date(event.startTime).getDate()}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-1">
                      {event.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                        {new Date(event.startTime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        {' - '}
                        {new Date(event.endTime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-black uppercase tracking-tighter">
                        {event.platform === 'teams' ? 'Microsoft Teams' : event.platform}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {event.meetingLink && (
                    <Button
                      variant="outline"
                      className="gap-2 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300 bg-white"
                      onClick={() => window.open(event.meetingLink, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Join Meeting / Calendar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
