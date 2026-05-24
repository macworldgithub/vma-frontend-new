// 'use client';

// import React, { useEffect, useRef } from 'react';
// import { MicOff, VideoOff, MoreVertical, Maximize2 } from 'lucide-react';

// interface Peer {
//   socketId: string;
//   userId: string;
//   userName: string;
//   stream: MediaStream;
//   audioEnabled: boolean;
//   videoEnabled: boolean;
// }

// interface VideoGridProps {
//   peers: Map<string, Peer>;
//   localStream: MediaStream | null;
//   localUserName: string;
//   localAudioEnabled: boolean;
//   localVideoEnabled: boolean;
// }

// const VideoTile = ({ stream, userName, audioEnabled, videoEnabled, isLocal, socketId }: {
//   stream: MediaStream | null;
//   userName: string;
//   audioEnabled: boolean;
//   videoEnabled: boolean;
//   isLocal?: boolean;
//   socketId?: string;
// }) => {
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const audioRef = useRef<HTMLAudioElement>(null);

//   useEffect(() => {
//     if (videoRef.current && stream) {
//       videoRef.current.srcObject = stream;
//     }
//   }, [stream]);

//   useEffect(() => {
//     if (audioRef.current && stream && !isLocal) {
//       audioRef.current.srcObject = stream;
//     }
//   }, [stream, isLocal]);

//   return (
//     <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-white/5 aspect-video flex items-center justify-center group transition-all duration-500 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5">
//       {!isLocal && stream && (
//         <audio ref={audioRef} autoPlay playsInline />
//       )}
//       {videoEnabled && stream ? (
//         <video
//           ref={videoRef}
//           autoPlay
//           playsInline
//           key={`video-${socketId || 'local'}`}
//           className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${isLocal ? 'mirror' : ''}`}
//         />
//       ) : (
//       <div className="flex flex-col items-center justify-center w-full h-full bg-[#0a0f1d]">
//         <div className="relative">
//           <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
//           <div className="relative h-20 w-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl font-black text-primary italic shadow-2xl">
//             {userName?.[0]?.toUpperCase() || '?'}
//           </div>
//         </div>
//         <p className="mt-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Camera Deactivated</p>
//       </div>
//       )}

//       {/* Top Controls Overlay */}
//       <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
//         <button className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-all">
//           <Maximize2 className="h-3.5 w-3.5" />
//         </button>
//         <button className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-all">
//           <MoreVertical className="h-3.5 w-3.5" />
//         </button>
//       </div>

//       {/* Bottom Information Overlay */}
//       <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
//         <div className="glass-dark px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3 backdrop-blur-xl pointer-events-auto">
//           <div className="flex items-center gap-2">
//             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
//             <span className="text-[10px] font-black text-white uppercase italic tracking-wider">
//               {userName} {isLocal && <span className="text-primary ml-1">(HOST)</span>}
//             </span>
//           </div>
//         </div>

//         <div className="flex items-center gap-2 pointer-events-auto">
//           {!audioEnabled && (
//             <div className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-md flex items-center justify-center">
//               <MicOff className="h-4 w-4 text-rose-500" />
//             </div>
//           )}
//           {!videoEnabled && (
//             <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center">
//               <VideoOff className="h-4 w-4 text-slate-400" />
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Active Speaker Border (Simulated) */}
//       <div className="absolute inset-0 border-2 border-primary opacity-0 pointer-events-none transition-opacity duration-300 rounded-3xl" />
//     </div>
//   );
// };

// export const VideoGrid = ({ peers, localStream, localUserName, localAudioEnabled, localVideoEnabled }: VideoGridProps) => {
//   const peerArray = Array.from(peers.values());
//   const totalCount = peerArray.length + 1; // +1 for local

//   // Simple grid logic based on participant count
//   const getGridClass = () => {
//     if (totalCount === 1) return 'grid-cols-1 max-w-4xl mx-auto';
//     if (totalCount === 2) return 'grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto';
//     if (totalCount <= 4) return 'grid-cols-1 sm:grid-cols-2 max-w-6xl mx-auto';
//     return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
//   };

//   return (
//     <div className="h-full w-full p-6 md:p-8 flex items-center justify-center bg-[#050810]">
//       <div className={`grid gap-6 w-full ${getGridClass()} transition-all duration-700 ease-in-out`}>
//       {/* Local video */}
//       <VideoTile
//         stream={localStream}
//         userName={localUserName}
//         audioEnabled={localAudioEnabled}
//         videoEnabled={localVideoEnabled}
//         isLocal
//       />
//       {/* Remote peers */}
//       {peerArray.map((peer) => (
//         <VideoTile
//           key={peer.socketId}
//           stream={peer.stream}
//           userName={peer.userName}
//           audioEnabled={peer.audioEnabled}
//           videoEnabled={peer.videoEnabled}
//           socketId={peer.socketId}
//         />
//       ))}
//     </div>
//     </div >
//   );
// };
'use client';

