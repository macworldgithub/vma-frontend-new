// 'use client';

// import { useEffect, useRef, useCallback, useState } from 'react';
// import { Socket } from 'socket.io-client';

// interface UseDeepgramTranscriptionProps {
//   roomId: string;
//   socket: Socket | null;
//   audioEnabled: boolean;
//   transcriptionEnabled: boolean;
//   localStream: MediaStream | null;
//   hasPeers: boolean;
// }

// /**
//  * Captures the local user's microphone audio via MediaRecorder and streams
//  * 250 ms binary chunks to the NestJS backend over Socket.IO.
//  *
//  * The backend forwards each chunk to Deepgram and broadcasts transcripts
//  * (interim + final) back to every participant in the room via:
//  *   • 'new-transcript-interim'  – live subtitles for all participants
//  *   • 'new-transcript'          – finalised, persisted segment for all participants
//  */
// export const useDeepgramTranscription = ({
//   roomId,
//   socket,
//   audioEnabled,
//   transcriptionEnabled,
//   localStream,
//   hasPeers,
// }: UseDeepgramTranscriptionProps) => {
//   const recorderRef   = useRef<MediaRecorder | null>(null);
//   const streamingRef  = useRef(false);

//   // Always-current refs so callbacks never close over stale values
//   const socketRef      = useRef(socket);
//   const localStreamRef = useRef(localStream);
//   const roomIdRef      = useRef(roomId);

//   useEffect(() => { socketRef.current      = socket;      }, [socket]);
//   useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
//   useEffect(() => { roomIdRef.current      = roomId;      }, [roomId]);

//   // ── Start capturing & streaming audio ─────────────────────────────────
//   const startTranscription = useCallback(() => {
//     const sock   = socketRef.current;
//     const stream = localStreamRef.current;
//     const rid    = roomIdRef.current;

//     if (!sock || !stream || streamingRef.current) return;

//     const audioTracks = stream.getAudioTracks();
//     if (!audioTracks.length) {
//       console.warn('[Deepgram] No audio tracks found on localStream');
//       return;
//     }

//     // Tell backend to open a Deepgram stream for this socket
//     sock.emit('start-transcription', { roomId: rid });

//     // Wait for backend to confirm Deepgram connection is OPEN before capturing audio
//     sock.once('transcription-started', () => {
//       if (!streamingRef.current && socketRef.current) {
//         // Pick the best supported MIME type (Deepgram accepts webm/ogg/mp4 containers)
//         const mimeType =
//           MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
//           MediaRecorder.isTypeSupported('audio/webm')             ? 'audio/webm'             :
//           MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')  ? 'audio/ogg;codecs=opus'  :
//           '';

//         try {
//           const audioOnlyStream = new MediaStream(audioTracks);
//           const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
//           const recorder = new MediaRecorder(audioOnlyStream, options);

//           recorder.ondataavailable = (evt) => {
//             if (evt.data.size > 0 && socketRef.current?.connected) {
//               // Convert Blob → ArrayBuffer → send as binary frame
//               evt.data.arrayBuffer().then((buf) => {
//                 socketRef.current?.emit('audio-chunk', buf);
//               });
//             }
//           };

//           recorder.onerror = (err) => {
//             console.error('[Deepgram] MediaRecorder error:', err);
//           };

//           recorder.start(250); // emit ondataavailable every 250 ms
//           recorderRef.current = recorder;
//           streamingRef.current = true;

//           console.log('[Deepgram] Transcription started — MIME:', mimeType || 'browser default');
//         } catch (err) {
//           console.error('[Deepgram] Failed to start MediaRecorder:', err);
//         }
//       }
//     });
//   }, []); // stable — reads via refs

//   // ── Stop capturing & notify backend ───────────────────────────────────
//   const stopTranscription = useCallback(() => {
//     if (!streamingRef.current) return;

//     try {
//       if (recorderRef.current && recorderRef.current.state !== 'inactive') {
//         recorderRef.current.stop();
//       }
//     } catch (err) {
//       console.warn('[Deepgram] Error stopping MediaRecorder:', err);
//     }

//     recorderRef.current  = null;
//     streamingRef.current = false;

//     socketRef.current?.emit('stop-transcription', { roomId: roomIdRef.current });
//     console.log('[Deepgram] Transcription stopped');
//   }, []); // stable — reads via refs

//   const [retryTrigger, setRetryTrigger] = useState(0);

//   // ── Listen for unexpected disconnects from Deepgram ───────────────────
//   useEffect(() => {
//     const sock = socketRef.current;
//     if (!sock) return;

//     const handleDisconnect = () => {
//       console.warn('[Deepgram] Backend disconnected stream. Restarting...');
//       stopTranscription();
//       // Trigger a restart after a short delay to ensure clean teardown
//       setTimeout(() => setRetryTrigger((r) => r + 1), 1000);
//     };

//     sock.on('transcription-disconnected', handleDisconnect);
//     return () => {
//       sock.off('transcription-disconnected', handleDisconnect);
//     };
//   }, [socket, stopTranscription]);

