'use client';

import React, { useEffect, useState } from 'react';
import { 
  Plus, Video, Calendar as CalendarIcon, 
  RefreshCw, User, Shield, Activity, Users,
  Search, SlidersHorizontal, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MeetingCard } from '@/components/dashboard/MeetingCard';
import { NewMeetingModal } from '@/components/dashboard/NewMeetingModal';
import { meetingService } from '@/services/meetingService';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchMeetings = async () => {
    setIsLoading(true);
    try {
      const data = await meetingService.getMyMeetings();
      // Only show meetings that haven't ended yet
      setMeetings(data.filter((m: any) => m.status !== 'ENDED'));
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleMeetingCreated = (code: string) => {
    setIsModalOpen(false);
    router.push(`/meeting/${code}`);
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-[#050b21] via-[#020512] to-[#0b1437] border border-primary/10 p-10 lg:p-14 shadow-2xl shadow-primary/5 animate-pulse-glow">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/10 blur-[130px] rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-accent/5 blur-[100px] rounded-full translate-y-1/3 -translate-x-1/4" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-accent/5 border border-accent/20 rounded-full w-fit shadow-md shadow-accent/5">
              <Shield className="h-4 w-4 text-accent" />
              <span className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">Enterprise Secure Platform</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-tight">
              Welcome back, <span className="text-primary">{user?.name?.split(' ')[0]}</span>
            </h1>
            <p className="text-lg text-slate-400 font-medium max-w-xl">
              You have <span className="text-white font-bold">{meetings.filter(m => m.status === 'SCHEDULED').length} sessions</span> scheduled for today. Ready to initialize your next meeting?
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
             <Button 
                className="h-16 px-8 rounded-2xl gap-3 text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                onClick={() => setIsModalOpen(true)}
             >
                <Plus className="h-6 w-6" />
                NEW SESSION
             </Button>
             <Button 
                variant="outline" 
                className="h-16 px-8 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 gap-3 text-sm font-black uppercase tracking-widest"
                onClick={() => router.push('/dashboard/calendar')}
             >
                <CalendarIcon className="h-5 w-5" />
                CALENDAR
             </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-14 relative z-10 border-t border-white/5 pt-10">
           <div className="space-y-1">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 <Activity className="h-3 w-3 text-emerald-500" />
                 Platform Status
              </p>
              <p className="text-xl font-black text-white uppercase tracking-tight">System Optimal</p>
           </div>
           <div className="space-y-1">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 <Video className="h-3 w-3 text-primary" />
                 Total Hosted
              </p>
              <p className="text-xl font-black text-white uppercase tracking-tight">{meetings.length} Sessions</p>
           </div>
           <div className="space-y-1">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 <Users className="h-3 w-3 text-blue-500" />
                 Live Nodes
              </p>
              <p className="text-xl font-black text-white uppercase tracking-tight">AU-Regional</p>
           </div>
           <div className="space-y-1">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 <RefreshCw className="h-3 w-3 text-amber-500" />
                 Last Sync
              </p>
              <p className="text-xl font-black text-white uppercase tracking-tight">Realtime</p>
           </div>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
         <div className="relative group flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="SEARCH SESSIONS BY TITLE OR CODE..." 
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black text-white uppercase tracking-widest focus:outline-none focus:border-primary/50 transition-all"
            />
         </div>
         
         <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={fetchMeetings} className="rounded-xl border-white/5 bg-white/5">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <div className="h-10 w-[1px] bg-white/10 mx-2" />
            <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-all">
               <SlidersHorizontal className="h-4 w-4" />
               FILTERS
            </button>
         </div>
      </div>

      {/* Meetings Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in-up">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 glass rounded-[32px] animate-pulse border-white/5 bg-white/5" />
          ))}
        </div>
      ) : meetings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in-up">
          {meetings.map((meeting: any) => (
            <MeetingCard key={meeting._id} meeting={meeting} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 glass rounded-[40px] border-white/5 text-center">
          <div className="relative mb-8">
             <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
             <div className="relative h-24 w-24 bg-slate-900 rounded-[32px] border border-white/10 flex items-center justify-center">
                <Video className="h-10 w-10 text-slate-600" />
             </div>
          </div>
          <h3 className="text-3xl font-black text-white uppercase tracking-tighter">No Sessions Found</h3>
          <p className="text-slate-400 mt-2 font-medium max-w-sm">Your meeting history is empty. Start your first high-performance session now.</p>
          <Button className="mt-10 h-14 px-8 rounded-2xl gap-3 font-black uppercase tracking-widest shadow-xl shadow-primary/20" onClick={() => setIsModalOpen(true)}>
            INITIALIZE FIRST SESSION
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* New Meeting Modal */}
      <NewMeetingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleMeetingCreated}
      />
    </div>
  );
}