import React, { useEffect, useRef, useReducer, useCallback } from 'react';
import { MicOff, VideoOff, MoreVertical, Maximize2 } from 'lucide-react';

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

const VideoTile = ({
  stream,
  userName,
  audioEnabled,
  videoEnabled,
  isLocal,
}: {
  stream: MediaStream | null;
  userName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isLocal?: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // useReducer as a forceUpdate — increments a counter to trigger re-render
  // when tracks are added to the stream without the stream reference changing
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const tryPlay = useCallback((el: HTMLMediaElement) => {
    el.play().catch(err => {
      if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
        console.warn('[VideoTile] play() error:', err.name);
      }
    });
  }, []);

  // ── Video: bind srcObject + listen for new tracks ─────────────────────────
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !stream) {
      if (videoEl) videoEl.srcObject = null;
      return;
    }

    videoEl.srcObject = stream;

    // Play immediately if video track already exists
    if (stream.getVideoTracks().some(t => t.readyState === 'live')) {
      tryPlay(videoEl);
    }

    const onAddTrack = (e: MediaStreamTrackEvent) => {
      console.log('[VideoTile] addtrack:', e.track.kind, e.track.readyState);
      // Re-render so showVideo is recomputed with the new track
      forceUpdate();
      tryPlay(videoEl);
    };

    stream.addEventListener('addtrack', onAddTrack);
    return () => stream.removeEventListener('addtrack', onAddTrack);
  }, [stream, tryPlay]);

  // ── Audio: separate element for remote peers ──────────────────────────────
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl || !stream || isLocal) return;
    audioEl.srcObject = stream;
    tryPlay(audioEl);

    // Re-attach if audio track arrives late
    const onAddTrack = (e: MediaStreamTrackEvent) => {
      if (e.track.kind === 'audio') {
        audioEl.srcObject = stream;
        tryPlay(audioEl);
      }
    };
    stream.addEventListener('addtrack', onAddTrack);
    return () => stream.removeEventListener('addtrack', onAddTrack);
  }, [stream, isLocal, tryPlay]);

  // ── Compute visibility at render time (after forceUpdate) ─────────────────
  const streamHasLiveVideo = stream
    ? stream.getVideoTracks().some(t => t.readyState === 'live' && t.enabled)
    : false;
  const showVideo = videoEnabled && streamHasLiveVideo;

  return (
    <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-white/5 aspect-video flex items-center justify-center group transition-all duration-500 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5">

      {!isLocal && (
        <audio ref={audioRef} autoPlay playsInline className="hidden" />
      )}

      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={!!isLocal}
          className={[
            'w-full h-full object-cover transition-transform duration-700 group-hover:scale-105',
            isLocal ? 'scale-x-[-1]' : '',
            showVideo ? 'block' : 'hidden',
          ].join(' ')}
        />
      )}

      {!showVideo && (
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

      <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-all">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-all">
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="glass-dark px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3 backdrop-blur-xl pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-[10px] font-black text-white uppercase italic tracking-wider">
              {userName}{isLocal && <span className="text-primary ml-1">(HOST)</span>}
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

      <div className="absolute inset-0 border-2 border-primary opacity-0 pointer-events-none transition-opacity duration-300 rounded-3xl" />
    </div>
  );
};

export const VideoGrid = ({
  peers,
  localStream,
  localUserName,
  localAudioEnabled,
  localVideoEnabled,
}: VideoGridProps) => {
  const peerArray  = Array.from(peers.values());
  const totalCount = peerArray.length + 1;

  const getGridClass = () => {
    if (totalCount === 1) return 'grid-cols-1 max-w-4xl mx-auto';
    if (totalCount === 2) return 'grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto';
    if (totalCount <= 4) return 'grid-cols-1 sm:grid-cols-2 max-w-6xl mx-auto';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  };

  return (
    <div className="h-full w-full p-6 md:p-8 flex items-center justify-center bg-[#050810]">
      <div className={`grid gap-6 w-full ${getGridClass()} transition-all duration-700 ease-in-out`}>
        <VideoTile
          stream={localStream}
          userName={localUserName}
          audioEnabled={localAudioEnabled}
          videoEnabled={localVideoEnabled}
          isLocal
        />
        {peerArray.map(peer => (
          <VideoTile
            key={peer.socketId}
            stream={peer.stream}
            userName={peer.userName}
            audioEnabled={peer.audioEnabled}
            videoEnabled={peer.videoEnabled}
          />
        ))}
      </div>
    </div>
  );
};