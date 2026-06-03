'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import api from '@/lib/axios';

// 🔍 Diagnostic utility - run this in browser console: WebRTCDiagnostics.checkDevices()
(globalThis as any).WebRTCDiagnostics = {
  async checkDevices() {
    console.log('%c🔍 WebRTC Device Diagnostics', 'font-size: 14px; font-weight: bold; color: #0066cc;');
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log('📋 All Devices Found:', devices.length);
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      console.log(`  📻 Audio Inputs: ${audioInputs.length}`);
      audioInputs.forEach((d, i) => console.log(`    ${i + 1}. ${d.label || 'Unknown'} (${d.deviceId})`));
      console.log(`  📷 Video Inputs: ${videoInputs.length}`);
      videoInputs.forEach((d, i) => console.log(`    ${i + 1}. ${d.label || 'Unknown'} (${d.deviceId})`));
      if (audioInputs.length === 0) console.warn('⚠️ No audio input devices found!');
      if (videoInputs.length === 0) console.warn('⚠️ No video input devices found!');
    } catch (err: any) {
      console.error('❌ Failed to enumerate devices:', err.message);
    }
  },

  async testAudio() {
    console.log('%c🎤 Testing Audio Input', 'font-size: 14px; font-weight: bold; color: #00aa00;');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Audio access GRANTED');
      stream.getTracks().forEach(t => t.stop());
    } catch (err: any) {
      console.error('❌ Audio access DENIED:', err.message);
    }
  },

  async testVideo() {
    console.log('%c📹 Testing Video Input', 'font-size: 14px; font-weight: bold; color: #00aa00;');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log('✅ Video access GRANTED');
      stream.getTracks().forEach(t => t.stop());
    } catch (err: any) {
      console.error('❌ Video access DENIED:', err.message);
    }
  },

  monitorAudioLevels() {
    console.log('%c📊 Monitoring Audio Levels (5 seconds)', 'font-size: 14px; font-weight: bold; color: #00cc00;');
    if (!(window as any).__webrtcDebug?.localStream) {
      console.warn('⚠️ Local stream not available. Start the meeting first.');
      return;
    }
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const stream = (window as any).__webrtcDebug.localStream;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let count = 0;
    const monitor = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const level = Math.round(average);
      const bars = '█'.repeat(Math.round(level / 5));
      console.log(`[${count}] Audio Level: ${bars} ${level} / 255`);
      count++;
      if (count >= 50) { clearInterval(monitor); console.log('✅ Done'); source.disconnect(); }
    }, 100);
  },

  printHelp() {
    console.log('%c📚 Available Diagnostics Commands:', 'font-size: 14px; font-weight: bold;');
    console.log('WebRTCDiagnostics.checkDevices()       - List all audio/video devices');
    console.log('WebRTCDiagnostics.testAudio()          - Test microphone access');
    console.log('WebRTCDiagnostics.testVideo()          - Test camera access');
    console.log('WebRTCDiagnostics.monitorAudioLevels() - Monitor real-time audio input levels');
  }
};

interface UseWebRTCProps {
  roomId: string;
  socket: Socket | null;
  userId: string;
  userName: string;
  initialAudio: boolean;
  initialVideo: boolean;
}

interface Peer {
  socketId: string;
  userId: string;
  userName: string;
  stream: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

/**
 * Builds the best-available audio constraints.
 *
 * Key decisions:
 * - sampleRate 16000 Hz  → matches what Deepgram nova-2 prefers; keeps bitrate low
 * - channelCount 1       → mono is sufficient for voice and required by most ASR pipelines
 * - echoCancellation     → keep ON for call quality (Deepgram receives the processed feed)
 * - noiseSuppression     → keep ON, but NOT autoGainControl — AGC is the main distortion culprit
 * - autoGainControl OFF  → prevents the amplitude pumping that breaks transcription
 * - latency 0            → request low-latency capture mode
 */
function buildAudioConstraints(): MediaTrackConstraints {
  return {
    echoCancellation: true,
    noiseSuppression: true,
    // ✅ Disabled: AGC is the #1 cause of audio distortion in WebRTC transcription pipelines
    autoGainControl: false,
    sampleRate: 16000,
    channelCount: 1,
    // Request the lowest latency the platform supports
    latency: 0,
  } as MediaTrackConstraints;
}

function buildVideoConstraints(): MediaTrackConstraints {
  return {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  };
}

/**
 * Attempt getUserMedia with progressively relaxed constraints so we always
 * get a stream rather than failing silently.
 */
async function acquireLocalStream(
  wantVideo: boolean,
  wantAudio: boolean,
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    console.error('[WebRTC] Browser media API not available');
    return new MediaStream();
  }

