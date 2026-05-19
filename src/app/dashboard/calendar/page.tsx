'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { calendarService } from '@/services/calendarService';
import { Button } from '@/components/ui/Button';
import { Calendar as CalendarIcon, RefreshCw, ExternalLink, CheckCircle2, AlertCircle, Video, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface CalendarEvent {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  meetingLink?: string;
  platform: string;
  participants: string[];
}

export default function CalendarPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isVideoMeeting = (link?: string) => {
    if (!link) return false;
    const lowerLink = link.toLowerCase();
    return lowerLink.includes('meet.google.com') ||
      lowerLink.includes('zoom.us') ||
      lowerLink.includes('teams.microsoft.com');
  };

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const response = await calendarService.getEvents();
      setEvents(response.data);
      setIsConnected(true);
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.data?.message?.includes('No calendar')) {
        setIsConnected(false);
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

  const handleConnect = async () => {
    try {
      const authUrl = await calendarService.getGoogleAuthUrl();
      window.location.href = authUrl;
    } catch (err) {
      alert('Failed to initialize Google connection.');
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
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
            Staff <span className="text-primary">Schedule</span>
          </h1>
          <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-xs mt-1">
            Google Calendar Integration
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isConnected ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                <CheckCircle2 className="h-3 w-3" />
                Linked to Google
              </div>
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                variant="outline"
                className="gap-2 border-white/5 bg-white/5"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            </>
          ) : (
            <Button onClick={handleConnect} className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Connect Google Calendar
            </Button>
          )}
        </div>
      </div>

      {/* Main content Area */}
      {!isConnected ? (
        <div className="glass p-12 rounded-3xl text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
          <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto border-2 border-primary/10 mb-2">
            <CalendarIcon className="h-10 w-10 text-primary opacity-40" />
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-black text-white uppercase">No Calendar Connected</h2>
            <p className="text-muted-foreground font-medium mt-2">
              Link your Patterson Cheney staff account to automatically ingest meetings into the VMA platform.
            </p>
          </div>
          <Button onClick={handleConnect} size="lg" className="px-10">
            Connect Now
          </Button>
        </div>
      ) : events.length === 0 ? (
        <div className="glass p-12 rounded-3xl text-center space-y-4">
          <p className="text-muted-foreground font-medium">No upcoming meetings found in your calendar.</p>
          <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
            Force Refresh
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">Upcoming Events ({events.length})</h3>
          </div>

          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event._id}
                className="glass-card p-6 rounded-2xl group border-white/5 hover-float flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex gap-6 items-start">
                  <div className="flex flex-col items-center justify-center bg-white/5 rounded-xl px-4 py-3 border border-white/5 min-w-[80px]">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                      {new Date(event.startTime).toLocaleDateString('en-AU', { month: 'short' })}
                    </span>
                    <span className="text-2xl font-black text-white leading-none">
                      {new Date(event.startTime).getDate()}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors mb-1">
                      {event.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                        {new Date(event.startTime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        {' - '}
                        {new Date(event.endTime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-black uppercase tracking-tighter">
                        {event.platform}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {event.meetingLink && (
                    <Button
                      variant="outline"
                      className="btn-primary-gradient gap-2 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300"
                      onClick={() => window.open(event.meetingLink, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Join Meeting / Calender
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