//   // ── React to audio/transcription toggle or dependency changes ─────────
//   useEffect(() => {
//     const shouldStream = audioEnabled && transcriptionEnabled && !!socket && !!localStream && hasPeers;

//     if (shouldStream) {
//       if (!streamingRef.current) startTranscription();
//     } else {
//       if (streamingRef.current) stopTranscription();
//     }
//   }, [audioEnabled, transcriptionEnabled, socket, localStream, hasPeers, startTranscription, stopTranscription, retryTrigger]);

//   // ── Cleanup on unmount ────────────────────────────────────────────────
//   useEffect(() => {
//     return () => { stopTranscription(); };
//   }, [stopTranscription]);
// };

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Socket } from 'socket.io-client';

interface UseDeepgramTranscriptionProps {
  roomId: string;
  socket: Socket | null;
  audioEnabled: boolean;
  transcriptionEnabled: boolean;
  localStream: MediaStream | null;
  // NOTE: `hasPeers` removed — transcription must work independently of
  // peer-connection timing so both the first and second user get captions.
}

/**
 * Captures the local user's microphone audio via MediaRecorder and streams
 * 250 ms binary chunks to the NestJS backend over Socket.IO.
 *
 * Architecture (two independent lifecycles):
 *   1. **Deepgram connection** — opened when `transcriptionEnabled` is true,
 *      closed when false or on unmount. Survives mute/unmute.
 *   2. **MediaRecorder** — started when audio is enabled AND Deepgram is ready,
 *      stopped on mute (cheap, no network cost), restarted on unmute.
 *
 * This separation prevents the expensive Deepgram WebSocket teardown/setup
 * cycle on every mute toggle and eliminates the race where the recorder
 * starts before Deepgram is ready.
 */
