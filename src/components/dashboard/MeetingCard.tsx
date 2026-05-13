'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface MeetingCardProps {
  meeting: {
    _id: string;
    title: string;
    meetingCode: string;
    status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
    scheduledStart?: string;
    participantCount?: number;
  };
}

export const MeetingCard = ({ meeting }: MeetingCardProps) => {
  const router = useRouter();
  
  const statusColors = {
    SCHEDULED: 'text-blue-400 bg-blue-400/10',
    LIVE: 'text-green-400 bg-green-400/10 animate-pulse',
    ENDED: 'text-slate-500 bg-slate-500/10',
    CANCELLED: 'text-red-400 bg-red-400/10',
  };

  const handleJoin = () => {
    router.push(`/meeting/${meeting.meetingCode}`);
  };

  return (
    <div className="glass-card p-5 space-y-4 hover:border-primary/30 transition-all group">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h3 className="font-semibold text-white group-hover:text-primary transition-colors">
            {meeting.title}
          </h3>
          <p className="text-xs text-slate-500 font-mono">Code: {meeting.meetingCode}</p>
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${statusColors[meeting.status]}`}>
          {meeting.status}
        </span>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-slate-400">
        {meeting.scheduledStart && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {new Date(meeting.scheduledStart).toLocaleDateString()}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          {meeting.scheduledStart ? new Date(meeting.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Instant'}
        </div>
        {meeting.status === 'LIVE' && (
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {meeting.participantCount || 0} active
          </div>
        )}
      </div>

      <div className="pt-2">
        <Button 
          variant={meeting.status === 'LIVE' ? 'primary' : 'outline'} 
          className="w-full gap-2"
          onClick={handleJoin}
          disabled={meeting.status === 'ENDED' || meeting.status === 'CANCELLED'}
        >
          <Video className="h-4 w-4" />
          {meeting.status === 'LIVE' ? 'Join Now' : 'Enter Waiting Room'}
        </Button>
      </div>
    </div>
  );
};
