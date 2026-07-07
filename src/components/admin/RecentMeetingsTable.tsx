import React from 'react';
import { RecentMeeting } from '@/services/dashboardService';
import { Video, Clock, Users, Search, ChevronDown } from 'lucide-react';

interface RecentMeetingsTableProps {
  meetings: RecentMeeting[];
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  showFilters?: boolean;
}

const formatDuration = (seconds?: number) => {
  if (!seconds) return '--';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const mRemaining = m % 60;
  return `${h}h ${mRemaining}m ${s}s`;
};

export const RecentMeetingsTable = ({ 
  meetings,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  search = '',
  onSearchChange,
  statusFilter = 'all',
  onStatusFilterChange,
  showFilters = false
}: RecentMeetingsTableProps) => {
  return (
    <div className="glass-card rounded-2xl overflow-hidden border-border bg-card shadow-sm">
      <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-foreground uppercase tracking-tight">
            Recent <span className="text-primary">Logs</span>
          </h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Platform Sessions
          </p>
        </div>
        
        {showFilters && onSearchChange && onStatusFilterChange && (
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="SEARCH SESSIONS..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="bg-muted/40 border border-border rounded-full pl-10 pr-6 py-2 text-[10px] font-bold text-foreground uppercase tracking-widest focus:outline-none focus:border-primary/50 transition-all min-w-[200px]"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="appearance-none bg-muted/40 border border-border rounded-full pl-4 pr-10 py-2 text-[10px] font-black text-foreground uppercase tracking-widest focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="LIVE">Live</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="ENDED">Ended</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 text-muted-foreground font-black uppercase tracking-widest text-[10px]">
              <th className="text-left p-5">Session</th>
              <th className="text-left p-5">Status</th>
              <th className="text-left p-5">Duration</th>
              <th className="text-right p-5">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {meetings.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-muted-foreground font-medium uppercase tracking-widest text-xs">
                  No session history available
                </td>
              </tr>
            ) : (
              meetings.map((meeting) => (
                <tr key={meeting._id} className="hover:bg-muted/20 transition-colors group">
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Video className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-foreground font-bold">{meeting.title}</div>
                        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                          {meeting.meetingCode}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter ${meeting.status === 'LIVE' ? 'bg-primary/10 text-primary border border-primary/20' :
                        meeting.status === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
                          meeting.status === 'ENDED' ? 'bg-muted text-muted-foreground border border-border' :
                            'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                      }`}>
                      {meeting.status}
                    </span>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                      <Clock className="h-3 w-3" />
                      {formatDuration(meeting.duration)}
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
      
      {/* Pagination Controls */}
      {onPageChange && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Prev
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
