'use client';

import React from 'react';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, 
  MessageSquare, PhoneOff, Lock, Unlock, LogOut,
  Settings, Users, Shield, UserPlus
} from 'lucide-react';

interface ControlBarProps {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  chatOpen: boolean;
  isHost: boolean;
  isLocked: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onCopyLink: () => void;
  onLeave: () => void;
  onEndMeeting: () => void;
  onToggleLock: () => void;
}

export const ControlBar = ({
  audioEnabled, videoEnabled, screenSharing, chatOpen,
  isHost, isLocked,
  onToggleAudio, onToggleVideo, onToggleScreenShare, onToggleChat,
  onCopyLink,
  onLeave, onEndMeeting, onToggleLock,
}: ControlBarProps) => {
  
  const ControlBtn = ({ active, danger, onClick, children, label, badge, accent }: any) => (
    <div className="flex flex-col items-center gap-1 sm:gap-2 group">
      <button
        onClick={onClick}
        title={label}
        className={`relative h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 backdrop-blur-xl border ${
          danger
            ? 'bg-rose-500 text-white border-rose-400/50 hover:bg-rose-600 shadow-lg shadow-rose-500/20'
            : active
              ? `${accent || 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30 shadow-lg shadow-primary/10'}`
              : 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20'
        } transform hover:-translate-y-1 active:scale-95`}
      >
        {children}
        {badge && (
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 sm:h-4 sm:w-4 bg-primary text-white text-[7px] sm:text-[8px] font-black rounded-full flex items-center justify-center border-2 border-slate-950">
            {badge}
          </span>
        )}
      </button>
      <span className="text-[7px] sm:text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
        {label}
      </span>
    </div>
  );

  return (
    <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[95%] sm:w-auto">
      <div className="glass-dark px-3 sm:px-8 py-2.5 sm:py-4 rounded-[20px] sm:rounded-[32px] flex items-center gap-2 sm:gap-6 border border-white/10 shadow-2xl backdrop-blur-2xl pointer-events-auto max-w-full overflow-x-auto justify-center">
        
        {/* Media Controls Group */}
        <div className="flex items-center gap-2 sm:gap-4 pr-3 sm:pr-6 border-r border-white/10">
          <ControlBtn 
            active={audioEnabled} 
            onClick={onToggleAudio} 
            label={audioEnabled ? 'Mute' : 'Unmute'}
          >
            {audioEnabled ? <Mic className="h-5 w-5 sm:h-6 sm:w-6" /> : <MicOff className="h-5 w-5 sm:h-6 sm:w-6" />}
          </ControlBtn>

          <ControlBtn 
            active={videoEnabled} 
            onClick={onToggleVideo} 
            label={videoEnabled ? 'Stop Video' : 'Start Video'}
          >
            {videoEnabled ? <Video className="h-5 w-5 sm:h-6 sm:w-6" /> : <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" />}
          </ControlBtn>
        </div>

        {/* Feature Controls Group */}
        <div className="flex items-center gap-2 sm:gap-4 px-1 sm:px-2">
          <ControlBtn 
            active={screenSharing} 
            onClick={onToggleScreenShare} 
            label={screenSharing ? 'Stop Sharing' : 'Share Screen'}
            accent={screenSharing ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : ''}
          >
            <Monitor className="h-5 w-5 sm:h-6 sm:w-6" />
          </ControlBtn>

          <ControlBtn 
            active={chatOpen} 
            onClick={onToggleChat} 
            label="Messages"
            accent={chatOpen ? 'bg-primary/20 text-primary border-primary/30' : ''}
          >
            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
          </ControlBtn>

          <ControlBtn 
            active={false} 
            onClick={onCopyLink} 
            label="Invite"
          >
            <UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />
          </ControlBtn>

          {isHost && (
            <ControlBtn 
              active={!isLocked} 
              onClick={onToggleLock} 
              label={isLocked ? 'Locked' : 'Unlocked'}
              accent={!isLocked ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-amber-500/20 text-amber-500 border-amber-500/30'}
            >
              {isLocked ? <Lock className="h-5 w-5 sm:h-6 sm:w-6" /> : <Unlock className="h-5 w-5 sm:h-6 sm:w-6" />}
            </ControlBtn>
          )}

          <div className="flex flex-col items-center gap-1 sm:gap-2 group">
            <button className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition-all backdrop-blur-xl">
              <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">Settings</span>
          </div>
        </div>

        {/* Exit Controls Group */}
        <div className="flex items-center gap-2 sm:gap-4 pl-3 sm:pl-6 border-l border-white/10">
          <ControlBtn 
            active={false} 
            danger 
            onClick={onLeave} 
            label="Leave"
          >
            <LogOut className="h-5 w-5 sm:h-6 sm:w-6" />
          </ControlBtn>

          {isHost && (
            <button
              onClick={onEndMeeting}
              className="h-10 sm:h-14 px-3 sm:px-6 rounded-xl sm:rounded-2xl bg-rose-600 text-white font-black text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20 border border-rose-500 flex items-center gap-1 sm:gap-2"
            >
              <PhoneOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">END SESSION</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Branding Subtitle */}
      <div className="flex items-center justify-center gap-2 mt-4 opacity-40">
         <Shield className="h-3 w-3 text-primary" />
         <span className="text-[8px] font-black text-white uppercase tracking-[0.4em]">OmniSuiteAI Secure Realtime Pipeline</span>
      </div>
    </div>
  );
};