  if (!wantVideo && !wantAudio) {
    return new MediaStream();
  }

  const audioConstraints = buildAudioConstraints();
  const videoConstraints = buildVideoConstraints();

  // Strategy 1 — request exactly what was asked for
  if (wantVideo && wantAudio) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints,
      });
      console.log('[WebRTC] ✅ Got A/V stream');
      return stream;
    } catch (err: any) {
      console.warn(`[WebRTC] A/V capture failed (${err.name}): ${err.message}`);
    }
  }

  // Strategy 2 — try audio-only
  if (wantAudio) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: wantVideo ? videoConstraints : false,
        audio: audioConstraints,
      });
      console.log('[WebRTC] ✅ Got audio stream (video skipped or failed)');
      return stream;
    } catch (err: any) {
      console.warn(`[WebRTC] Audio capture failed (${err.name}): ${err.message}`);
    }
  }

  // Strategy 3 — try video-only
  if (wantVideo) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
      console.log('[WebRTC] ✅ Got video-only stream');
      return stream;
    } catch (err: any) {
      console.warn(`[WebRTC] Video-only capture failed (${err.name}): ${err.message}`);
    }
  }

  // Strategy 4 — last resort: bare constraints, let browser decide
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: wantVideo,
      audio: wantAudio,
    });
    console.log('[WebRTC] ✅ Got stream with bare constraints');
    return stream;
  } catch (err: any) {
    console.error(`[WebRTC] ❌ All getUserMedia attempts failed: ${err.message}`);
    return new MediaStream();
  }
}

