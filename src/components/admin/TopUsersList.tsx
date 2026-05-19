import React from 'react';
import { TopUser } from '@/services/dashboardService';
import { User, Trophy } from 'lucide-react';

interface TopUsersListProps {
  users: TopUser[];
}

export const TopUsersList = ({ users }: TopUsersListProps) => {
  return (
    <div className="glass p-6 rounded-2xl border-white/5 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-white uppercase tracking-tight">
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
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-primary/30 transition-colors">
                    <User className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-white border-2 border-slate-950">
                    {i + 1}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">
                    ID: {u.userId}
                  </div>
                  <div className="text-[10px] font-black text-white uppercase tracking-widest">
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
      
      <div className="pt-4 border-t border-white/5">
        <button className="w-full text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] hover:text-white transition-colors">
          View All Leaderboard
        </button>
      </div>
    </div>
  );
};
