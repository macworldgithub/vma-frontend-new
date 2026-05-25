'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, FileText, Search, Clock, Copy, Check, MessageSquareDashed } from 'lucide-react';

interface TranscriptBlock {
  id?: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}

interface TranscriptPanelProps {
  transcripts: TranscriptBlock[];
  onClose: () => void;
  currentUserId: string;
}

export const TranscriptPanel = ({ transcripts, onClose, currentUserId }: TranscriptPanelProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  const handleCopy = () => {
    const fullText = transcripts
      .map(
        (t) =>
          `[${new Date(t.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}] ${t.userName}: ${t.text}`
      )
      .join('\n');
    
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredTranscripts = transcripts.filter((t) =>
    t.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full sm:w-96 h-full flex flex-col glass border-l border-white/5 fixed sm:static inset-y-0 right-0 z-50 sm:z-40 bg-slate-950/95 sm:bg-slate-950/80 backdrop-blur-3xl animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Live Transcript</h3>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Continuous Sync</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {transcripts.length > 0 && (
            <button
              onClick={handleCopy}
              title="Copy full transcript"
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all mr-1"
            >
              {copied ? <Check className="h-4.5 w-4.5 text-emerald-400" /> : <Copy className="h-4.5 w-4.5" />}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="px-6 py-3 border-b border-white/5 bg-white/[0.01] relative flex items-center">
        <Search className="absolute left-9 h-4 w-4 text-slate-500 pointer-events-none" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="SEARCH CONVERSATION..."
          className="w-full bg-slate-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-[9px] font-bold text-white uppercase tracking-widest placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/30 transition-all"
        />
      </div>

      {/* Transcript Log */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {filteredTranscripts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
            <div className="p-6 rounded-full bg-white/5">
              <MessageSquareDashed className="h-10 w-10 text-white" />
            </div>
            <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">
              {searchQuery ? 'No Match Found' : 'Listening for Voice...'}
            </p>
          </div>
        ) : (
          filteredTranscripts.map((t, i) => {
            const isMe = t.userId === currentUserId;
            return (
              <div key={t.id || i} className="flex flex-col items-start animate-in fade-in duration-200">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black ${
                    isMe ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/20 text-primary'
                  }`}>
                    {t.userName[0].toUpperCase()}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${
                    isMe ? 'text-emerald-400' : 'text-slate-300'
                  }`}>
                    {isMe ? 'YOU' : t.userName}
                  </span>
                </div>

                <div className="pl-7 pr-4">
                  <p className="text-[13px] font-medium text-slate-300 leading-relaxed tracking-wide break-words first-letter:uppercase">
                    {t.text}
                  </p>
                  <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1.5 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-white/5 border-t border-white/5 text-[8px] font-black text-muted-foreground text-center uppercase tracking-widest opacity-30 flex items-center justify-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        APP-COMPLIANT SECURE STORAGE PIPELINE (AU REGION)
      </div>
    </div>
  );
};
