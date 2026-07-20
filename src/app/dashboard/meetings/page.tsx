'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Video, Search, SlidersHorizontal, Clock, ArrowLeft,
  Copy, Check, ExternalLink, XCircle, CheckCircle2,
  MessageSquare, CalendarDays, Trash2, Shield, Calendar,
  Play, Users, Lock, Unlock, Sparkles, Send, UserCheck,
  Plus, BrainCircuit,
  FileDown, RefreshCw
} from 'lucide-react';
import { meetingService, Meeting } from '@/services/meetingService';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { MeetingsPageSkeleton } from '@/components/ui/skeletons/PageSkeletons';

export default function MyMeetingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'SCHEDULED' | 'ENDED' | 'CANCELLED'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Historical Chat Drawer States
  const [activeChatSession, setActiveChatSession] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'chat' | 'summary'>('summary');
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    setIsLoading(true);
    try {
      const data = await meetingService.getMyMeetings();
      setMeetings(data);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleStartSession = async (meeting: Meeting) => {
    try {
      await meetingService.startMeeting(meeting._id);
      if (meeting.provider !== 'vma' && meeting.meetingLink) {
        window.open(meeting.meetingLink, '_blank');
      } else {
        router.push(`/meeting/${meeting.meetingCode}/room`);
      }
    } catch (error) {
      console.error('Failed to start meeting:', error);
      alert('Could not start meeting. Please try again.');
    }
  };

  const handleCancelSession = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this meeting?')) return;
    try {
      await meetingService.cancelMeeting(id);
      fetchMeetings();
    } catch (error) {
      console.error('Failed to cancel meeting:', error);
      alert('Could not cancel meeting.');
    }
  };

  const loadChatHistory = async (meeting: Meeting) => {
    setActiveChatSession(meeting);
    setActiveDrawerTab('summary');
    setIsLoadingChat(true);
    try {
      const response = await meetingService.getChatHistory(meeting._id);
      setChatMessages(response.messages || []);
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
      setChatMessages([]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Filter Logic
  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch =
      (meeting.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (meeting.meetingCode || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || meeting.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Meeting['status']) => {
    switch (status) {
      case 'LIVE':
        return (
          <span className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/30 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            LIVE
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/30">
            <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            UPCOMING
          </span>
        );
      case 'ENDED':
        return (
          <span className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-black uppercase tracking-widest bg-muted text-muted-foreground border border-border">
            <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            COMPLETED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-black uppercase tracking-widest bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            CANCELLED
          </span>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).toUpperCase();
  };

  const formatTime = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleDownloadReport = async (meeting: Meeting) => {
    setDownloadingReportId(meeting._id);
    try {
      const blob = await meetingService.downloadMeetingReport(meeting._id);
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${meeting.title}-Report.pdf`;

      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to download meeting report.");
    } finally {
      setDownloadingReportId(null);
    }
  };

  return (
    <div className="space-y-10 pb-20 relative min-h-screen">

      {/* Premium Header Block */}
      <div className="relative overflow-hidden rounded-[24px] sm:rounded-[40px] bg-linear-to-br from-card via-secondary/40 to-secondary/80 border border-border p-6 sm:p-10 lg:p-14 shadow-md shadow-primary/5 animate-pulse-glow">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 blur-[130px] rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-accent/3 blur-[100px] rounded-full translate-y-1/3 -translate-x-1/4" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
          <div className="space-y-3 sm:space-y-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-black text-primary uppercase tracking-widest hover:text-primary/80 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              BACK TO YOUR DASHBOARD
            </Link>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground uppercase tracking-tighter leading-tight">
              SESSION <span className="text-primary">LOGS</span>
            </h1>
            <p className="text-xs sm:text-lg text-muted-foreground font-medium">
              Manage scheduled meetings, initialize sessions, and audit historical communication telemetry.
            </p>
          </div>

          {/* Quick Stats Panel */}
          <div className="flex w-full sm:w-auto gap-3 sm:gap-4">
            <div className="bg-card px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border border-border text-center flex-1 sm:flex-none min-w-0 sm:min-w-[120px] shadow-sm">
              <span className="text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-widest">Total Meetings</span>
              <p className="text-2xl sm:text-3xl font-black text-foreground mt-1">{meetings.length}</p>
            </div>
            <div className="bg-card px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border border-border text-center flex-1 sm:flex-none min-w-0 sm:min-w-[120px] shadow-sm">
              <span className="text-[8px] sm:text-[9px] font-black text-primary uppercase tracking-widest">Active Live</span>
              <p className="text-2xl sm:text-3xl font-black text-primary mt-1">
                {meetings.filter(m => m.status === 'LIVE').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Control / Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">

        {/* Search */}
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="SEARCH SESSIONS BY TITLE OR JOIN CODE..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-muted/40 border border-border rounded-xl sm:rounded-2xl pl-10 sm:pl-12 pr-4 sm:pr-6 py-3 sm:py-4 text-[10px] sm:text-xs font-black text-foreground placeholder:text-muted-foreground uppercase tracking-widest focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-300"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 sm:gap-2 items-center overflow-x-auto whitespace-nowrap pb-2 lg:pb-0 scrollbar-hide max-w-full">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground mr-2 hidden md:block flex-shrink-0" />
          {(['ALL', 'LIVE', 'SCHEDULED', 'ENDED', 'CANCELLED'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border text-[8px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex-shrink-0 ${statusFilter === filter
                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/20 hover:text-primary'
                }`}
            >
              {filter === 'ALL' ? 'ALL SESSIONS' : filter === 'ENDED' ? 'COMPLETED' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions Content */}
      {isLoading ? (
        <MeetingsPageSkeleton />
      ) : filteredMeetings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
          {filteredMeetings.map((meeting) => {
            const isHost = meeting.hostId === user?.id;
            let effectiveStatus = meeting.status;
            if (meeting.status !== "CANCELLED") {
              const now = Date.now();
              const startTime = meeting.startTime ? new Date(meeting.startTime).getTime() : now;
              const endTime = meeting.endTime ? new Date(meeting.endTime).getTime() : null;

              if (endTime && endTime < now) {
                effectiveStatus = "ENDED";
              } else if (startTime > now) {
                effectiveStatus = "SCHEDULED";
              }
            }

            return (
              <div
                key={meeting._id}
                className="glass-card group relative overflow-hidden rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 flex flex-col justify-between h-full min-h-[200px] sm:min-h-[220px]"
              >

                {/* Visual Status Indicator Line */}
                <div className={`absolute top-0 left-0 w-full h-[3px] opacity-35 group-hover:opacity-100 transition-opacity duration-300 ${effectiveStatus === 'LIVE' ? 'bg-primary shadow-[0_0_8px_var(--color-primary)]' :
                  effectiveStatus === 'SCHEDULED' ? 'bg-primary shadow-[0_0_8px_var(--color-primary)]' :
                    effectiveStatus === 'ENDED' ? 'bg-slate-500' : 'bg-rose-500'
                  }`} />

                <div className="space-y-4">
                  {/* Top Row: Date, Badge */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      <CalendarDays className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-accent" />
                      <span>{formatDate(meeting.startTime)}</span>
                    </div>
                    {getStatusBadge(effectiveStatus)}
                  </div>

                  {/* Meeting Title & Code */}
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-xl font-black uppercase text-foreground tracking-tight leading-tight group-hover:text-primary transition-colors duration-300">
                      {meeting.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] sm:text-[10px] font-black text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded tracking-widest font-mono">
                        {meeting.meetingCode || meeting.platform?.replace('_', ' ')?.toUpperCase() || 'EXTERNAL'}
                      </span>
                      <button
                        onClick={() => handleCopyCode(meeting.meetingCode, meeting._id)}
                        className="text-muted-foreground hover:text-primary transition-colors duration-200"
                        title="Copy Code"
                      >
                        {copiedId === meeting._id ? (
                          <Check className="h-3 w-3 text-primary" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Details and Actions */}
                <div className="flex items-center justify-between gap-4 mt-6 pt-5 border-t border-border">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-widest">
                    <Clock className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary" />
                    <span>{formatTime(meeting.startTime)}</span>
                  </div>

                  <div className="flex gap-2">

                    {/* View Chat Action for Completed Meetings */}
                    {effectiveStatus === "ENDED" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadReport(meeting)}
                          disabled={downloadingReportId === meeting._id}
                          className="rounded-lg sm:rounded-xl px-2.5 sm:px-3 h-8 sm:h-10 gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] font-black tracking-widest uppercase border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary"
                        >
                          {downloadingReportId === meeting._id ? (
                            <RefreshCw className="h-3 sm:h-3.5 w-3 sm:w-3.5 animate-spin" />
                          ) : (
                            <FileDown className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                          )}
                          REPORT
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => loadChatHistory(meeting)}
                          className="rounded-lg sm:rounded-xl px-2.5 sm:px-3 h-8 sm:h-10 gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] font-black tracking-widest uppercase border border-border bg-muted/50"
                        >
                          <MessageSquare className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                          TELEMETRY
                        </Button>
                      </>
                    )}

                    {/* Join / Start Actions */}
                    {effectiveStatus === 'LIVE' && (
                      meeting.provider !== 'vma' && meeting.meetingLink ? (
                        <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer">
                          <Button
                            variant="primary"
                            size="sm"
                            className="rounded-lg sm:rounded-xl px-3 sm:px-4 h-8 sm:h-10 gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] font-black tracking-widest uppercase shadow-lg shadow-primary/20 border-primary"
                          >
                            <Play className="h-3 sm:h-3.5 w-3 sm:w-3.5 fill-current" />
                            ENTER MEETING
                          </Button>
                        </a>
                      ) : (
                        <Link href={`/meeting/${meeting.meetingCode}`}>
                          <Button
                            variant="primary"
                            size="sm"
                            className="rounded-lg sm:rounded-xl px-3 sm:px-4 h-8 sm:h-10 gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] font-black tracking-widest uppercase shadow-lg shadow-primary/20 border-primary"
                          >
                            <Play className="h-3 sm:h-3.5 w-3 sm:w-3.5 fill-current" />
                            ENTER MEETING
                          </Button>
                        </Link>
                      )
                    )}

                    {effectiveStatus === 'SCHEDULED' && (
                      <>
                        {isHost ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelSession(meeting._id)}
                              className="rounded-lg sm:rounded-xl px-2 sm:px-3 h-8 sm:h-10 text-rose-600 border-rose-500/20 hover:bg-rose-500/10"
                              title="Cancel Session"
                            >
                              <Trash2 className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleStartSession(meeting)}
                              className="rounded-lg sm:rounded-xl px-3 sm:px-4 h-8 sm:h-10 gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] font-black tracking-widest uppercase shadow-lg shadow-primary/20"
                            >
                              <Play className="h-3 sm:h-3.5 w-3 sm:w-3.5 fill-current" />
                              ENTER MEETING
                            </Button>
                          </>
                        ) : (
                          meeting.provider !== 'vma' && meeting.meetingLink ? (
                            <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="rounded-lg sm:rounded-xl px-3 sm:px-4 h-8 sm:h-10 gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] font-black tracking-widest uppercase"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                LOBBY
                              </Button>
                            </a>
                          ) : (
                            <Link href={`/meeting/${meeting.meetingCode}`}>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="rounded-lg sm:rounded-xl px-3 sm:px-4 h-8 sm:h-10 gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] font-black tracking-widest uppercase"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                LOBBY
                              </Button>
                            </Link>
                          )
                        )}
                      </>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="glass-card px-10 py-16 rounded-[32px] border-border text-center flex flex-col items-center justify-center space-y-6 max-w-xl mx-auto shadow-md bg-card">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
            <Video className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">Lobby Queue Empty</h3>
            <p className="text-muted-foreground font-medium">
              No meetings found matching your filters. Ready to establish your next secure interactive session?
            </p>
          </div>
          <Link href="/dashboard">
            <Button className="rounded-xl gap-2 px-6 h-12 uppercase text-[10px] font-black tracking-widest">
              <Plus className="h-4 w-4" />
              CREATE SESSION
            </Button>
          </Link>
        </div>
      )}

      {/* Historical Telemetry / Chat History Slide-out Drawer */}
      {activeChatSession && (
        <div className="fixed inset-0 z-50 flex justify-end pointer-events-auto">
          {/* Overlay Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setActiveChatSession(null)}
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-lg bg-card border-l border-border h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-right duration-300">
            <div className="absolute top-0 right-0 w-full h-1 bg-primary shimmer" />

            {/* Drawer Header */}
            <div className="p-6 border-b border-border space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-accent uppercase tracking-widest">Communication Audits</span>
                  <h2 className="text-2xl font-bold uppercase text-foreground tracking-tight">{activeChatSession.title}</h2>
                </div>
                <button
                  onClick={() => setActiveChatSession(null)}
                  className="p-2 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-4 border-b border-border pt-2">
                <button
                  onClick={() => setActiveDrawerTab('summary')}
                  className={`pb-2 px-1 text-xs font-black uppercase tracking-widest transition-colors border-b-2 ${activeDrawerTab === 'summary' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  AI Intelligence
                </button>
                <button
                  onClick={() => setActiveDrawerTab('chat')}
                  className={`pb-2 px-1 text-xs font-black uppercase tracking-widest transition-colors border-b-2 ${activeDrawerTab === 'chat' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  Raw Telemetry
                </button>
              </div>

              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-[10px] font-black text-muted-foreground bg-muted px-2 py-0.5 rounded tracking-widest font-mono">
                  {activeChatSession.meetingCode}
                </span>
                <span className="text-[9px] font-black text-muted-foreground border border-border px-2 py-0.5 rounded-full">
                  ID: {activeChatSession._id.slice(-6).toUpperCase()}
                </span>
                <span className="text-[9px] font-black text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                  Secure Audited
                </span>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 min-h-[300px]">
              {activeDrawerTab === 'summary' ? (
                activeChatSession.summaryData ? (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Executive Summary */}
                    {activeChatSession.summaryData.executive_summary && (
                      <div className="space-y-2">
                        <h4 className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
                          <BrainCircuit className="h-4 w-4" />
                          Executive Summary
                        </h4>
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-sm leading-relaxed text-foreground">
                          {activeChatSession.summaryData.executive_summary}
                        </div>
                      </div>
                    )}
                    
                    {/* Action Items */}
                    {activeChatSession.summaryData.action_items && activeChatSession.summaryData.action_items.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-widest">
                          <CheckCircle2 className="h-4 w-4" />
                          Action Items
                        </h4>
                        <div className="space-y-2">
                          {activeChatSession.summaryData.action_items.map((item: any, idx: number) => (
                            <div key={idx} className="p-3 rounded-xl border border-border bg-card flex justify-between gap-4">
                              <span className="text-sm font-medium">{item.task}</span>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-[9px] font-black uppercase text-primary bg-primary/10 px-2 py-0.5 rounded">
                                  {item.assignee || 'Unassigned'}
                                </span>
                                {item.deadline && (
                                  <span className="text-[8px] font-black text-muted-foreground">{item.deadline}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Decisions */}
                    {activeChatSession.summaryData.key_decisions && activeChatSession.summaryData.key_decisions.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest">
                          <Sparkles className="h-4 w-4" />
                          Key Decisions
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-1">
                          {activeChatSession.summaryData.key_decisions.map((desc: string, idx: number) => (
                            <li key={idx}>{desc}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50 py-20">
                    <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center">
                      <BrainCircuit className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-foreground uppercase tracking-wider">No Summary Available</h4>
                      <p className="text-xs text-muted-foreground">The AI bot is processing or hasn't attended this meeting.</p>
                    </div>
                  </div>
                )
              ) : (
                /* Chat Telemetry */
                <>
                  {isLoadingChat ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col gap-2 max-w-[80%] even:ml-auto">
                          <div className="h-4 w-20 bg-muted rounded shimmer" />
                          <div className="h-12 w-64 bg-muted rounded-xl shimmer" />
                        </div>
                      ))}
                    </div>
                  ) : chatMessages.length > 0 ? (
                    chatMessages.map((msg, index) => {
                      const isUser = msg.userId === user?.id;

                      return (
                        <div
                          key={msg._id || index}
                          className={`flex flex-col max-w-[80%] ${isUser ? 'ml-auto items-end' : 'items-start'
                            }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                              {msg.userName}
                            </span>

                            <span className="text-[8px] text-muted-foreground font-mono">
                              {new Date(msg.sentAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div
                            className={`p-3.5 rounded-2xl text-sm border font-medium leading-relaxed ${isUser
                              ? 'bg-primary/10 border-primary/20 text-foreground rounded-tr-none'
                              : 'bg-muted/50 border-border text-foreground rounded-tl-none'
                              }`}
                          >
                            {msg.message}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50 py-20">
                      <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center">
                        <MessageSquare className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-foreground uppercase tracking-wider">No Messages Audited</h4>
                        <p className="text-xs text-muted-foreground">No chat messages were recorded in this room.</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Drawer Footer Stats */}
            <div className="p-6 border-t border-border bg-muted/20 space-y-2.5">
              <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                <span>Audited By</span>
                <span className="text-foreground font-bold">OMNISUITEAI PIPELINE</span>
              </div>
              <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                <span>Security Level</span>
                <span className="text-accent flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5" />
                  END-TO-END VERIFIED
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
