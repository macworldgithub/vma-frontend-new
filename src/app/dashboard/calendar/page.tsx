'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { calendarService } from '@/services/calendarService';
import { Button } from '@/components/ui/Button';
import { RefreshCw, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

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

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </svg>
);

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
  const [activeTab, setActiveTab] = useState<'google' | 'microsoft'>('google');
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
        const provider = params.get('provider') === 'microsoft' ? 'Microsoft Teams' : 'Google Calendar';
        setSuccessMessage(`${provider} connected successfully!`);
        router.replace('/dashboard/calendar');
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    }
  }, [router]);

  const handleConnectGoogle = async () => {
    try {
      const authUrl = await calendarService.getGoogleAuthUrl();
      window.location.href = authUrl;
    } catch (err) {
      alert('Failed to initialize Google connection.');
    }
  };

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

  const isGoogleConnected = connectedProviders.includes('google');
  const isMicrosoftConnected = connectedProviders.includes('microsoft');
  
  const isCurrentTabConnected = activeTab === 'google' ? isGoogleConnected : isMicrosoftConnected;

  const filteredEvents = events.filter((event) => {
    const provider = event.provider || 'google';
    return provider === (activeTab === 'google' ? 'google' : 'microsoft');
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse font-medium uppercase tracking-widest text-xs">Accessing Calendar Data...</p>
      </div>
    );
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
            {activeTab === 'google' ? 'Google Calendar Integration' : 'Microsoft Teams Integration'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isCurrentTabConnected ? (
            <>
              {activeTab === 'google' ? (
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                  <CheckCircle2 className="h-3 w-3" />
                  Linked to Google
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                  <CheckCircle2 className="h-3 w-3" />
                  Linked to Teams
                </div>
              )}
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
              onClick={activeTab === 'google' ? handleConnectGoogle : handleConnectMicrosoft} 
              className={`gap-2 ${activeTab === 'microsoft' ? 'bg-[#464EB8] border-[#464EB8]/20 hover:bg-[#5b65e8]' : ''}`}
            >
              {activeTab === 'google' ? (
                <>
                  <GoogleIcon className="h-4 w-4" />
                  Connect Google Calendar
                </>
              ) : (
                <>
                  <MicrosoftIcon className="h-4 w-4" />
                  Connect Teams Calendar
                </>
              )}
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

      {/* Provider Tabs */}
      <div className="flex border-b border-border space-x-6">
        <button
          onClick={() => setActiveTab('google')}
          className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
            activeTab === 'google'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-primary'
          }`}
        >
          Google Calendar
        </button>
        <button
          onClick={() => setActiveTab('microsoft')}
          className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
            activeTab === 'microsoft'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-primary'
          }`}
        >
          Teams Calendar
        </button>
      </div>

      {/* Main content Area */}
      {!isCurrentTabConnected ? (
        <div className="glass-card p-12 rounded-3xl text-center space-y-6 relative overflow-hidden bg-card border-border">
          <div className={`absolute top-0 left-0 w-full h-1 ${activeTab === 'google' ? 'bg-blue-500/20' : 'bg-indigo-500/20'}`} />
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto border-2 mb-2 ${
            activeTab === 'google' ? 'bg-blue-500/5 border-blue-500/10' : 'bg-indigo-500/5 border-indigo-500/10'
          }`}>
            {activeTab === 'google' ? (
              <GoogleIcon className="h-10 w-10" />
            ) : (
              <div className="scale-120"><MicrosoftIcon className="h-8 w-8" /></div>
            )}
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-black text-foreground uppercase">
              {activeTab === 'google' ? 'Google Calendar' : 'Teams Calendar'} Not Connected
            </h2>
            <p className="text-muted-foreground font-medium mt-2">
              {activeTab === 'google'
                ? 'Link your Patterson Cheney staff account to automatically ingest meetings into the VMA platform.'
                : 'Link your Microsoft Teams staff account to automatically ingest Teams calendar meetings into the VMA platform.'}
            </p>
          </div>
          <Button 
            onClick={activeTab === 'google' ? handleConnectGoogle : handleConnectMicrosoft} 
            size="lg" 
            className={`px-10 ${activeTab === 'microsoft' ? 'bg-[#464EB8] border-[#464EB8]/20 hover:bg-[#5b65e8]' : ''}`}
          >
            Connect Now
          </Button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl text-center space-y-4 bg-card border-border">
          <p className="text-muted-foreground font-medium">
            No upcoming meetings found in your {activeTab === 'google' ? 'Google' : 'Teams'} calendar.
          </p>
          <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
            Force Refresh
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">
              Upcoming {activeTab === 'google' ? 'Google' : 'Teams'} Events ({filteredEvents.length})
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
                        {event.platform === 'teams' ? 'Microsoft Teams' : event.platform === 'google' ? 'Google Meet' : event.platform}
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