export const useWebRTC = ({
  roomId,
  socket,
  userId,
  userName,
  initialAudio,
  initialVideo,
}: UseWebRTCProps) => {
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceServers = useRef<RTCIceServer[]>([]);
  // Buffer ICE candidates that arrive before remote description is set
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // 🔧 Debug: expose to browser console
  useEffect(() => {
    (globalThis as any).__webrtcDebug = {
      peerConnections: peerConnections.current,
      localStream: localStreamRef.current,
      peers,
    };
  }, [peers, localStream]);

  // ── Flush buffered ICE candidates after remote description is set ────
  const flushPendingCandidates = useCallback(
    async (socketId: string, pc: RTCPeerConnection) => {
      const pending = pendingCandidates.current.get(socketId);
      if (!pending?.length) return;
      console.log(`[WebRTC] Flushing ${pending.length} buffered ICE candidates for ${socketId}`);
      for (const init of pending) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(init));
        } catch (err) {
          console.warn('[WebRTC] Failed to add buffered ICE candidate:', err);
        }
      }
      pendingCandidates.current.delete(socketId);
    },
    [],
  );

  // ── Create a new RTCPeerConnection ───────────────────────────────────
  const createPeerConnection = useCallback(
    (targetSocketId: string, remoteUser: { userId: string; userName: string }) => {
      // Always include Google STUN; only add TURN if credentials are present
      const reliableServers: RTCIceServer[] = [
        { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
      ];

      for (const server of iceServers.current) {
        const urls = Array.isArray(server.urls) ? server.urls : [server.urls as string];
        const hasTurn = urls.some((u) => u.startsWith('turn:') || u.startsWith('turns:'));
        if (hasTurn && server.username && server.credential) {
          reliableServers.push(server);
        } else if (!hasTurn) {
          const stunOnly = urls.filter((u) => u.startsWith('stun:'));
          if (stunOnly.length) reliableServers.push({ urls: stunOnly });
        }
      }

      console.log('[WebRTC] ICE servers:', reliableServers.map((s) => s.urls));

      if (peerConnections.current.has(targetSocketId)) {
        console.warn(`[WebRTC] Closing leaked PC for ${targetSocketId}`);
        peerConnections.current.get(targetSocketId)?.close();
      }

      const pc = new RTCPeerConnection({
        iceServers: reliableServers,
        iceCandidatePoolSize: 4,
      });
      peerConnections.current.set(targetSocketId, pc);

      // ── Add local tracks ──────────────────────────────────────────────
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          console.log(`[WebRTC] Adding local ${track.kind} track (enabled: ${track.enabled})`);
          pc.addTrack(track, localStreamRef.current!);
        });
      } else {
        console.warn(`[WebRTC] No local stream when creating PC for ${targetSocketId}`);
      }

      // ── ICE candidate ─────────────────────────────────────────────────
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket?.emit('ice-candidate', {
            targetSocketId,
            signal: event.candidate.toJSON(),
            roomId,
          });
        }
      };

      // ── Remote track received ─────────────────────────────────────────
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        console.log(
          `[WebRTC] Remote ${event.track.kind} track from ${targetSocketId}; ` +
          `stream tracks: ${remoteStream.getTracks().map((t) => `${t.kind}(${t.enabled})`).join(', ')}`,
        );
        setPeers((prev) => {
          const next = new Map(prev);
          next.set(targetSocketId, {
            socketId: targetSocketId,
            userId: remoteUser.userId,
            userName: remoteUser.userName,
            stream: remoteStream,
            audioEnabled: true,
            videoEnabled: true,
          });
          return next;
        });
      };

      // ── Connection state ──────────────────────────────────────────────
      pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] Connection state → ${targetSocketId}: ${pc.connectionState}`);
        if (pc.connectionState === 'failed') {
          console.warn(`[WebRTC] Connection FAILED for ${targetSocketId} — attempting ICE restart`);
          pc.createOffer({ iceRestart: true })
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => {
              if (pc.localDescription) {
                socket?.emit('offer', {
                  targetSocketId,
                  signal: pc.localDescription,
                  roomId,
                });
              }
            })
            .catch((err) => console.error('[WebRTC] ICE restart error:', err));
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[WebRTC] ICE state → ${targetSocketId}: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'disconnected') {
          setTimeout(() => {
            if (pc.iceConnectionState === 'disconnected') {
              console.warn(`[WebRTC] ICE still disconnected for ${targetSocketId}`);
            }
          }, 5000);
        }
      };

      return pc;
    },
    [roomId, socket],
  );

  // ── Main effect: init media, register signalling, join room ──────────
  useEffect(() => {
    if (!socket || !roomId) return;

    let cancelled = false;

    const init = async () => {
      // 1. Fetch ICE servers
      try {
        const { data } = await api.get('/meetings/ice-servers');
        iceServers.current = data.iceServers ?? [];
        console.log('[WebRTC] ICE servers fetched:', iceServers.current.length);
      } catch (err) {
        console.warn('[WebRTC] ICE server fetch failed — using Google STUN only');
        iceServers.current = [];
      }

      if (cancelled) return;

      // 2. Acquire local media
      const stream = await acquireLocalStream(initialVideo, initialAudio);

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // Log every track for diagnostics
      stream.getTracks().forEach((t) => {
        const settings = t.getSettings();
        console.log(
          `[WebRTC] Local track: kind=${t.kind} label="${t.label}" ` +
          `enabled=${t.enabled} state=${t.readyState} ` +
          (t.kind === 'audio'
            ? `sampleRate=${settings.sampleRate} channels=${settings.channelCount} ` +
            `echoCancellation=${settings.echoCancellation} ` +
            `noiseSuppression=${settings.noiseSuppression} ` +
            `autoGainControl=${settings.autoGainControl}`
            : `${settings.width}x${settings.height}@${settings.frameRate}fps`),
        );
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      // 3. Register all signalling handlers BEFORE joining
      socket.on('user-joined', async ({ socketId, userId: uid, userName: uname }) => {
        console.log('[WebRTC] user-joined:', socketId, uname);
        const pc = createPeerConnection(socketId, { userId: uid, userName: uname });
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { targetSocketId: socketId, signal: offer, roomId });
      });

      socket.on('offer', async ({ fromSocketId, fromUserId, fromUserName, signal }) => {
        console.log('[WebRTC] Received offer from:', fromSocketId);
        let pc = peerConnections.current.get(fromSocketId);
        if (!pc) {
          pc = createPeerConnection(fromSocketId, { userId: fromUserId, userName: fromUserName });
        }
        if (pc.signalingState !== 'stable') {
          console.warn(`[WebRTC] Glare — ignoring offer from ${fromSocketId} (state: ${pc.signalingState})`);
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        await flushPendingCandidates(fromSocketId, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { targetSocketId: fromSocketId, signal: answer, roomId });
      });

      socket.on('answer', async ({ fromSocketId, signal }) => {
        console.log('[WebRTC] Received answer from:', fromSocketId);
        const pc = peerConnections.current.get(fromSocketId);
        if (!pc) return;
        if (pc.signalingState !== 'have-local-offer') {
          console.warn(`[WebRTC] Ignoring answer from ${fromSocketId} (state: ${pc.signalingState})`);
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        await flushPendingCandidates(fromSocketId, pc);
      });

      socket.on('ice-candidate', async ({ fromSocketId, candidate }) => {
        if (!candidate) return;
        const pc = peerConnections.current.get(fromSocketId);
        if (!pc || !pc.remoteDescription) {
          if (!pendingCandidates.current.has(fromSocketId)) {
            pendingCandidates.current.set(fromSocketId, []);
          }
          pendingCandidates.current.get(fromSocketId)!.push(candidate);
          return;
        }
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC] addIceCandidate error:', err);
        }
      });

      socket.on('user-left', ({ socketId }) => {
        console.log('[WebRTC] user-left:', socketId);
        peerConnections.current.get(socketId)?.close();
        peerConnections.current.delete(socketId);
        pendingCandidates.current.delete(socketId);
        setPeers((prev) => {
          const next = new Map(prev);
          next.delete(socketId);
          return next;
        });
      });

      // Handle both event name variants from the server
      const handleMediaStateChange = ({ socketId, audioEnabled, videoEnabled }: any) => {
        setPeers((prev) => {
          const next = new Map(prev);
          const peer = next.get(socketId);
          if (peer) next.set(socketId, { ...peer, audioEnabled, videoEnabled });
          return next;
        });
      };
      socket.on('media-state-changed', handleMediaStateChange);
      socket.on('media-state-change', handleMediaStateChange);

      // 4. Join the room — local stream is ready, handlers are registered
      console.log(`[WebRTC] Joining room ${roomId} as ${userName}`);
      socket.emit('join-room', {
        roomId,
        userId,
        userName,
        audioEnabled: initialAudio,
        videoEnabled: initialVideo,
      });
    };

    init();

    return () => {
      cancelled = true;
      socket.off('user-joined');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('user-left');
      socket.off('media-state-changed');
      socket.off('media-state-change');
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      pendingCandidates.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [socket, roomId, userId, userName, initialAudio, initialVideo, createPeerConnection, flushPendingCandidates]);

  // ── Replace a local track across all peer connections ────────────────
  const updateLocalStreamTrack = useCallback(
    async (newTrack: MediaStreamTrack) => {
      if (!localStreamRef.current) return;

      // Swap track in local stream
      const oldTrack = localStreamRef.current.getTracks().find((t) => t.kind === newTrack.kind);
      if (oldTrack) {
        localStreamRef.current.removeTrack(oldTrack);
        oldTrack.stop();
      }
      localStreamRef.current.addTrack(newTrack);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

      // Replace track in every peer connection (no renegotiation needed if sender exists)
      for (const [targetSocketId, pc] of Array.from(peerConnections.current.entries())) {
        const sender = pc.getSenders().find(
          (s) => s.track?.kind === newTrack.kind || s.track === null,
        );
        if (sender) {
          await sender.replaceTrack(newTrack);
        } else {
          // Sender doesn't exist yet — add track and renegotiate
          pc.addTrack(newTrack, localStreamRef.current!);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket?.emit('offer', { targetSocketId, signal: pc.localDescription, roomId });
          } catch (err) {
            console.error('[WebRTC] Renegotiation error:', err);
          }
        }
      }
    },
    [socket, roomId],
  );

  return { peers, localStream, updateLocalStreamTrack };
};