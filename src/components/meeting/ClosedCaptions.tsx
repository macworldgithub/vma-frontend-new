'use client';

import React, { useEffect, useState } from 'react';
import { Mic } from 'lucide-react';

interface ClosedCaptionsProps {
  speakerName: string;
  text: string;
}

export const ClosedCaptions = ({ speakerName, text }: ClosedCaptionsProps) => {
  const [visible, setVisible] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [displayedSpeaker, setDisplayedSpeaker] = useState('');

  useEffect(() => {
    if (text.trim()) {
      setDisplayedText(text);
      setDisplayedSpeaker(speakerName);
      setVisible(true);
    } else {
      setVisible(false);
      // Wait for slide-out animation to finish before clearing text
      const t = setTimeout(() => {
        setDisplayedText('');
        setDisplayedSpeaker('');
      }, 300);
      return () => clearTimeout(t);
    }
  }, [text, speakerName]);

  if (!displayedText.trim()) return null;

  return (
    <div className={`absolute bottom-28 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-2xl text-center pointer-events-none duration-300 ${visible ? 'animate-in fade-in slide-in-from-bottom-2' : 'animate-out fade-out slide-out-to-bottom-2 fill-mode-forwards'}`}>
      <div className="glass-dark px-6 py-3.5 rounded-2xl border border-primary/20 shadow-2xl flex items-center gap-3 backdrop-blur-2xl bg-slate-950/90 text-left pointer-events-auto">
        <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary">
          <Mic className="h-4 w-4 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-black text-primary uppercase tracking-widest leading-none mb-1 flex items-center gap-1.5">
            {displayedSpeaker || 'Unknown Speaker'}
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
          </div>
          <p className="text-[13px] font-bold text-slate-100 leading-normal tracking-wide break-words first-letter:uppercase">
            {displayedText}
          </p>
        </div>
      </div>
    </div>
  );
};
