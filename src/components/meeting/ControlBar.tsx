"use client";

import React, { useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  MessageSquare,
  PhoneOff,
  Lock,
  Unlock,
  LogOut,
  Settings,
  Users,
  Shield,
  UserPlus,
  FileText,
  MoreVertical,
  Hand
} from "lucide-react";

interface ControlBarProps {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  chatOpen: boolean;
  transcriptOpen: boolean;
  isHost: boolean;
  isLocked: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleTranscript: () => void;
  onCopyLink: () => void;
  onLeave: () => void;
  onEndMeeting: () => void;
  onToggleLock: () => void;
  raisedHand: boolean;
  onToggleRaiseHand: () => void;
}

export const ControlBar = ({
  audioEnabled,
  videoEnabled,
  screenSharing,
  chatOpen,
  transcriptOpen,
  isHost,
  isLocked,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onToggleTranscript,
  onCopyLink,
  onLeave,
  onEndMeeting,
  onToggleLock,
  raisedHand,
  onToggleRaiseHand
}: ControlBarProps) => {
  const [showMenu, setShowMenu] = useState(false);

  const ControlBtn = ({
    active,
    danger,
    onClick,
    children,
    label,
    badge,
    accent,
  }: any) => (
    <div className="flex flex-col items-center gap-1 sm:gap-2 group">
      <button
        onClick={onClick}
        title={label}
        className={`relative h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 backdrop-blur-xl border ${danger
          ? "bg-rose-500 text-white border-rose-400/50 hover:bg-rose-600 shadow-lg shadow-rose-500/20"
          : active
            ? `${accent || "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30 shadow-lg shadow-primary/10"}`
            : "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20"
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

  const MenuBtn = ({
    active,
    danger,
    onClick,
    children,
    label,
    accent,
  }: any) => (
    <button
      onClick={onClick}
      title={label}
      className={`w-full px-3 py-2 text-sm rounded-lg flex items-center gap-2 transition-all ${danger
        ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
        : active
          ? `${accent || "bg-primary/20 text-primary hover:bg-primary/30"}`
          : "bg-white/5 text-white hover:bg-white/10"
        }`}
    >
      {children}
      <span className="font-semibold text-xs uppercase">{label}</span>
    </button>
  );

  return (
    <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[95%] sm:w-auto">
      <div className="glass-dark px-3 sm:px-8 py-2.5 sm:py-4 rounded-[20px] sm:rounded-[32px] flex items-center gap-2 sm:gap-3 md:gap-6 border border-white/10 shadow-2xl backdrop-blur-2xl pointer-events-auto">
        {/* Media Controls Group - Left Side */}
        <div className="flex items-center gap-2 sm:gap-4">
          <ControlBtn
            active={audioEnabled}
            onClick={onToggleAudio}
            label={audioEnabled ? "Mute" : "Unmute"}
          >
            {audioEnabled ? (
              <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <MicOff className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </ControlBtn>

          <ControlBtn
            active={videoEnabled}
            onClick={onToggleVideo}
            label={videoEnabled ? "Stop Video" : "Start Video"}
          >
            {videoEnabled ? (
              <Video className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </ControlBtn>

          <ControlBtn
            active={raisedHand}
            onClick={onToggleRaiseHand}
            label={raisedHand ? "Lower Hand" : "Raise Hand"}
            accent={
              raisedHand
                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                : ""
            }
          >
            <Hand className="h-5 w-5 sm:h-6 sm:w-6" />
          </ControlBtn>
        </div>

        {/* Feature Controls Group - Hidden on lg and below, shown in menu */}
        <div className="hidden lg:flex items-center gap-2 sm:gap-4">
          <ControlBtn
            active={screenSharing}
            onClick={onToggleScreenShare}
            label={screenSharing ? "Stop Sharing" : "Share Screen"}
            accent={
              screenSharing
                ? "bg-primary/20 text-primary border-primary/30"
                : ""
            }
          >
            <Monitor className="h-5 w-5 sm:h-6 sm:w-6" />
          </ControlBtn>

          <ControlBtn
            active={chatOpen}
            onClick={onToggleChat}
            label="Messages"
            accent={
              chatOpen ? "bg-primary/20 text-primary border-primary/30" : ""
            }
          >
            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
          </ControlBtn>

          <ControlBtn
            active={transcriptOpen}
            onClick={onToggleTranscript}
            label="Transcript"
            accent={
              transcriptOpen
                ? "bg-primary/20 text-primary border-primary/30"
                : ""
            }
          >
            <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
          </ControlBtn>

          <ControlBtn active={false} onClick={onCopyLink} label="Invite">
            <UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />
          </ControlBtn>

          {isHost && (
            <ControlBtn
              active={!isLocked}
              onClick={onToggleLock}
              label={isLocked ? "Locked" : "Unlocked"}
              accent={
                !isLocked
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  : "bg-amber-500/20 text-amber-500 border-amber-500/30"
              }
            >
              {isLocked ? (
                <Lock className="h-5 w-5 sm:h-6 sm:w-6" />
              ) : (
                <Unlock className="h-5 w-5 sm:h-6 sm:w-6" />
              )}
            </ControlBtn>
          )}
        </div>

        {/* Exit Controls Group - Middle */}
        <div className="flex items-center gap-2 sm:gap-4">
          <ControlBtn active={false} danger onClick={onLeave} label="Leave">
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


        <div className="lg:hidden relative md:ml-auto">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition-all backdrop-blur-xl"
            title="More options"
          >
            <MoreVertical className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute bottom-20 right-0 w-48 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl p-2 space-y-1">
              <MenuBtn
                active={screenSharing}
                onClick={() => {
                  onToggleScreenShare();
                  setShowMenu(false);
                }}
                label={screenSharing ? "Stop Sharing" : "Share Screen"}
                accent={
                  screenSharing ? "bg-primary/20 text-primary" : ""
                }
              >
                {screenSharing ? (
                  <MonitorOff className="h-4 w-4" />
                ) : (
                  <Monitor className="h-4 w-4" />
                )}
              </MenuBtn>

              <MenuBtn
                active={chatOpen}
                onClick={() => {
                  onToggleChat();
                  setShowMenu(false);
                }}
                label="Messages"
                accent={chatOpen ? "bg-primary/20 text-primary" : ""}
              >
                <MessageSquare className="h-4 w-4" />
              </MenuBtn>

              <MenuBtn
                active={transcriptOpen}
                onClick={() => {
                  onToggleTranscript();
                  setShowMenu(false);
                }}
                label="Transcript"
                accent={
                  transcriptOpen ? "bg-primary/20 text-primary" : ""
                }
              >
                <FileText className="h-4 w-4" />
              </MenuBtn>

              <MenuBtn
                active={false}
                onClick={() => {
                  onCopyLink();
                  setShowMenu(false);
                }}
                label="Invite"
              >
                <UserPlus className="h-4 w-4" />
              </MenuBtn>

              {isHost && (
                <MenuBtn
                  active={!isLocked}
                  onClick={() => {
                    onToggleLock();
                    setShowMenu(false);
                  }}
                  label={isLocked ? "Locked" : "Unlocked"}
                  accent={
                    !isLocked
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-amber-500/20 text-amber-500"
                  }
                >
                  {isLocked ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Unlock className="h-4 w-4" />
                  )}
                </MenuBtn>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Branding Subtitle */}
      <div className="flex items-center justify-center gap-2 mt-4 opacity-40">
        <Shield className="h-3 w-3 text-primary" />
        <span className="text-[8px] font-black text-white uppercase tracking-[0.4em]">
          OmniSuiteAI Secure Realtime Pipeline
        </span>
      </div>
    </div>
  );
};
