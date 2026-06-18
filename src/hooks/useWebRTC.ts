'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import api from '@/lib/axios';

// ---------------------------------------------------------------------------
// 🔍 Diagnostic utility — run in browser console: WebRTCDiagnostics.checkDevices()
// ---------------------------------------------------------------------------
(globalThis as any).WebRTCDiagnostics = {
  async checkDevices() {
    console.log('%c🔍 WebRTC Device Diagnostics', 'font-size:14px;font-weight:bold;color:#0066cc');
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      console.log(`📻 Audio Inputs (${audioInputs.length}):`);
      audioInputs.forEach((d, i) => console.log(`  ${i + 1}. ${d.label || 'Unknown'} (${d.deviceId})`));
      console.log(`📷 Video Inputs (${videoInputs.length}):`);
      videoInputs.forEach((d, i) => console.log(`  ${i + 1}. ${d.label || 'Unknown'} (${d.deviceId})`));
      if (!audioInputs.length) console.warn('⚠️  No audio input devices found!');
      if (!videoInputs.length) console.warn('⚠️  No video input devices found!');
    } catch (err: any) {
      console.error('❌ Failed to enumerate devices:', err.message);
    }
  },
  async testAudio() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Audio access GRANTED'); s.getTracks().forEach(t => t.stop());
    } catch (err: any) { console.error('❌ Audio access DENIED:', err.message); }
  },
  async testVideo() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log('✅ Video access GRANTED'); s.getTracks().forEach(t => t.stop());
    } catch (err: any) { console.error('❌ Video access DENIED:', err.message); }
  },
  monitorAudioLevels() {
    const stream = (window as any).__webrtcDebug?.localStream;
    if (!stream) { console.warn('⚠️  Start the meeting first.'); return; }
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let n = 0;
    const id = setInterval(() => {
      analyser.getByteFrequencyData(data);
      const avg = Math.round(data.reduce((a, b) => a + b) / data.length);
      console.log(`[${n}] ${'█'.repeat(Math.round(avg / 5))} ${avg}/255`);
      if (++n >= 50) { clearInterval(id); src.disconnect(); }
    }, 100);
  },
  printHelp() {
    console.log('WebRTCDiagnostics.checkDevices()       — list devices');
    console.log('WebRTCDiagnostics.testAudio()          — test mic access');
    console.log('WebRTCDiagnostics.testVideo()          — test camera access');
    console.log('WebRTCDiagnostics.monitorAudioLevels() — real-time audio levels');
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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
  raisedHand?: boolean;
}

// Per-peer negotiation state used by the Perfect Negotiation pattern.
interface NegotiationState {
  makingOffer: boolean;
  ignoreOffer: boolean;
  isSettingRemoteAnswerPending: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export const useWebRTC = ({
  roomId,
  socket,
  userId,
  userName,
  initialAudio,
  initialVideo,
}: UseWebRTCProps) => {
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [raisedHand, setRaisedHand] = useState(false);

  // audioEnabled / videoEnabled are owned here — the parent reads them, never sets them.
  const [audioEnabled, setAudioEnabled] = useState(initialAudio);
  const [videoEnabled, setVideoEnabled] = useState(initialVideo);

  // localStream is a *stable* MediaStream object — its identity never changes
  // after initialisation. Deepgram's useEffect depends on this reference; it
  // must not be replaced when we swap tracks in/out.
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const negotiationState = useRef<Map<string, NegotiationState>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceServers = useRef<RTCIceServer[]>([]);
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const mySocketId = useRef<string>('');
  // Ref mirrors so callbacks always see current values without stale closures.
  const audioEnabledRef = useRef(initialAudio);
  const videoEnabledRef = useRef(initialVideo);
  const socketRef = useRef<Socket | null>(null);

  // Keep socketRef current.
  useEffect(() => { socketRef.current = socket; }, [socket]);

  // ---------------------------------------------------------------------------
  // Emit media-state helper — always uses the latest socket ref.
  // ---------------------------------------------------------------------------
  const emitMediaState = useCallback((audio: boolean, video: boolean) => {
    socketRef.current?.emit('media-state-change', {
      roomId,
      socketId: socketRef.current?.id,
      audioEnabled: audio,
      videoEnabled: video,
      userId,
    });
  }, [roomId, userId]);

  // ---------------------------------------------------------------------------
  // toggleAudio
  //
  // Mute/unmute is ONLY track.enabled = true/false on the EXISTING audio track.
  // We never stop/restart the audio track — that causes audible glitches and
  // breaks Deepgram's Web Audio graph.
  // ---------------------------------------------------------------------------
  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      console.warn('[WebRTC] toggleAudio: no audio track present');
      return;
    }

