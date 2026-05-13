'use client';

import React from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, MessageSquare, PhoneOff, Lock, Unlock, LogOut } from 'lucide-react';

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
  onLeave: () => void;
  onEndMeeting: () => void;
  onToggleLock: () => void;
}

export const ControlBar = ({
  audioEnabled, videoEnabled, screenSharing, chatOpen,
  isHost, isLocked,
  onToggleAudio, onToggleVideo, onToggleScreenShare, onToggleChat,
  onLeave, onEndMeeting, onToggleLock,
}: ControlBarProps) => {
  const Btn = ({ active, danger, onClick, children, label }: any) => (
    <button
      onClick={onClick}
      title={label}
      className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
        danger
          ? 'bg-destructive hover:bg-destructive/80'
          : active
            ? 'bg-slate-700 hover:bg-slate-600'
            : 'bg-destructive/80 hover:bg-destructive'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="absolute bottom-0 left-0 right-0 py-4 flex items-center justify-center gap-3 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
      <Btn active={audioEnabled} onClick={onToggleAudio} label={audioEnabled ? 'Mute' : 'Unmute'}>
        {audioEnabled ? <Mic className="h-5 w-5 text-white" /> : <MicOff className="h-5 w-5 text-white" />}
      </Btn>

      <Btn active={videoEnabled} onClick={onToggleVideo} label={videoEnabled ? 'Camera Off' : 'Camera On'}>
        {videoEnabled ? <Video className="h-5 w-5 text-white" /> : <VideoOff className="h-5 w-5 text-white" />}
      </Btn>

      <Btn active={!screenSharing} onClick={onToggleScreenShare} label={screenSharing ? 'Stop Share' : 'Share Screen'}>
        {screenSharing ? <MonitorOff className="h-5 w-5 text-white" /> : <Monitor className="h-5 w-5 text-white" />}
      </Btn>

      <Btn active={!chatOpen} onClick={onToggleChat} label="Chat">
        <MessageSquare className="h-5 w-5 text-white" />
      </Btn>

      {isHost && (
        <Btn active={!isLocked} onClick={onToggleLock} label={isLocked ? 'Unlock' : 'Lock'}>
          {isLocked ? <Lock className="h-5 w-5 text-yellow-400" /> : <Unlock className="h-5 w-5 text-white" />}
        </Btn>
      )}

      <Btn active={false} danger onClick={onLeave} label="Leave">
        <LogOut className="h-5 w-5 text-white" />
      </Btn>

      {isHost && (
        <Btn active={false} danger onClick={onEndMeeting} label="End for All">
          <PhoneOff className="h-5 w-5 text-white" />
        </Btn>
      )}
    </div>
  );
};
