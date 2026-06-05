import React from 'react';
import { RecentMeeting } from '@/services/dashboardService';
import { Video, Clock, Users } from 'lucide-react';

interface RecentMeetingsTableProps {
  meetings: RecentMeeting[];
}

export const RecentMeetingsTable = ({ meetings }: RecentMeetingsTableProps) => {
  return (
    <div className="glass rounded-2xl overflow-hidden border-white/5">
      <div className="p-6 border-b border-white/5">
        <h3 className="text-lg font-black text-white uppercase tracking-tight">
          Recent <span className="text-primary">Logs</span>
        </h3>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
          Last 20 Platform Sessions
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 text-muted-foreground font-black uppercase tracking-widest text-[10px]">
              <th className="text-left p-5">Session</th>
              <th className="text-left p-5">Status</th>
              <th className="text-left p-5">Duration</th>
              <th className="text-right p-5">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {meetings.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-muted-foreground font-medium uppercase tracking-widest text-xs">
                  No session history available
                </td>
              </tr>
            ) : (
              meetings.map((meeting) => (
                <tr key={meeting._id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Video className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-white font-bold">{meeting.title}</div>
                        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                          {meeting.meetingCode}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter ${meeting.status === 'LIVE' ? 'bg-primary/10 text-primary border border-primary/20' :
                        meeting.status === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                          meeting.status === 'ENDED' ? 'bg-white/5 text-slate-400 border border-white/5' :
                            'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      }`}>
                      {meeting.status}
                    </span>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                      <Clock className="h-3 w-3" />
                      {meeting.duration ? `${Math.round(meeting.duration / 60)} min` : '--'}
                    </div>
                  </td>
                  <td className="p-5 text-right font-mono text-xs text-muted-foreground">
                    {new Date(meeting.createdAt).toLocaleDateString('en-AU', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
