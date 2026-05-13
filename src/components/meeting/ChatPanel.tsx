'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';

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
    <div className="w-80 h-full flex flex-col bg-slate-900 border-l border-slate-800">
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <h3 className="font-semibold text-white">In-call messages</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={msg.id || i} className={`flex flex-col ${msg.userId === currentUserId ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] text-slate-500 mb-1">{msg.userName}</span>
            <div className={`px-3 py-2 rounded-lg text-sm max-w-[85%] ${
              msg.userId === currentUserId
                ? 'bg-primary text-white rounded-br-none'
                : 'bg-slate-800 text-slate-200 rounded-bl-none'
            }`}>
              {msg.message}
            </div>
            <span className="text-[9px] text-slate-600 mt-0.5">
              {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Send a message..."
            className="flex-1 bg-slate-800 text-white text-sm rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-primary"
          />
          <button onClick={handleSend} className="h-9 w-9 bg-primary rounded-lg flex items-center justify-center hover:bg-primary/80">
            <Send className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
