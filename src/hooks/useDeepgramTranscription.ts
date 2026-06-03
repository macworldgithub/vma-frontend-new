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

/**
 * Captures the local user's microphone audio via MediaRecorder and streams
 * 250 ms binary chunks to the NestJS backend over Socket.IO.
 *
 * The backend forwards each chunk to Deepgram and broadcasts transcripts
 * (interim + final) back to every participant in the room via:
 *   • 'new-transcript-interim'  – live subtitles for all participants
 *   • 'new-transcript'          – finalised, persisted segment for all participants
 */
export const useDeepgramTranscription = ({
  roomId,
  socket,
  audioEnabled,
  transcriptionEnabled,
  localStream,
  hasPeers,
}: UseDeepgramTranscriptionProps) => {
  const recorderRef   = useRef<MediaRecorder | null>(null);
  const streamingRef  = useRef(false);

  // Always-current refs so callbacks never close over stale values
  const socketRef      = useRef(socket);
  const localStreamRef = useRef(localStream);
  const roomIdRef      = useRef(roomId);

  useEffect(() => { socketRef.current      = socket;      }, [socket]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { roomIdRef.current      = roomId;      }, [roomId]);

  // ── Start capturing & streaming audio ─────────────────────────────────
  const startTranscription = useCallback(() => {
    const sock   = socketRef.current;
    const stream = localStreamRef.current;
    const rid    = roomIdRef.current;

    if (!sock || !stream || streamingRef.current) return;

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) {
      console.warn('[Deepgram] No audio tracks found on localStream');
      return;
    }

    // Tell backend to open a Deepgram stream for this socket
    sock.emit('start-transcription', { roomId: rid });

    // Wait for backend to confirm Deepgram connection is OPEN before capturing audio
    sock.once('transcription-started', () => {
      if (!streamingRef.current && socketRef.current) {
        // Pick the best supported MIME type (Deepgram accepts webm/ogg/mp4 containers)
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
            if (evt.data.size > 0 && socketRef.current?.connected) {
              // Convert Blob → ArrayBuffer → send as binary frame
              evt.data.arrayBuffer().then((buf) => {
                socketRef.current?.emit('audio-chunk', buf);
              });
            }
          };

          recorder.onerror = (err) => {
            console.error('[Deepgram] MediaRecorder error:', err);
          };

          recorder.start(250); // emit ondataavailable every 250 ms
          recorderRef.current = recorder;
          streamingRef.current = true;

          console.log('[Deepgram] Transcription started — MIME:', mimeType || 'browser default');
        } catch (err) {
          console.error('[Deepgram] Failed to start MediaRecorder:', err);
        }
      }
    });
  }, []); // stable — reads via refs

  // ── Stop capturing & notify backend ───────────────────────────────────
  const stopTranscription = useCallback(() => {
    if (!streamingRef.current) return;

    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } catch (err) {
      console.warn('[Deepgram] Error stopping MediaRecorder:', err);
    }

    recorderRef.current  = null;
    streamingRef.current = false;

    socketRef.current?.emit('stop-transcription', { roomId: roomIdRef.current });
    console.log('[Deepgram] Transcription stopped');
  }, []); // stable — reads via refs

  const [retryTrigger, setRetryTrigger] = useState(0);

  // ── Listen for unexpected disconnects from Deepgram ───────────────────
  useEffect(() => {
    const sock = socketRef.current;
    if (!sock) return;

    const handleDisconnect = () => {
      console.warn('[Deepgram] Backend disconnected stream. Restarting...');
      stopTranscription();
      // Trigger a restart after a short delay to ensure clean teardown
      setTimeout(() => setRetryTrigger((r) => r + 1), 1000);
    };

    sock.on('transcription-disconnected', handleDisconnect);
    return () => {
      sock.off('transcription-disconnected', handleDisconnect);
    };
  }, [socket, stopTranscription]);

  // ── React to audio/transcription toggle or dependency changes ─────────
  useEffect(() => {
    const shouldStream = audioEnabled && transcriptionEnabled && !!socket && !!localStream && hasPeers;

    if (shouldStream) {
      if (!streamingRef.current) startTranscription();
    } else {
      if (streamingRef.current) stopTranscription();
    }
  }, [audioEnabled, transcriptionEnabled, socket, localStream, hasPeers, startTranscription, stopTranscription, retryTrigger]);

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => { stopTranscription(); };
  }, [stopTranscription]);
};
