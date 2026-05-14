import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isUp: boolean;
  };
  color?: string;
}

export const StatCard = ({ label, value, icon: Icon, description, trend, color = 'text-primary' }: StatCardProps) => {
  return (
    <div className="glass p-6 rounded-2xl border-white/5 relative overflow-hidden group transition-all hover:border-primary/20">
      <div className="absolute top-0 left-0 w-full h-1 bg-white/5 group-hover:bg-primary/30 transition-colors" />
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-white italic tracking-tighter">
              {value}
            </h3>
            {trend && (
              <span className={`text-[10px] font-bold ${trend.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                {trend.isUp ? '↑' : '↓'} {trend.value}%
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {description}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-white/5 border border-white/10 ${color}`}>
          <Icon className="h-6 w-6 opacity-80" />
        </div>
      </div>
      
      {/* Decorative background element */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
    </div>
  );
};
