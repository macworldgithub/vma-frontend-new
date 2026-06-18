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
  makingOffer: boolean;   // true while createOffer → setLocalDescription is in-flight
  ignoreOffer: boolean;   // set to true for the "impolite" peer during glare
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

  // localStream is a *stable* MediaStream object — its identity never changes
  // after initialisation.  We only call setLocalStream once so that consumers
  // (e.g. Deepgram) whose useEffect depends on the stream reference are NOT
  // re-triggered when we swap a video track in/out.
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const negotiationState = useRef<Map<string, NegotiationState>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceServers = useRef<RTCIceServer[]>([]);
  // Buffer ICE candidates that arrive before the remote description is set.
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  // The socket.id we were assigned — used by Perfect Negotiation to decide
  // which peer is "polite" vs "impolite".
  const mySocketId = useRef<string>('');

  // ---------------------------------------------------------------------------
  // Raise hand
  // ---------------------------------------------------------------------------
  const toggleRaiseHand = useCallback(() => {
    const next = !raisedHand;
    setRaisedHand(next);
    socket?.emit('raise-hand', {
      roomId,
      socketId: socket?.id,
      raisedHand: next,
      userId,
      userName,
    });
  }, [raisedHand, socket, roomId, userId, userName]);

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
  // createPeerConnection — wires up Perfect Negotiation
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

    // Initialise per-peer negotiation state.
    // "Polite" = lexicographically lower socket.id.  The polite peer rolls back
    // its own offer when glare occurs; the impolite peer ignores the collision.
    const polite = mySocketId.current < targetSocketId;
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
    // Each PC manages its own renegotiation lifecycle with the makingOffer flag,
    // so concurrent track-replacements across multiple peers are fully
    // serialised and cannot race against each other.
    pc.onnegotiationneeded = async () => {
      const ns = negotiationState.current.get(targetSocketId);
      if (!ns) return;
      try {
        ns.makingOffer = true;
        await pc.setLocalDescription(); // triggers implicit createOffer
        console.log(`[WebRTC] onnegotiationneeded → offer sent to ${targetSocketId}`);
        socket?.emit('offer', {
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

    // ── ICE candidate ───────────────────────────────────────────────────────
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket?.emit('ice-candidate', {
          targetSocketId,
          signal: candidate.toJSON(),
          roomId,
        });
      }
    };

    // ── Remote tracks ───────────────────────────────────────────────────────
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

    // ── Connection state ────────────────────────────────────────────────────
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] ${targetSocketId} connectionState →`, pc.connectionState);
      if (pc.connectionState === 'failed') {
        console.warn(`[WebRTC] Connection failed for ${targetSocketId} — ICE restart`);
        const ns = negotiationState.current.get(targetSocketId);
        if (!ns) return;
        (async () => {
          try {
            ns.makingOffer = true;
            await pc.setLocalDescription(await pc.createOffer({ iceRestart: true }));
            socket?.emit('offer', {
              targetSocketId,
              signal: pc.localDescription,
              roomId,
            });
          } catch (e) {
            console.error('[WebRTC] ICE restart failed:', e);
          } finally {
            ns.makingOffer = false;
          }
        })();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ${targetSocketId} iceConnectionState →`, pc.iceConnectionState);
    };

    return pc;
  }, [roomId, socket, buildIceServers]);

  // ---------------------------------------------------------------------------
  // Main effect — stream acquisition + signaling
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!socket || !roomId) return;

    // Capture socket.id as soon as it's available; socket.io sets it
    // synchronously once connected.
    mySocketId.current = socket.id ?? '';
    if (!mySocketId.current) {
      // If not yet connected, wait for it.
      const onConnect = () => { mySocketId.current = socket.id ?? ''; };
      socket.once('connect', onConnect);
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
          const tryGet = async (constraints: MediaStreamConstraints) =>
            navigator.mediaDevices.getUserMedia(constraints).catch(() => null);

          const videoConstraints: MediaTrackConstraints = {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          };
          const audioConstraints: MediaTrackConstraints = {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 48000,
          };

          // Try the full requested combination first.
          let s = await tryGet({
            video: initialVideo ? videoConstraints : false,
            audio: initialAudio ? audioConstraints : false,
          });
          if (s) return s;

          console.warn('[WebRTC] Full media request failed — attempting fallbacks');

          // Fallback: audio-only → video-only → empty.
          if (initialAudio) {
            s = await tryGet({ audio: audioConstraints, video: false });
            if (s) return s;
          }
          if (initialVideo) {
            s = await tryGet({ video: videoConstraints, audio: false });
            if (s) return s;
          }
          return new MediaStream();
        })();
      }

      console.log(
        `[WebRTC] Local stream ready: [${stream.getTracks().map(t => `${t.kind}(${t.enabled})`).join(', ')}]`,
      );

      // Store stream references.  setLocalStream is called ONCE here;
      // subsequent track swaps mutate the stream in-place (see updateLocalStreamTrack).
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Expose for console diagnostics.
      (globalThis as any).__webrtcDebug = {
        get peerConnections() { return peerConnections.current; },
        get localStream() { return localStreamRef.current; },
        get peers() { return peers; },
      };

      // ── Signaling handlers ─────────────────────────────────────────────────

      // A new remote peer has joined → we are the offerer.
      socket.on('user-joined', async ({ socketId, userId: uid, userName: uname }) => {
        console.log('[WebRTC] user-joined:', socketId);
        // createPeerConnection registers onnegotiationneeded which fires
        // automatically when tracks are added inside it.
        createPeerConnection(socketId, { userId: uid, userName: uname });
      });

      // Received an offer — Perfect Negotiation handling.
      socket.on('offer', async ({ fromSocketId, fromUserId, fromUserName, signal }) => {
        console.log('[WebRTC] offer from:', fromSocketId);

        let pc = peerConnections.current.get(fromSocketId);
        if (!pc) {
          pc = createPeerConnection(fromSocketId, {
            userId: fromUserId,
            userName: fromUserName,
          });
        }

        const ns = negotiationState.current.get(fromSocketId)!;
        const polite = mySocketId.current < fromSocketId;

        // Glare: we already sent an offer (makingOffer = true) or our
        // signalingState is not stable.
        const offerCollision =
          signal.type === 'offer' &&
          (ns.makingOffer || pc.signalingState !== 'stable');

        ns.ignoreOffer = !polite && offerCollision;
        if (ns.ignoreOffer) {
          console.warn(
            `[WebRTC] Glare — impolite peer ignoring offer from ${fromSocketId}`,
          );
          return;
        }

        try {
          if (offerCollision) {
            // Polite peer rolls back its own in-flight offer.
            await Promise.all([
              pc.setLocalDescription({ type: 'rollback' }),
              pc.setRemoteDescription(new RTCSessionDescription(signal)),
            ]);
          } else {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
          }

          await flushPendingCandidates(fromSocketId, pc);

          if (signal.type === 'offer') {
            await pc.setLocalDescription();      // implicit createAnswer
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

      // Received an answer.
      socket.on('answer', async ({ fromSocketId, signal }) => {
        console.log('[WebRTC] answer from:', fromSocketId);
        const pc = peerConnections.current.get(fromSocketId);
        if (!pc) return;

        const ns = negotiationState.current.get(fromSocketId);
        if (!ns) return;

        if (pc.signalingState !== 'have-local-offer') {
          console.warn(
            `[WebRTC] Ignoring answer from ${fromSocketId} (state: ${pc.signalingState})`,
          );
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

      // Received an ICE candidate.
      socket.on('ice-candidate', async ({ fromSocketId, candidate }) => {
        if (!candidate) return;
        const pc = peerConnections.current.get(fromSocketId);
        const ns = negotiationState.current.get(fromSocketId);

        // Buffer if PC doesn't exist yet or remote description isn't set.
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
          if (!ns?.ignoreOffer) {
            console.warn('[WebRTC] addIceCandidate failed:', err);
          }
        }
      });

      // Remote peer disconnected.
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

      // Media state changes from remote peers (handle both event name variants
      // in case the server emits either).
      const handleMediaStateChange = ({
        socketId,
        audioEnabled,
        videoEnabled,
      }: {
        socketId: string;
        audioEnabled: boolean;
        videoEnabled: boolean;
      }) => {
        setPeers(prev => {
          const next = new Map(prev);
          const peer = next.get(socketId);
          if (peer) next.set(socketId, { ...peer, audioEnabled, videoEnabled });
          return next;
        });
      };
      socket.on('media-state-changed', handleMediaStateChange);
      socket.on('media-state-change', handleMediaStateChange);

      // Raise-hand from remote peers.
      socket.on('raise-hand', ({ socketId, raisedHand: raised }) => {
        setPeers(prev => {
          const next = new Map(prev);
          const peer = next.get(socketId);
          if (peer) next.set(socketId, { ...peer, raisedHand: raised });
          return next;
        });
      });

      // 3. Join the room AFTER stream + handlers are fully set up.
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
  // Replaces a track (audio or video) in the existing stable MediaStream and in
  // every active RTCPeerConnection, without ever creating a new MediaStream
  // object.  Because the stream identity is preserved, Deepgram's useEffect
  // (which depends on the stream reference) will NOT re-fire — toggling video
  // never touches the audio pipeline.
  //
  // Renegotiation is handled automatically by each PC's onnegotiationneeded
  // callback, so we no longer manually createOffer here.
  // ---------------------------------------------------------------------------
  const updateLocalStreamTrack = useCallback(async (newTrack: MediaStreamTrack) => {
    const stream = localStreamRef.current;
    if (!stream) return;

    // Swap the track inside the existing MediaStream (same object, no new ref).
    const oldTrack = stream.getTracks().find(t => t.kind === newTrack.kind);
    if (oldTrack) {
      stream.removeTrack(oldTrack);
      oldTrack.stop();
    }
    stream.addTrack(newTrack);

    // NOTE: we do NOT call setLocalStream() here, preserving stream identity.
    // Any UI component that reads localStream directly (e.g. a <video> element)
    // will still work because the MediaStream object's track list has changed.

    // Push the new track into every active sender.
    // onnegotiationneeded fires automatically if renegotiation is required.
    for (const pc of Array.from(peerConnections.current.values())) {
      const sender = pc.getSenders().find(s => s.track?.kind === newTrack.kind);
      if (sender) {
        // replaceTrack doesn't trigger renegotiation (same codec).
        await sender.replaceTrack(newTrack);
      } else {
        // No existing sender for this kind — add the track.
        // This WILL trigger onnegotiationneeded on the PC, which handles the
        // offer/answer exchange automatically.
        pc.addTrack(newTrack, stream);
      }
    }
  }, []);

  return { peers, localStream, updateLocalStreamTrack, raisedHand, toggleRaiseHand };
};