export const useDeepgramTranscription = ({
  roomId,
  socket,
  audioEnabled,
  transcriptionEnabled,
  localStream,
}: UseDeepgramTranscriptionProps) => {
  // ── Refs for latest values (avoid stale closures) ─────────────────
  const socketRef = useRef(socket);
  const localStreamRef = useRef(localStream);
  const roomIdRef = useRef(roomId);
  const audioEnabledRef = useRef(audioEnabled);
  const transcriptionEnabledRef = useRef(transcriptionEnabled);

  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { audioEnabledRef.current = audioEnabled; }, [audioEnabled]);
  useEffect(() => { transcriptionEnabledRef.current = transcriptionEnabled; }, [transcriptionEnabled]);

  // ── Internal state ────────────────────────────────────────────────
  const recorderRef = useRef<MediaRecorder | null>(null);
  const deepgramReadyRef = useRef(false);
  const openingRef = useRef(false); // prevents duplicate open attempts
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Track which audio track the recorder is capturing so we can detect
  // when the track changes (device switch, re-enable mic, etc.)
  const activeTrackIdRef = useRef<string | null>(null);

  // ── MediaRecorder helpers ─────────────────────────────────────────

  const stopRecorder = useCallback(() => {
    if (!recorderRef.current) return;
    try {
      if (recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } catch (err) {
      console.warn('[Deepgram] Error stopping MediaRecorder:', err);
    }
    recorderRef.current = null;
    activeTrackIdRef.current = null;
    console.log('[Deepgram] MediaRecorder stopped');
  }, []);

  const startRecorder = useCallback(() => {
    // Guard: don't start if already recording or prerequisites missing
    if (recorderRef.current) return;

    const stream = localStreamRef.current;
    const sock = socketRef.current;
    if (!stream || !sock?.connected || !deepgramReadyRef.current) return;

    const audioTracks = stream.getAudioTracks().filter(t => t.readyState === 'live');
    if (!audioTracks.length) {
      console.warn('[Deepgram] No live audio tracks on localStream — cannot start recorder');
      return;
    }

    // Pick the best MIME type (Deepgram accepts webm/ogg/mp4 containers)
    const mimeType =
      MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
      MediaRecorder.isTypeSupported('audio/webm')             ? 'audio/webm'             :
      MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')  ? 'audio/ogg;codecs=opus'  :
      '';

    try {
      const audioOnlyStream = new MediaStream(audioTracks);
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(audioOnlyStream, options);

      recorder.ondataavailable = (evt) => {
        if (evt.data.size > 0 && socketRef.current?.connected && deepgramReadyRef.current) {
          evt.data.arrayBuffer().then((buf) => {
            socketRef.current?.emit('audio-chunk', buf);
          });
        }
      };

      recorder.onerror = (err) => {
        console.error('[Deepgram] MediaRecorder error:', err);
        // Try to restart after a brief pause
        stopRecorder();
        setTimeout(() => {
          if (audioEnabledRef.current && deepgramReadyRef.current && transcriptionEnabledRef.current) {
            startRecorder();
          }
        }, 500);
      };

      // When an audio track ends (device unplugged, track stopped externally),
      // stop the recorder so the next effect cycle can restart with a new track.
      audioTracks[0].addEventListener('ended', () => {
        console.warn('[Deepgram] Audio track ended — stopping recorder');
        stopRecorder();
      });

      recorder.start(250);
      recorderRef.current = recorder;
      activeTrackIdRef.current = audioTracks[0].id;

      console.log('[Deepgram] MediaRecorder started — MIME:', mimeType || 'browser default', '— Track:', audioTracks[0].label);
    } catch (err) {
      console.error('[Deepgram] Failed to create/start MediaRecorder:', err);
    }
  }, [stopRecorder]);

  // ── Deepgram connection helpers ───────────────────────────────────

  const closeDeepgram = useCallback(() => {
    stopRecorder();

    if (deepgramReadyRef.current || openingRef.current) {
      socketRef.current?.emit('stop-transcription', { roomId: roomIdRef.current });
      console.log('[Deepgram] Sent stop-transcription to backend');
    }

    deepgramReadyRef.current = false;
    openingRef.current = false;
  }, [stopRecorder]);

  const openDeepgram = useCallback(() => {
    const sock = socketRef.current;
    if (!sock?.connected || deepgramReadyRef.current || openingRef.current) return;

    openingRef.current = true;
    console.log('[Deepgram] Requesting backend to open Deepgram stream…');

    // Clean up any leftover listeners from previous attempts
    sock.off('transcription-started');
    sock.off('transcription-error');

    const timeoutId = setTimeout(() => {
      console.error('[Deepgram] Backend did not confirm Deepgram stream within 12 s');
      openingRef.current = false;
      sock.off('transcription-started');
      sock.off('transcription-error');
      // Retry
      setTimeout(() => setRetryTrigger(r => r + 1), 2000);
    }, 12_000);

    sock.once('transcription-started', () => {
      clearTimeout(timeoutId);
      sock.off('transcription-error');
      openingRef.current = false;
      deepgramReadyRef.current = true;
      console.log('[Deepgram] Backend confirmed Deepgram connection is ready');

      // If audio is already enabled, start the recorder immediately
      if (audioEnabledRef.current && localStreamRef.current) {
        startRecorder();
      }
    });

    sock.once('transcription-error', (err: any) => {
      clearTimeout(timeoutId);
      sock.off('transcription-started');
      openingRef.current = false;
      console.error('[Deepgram] Backend reported error opening Deepgram:', err);
      // Retry after a delay
      setTimeout(() => setRetryTrigger(r => r + 1), 3000);
    });

    sock.emit('start-transcription', { roomId: roomIdRef.current });
  }, [startRecorder]);

  // ── Effect: Manage Deepgram connection lifecycle ──────────────────
  // Opens when transcription is enabled, closes when disabled.
  useEffect(() => {
    if (!socket) {
      // Socket gone — clean everything
      if (deepgramReadyRef.current || openingRef.current) {
        stopRecorder();
        deepgramReadyRef.current = false;
        openingRef.current = false;
      }
      return;
    }

    if (transcriptionEnabled) {
      if (!deepgramReadyRef.current && !openingRef.current) {
        openDeepgram();
      }
    } else {
      closeDeepgram();
    }
  }, [socket, transcriptionEnabled, retryTrigger, openDeepgram, closeDeepgram, stopRecorder]);

  // ── Effect: Manage MediaRecorder based on audio + readiness ───────
  // This runs whenever audioEnabled or localStream changes.
  useEffect(() => {
    if (!deepgramReadyRef.current) return;

    if (audioEnabled && localStream) {
      // Check if we need to (re)start the recorder
      const currentTracks = localStream.getAudioTracks().filter(t => t.readyState === 'live');
      const currentTrackId = currentTracks[0]?.id ?? null;

      if (recorderRef.current && activeTrackIdRef.current !== currentTrackId) {
        // Audio track changed (device switch, re-enabled mic) — restart recorder
        console.log('[Deepgram] Audio track changed — restarting recorder');
        stopRecorder();
      }

      if (!recorderRef.current) {
        // Small delay to let tracks settle after a device change
        const t = setTimeout(() => startRecorder(), 150);
        return () => clearTimeout(t);
      }
    } else {
      // Audio disabled or no stream — stop recorder but keep Deepgram alive
      if (recorderRef.current) {
        stopRecorder();
      }
    }
  }, [audioEnabled, localStream, startRecorder, stopRecorder]);

  // ── Effect: Handle unexpected Deepgram disconnects ────────────────
  useEffect(() => {
    if (!socket) return;

    const handleDisconnect = () => {
      console.warn('[Deepgram] Backend reported Deepgram stream disconnect — will retry');
      stopRecorder();
      deepgramReadyRef.current = false;
      openingRef.current = false;
      // Retry after a short delay so teardown completes
      setTimeout(() => setRetryTrigger(r => r + 1), 1500);
    };

    socket.on('transcription-disconnected', handleDisconnect);
    return () => {
      socket.off('transcription-disconnected', handleDisconnect);
    };
  }, [socket, stopRecorder]);

  // ── Cleanup on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      closeDeepgram();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
