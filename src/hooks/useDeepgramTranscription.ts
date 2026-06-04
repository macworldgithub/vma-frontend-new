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
  hasPeers: boolean;
}

const TARGET_SAMPLE_RATE = 16000;     // must match backend
const PROCESSOR_BUFFER_SIZE = 4096;   // ≈85 ms @ 48 kHz

// ── PCM helpers ───────────────────────────────────────────────────────
function floatToInt16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** Block-averaging downsampler — good enough for speech, cheap. */
function downsample(buffer: Float32Array, srcRate: number, dstRate: number): Float32Array {
  if (srcRate === dstRate) return buffer;
  if (srcRate < dstRate) return buffer; // do not upsample
  const ratio = srcRate / dstRate;
  const newLength = Math.floor(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < newLength) {
    const nextOffsetBuffer = Math.floor((offsetResult + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      sum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? sum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

/**
 * Captures the local user's microphone audio with the Web Audio API, downsamples
 * it to 16 kHz mono Int16 PCM, and streams those raw PCM frames to the backend.
 *
 * Why PCM and not MediaRecorder?
 *   • MediaRecorder produces a WebM/Opus container. ONLY the first chunk
 *     carries the header. If that header chunk is delayed, dropped, or arrives
 *     before Deepgram's WebSocket is fully open, every subsequent chunk fails
 *     to decode and the user gets ZERO transcripts for the whole session.
 *   • Raw PCM has no container — every chunk is independently decodable.
 */
export const useDeepgramTranscription = ({
  roomId,
  socket,
  audioEnabled,
  transcriptionEnabled,
  localStream,
  hasPeers,
}: UseDeepgramTranscriptionProps) => {
  // Audio graph
  const audioContextRef  = useRef<AudioContext | null>(null);
  const sourceNodeRef    = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const silentGainRef    = useRef<GainNode | null>(null);

  // Lifecycle flags
  const streamingRef = useRef(false);   // PCM pump active
  const startingRef  = useRef(false);   // currently negotiating start

  // Always-current refs so callbacks never close over stale state
  const socketRef      = useRef(socket);
  const localStreamRef = useRef(localStream);
  const roomIdRef      = useRef(roomId);

  useEffect(() => { socketRef.current      = socket;      }, [socket]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { roomIdRef.current      = roomId;      }, [roomId]);

  const [retryTrigger, setRetryTrigger] = useState(0);

  // ── Teardown the Web Audio graph ──────────────────────────────────────
  const teardownAudio = useCallback(() => {
    try {
      if (processorNodeRef.current) {
        processorNodeRef.current.onaudioprocess = null as any;
        processorNodeRef.current.disconnect();
      }
    } catch {}
    try { sourceNodeRef.current?.disconnect(); }    catch {}
    try { silentGainRef.current?.disconnect(); }    catch {}
    try {
      const ctx = audioContextRef.current;
      if (ctx && ctx.state !== 'closed') ctx.close();
    } catch {}
    processorNodeRef.current = null;
    sourceNodeRef.current    = null;
    silentGainRef.current    = null;
    audioContextRef.current  = null;
  }, []);

  // ── Start streaming PCM to the backend ────────────────────────────────
  const startTranscription = useCallback(async () => {
    if (startingRef.current || streamingRef.current) return;

    const sock   = socketRef.current;
    const stream = localStreamRef.current;
    const rid    = roomIdRef.current;

    if (!sock || !stream) return;

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) {
      console.warn('[Deepgram] No audio tracks on localStream');
      return;
    }

    startingRef.current = true;

    // 1. Wait for the backend to confirm Deepgram WebSocket is OPEN.
    //    Register listeners BEFORE emitting so we can't race the response.
    const waitForBackend = new Promise<void>((resolve, reject) => {
      let settled = false;

      const onStarted = () => {
        if (settled) return;
        settled = true;
        sock.off('transcription-error', onError);
        resolve();
      };
      const onError = (err: any) => {
        if (settled) return;
        settled = true;
        sock.off('transcription-started', onStarted);
        reject(new Error(err?.message || 'Backend rejected transcription'));
      };

      sock.once('transcription-started', onStarted);
      sock.once('transcription-error',   onError);

      setTimeout(() => {
        if (settled) return;
        settled = true;
        sock.off('transcription-started', onStarted);
        sock.off('transcription-error',   onError);
        reject(new Error('Timed out waiting for transcription-started'));
      }, 8000);
    });

    sock.emit('start-transcription', { roomId: rid });

    try {
      await waitForBackend;
    } catch (err) {
      console.error('[Deepgram] Backend confirmation failed:', err);
      startingRef.current = false;
      // Make sure the backend cleans up any half-open stream, then retry
      sock.emit('stop-transcription', { roomId: rid });
      setTimeout(() => setRetryTrigger((r) => r + 1), 2000);
      return;
    }

    // 2. Build the Web Audio capture graph.
    try {
      const AudioCtxClass: typeof AudioContext =
        (window.AudioContext || (window as any).webkitAudioContext);
      const ctx = new AudioCtxClass();

      // Some browsers (Chrome with no user gesture, Safari) start suspended.
      if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch {}
      }

      // Build a dedicated MediaStream around just the audio tracks. Sharing
      // the original stream with WebRTC's RTCPeerConnection is fine — tracks
      // can have multiple consumers.
      const micStream = new MediaStream(audioTracks);
      const source = ctx.createMediaStreamSource(micStream);

      // ScriptProcessorNode is deprecated but universally supported. It is
      // sufficient for ~85 ms latency speech capture. An AudioWorklet upgrade
      // is straightforward later if needed.
      const processor = ctx.createScriptProcessor(PROCESSOR_BUFFER_SIZE, 1, 1);

      // ScriptProcessorNode only runs when connected to ctx.destination.
      // Route through a zero-gain node so the mic doesn't loop back to speakers.
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;

      processor.onaudioprocess = (e) => {
        if (!streamingRef.current) return;
        const s = socketRef.current;
        if (!s?.connected) return;

        const input = e.inputBuffer.getChannelData(0);
        const downsampled = downsample(input, ctx.sampleRate, TARGET_SAMPLE_RATE);
        const pcm = floatToInt16(downsampled);

        // Send the underlying ArrayBuffer — socket.io preserves binary as-is.
        s.emit('audio-chunk', pcm.buffer);
      };

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(ctx.destination);

      audioContextRef.current  = ctx;
      sourceNodeRef.current    = source;
      processorNodeRef.current = processor;
      silentGainRef.current    = silentGain;

      streamingRef.current = true;
      startingRef.current  = false;

      console.log(
        `[Deepgram] PCM streaming STARTED — ${ctx.sampleRate} Hz → ${TARGET_SAMPLE_RATE} Hz`,
      );
    } catch (err) {
      console.error('[Deepgram] Failed to set up Web Audio pipeline:', err);
      startingRef.current = false;
      teardownAudio();
      sock.emit('stop-transcription', { roomId: rid });
    }
  }, [teardownAudio]);

  // ── Stop streaming & tell backend ─────────────────────────────────────
  const stopTranscription = useCallback(() => {
    const wasActive = streamingRef.current || startingRef.current;

    streamingRef.current = false;
    startingRef.current  = false;

    teardownAudio();

    if (socketRef.current && roomIdRef.current) {
      socketRef.current.emit('stop-transcription', { roomId: roomIdRef.current });
    }

    if (wasActive) console.log('[Deepgram] PCM streaming STOPPED');
  }, [teardownAudio]);

  // ── Handle backend-initiated disconnects / errors ─────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleDisconnect = () => {
      console.warn('[Deepgram] Backend stream closed unexpectedly. Restarting…');
      stopTranscription();
      setTimeout(() => setRetryTrigger((r) => r + 1), 1500);
    };

    const handleError = (err: any) => {
      console.error('[Deepgram] Backend reported error:', err);
      // On hard errors, stop + retry after a longer delay
      stopTranscription();
      setTimeout(() => setRetryTrigger((r) => r + 1), 3000);
    };

    socket.on('transcription-disconnected', handleDisconnect);
    socket.on('transcription-error',        handleError);

    return () => {
      socket.off('transcription-disconnected', handleDisconnect);
      socket.off('transcription-error',        handleError);
    };
  }, [socket, stopTranscription]);

  // ── React to audio/transcription toggles & dependencies ───────────────
  useEffect(() => {
    const shouldStream =
      audioEnabled && transcriptionEnabled && !!socket && !!localStream && hasPeers;

    if (shouldStream) {
      if (!streamingRef.current && !startingRef.current) {
        startTranscription();
      }
    } else {
      if (streamingRef.current || startingRef.current) {
        stopTranscription();
      }
    }
  }, [
    audioEnabled,
    transcriptionEnabled,
    socket,
    localStream,
    hasPeers,
    retryTrigger,
    startTranscription,
    stopTranscription,
  ]);

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => { stopTranscription(); };
  }, [stopTranscription]);
};
