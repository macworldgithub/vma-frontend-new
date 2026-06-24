import React, { useState } from 'react';
import { TopUser, dashboardService } from '@/services/dashboardService';
import { User, Trophy, X, Loader2 } from 'lucide-react';

interface TopUsersListProps {
  users: TopUser[];
}

export const TopUsersList = ({ users }: TopUsersListProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [allLeaders, setAllLeaders] = useState<TopUser[]>([]);
  const [userMap, setUserMap] = useState<Record<string, { name: string; email: string }>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleOpen = async () => {
    setIsOpen(true);
    setIsLoading(true);
    try {
      const [leadersData, usersData] = await Promise.all([
        dashboardService.getTopUsers(50),
        import('@/lib/axios').then((m) => m.default.get('/users').then((res) => res.data).catch(() => [])),
      ]);
      setAllLeaders(leadersData);
      
      const map: Record<string, { name: string; email: string }> = {};
      usersData.forEach((u: any) => {
        map[u._id] = { name: u.name, email: u.email };
      });
      setUserMap(map);
    } catch (err) {
      console.error('Failed to load leaderboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 rounded-2xl bg-card border border-border space-y-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-foreground uppercase tracking-tight">
            Top <span className="text-primary">Hosts</span>
          </h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Performance Leaders
          </p>
        </div>
        <Trophy className="h-5 w-5 text-yellow-500 opacity-50" />
      </div>

      <div className="space-y-4">
        {users.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground text-xs uppercase font-bold tracking-widest">
            No leader data
          </p>
        ) : (
          users.map((u, i) => (
            <div key={u.userId} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border group-hover:border-primary/30 transition-colors">
                    <User className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-primary-foreground border-2 border-background">
                    {i + 1}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">
                    ID: {u.userId}
                  </div>
                  <div className="text-[10px] font-black text-foreground uppercase tracking-widest">
                    Host Activity
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-primary leading-none">
                  {u.meetingsHosted}
                </div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                  Sessions
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-4 border-t border-border">
        <button 
          onClick={handleOpen}
          className="w-full text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] hover:text-primary transition-colors cursor-pointer"
        >
          View All Leaderboard
        </button>
      </div>

      {/* Leaderboard Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass-card max-w-xl w-full rounded-[30px] border border-border bg-card shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary shimmer" />
            
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                  Performance <span className="text-primary">Leaderboard</span>
                  <Trophy className="h-5 w-5 text-yellow-500" />
                </h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                  Full host statistics
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest animate-pulse">
                    Retrieving Leaderboard Data...
                  </p>
                </div>
              ) : allLeaders.length === 0 ? (
                <p className="text-center py-20 text-muted-foreground text-xs uppercase font-bold tracking-widest">
                  No records found
                </p>
              ) : (
                <div className="space-y-4">
                  {allLeaders.map((u, i) => {
                    const resolvedUser = userMap[u.userId];
                    const displayName = resolvedUser ? resolvedUser.name : `Host ID: ${u.userId.slice(-6).toUpperCase()}`;
                    const displayEmail = resolvedUser ? resolvedUser.email : `ID: ${u.userId}`;
                    
                    return (
                      <div key={u.userId} className="flex items-center justify-between p-3.5 rounded-xl bg-muted/20 border border-border hover:border-primary/20 hover:bg-muted/40 transition-all group gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border group-hover:border-primary/30 transition-colors">
                              <User className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-primary-foreground border-2 border-background">
                              {i + 1}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-black text-foreground uppercase tracking-wider truncate">
                              {displayName}
                            </h4>
                            <p className="text-[10px] font-mono text-muted-foreground truncate">
                              {displayEmail}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xl font-black text-primary leading-none block">
                            {u.meetingsHosted}
                          </span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                            Sessions
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-border bg-muted/10 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-6 py-2.5 rounded-xl border border-border bg-white hover:bg-muted text-foreground font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
