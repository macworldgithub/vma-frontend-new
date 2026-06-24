'use client';

import React, { useState } from 'react';
import { X, Video, Calendar, Clock, Users, ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { meetingService } from '@/services/meetingService';

interface NewMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (meetingCode: string) => void;
}

export const NewMeetingModal = ({ isOpen, onClose, onSuccess }: NewMeetingModalProps) => {
  const [type, setType] = useState<'instant' | 'scheduled'>('instant');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scheduledStart, setScheduledStart] = useState('');

  if (!isOpen) return null;

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const data = {
        title: title || (type === 'instant' ? 'Quick Sync' : 'Scheduled Meeting'),
        scheduledStart: type === 'scheduled' ? scheduledStart : undefined,
      };
      const response = await meetingService.createMeeting(data);
      onSuccess(response.meeting.meetingCode);
    } catch (error) {
      alert('Failed to create meeting');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="relative bg-card w-full max-w-xl rounded-[24px] sm:rounded-[32px] border border-border shadow-xl overflow-hidden animate-scale-in">
        <div className="p-5 sm:p-8 space-y-5 sm:space-y-8">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-foreground uppercase tracking-tighter">
                Initialize <span className="text-primary">Session</span>
              </h2>
              <p className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">OmniSuiteAI Realtime Infrastructure</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setType('instant')}
              className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all text-left space-y-2 sm:space-y-3 ${type === 'instant'
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border bg-muted/20 hover:border-muted-foreground/30'
                }`}
            >
              <div className={`p-2.5 sm:p-3 rounded-xl w-fit ${type === 'instant' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <Video className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h3 className="font-black text-foreground uppercase tracking-tighter text-sm sm:text-base">Instant</h3>
                <p className="text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">Start a session immediately</p>
              </div>
            </button>

            <button
              onClick={() => setType('scheduled')}
              className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all text-left space-y-2 sm:space-y-3 ${type === 'scheduled'
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border bg-muted/20 hover:border-muted-foreground/30'
                }`}
            >
              <div className={`p-2.5 sm:p-3 rounded-xl w-fit ${type === 'scheduled' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h3 className="font-black text-foreground uppercase tracking-tighter text-sm sm:text-base">Scheduled</h3>
                <p className="text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">Plan for a future session</p>
              </div>
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Meeting Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="E.G. QUARTERLY REVIEW..."
                className="w-full bg-muted/40 border border-border rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-black text-foreground placeholder:text-muted-foreground uppercase tracking-widest focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>

            {type === 'scheduled' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Session Date & Time</label>
                <input
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-black text-foreground uppercase tracking-widest focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>
            )}
          </div>

          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-muted border border-border flex items-center gap-3 sm:gap-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Shield className="h-4 w-4" />
            </div>
            <p className="text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">
              Sessions are protected by <span className="text-foreground font-black">AES-256</span> encryption and localized on <span className="text-foreground font-black">AU-EAST</span> edge nodes.
            </p>
          </div>

          <Button
            className="w-full h-12 sm:h-16 rounded-xl sm:rounded-2xl gap-2 sm:gap-3 text-sm sm:text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20"
            onClick={handleCreate}
            isLoading={isLoading}
          >
            {type === 'instant' ? 'INITIALIZE LIVE ROOM' : 'SCHEDULE SESSION'}
            <ArrowRight className="h-4.5 w-4.5 sm:h-6 sm:w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};
