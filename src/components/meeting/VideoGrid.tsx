'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  MicOff,
  VideoOff,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Hand
} from 'lucide-react';

interface Peer {
  socketId: string;
  userId: string;
  userName: string;
  stream: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
  raisedHand?: boolean;
}

interface VideoGridProps {
  peers: Map<string, Peer>;
  localStream: MediaStream | null;
  localUserName: string;
  localAudioEnabled: boolean;
  localVideoEnabled: boolean;
  localRaisedHand?: boolean; // <-- ADD THIS
}

// ─── VideoTile ────────────────────────────────────────────────────────────────

const VideoTile = ({
  stream,
  userName,
  audioEnabled,
  videoEnabled,
  isLocal,
  socketId,
  raisedHand, // <-- NOW DESTRUCTURED
}: {
  stream: MediaStream | null;
  userName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isLocal?: boolean;
  socketId?: string;
  raisedHand?: boolean;
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

  return (
    <div
      ref={tileRef}
      className="relative rounded-3xl overflow-hidden bg-slate-900 border border-white/5 flex items-center justify-center group transition-all duration-500 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 h-full w-full"
    >
      {!isLocal && stream && <audio ref={audioRef} autoPlay playsInline />}

      {videoEnabled && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          key={`video-${socketId || 'local'}`}
          className={`w-full h-full object-cover transition-transform duration-300 ${isLocal ? 'mirror' : ''}`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full bg-[#0a0f1d]">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative h-20 w-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl font-black text-primary italic shadow-2xl">
              {userName?.[0]?.toUpperCase() || '?'}
            </div>
          </div>
          <p className="mt-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
            Camera Deactivated
          </p>
        </div>
      )}

      {/* ── Raised-Hand Badge ─────────────────────────────────────────────── */}
      {raisedHand && (
        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-yellow-400/20 border border-yellow-400/40 backdrop-blur-md shadow-lg shadow-yellow-400/10 animate-bounce-subtle">
          <Hand className="h-4 w-4 text-yellow-400" />
          <span className="text-[9px] font-black text-yellow-300 uppercase tracking-widest">
            Hand Raised
          </span>
        </div>
      )}

      {/* ── Top Controls Overlay ──────────────────────────────────────────── */}
      <div className="absolute top-4 right-4 flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={zoomOut}
          className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-colors"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={zoomIn}
          className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-colors"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-colors"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Bottom Information Overlay ────────────────────────────────────── */}
      <div className="absolute bottom-20 lg:bottom-6 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="glass-dark px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3 backdrop-blur-xl pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-[10px] font-black text-white uppercase italic tracking-wider">
              {userName}
              {isLocal && <span className="text-primary ml-1">(HOST)</span>}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {!audioEnabled && (
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-md flex items-center justify-center">
              <MicOff className="h-4 w-4 text-rose-500" />
            </div>
          )}
          {!videoEnabled && (
            <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center">
              <VideoOff className="h-4 w-4 text-slate-400" />
            </div>
          )}
        </div>
      </div>

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
}: VideoGridProps) => {
  const peerArray = Array.from(peers.values());
  const participants = [null, ...peerArray];
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
    <div className="h-full w-full p-2 sm:p-4 md:p-6 bg-[#050810] overflow-hidden">
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

        {peerArray.map((peer) => (
          <VideoTile
            key={peer.socketId}
            stream={peer.stream}
            userName={peer.userName}
            audioEnabled={peer.audioEnabled}
            videoEnabled={peer.videoEnabled}
            socketId={peer.socketId}
            raisedHand={peer.raisedHand} // <-- ALREADY CORRECT, now actually renders
          />
        ))}
      </div>
    </div>
  );
};