    const next = !audioEnabledRef.current;
    audioTrack.enabled = next;         // ← the only thing that needs to happen
    audioEnabledRef.current = next;
    setAudioEnabled(next);

    console.log(`[WebRTC] Audio ${next ? 'unmuted' : 'muted'} (track.enabled = ${next})`);
    emitMediaState(next, videoEnabledRef.current);
  }, [emitMediaState]);

  // ---------------------------------------------------------------------------
  // toggleVideo
  //
  // Video is different from audio:
  //   OFF → stop the camera track entirely (releases the hardware / indicator light)
  //         and replace the sender with a null track.
  //   ON  → acquire a new camera track and push it through replaceTrack.
  //
  // replaceTrack() does NOT trigger onnegotiationneeded (same codec slot), so
  // there is no offer/answer exchange and no risk of glare.
  // ---------------------------------------------------------------------------
  const toggleVideo = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const next = !videoEnabledRef.current;

    if (!next) {
      // ── Turning camera OFF ─────────────────────────────────────────────────
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = false;
        videoTrack.stop();                  // release camera hardware
        stream.removeTrack(videoTrack);
      }

      // Push null into every sender so the remote side gets no track
      // (not a black frame — a proper removed track).
      for (const pc of peerConnections.current.values()) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(null);
      }

    } else {
      // ── Turning camera ON ──────────────────────────────────────────────────
      let newTrack: MediaStreamTrack | null = null;
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        newTrack = s.getVideoTracks()[0];
      } catch (err) {
        console.error('[WebRTC] toggleVideo: failed to acquire camera', err);
        return;   // don't flip state if we couldn't get the camera
      }

      stream.addTrack(newTrack);

      // Push new track into every sender via replaceTrack (no renegotiation).
      for (const pc of peerConnections.current.values()) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video' || s.track === null);
        if (sender) {
          await sender.replaceTrack(newTrack);
        } else {
          // No video sender exists yet (e.g. started with video off).
          // addTrack WILL trigger onnegotiationneeded — that's correct here.
          pc.addTrack(newTrack, stream);
        }
      }
    }

    videoEnabledRef.current = next;
    setVideoEnabled(next);

    console.log(`[WebRTC] Video ${next ? 'started' : 'stopped'}`);
    emitMediaState(audioEnabledRef.current, next);
  }, [emitMediaState]);

  // ---------------------------------------------------------------------------
  // Raise hand
  // ---------------------------------------------------------------------------
  const toggleRaiseHand = useCallback(() => {
    const next = !raisedHand;
    setRaisedHand(next);
    socketRef.current?.emit('raise-hand', {
      roomId,
      socketId: socketRef.current?.id,
      raisedHand: next,
      userId,
      userName,
    });
  }, [raisedHand, roomId, userId, userName]);

  // ---------------------------------------------------------------------------
  // ICE helpers
  // ---------------------------------------------------------------------------
  const buildIceServers = useCallback((): RTCIceServer[] => {
    const reliable: RTCIceServer[] = [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    ];
    for (const server of iceServers.current) {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls as string];
      const hasTurn = urls.some(u => u.startsWith('turn:') || u.startsWith('turns:'));
      if (hasTurn && server.username && server.credential) {
        reliable.push(server);
      } else if (!hasTurn) {
        const stunUrls = urls.filter(u => u.startsWith('stun:'));
        if (stunUrls.length) reliable.push({ urls: stunUrls });
      }
    }
    return reliable;
  }, []);

  const flushPendingCandidates = useCallback(async (
    socketId: string,
    pc: RTCPeerConnection,
  ) => {
    const pending = pendingCandidates.current.get(socketId);
    if (!pending?.length) return;
    console.log(`[WebRTC] Flushing ${pending.length} buffered ICE candidates for ${socketId}`);
    for (const init of pending) {
      try { await pc.addIceCandidate(new RTCIceCandidate(init)); }
      catch (e) { console.warn('[WebRTC] Buffered ICE candidate rejected:', e); }
    }
    pendingCandidates.current.delete(socketId);
  }, []);

  // ---------------------------------------------------------------------------
  // createPeerConnection
  // ---------------------------------------------------------------------------
  const createPeerConnection = useCallback((
    targetSocketId: string,
    remoteUser: { userId: string; userName: string },
  ): RTCPeerConnection => {
    if (peerConnections.current.has(targetSocketId)) {
      console.warn(`[WebRTC] Closing stale PC for ${targetSocketId}`);
      peerConnections.current.get(targetSocketId)!.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: buildIceServers(),
      iceCandidatePoolSize: 4,
    });
    peerConnections.current.set(targetSocketId, pc);

    negotiationState.current.set(targetSocketId, {
      makingOffer: false,
      ignoreOffer: false,
      isSettingRemoteAnswerPending: false,
    });

    // Add existing local tracks.
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log(`[WebRTC] Adding ${track.kind} track to PC for ${targetSocketId}`);
        pc.addTrack(track, localStreamRef.current!);
      });
    } else {
      console.warn(`[WebRTC] No local stream when creating PC for ${targetSocketId}`);
    }

    // ── Perfect Negotiation: onnegotiationneeded ────────────────────────────
    pc.onnegotiationneeded = async () => {
      const ns = negotiationState.current.get(targetSocketId);
      if (!ns) return;
      try {
        ns.makingOffer = true;
        await pc.setLocalDescription();
        console.log(`[WebRTC] onnegotiationneeded → offer sent to ${targetSocketId}`);
        socketRef.current?.emit('offer', {
          targetSocketId,
          signal: pc.localDescription,
          roomId,
        });
      } catch (err) {
        console.error(`[WebRTC] onnegotiationneeded failed for ${targetSocketId}:`, err);
      } finally {
        ns.makingOffer = false;
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socketRef.current?.emit('ice-candidate', {
          targetSocketId,
          signal: candidate.toJSON(),
          roomId,
        });
      }
    };

    pc.ontrack = ({ streams: [remoteStream], track }) => {
      console.log(`[WebRTC] Remote ${track.kind} track from ${targetSocketId}`);
      setPeers(prev => {
        const next = new Map(prev);
        const existing = next.get(targetSocketId);
        next.set(targetSocketId, {
          socketId: targetSocketId,
          userId: remoteUser.userId,
          userName: remoteUser.userName,
          stream: remoteStream,
          audioEnabled: existing?.audioEnabled ?? true,
          videoEnabled: existing?.videoEnabled ?? true,
          raisedHand: existing?.raisedHand ?? false,
        });
        return next;
      });
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] ${targetSocketId} connectionState →`, pc.connectionState);
      if (pc.connectionState === 'failed') {
        console.warn(`[WebRTC] Connection failed for ${targetSocketId} — ICE restart`);
        try { pc.restartIce(); }
        catch (e) { console.error('[WebRTC] restartIce failed:', e); }
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ${targetSocketId} iceConnectionState →`, pc.iceConnectionState);
    };

    return pc;
  }, [roomId, buildIceServers]);

  // ---------------------------------------------------------------------------
  // Main effect — stream acquisition + signaling
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!socket || !roomId) return;

    mySocketId.current = socket.id ?? '';
    if (!mySocketId.current) {
      socket.once('connect', () => { mySocketId.current = socket.id ?? ''; });
    }

    const init = async () => {
      // 1. Fetch ICE servers.
      try {
        const { data } = await api.get('/meetings/ice-servers');
        iceServers.current = data.iceServers ?? [];
        console.log('[WebRTC] ICE servers received:', iceServers.current.length);
      } catch {
        console.warn('[WebRTC] ICE server fetch failed — using public STUN only');
        iceServers.current = [];
      }

      // 2. Acquire local media.
      let stream: MediaStream;

      if (!navigator.mediaDevices?.getUserMedia) {
        console.error('[WebRTC] getUserMedia not available');
        stream = new MediaStream();
      } else if (!initialAudio && !initialVideo) {
        stream = new MediaStream();
      } else {
        stream = await (async () => {
          const tryGet = async (c: MediaStreamConstraints) =>
            navigator.mediaDevices.getUserMedia(c).catch(() => null);

          const videoC: MediaTrackConstraints = { width: { ideal: 1280 }, height: { ideal: 720 } };
          const audioC: MediaTrackConstraints = {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 48000,
          };

          let s = await tryGet({
            video: initialVideo ? videoC : false,
            audio: initialAudio ? audioC : false,
          });
          if (s) return s;

          console.warn('[WebRTC] Full media request failed — attempting fallbacks');
          if (initialAudio) { s = await tryGet({ audio: audioC, video: false }); if (s) return s; }
          if (initialVideo) { s = await tryGet({ video: videoC, audio: false }); if (s) return s; }
          return new MediaStream();
        })();
      }

      // Sync enabled state from what we actually got.
      const gotAudio = stream.getAudioTracks().length > 0;
      const gotVideo = stream.getVideoTracks().length > 0;
      audioEnabledRef.current = gotAudio && initialAudio;
      videoEnabledRef.current = gotVideo && initialVideo;
      setAudioEnabled(audioEnabledRef.current);
      setVideoEnabled(videoEnabledRef.current);

      console.log(
        `[WebRTC] Local stream ready: [${stream.getTracks().map(t => `${t.kind}(${t.enabled})`).join(', ')}]`,
      );

      localStreamRef.current = stream;
      setLocalStream(stream);

      (globalThis as any).__webrtcDebug = {
        get peerConnections() { return peerConnections.current; },
        get localStream() { return localStreamRef.current; },
        get peers() { return peers; },
      };

      // ── Signaling handlers ─────────────────────────────────────────────────

      socket.on('user-joined', ({ socketId, userId: uid, userName: uname }) => {
        console.log('[WebRTC] user-joined:', socketId);
        createPeerConnection(socketId, { userId: uid, userName: uname });
      });

      socket.on('offer', async ({ fromSocketId, fromUserId, fromUserName, signal }) => {
        console.log('[WebRTC] offer from:', fromSocketId);

        let pc = peerConnections.current.get(fromSocketId);
        if (!pc) {
          pc = createPeerConnection(fromSocketId, { userId: fromUserId, userName: fromUserName });
        }

        const ns = negotiationState.current.get(fromSocketId)!;
        const polite = mySocketId.current < fromSocketId;

        const offerCollision =
          signal.type === 'offer' &&
          (ns.makingOffer || pc.signalingState !== 'stable');

        ns.ignoreOffer = !polite && offerCollision;
        if (ns.ignoreOffer) {
          console.warn(`[WebRTC] Glare — impolite peer ignoring offer from ${fromSocketId}`);
          return;
        }

        try {
          if (offerCollision) {
            await Promise.all([
              pc.setLocalDescription({ type: 'rollback' }),
              pc.setRemoteDescription(new RTCSessionDescription(signal)),
            ]);
          } else {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
          }

          await flushPendingCandidates(fromSocketId, pc);

          if (signal.type === 'offer') {
            await pc.setLocalDescription();
            socket.emit('answer', {
              targetSocketId: fromSocketId,
              signal: pc.localDescription,
              roomId,
            });
          }
        } catch (err) {
          console.error(`[WebRTC] Error handling offer from ${fromSocketId}:`, err);
        }
      });

      socket.on('answer', async ({ fromSocketId, signal }) => {
        console.log('[WebRTC] answer from:', fromSocketId);
        const pc = peerConnections.current.get(fromSocketId);
        if (!pc) return;
        const ns = negotiationState.current.get(fromSocketId);
        if (!ns) return;

        if (pc.signalingState !== 'have-local-offer') {
          console.warn(`[WebRTC] Ignoring answer from ${fromSocketId} (state: ${pc.signalingState})`);
          return;
        }

        try {
          ns.isSettingRemoteAnswerPending = true;
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          await flushPendingCandidates(fromSocketId, pc);
        } catch (err) {
          console.error(`[WebRTC] Error handling answer from ${fromSocketId}:`, err);
        } finally {
          ns.isSettingRemoteAnswerPending = false;
        }
      });

      socket.on('ice-candidate', async ({ fromSocketId, candidate }) => {
        if (!candidate) return;
        const pc = peerConnections.current.get(fromSocketId);
        const ns = negotiationState.current.get(fromSocketId);

        const readyToAdd =
          pc &&
          pc.remoteDescription &&
          !(ns?.ignoreOffer) &&
          !(ns?.isSettingRemoteAnswerPending);

        if (!readyToAdd) {
          if (!pendingCandidates.current.has(fromSocketId)) {
            pendingCandidates.current.set(fromSocketId, []);
          }
          pendingCandidates.current.get(fromSocketId)!.push(candidate);
          return;
        }

        try {
          await pc!.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          if (!ns?.ignoreOffer) console.warn('[WebRTC] addIceCandidate failed:', err);
        }
      });

      socket.on('user-left', ({ socketId }) => {
        console.log('[WebRTC] user-left:', socketId);
        peerConnections.current.get(socketId)?.close();
        peerConnections.current.delete(socketId);
        negotiationState.current.delete(socketId);
        pendingCandidates.current.delete(socketId);
        setPeers(prev => {
          const next = new Map(prev);
          next.delete(socketId);
          return next;
        });
      });

      const handleMediaStateChange = ({
        socketId,
        audioEnabled: remoteAudio,
        videoEnabled: remoteVideo,
      }: { socketId: string; audioEnabled: boolean; videoEnabled: boolean }) => {
        setPeers(prev => {
          const next = new Map(prev);
          const peer = next.get(socketId);
          if (peer) next.set(socketId, { ...peer, audioEnabled: remoteAudio, videoEnabled: remoteVideo });
          return next;
        });
      };
      socket.on('media-state-changed', handleMediaStateChange);
      socket.on('media-state-change', handleMediaStateChange);

      socket.on('raise-hand', ({ socketId, raisedHand: raised }) => {
        setPeers(prev => {
          const next = new Map(prev);
          const peer = next.get(socketId);
          if (peer) next.set(socketId, { ...peer, raisedHand: raised });
          return next;
        });
      });

      // 3. Join the room AFTER stream + handlers are ready.
      console.log(`[WebRTC] Joining room ${roomId} as ${userName}`);
      socket.emit('join-room', {
        roomId,
        userId,
        userName,
        audioEnabled: audioEnabledRef.current,
        videoEnabled: videoEnabledRef.current,
      });
    };

    init();

    return () => {
      socket.off('user-joined');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('user-left');
      socket.off('media-state-changed');
      socket.off('media-state-change');
      socket.off('raise-hand');

      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      negotiationState.current.clear();
      pendingCandidates.current.clear();

      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId, userId, userName, initialAudio, initialVideo]);

  // ---------------------------------------------------------------------------
  // updateLocalStreamTrack
  //
  // For DEVICE SWITCHES only (e.g. user picks a different microphone or camera
  // from a settings panel). Do NOT call this for mute/unmute — use toggleAudio
  // / toggleVideo instead.
  // ---------------------------------------------------------------------------
  const updateLocalStreamTrack = useCallback(async (newTrack: MediaStreamTrack) => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const oldTrack = stream.getTracks().find(t => t.kind === newTrack.kind);
    if (oldTrack) {
      stream.removeTrack(oldTrack);
      oldTrack.stop();
    }
    stream.addTrack(newTrack);

    for (const pc of peerConnections.current.values()) {
      const sender = pc.getSenders().find(s => s.track?.kind === newTrack.kind);
      if (sender) {
        await sender.replaceTrack(newTrack);
      } else {
        pc.addTrack(newTrack, stream);
      }
    }
  }, []);

  return {
    peers,
    localStream,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    updateLocalStreamTrack,
    raisedHand,
    toggleRaiseHand,
  };
};