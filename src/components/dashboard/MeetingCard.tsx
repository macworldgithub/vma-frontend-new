'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, Video, ChevronRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface MeetingCardProps {
  meeting: {
    _id: string;
    title: string;
    meetingCode: string;
    status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
    startTime?: string;
    participantCount?: number;
    hostId?: string;
  };
}

export const MeetingCard = ({ meeting }: MeetingCardProps) => {
  const router = useRouter();
  
  const statusConfig = {
    SCHEDULED: { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Upcoming' },
    LIVE: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Live Now' },
    ENDED: { color: 'text-slate-500', bg: 'bg-white/5', label: 'Ended' },
    CANCELLED: { color: 'text-rose-500', bg: 'bg-rose-500/10', label: 'Cancelled' },
  };

  const currentStatus = statusConfig[meeting.status];

  const handleJoin = () => {
    router.push(`/meeting/${meeting.meetingCode}`);
  };

  return (
    <div className="glass group relative overflow-hidden rounded-2xl border-white/5 transition-all hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5">
      {/* Dynamic Status Border */}
      <div className={`absolute top-0 left-0 w-full h-1 opacity-20 group-hover:opacity-100 transition-opacity ${
        meeting.status === 'LIVE' ? 'bg-emerald-500' : 'bg-primary'
      }`} />
      
      <div className="p-6 space-y-5">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <h3 className="font-black text-lg text-white uppercase italic tracking-tight group-hover:text-primary transition-colors line-clamp-1">
              {meeting.title}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5">
                {meeting.meetingCode}
              </span>
              {meeting.status === 'LIVE' && (
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              )}
            </div>
          </div>
          <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest border border-white/10 ${currentStatus.color} ${currentStatus.bg}`}>
            {currentStatus.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-tighter">
            <div className="p-2 rounded-lg bg-white/5">
              <Calendar className="h-3.5 w-3.5" />
            </div>
            {meeting.startTime ? new Date(meeting.startTime).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' }) : 'Instant'}
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-tighter">
            <div className="p-2 rounded-lg bg-white/5">
              <Clock className="h-3.5 w-3.5" />
            </div>
            {meeting.startTime ? new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
          </div>
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-white/5">
          <div className="flex items-center gap-2">
             <div className="flex -space-x-2">
                {[1, 2].map((i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-white/10 border-2 border-slate-950 flex items-center justify-center">
                    <Users className="h-3 w-3 text-muted-foreground" />
                  </div>
                ))}
                {meeting.status === 'LIVE' && (
                   <div className="w-6 h-6 rounded-full bg-emerald-500/20 border-2 border-slate-950 flex items-center justify-center text-[8px] font-black text-emerald-400">
                    +{meeting.participantCount || 0}
                  </div>
                )}
             </div>
             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                {meeting.status === 'LIVE' ? 'Active Session' : 'Ready to Start'}
             </span>
          </div>
          
          <Button 
            variant={meeting.status === 'LIVE' ? 'primary' : 'outline'} 
            size="sm"
            className={`rounded-xl px-4 gap-2 font-black uppercase tracking-widest text-[10px] h-10 transition-all ${
              meeting.status === 'LIVE' 
                ? 'shadow-lg shadow-emerald-500/20 border-emerald-500 hover:bg-emerald-600' 
                : 'border-white/10 hover:bg-white/10'
            }`}
            onClick={handleJoin}
            disabled={meeting.status === 'ENDED' || meeting.status === 'CANCELLED'}
          >
            {meeting.status === 'LIVE' ? 'JOIN ROOM' : 'GO TO LOBBY'}
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Decorative Accent */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
    </div>
  );
};
