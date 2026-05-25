'use client';

import React, { useEffect, useState } from 'react';
import { Mic } from 'lucide-react';

interface ClosedCaptionsProps {
  speakerName: string;
  text: string;
}

export const ClosedCaptions = ({ speakerName, text }: ClosedCaptionsProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (text.trim()) {
      setVisible(true);
    } else {
      // Small delay on clear to let slide-out finish
      const t = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(t);
    }
  }, [text]);

  if (!visible || !text.trim()) return null;

  return (
    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-2xl text-center pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="glass-dark px-6 py-3.5 rounded-2xl border border-emerald-500/20 shadow-2xl flex items-center gap-3 backdrop-blur-2xl bg-slate-950/90 text-left pointer-events-auto">
        <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400">
          <Mic className="h-4 w-4 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1 flex items-center gap-1.5">
            {speakerName || 'Unknown Speaker'}
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <p className="text-[13px] font-bold text-slate-100 leading-normal tracking-wide break-words first-letter:uppercase">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
};
