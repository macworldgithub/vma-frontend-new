'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Plus, Video, Calendar as CalendarIcon, Bot,
  RefreshCw, User, Shield, Activity, Users,
  Search, SlidersHorizontal, ChevronRight, ChevronDown, X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MeetingCard } from '@/components/dashboard/MeetingCard';
import { NewMeetingModal } from '@/components/dashboard/NewMeetingModal';
import { SummonBotModal } from '@/components/dashboard/SummonBotModal';
import { meetingService } from '@/services/meetingService';
import { useAuthStore } from '@/store/authStore';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { DashboardSkeleton } from '@/components/ui/skeletons/PageSkeletons';

const getEffectiveMeetingStatus = (meeting: any): 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED' => {
  const isBotDone = meeting.botStatus === 'done' || meeting.botStatus === 'fatal' || meeting.botStatus === 'call_ended';

  if (meeting.status === 'CANCELLED') {
    return 'CANCELLED';
  }

  if (meeting.status === 'ENDED' || isBotDone) {
    return 'ENDED';
  }

  const now = Date.now();
  const startTime = meeting.startTime ? new Date(meeting.startTime).getTime() : now;
  const endTime = meeting.endTime ? new Date(meeting.endTime).getTime() : null;

  if (endTime && endTime < now) {
    return 'ENDED';
  }

  if (meeting.status === 'LIVE') {
    return 'LIVE';
  }

  if (startTime > now) {
    return 'SCHEDULED';
  }

  return 'LIVE';
};

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSummonModalOpen, setIsSummonModalOpen] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'LIVE' | 'COMPLETED'>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (searchParams.get('meetingLocked') === 'true') {
      toast.error(
        'This meeting is currently locked. Please wait for the host to unlock it.'
      );
    }
  }, [searchParams]);

  const fetchMeetings = async () => {
    setIsLoading(true);
    try {
      const data = await meetingService.getMyMeetings();
      setMeetings(data);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const normalizedMeetings = useMemo(() => {
    return meetings.map((meeting: any) => ({
      ...meeting,
      effectiveStatus: getEffectiveMeetingStatus(meeting),
    }));
  }, [meetings]);

  // Filtered meetings based on search query and status filter
  const filteredMeetings = useMemo(() => {
    let result = normalizedMeetings;

    // Filter by search query (title or meeting code)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m: any) =>
          m.title?.toLowerCase().includes(query) ||
          m.meetingCode?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'ALL') {
      const mappedFilter = statusFilter === 'COMPLETED' ? 'ENDED' : statusFilter;
      result = result.filter((m: any) => m.effectiveStatus === mappedFilter);
    }

    return result;
  }, [normalizedMeetings, searchQuery, statusFilter]);

  const handleMeetingCreated = (code: string) => {
    setIsModalOpen(false);
    router.push(`/meeting/${code}`);
  };

  const handleBotSummoned = (meetingId: string) => {
    setIsSummonModalOpen(false);
    fetchMeetings();
  };

  const activeFilterCount = (searchQuery ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden sm:rounded-[40px] bg-linear-to-br from-card via-secondary/40 to-secondary/80 border border-border p-6 sm:p-10 lg:p-14 shadow-md shadow-primary/5 animate-pulse-glow">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 blur-[130px] rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-accent/3 blur-[100px] rounded-full translate-y-1/3 -translate-x-1/4" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-10">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-accent/10 border border-accent/20 rounded-full w-fit shadow-sm shadow-accent/5">
              <Shield className="h-3.5 w-3.5 text-accent" />
              <span className="text-[8px] sm:text-[10px] font-black text-accent uppercase tracking-[0.2em]">Enterprise Secure Platform</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-6xl font-black text-foreground uppercase tracking-tighter leading-tight">
              Welcome <span className="text-primary">{user?.name?.split(' ')[0]}</span>
            </h1>
            <p className="text-xs sm:text-base lg:text-lg text-muted-foreground font-medium max-w-xl">
              You have <span className="text-foreground font-bold">{normalizedMeetings.filter(m => m.effectiveStatus === 'SCHEDULED').length} sessions</span> scheduled for today. Ready to initialize your next meeting?
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
            <Button
              className="h-11 sm:h-14 px-4 sm:px-6 rounded-xl sm:rounded-2xl gap-2.5 sm:gap-3 text-sm sm:text-base font-black uppercase tracking-widest shadow-xl shadow-primary/20 w-full sm:w-auto justify-center"
              onClick={() => setIsSummonModalOpen(true)}
            >
              <Bot className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              SUMMON BOT
            </Button>
            <Button
              variant="outline"
              className="h-11 sm:h-14 px-4 sm:px-6 rounded-xl sm:rounded-2xl gap-2.5 sm:gap-3 text-sm sm:text-base font-black uppercase tracking-widest bg-white shadow-sm w-full sm:w-auto justify-center"
              onClick={() => setIsModalOpen(true)}
            >
              NEW SESSION
            </Button>
            <Button
              variant="outline"
              className="h-11 sm:h-14 px-4 sm:px-6 rounded-xl sm:rounded-2xl gap-2.5 sm:gap-3 text-xs sm:text-sm font-black uppercase tracking-widest w-full sm:w-auto justify-center bg-white shadow-sm"
              onClick={() => router.push('/dashboard/calendar')}
            >
              <CalendarIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              CALENDAR
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-14 relative z-10 border-t border-border pt-10">
          <div className="space-y-1">
            <p className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Activity className="h-3 w-3 text-primary" />
              Platform Status
            </p>
            <p className="text-base sm:text-xl font-black text-foreground uppercase tracking-tight">System Optimal</p>
          </div>
          <div className="space-y-1">
            <p className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Video className="h-3 w-3 text-primary" />
              Total Hosted
            </p>
            <p className="text-base sm:text-xl font-black text-foreground uppercase tracking-tight">{meetings.length} Sessions</p>
          </div>
          <div className="space-y-1">
            <p className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Users className="h-3 w-3 text-blue-500" />
              Live Nodes
            </p>
            <p className="text-base sm:text-xl font-black text-foreground uppercase tracking-tight">AU-Regional</p>
          </div>
          <div className="space-y-1">
            <p className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <RefreshCw className="h-3 w-3 text-amber-500" />
              Last Sync
            </p>
            <p className="text-base sm:text-xl font-black text-foreground uppercase tracking-tight">Realtime</p>
          </div>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 px-2">
        <div className="relative group flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="SEARCH SESSIONS BY TITLE OR CODE..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-muted/40 border border-border rounded-xl sm:rounded-2xl pl-10 sm:pl-12 pr-4 sm:pr-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-black text-foreground placeholder:text-muted-foreground uppercase tracking-widest focus:outline-none focus:border-primary/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchMeetings} className="rounded-lg sm:rounded-xl border-border bg-white h-9 sm:h-10 px-3 sm:px-4 shadow-sm">
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <div className="h-8 sm:h-10 w-px bg-border mx-1 sm:mx-2" />
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${showFilters || statusFilter !== 'ALL'
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-white border-border text-foreground hover:text-primary'
                }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              FILTERS
              {activeFilterCount > 0 && (
                <span className="ml-1 bg-primary text-primary-foreground text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filter Dropdown */}
            {showFilters && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-scale-in">
                <div className="p-3 border-b border-border">
                  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Status Filter</p>
                </div>
                <div className="p-2 space-y-1">
                  {(['ALL', 'SCHEDULED', 'LIVE', 'COMPLETED'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(status);
                        setShowFilters(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === status
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                      {status === 'ALL' ? 'All Sessions' : status === 'COMPLETED' ? 'Completed' : status}
                    </button>
                  ))}
                </div>
                {statusFilter !== 'ALL' && (
                  <div className="p-2 border-t border-border">
                    <button
                      onClick={() => {
                        setStatusFilter('ALL');
                        setShowFilters(false);
                      }}
                      className="w-full text-center px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 transition-all"
                    >
                      Clear Filter
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Meetings Grid */}
      {filteredMeetings.length > 0 ? (
        <>
          {/* Results count when filtering */}
          {(searchQuery || statusFilter !== 'ALL') && (
            <div className="px-2">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Showing {filteredMeetings.length} of {meetings.length} sessions
                {searchQuery && <span> matching &ldquo;{searchQuery}&rdquo;</span>}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in-up">
            {filteredMeetings.map((meeting: any) => (
              <MeetingCard key={meeting._id} meeting={meeting} />
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 glass-card rounded-[40px] border-border text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="relative h-24 w-24 bg-muted rounded-4xl border border-border flex items-center justify-center">
              <Video className="h-10 w-10 text-muted-foreground" />
            </div>
          </div>
          {searchQuery || statusFilter !== 'ALL' ? (
            <>
              <h3 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-tighter">No Matching Sessions</h3>
              <p className="text-muted-foreground mt-2 font-medium max-w-sm">No sessions match your current search or filter criteria.</p>
              <Button
                variant="outline"
                className="mt-10 h-12 px-6 rounded-2xl gap-3 font-black uppercase tracking-widest"
                onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
              >
                Clear All Filters
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-tighter">No Sessions Found</h3>
              <p className="text-muted-foreground mt-2 font-medium max-w-sm">Your meeting history is empty. Start your first high-performance session now.</p>
              <Button className="mt-10 h-14 px-3 rounded-2xl gap-3 font-black uppercase tracking-widest shadow-xl shadow-primary/20" onClick={() => setIsModalOpen(true)}>
                INITIALIZE FIRST SESSION
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* New Meeting Modal */}
      <NewMeetingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleMeetingCreated}
      />

      {/* Summon Bot Modal */}
      <SummonBotModal
        isOpen={isSummonModalOpen}
        onClose={() => setIsSummonModalOpen(false)}
        onSuccess={handleBotSummoned}
      />
    </div>
  );
}
