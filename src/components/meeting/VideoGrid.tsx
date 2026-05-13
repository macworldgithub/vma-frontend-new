'use client';

import React, { useEffect, useRef } from 'react';
import { MicOff, VideoOff } from 'lucide-react';

interface Peer {
  socketId: string;
  userId: string;
  userName: string;
  stream: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

interface VideoGridProps {
  peers: Map<string, Peer>;
  localStream: MediaStream | null;
  localUserName: string;
  localAudioEnabled: boolean;
  localVideoEnabled: boolean;
}

const VideoTile = ({ stream, userName, audioEnabled, videoEnabled, isLocal }: {
  stream: MediaStream | null;
  userName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isLocal?: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 aspect-video flex items-center justify-center group transition-all">
      {videoEnabled && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-slate-800 to-slate-900">
          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
            {userName?.[0]?.toUpperCase() || '?'}
          </div>
        </div>
      )}

      {/* Bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between">
        <span className="text-sm font-medium text-white truncate">
          {userName}{isLocal ? ' (You)' : ''}
        </span>
        <div className="flex items-center gap-2">
          {!audioEnabled && (
            <div className="h-6 w-6 rounded-full bg-destructive/80 flex items-center justify-center">
              <MicOff className="h-3 w-3 text-white" />
            </div>
          )}
          {!videoEnabled && (
            <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center">
              <VideoOff className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const VideoGrid = ({ peers, localStream, localUserName, localAudioEnabled, localVideoEnabled }: VideoGridProps) => {
  const peerArray = Array.from(peers.values());
  const totalCount = peerArray.length + 1; // +1 for local

  return (
    <div className="meeting-grid h-full w-full" data-count={Math.min(totalCount, 6)}>
      {/* Local video */}
      <VideoTile
        stream={localStream}
        userName={localUserName}
        audioEnabled={localAudioEnabled}
        videoEnabled={localVideoEnabled}
        isLocal
      />
      {/* Remote peers */}
      {peerArray.map((peer) => (
        <VideoTile
          key={peer.socketId}
          stream={peer.stream}
          userName={peer.userName}
          audioEnabled={peer.audioEnabled}
          videoEnabled={peer.videoEnabled}
        />
      ))}
    </div>
  );
};
