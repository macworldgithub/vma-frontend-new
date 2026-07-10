'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  MicOff,
  VideoOff,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Hand,
  UserMinus,
} from 'lucide-react';

interface Peer {
  socketId: string;
  userId: string;
  userName: string;
  stream: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
  raisedHand?: boolean;
  isScreenShare?: boolean;
}

interface VideoGridProps {
  peers: Map<string, Peer>;
  localStream: MediaStream | null;
  localUserName: string;
  localAudioEnabled: boolean;
  localVideoEnabled: boolean;
  localRaisedHand?: boolean;
  isHost?: boolean;
  onKickParticipant?: (targetUserId: string) => void;
}

// ─── VideoTile ────────────────────────────────────────────────────────────────

const VideoTile = ({
  stream,
  userName,
  audioEnabled,
  videoEnabled,
  isLocal,
  socketId,
  userId,
  raisedHand,
  isScreenShare,
  canKick,
  onKick,
}: {
  stream: MediaStream | null;
  userName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isLocal?: boolean;
  socketId?: string;
  userId?: string;
  raisedHand?: boolean;
  isScreenShare?: boolean;
  canKick?: boolean;
  onKick?: (targetUserId: string) => void;
}) => {
  const [zoom, setZoom] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const tileRef = useRef<HTMLDivElement>(null);
  const [position] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, stream?.getVideoTracks().length]);

  useEffect(() => {
    if (audioRef.current && stream && !isLocal) {
      audioRef.current.srcObject = stream;
    }
  }, [stream, isLocal, stream?.getAudioTracks().length]);

  const toggleFullscreen = async () => {
    if (!tileRef.current) return;
    if (!document.fullscreenElement) {
      await tileRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const zoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 1));

  const handleKick = () => {
    if (!userId || !onKick) return;
    if (window.confirm(`Remove ${userName} from the meeting?`)) {
      onKick(userId);
    }
  };

  return (
    <div
      ref={tileRef}
      className={`
relative
overflow-hidden
flex
items-center
justify-center
transition-all
duration-500
h-full
w-full
${isScreenShare
          ? "rounded-none sm:rounded-3xl bg-black border-0"
          : "rounded-3xl bg-card border border-border hover:border-primary/30 hover:shadow-xl"}
`}
    >
      {!isLocal && stream && <audio ref={audioRef} autoPlay playsInline />}

      {videoEnabled && stream ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            key={`video-${socketId || "local"}`}
            className={[
              "w-full",
              "h-full",
              "transition-transform",
              "duration-300",
              isScreenShare ? "object-contain bg-black" : "object-cover",
              isLocal ? "mirror" : "",
            ].join(" ")}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            }}
          />

          {isScreenShare && (
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
              <span className="text-base">🖥</span>
              <span>{userName} is presenting</span>
            </div>
          )}
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-muted/40">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/10 blur-2xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card text-3xl font-black italic text-primary shadow-md">
              {userName?.[0]?.toUpperCase() || "?"}
            </div>
          </div>

          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            Camera Deactivated
          </p>
        </div>
      )}

      {/* ── Raised-Hand Badge ─────────────────────────────────────────────── */}
      {raisedHand && (
        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-100 border border-amber-300 backdrop-blur-md shadow-md animate-bounce-subtle">
          <Hand className="h-4 w-4 text-amber-600" />
          <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest">
            Hand Raised
          </span>
        </div>
      )}

      {/* ── Top Controls Overlay ──────────────────────────────────────────── */}
      {!isScreenShare && (
        <>
          <div className="absolute top-4 right-4 flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={zoomOut}
              className="p-2 rounded-xl bg-white/70 hover:bg-white/95 text-foreground hover:text-primary backdrop-blur-md border border-border shadow-sm transition-colors"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={zoomIn}
              className="p-2 rounded-xl bg-white/70 hover:bg-white/95 text-foreground hover:text-primary backdrop-blur-md border border-border shadow-sm transition-colors"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-white/70 hover:bg-white/95 text-foreground hover:text-primary backdrop-blur-md border border-border shadow-sm transition-colors"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            {canKick && (
              <button
                onClick={handleKick}
                title={`Remove ${userName}`}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/90 text-rose-500 hover:text-white backdrop-blur-md border border-rose-500/20 shadow-sm transition-colors"
              >
                <UserMinus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </>
      )}
      {/* ── Bottom Information Overlay ────────────────────────────────────── */}
      {!isScreenShare && (
        <>
          <div className="absolute bottom-20 lg:bottom-6 left-4 right-4 flex items-center justify-between pointer-events-none">
            <div className="glass px-4 py-2 rounded-2xl border border-border flex items-center gap-3 backdrop-blur-xl pointer-events-auto">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
                <span className="text-[10px] font-black text-foreground uppercase italic tracking-wider">
                  {userName}
                  {isLocal && <span className="text-primary ml-1">(HOST)</span>}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              {!isScreenShare && !audioEnabled && (
                <div className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-md flex items-center justify-center">
                  <MicOff className="h-4 w-4 text-rose-500" />
                </div>
              )}
              {!isScreenShare && !videoEnabled && (
                <div className="h-9 w-9 rounded-xl bg-muted border border-border backdrop-blur-md flex items-center justify-center">
                  <VideoOff className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {/* Active Speaker Border */}
      <div className="absolute inset-0 border-2 border-primary opacity-0 pointer-events-none transition-opacity duration-300 rounded-3xl" />
    </div>
  );
};

// ─── VideoGrid ────────────────────────────────────────────────────────────────

export const VideoGrid = ({
  peers,
  localStream,
  localUserName,
  localAudioEnabled,
  localVideoEnabled,
  localRaisedHand,
  isHost,
  onKickParticipant,
}: VideoGridProps) => {
  const peerArray = Array.from(peers.values());

  // Screen-share tiles are "virtual peers" whose socketId ends with
  // "-screen" — they don't represent a kickable participant.
  const screenPeer = peerArray.find(
    (p) => p.isScreenShare || p.socketId.endsWith('-screen')
  );
  const cameraPeers = peerArray.filter((p) => p !== screenPeer);

  // ── Spotlight layout: a screen share is active ─────────────────────────
  // The shared screen takes over the main viewing area (using object-contain
  // so nothing is cropped), and everyone's camera — including local — drops
  // into a scrollable filmstrip below/beside it. This replaces the equal-size
  // grid, which previously squeezed the screen share into one small cell.
  if (screenPeer) {
    return (
      <div className="h-full w-full bg-background overflow-hidden flex flex-col p-0 sm:p-3 md:p-6 gap-2">
        <div className="flex-1 min-h-0 flex items-center justify-center bg-black rounded-none sm:rounded-3xl overflow-hidden">
          <VideoTile
            stream={screenPeer.stream}
            userName={screenPeer.userName}
            audioEnabled={screenPeer.audioEnabled}
            videoEnabled={screenPeer.videoEnabled}
            socketId={screenPeer.socketId}
            isScreenShare
          />
        </div>

        <div className="flex gap-2 overflow-x-auto overflow-y-hidden shrink-0 h-14 sm:h-20 md:h-28 px-2 pb-2">
          <div className="h-full aspect-[16/9] shrink-0">
            <VideoTile
              stream={localStream}
              userName={localUserName}
              audioEnabled={localAudioEnabled}
              videoEnabled={localVideoEnabled}
              isLocal
              raisedHand={localRaisedHand}
            />
          </div>

          {cameraPeers.map((peer) => (
            <div key={peer.socketId} className="h-full aspect-[16/9] shrink-0">
              <VideoTile
                stream={peer.stream}
                userName={peer.userName}
                audioEnabled={peer.audioEnabled}
                videoEnabled={peer.videoEnabled}
                socketId={peer.socketId}
                userId={peer.userId}
                raisedHand={peer.raisedHand}
                canKick={Boolean(isHost && onKickParticipant)}
                onKick={onKickParticipant}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Standard grid layout: no active screen share ───────────────────────
  const participants = [null, ...cameraPeers];
  const count = participants.length;

  const getGridCols = () => {
    // On mobile we always use 2 cols for 3+ participants so tiles share
    // the available height rather than stacking and causing scroll.
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-2 lg:grid-cols-3';
    if (count <= 9) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4';
  };

  return (
    <div className="h-full w-full p-2 sm:p-4 md:p-6 bg-background overflow-hidden">
      <div
        className={`grid gap-2 sm:gap-3 md:gap-4 w-full h-full ${getGridCols()} auto-rows-fr`}
      >
        <VideoTile
          stream={localStream}
          userName={localUserName}
          audioEnabled={localAudioEnabled}
          videoEnabled={localVideoEnabled}
          isLocal
          raisedHand={localRaisedHand}
        />

        {cameraPeers.map((peer) => (
          <VideoTile
            key={peer.socketId}
            stream={peer.stream}
            userName={peer.userName}
            audioEnabled={peer.audioEnabled}
            videoEnabled={peer.videoEnabled}
            socketId={peer.socketId}
            userId={peer.userId}
            raisedHand={peer.raisedHand}
            canKick={Boolean(isHost && onKickParticipant)}
            onKick={onKickParticipant}
          />
        ))}
      </div>
    </div>
  );
};
