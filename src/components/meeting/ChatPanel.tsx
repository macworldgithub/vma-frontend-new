'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Hash, MessageSquare, Clock } from 'lucide-react';

interface ChatMessage {
  id?: string;
  userId: string;
  userName: string;
  message: string;
  sentAt: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  onClose: () => void;
  currentUserId: string;
}

export const ChatPanel = ({ messages, onSend, onClose, currentUserId }: ChatPanelProps) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      onSend(input.trim());
      setInput('');
    }
  };

  return (
    <div className="w-96 h-full flex flex-col glass border-l border-white/5 relative z-40 bg-slate-950/80 backdrop-blur-3xl animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">In-Call Chat</h3>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Secure Channel</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
            <div className="p-6 rounded-full bg-white/5">
              <Hash className="h-10 w-10 text-white" />
            </div>
            <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">No Messages Yet</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.userId === currentUserId;
            return (
              <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {!isMe && (
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-black text-primary">
                      {msg.userName[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                    {isMe ? 'YOU' : msg.userName}
                  </span>
                </div>

                <div className={`px-4 py-3 rounded-2xl text-[13px] max-w-[90%] leading-relaxed shadow-sm border ${isMe
                    ? 'bg-primary text-white border-primary/20 rounded-tr-none'
                    : 'bg-white/5 text-slate-200 border-white/10 rounded-tl-none backdrop-blur-md'
                  }`}>
                  {msg.message}
                </div>

                <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                  <Clock className="h-2.5 w-2.5" />
                  {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-white/5 border-t border-white/5 backdrop-blur-xl">
        <div className="relative group">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="TYPE SECURE MESSAGE..."
            className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-[10px] font-bold text-white uppercase tracking-widest placeholder:text-slate-600 focus:outline-none focus:border-primary/50 transition-all shadow-inner"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={`absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl flex items-center justify-center transition-all ${input.trim()
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-white/5 text-slate-600'
              }`}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[8px] font-black text-muted-foreground text-center uppercase tracking-widest mt-4 opacity-30">
          Messages are encrypted and ephemeral
        </p>
      </div>
    </div>
  );
};
