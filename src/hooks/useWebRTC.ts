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

    if (!(window as any).__webrtcDebug || !(window as any).__webrtcDebug.localStream) {
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
    const maxSamples = 50;

    const monitor = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const level = Math.round(average);
      const bars = '█'.repeat(Math.round(level / 5));
      console.log(`[${count}] Audio Level: ${bars} ${level} / 255`);

      count++;
      if (count >= maxSamples) {
        clearInterval(monitor);
        console.log('✅ Audio monitoring stopped');
        source.disconnect();
      }
    }, 100);
  },

  printHelp() {
    console.log('%c📚 Available Diagnostics Commands:', 'font-size: 14px; font-weight: bold;');
    console.log('WebRTCDiagnostics.checkDevices()      - List all audio/video devices');
    console.log('WebRTCDiagnostics.testAudio()         - Test microphone access');
    console.log('WebRTCDiagnostics.testVideo()         - Test camera access');
    console.log('WebRTCDiagnostics.monitorAudioLevels()- Monitor real-time audio input levels');
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
  raisedHand?: boolean;
}

export const useWebRTC = ({ roomId, socket, userId, userName, initialAudio, initialVideo }: UseWebRTCProps) => {
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [raisedHand, setRaisedHand] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceServers = useRef<any[]>([]);
  // Buffer ICE candidates that arrive before remote description is set
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const toggleRaiseHand = useCallback(() => {
    const newState = !raisedHand;
    setRaisedHand(newState);

    socket?.emit('raise-hand', {
      roomId,
      socketId: socket?.id,
      raisedHand: newState,
      userId,
      userName,
    });
  }, [raisedHand, socket, roomId, userId, userName]);

  // 🔧 Debug: Expose to global for console access
  useEffect(() => {
    (globalThis as any).__webrtcDebug = {
      peerConnections: peerConnections.current,
      localStream: localStreamRef.current,
      peers,
    };
  }, [peers, localStream]);

  const createPeerConnection = useCallback((targetSocketId: string, remoteUser: { userId: string, userName: string }) => {
    // Build a reliable ICE server list:
    // - Always include Google STUN servers (works on localhost & most networks)
    // - Only include TURN servers if they look properly configured
    const reliableServers: RTCIceServer[] = [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    ];

    if (iceServers.current) {
      for (const server of iceServers.current) {
        const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
        const hasTurn = urls.some((u: string) => u.startsWith('turn:') || u.startsWith('turns:'));
        // Only add TURN servers that have credentials configured
        if (hasTurn && server.username && server.credential) {
          reliableServers.push(server);
        }
        // Add any additional STUN servers
        const stunUrls = urls.filter((u: string) => u.startsWith('stun:'));
        if (stunUrls.length > 0 && !hasTurn) {
          reliableServers.push({ urls: stunUrls });
        }
      }
    }

    console.log('[WebRTC] Using ICE servers:', JSON.stringify(reliableServers.map(s => s.urls)));

    const pc = new RTCPeerConnection({
      iceServers: reliableServers,
      iceCandidatePoolSize: 4,
    });

    if (peerConnections.current.has(targetSocketId)) {
      console.warn(`[WebRTC] Closing leaked peer connection for ${targetSocketId}`);
      peerConnections.current.get(targetSocketId)?.close();
    }
    peerConnections.current.set(targetSocketId, pc);

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        console.log(`[WebRTC] Adding local track: ${track.kind} (enabled: ${track.enabled})`);
        pc.addTrack(track, localStreamRef.current!);
      });
    } else {
      console.warn(`[WebRTC] No local stream when creating PC for ${targetSocketId}`);
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[WebRTC] ICE candidate for ${targetSocketId}`);
        // Send the FULL candidate object including sdpMid and sdpMLineIndex
        socket?.emit('ice-candidate', {
          targetSocketId,
          signal: event.candidate.toJSON(),
          roomId,
        });
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      console.log(`[WebRTC] Received remote track from ${targetSocketId}:`, event.track.kind);
      console.log(`[WebRTC] Remote stream has ${remoteStream.getTracks().length} tracks:`, remoteStream.getTracks().map(t => `${t.kind}(${t.enabled})`).join(', '));

      setPeers((prev) => {
        const newPeers = new Map(prev);
        newPeers.set(targetSocketId, {
          socketId: targetSocketId,
          userId: remoteUser.userId,
          userName: remoteUser.userName,
          stream: remoteStream,
          audioEnabled: true,
          videoEnabled: true,
          raisedHand: false,
        });
        return newPeers;
      });
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state for ${targetSocketId}:`, pc.connectionState);
      if (pc.connectionState === 'failed') {
        console.warn(`[WebRTC] Connection FAILED for ${targetSocketId} — attempting ICE restart`);
        // Attempt an ICE restart by creating a new offer with iceRestart: true
        pc.createOffer({ iceRestart: true })
          .then(offer => pc.setLocalDescription(offer))
          .then(() => {
            if (pc.localDescription) {
              socket?.emit('offer', {
                targetSocketId,
                signal: pc.localDescription,
                roomId,
              });
              console.log(`[WebRTC] ICE restart offer sent to ${targetSocketId}`);
            }
          })
          .catch(err => console.error('[WebRTC] ICE restart failed:', err));
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE connection state for ${targetSocketId}:`, pc.iceConnectionState);
      if (pc.iceConnectionState === 'disconnected') {
        // Give it a moment to recover before logging a warning
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected') {
            console.warn(`[WebRTC] ICE still disconnected for ${targetSocketId} after timeout`);
          }
        }, 5000);
      }
    };

    return pc;
  }, [roomId, socket]);

  // Helper to flush buffered ICE candidates after remote description is set
  const flushPendingCandidates = useCallback(async (socketId: string, pc: RTCPeerConnection) => {
    const pending = pendingCandidates.current.get(socketId);
    if (pending && pending.length > 0) {
      console.log(`[WebRTC] Flushing ${pending.length} buffered ICE candidates for ${socketId}`);
      for (const candidateInit of pending) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
        } catch (err) {
          console.warn('[WebRTC] Failed to add buffered ICE candidate:', err);
        }
      }
      pendingCandidates.current.delete(socketId);
    }
  }, []);

  useEffect(() => {
    if (!socket || !roomId) return;

    const init = async () => {
      // 1. Get ICE Servers FIRST
      try {
        const { data } = await api.get('/meetings/ice-servers');
        console.log('[WebRTC] ICE Servers received:', data.iceServers);
        iceServers.current = data.iceServers;
      } catch (err) {
        console.warn('[WebRTC] Failed to get ICE servers, using default STUN server', err);
        iceServers.current = [{ urls: ['stun:stun.l.google.com:19302'] }];
      }

      // 2. Get Local Stream BEFORE joining the room
      let stream: MediaStream | null = null;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('[VMA] Browser media API not available.');
        stream = new MediaStream();
      } else if (!initialVideo && !initialAudio) {
        console.log('[WebRTC] Both video and audio disabled, creating empty stream');
        stream = new MediaStream();
      } else {
        try {
          console.log(`[WebRTC] Requesting media: video = ${initialVideo}, audio = ${initialAudio}`);
          stream = await navigator.mediaDevices.getUserMedia({
            video: initialVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
            audio: initialAudio ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
              sampleRate: 48000,
            } : false,
          });
          console.log(`[WebRTC] ✅ Local stream obtained with tracks:`, stream.getTracks().map(t => `${t.kind}(${t.enabled})`).join(', '));
        } catch (err: any) {
          console.warn(`[VMA] Initial media capture failed: ${err.name} - ${err.message}`);

          if (initialVideo && initialAudio) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            } catch {
              try {
                stream = await navigator.mediaDevices.getUserMedia({
                  video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                  audio: false,
                });
              } catch {
                stream = new MediaStream();
              }
            }
          } else if (initialAudio) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch {
              stream = new MediaStream();
            }
          } else if (initialVideo) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 } },
              });
            } catch {
              stream = new MediaStream();
            }
          } else {
            stream = new MediaStream();
          }
        }
      }

      // Set stream refs BEFORE registering handlers and joining
      localStreamRef.current = stream;
      setLocalStream(stream);

      console.log(`[WebRTC] Local stream ready with ${stream.getTracks().length} tracks before joining room`);

      // 3. Register signaling event handlers
      socket.on('user-joined', async (data) => {
        console.log('[WebRTC] User joined:', data);
        const { socketId, userId: newUserId, userName: newUserName } = data;
        const pc = createPeerConnection(socketId, { userId: newUserId, userName: newUserName });
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { targetSocketId: socketId, signal: offer, roomId });
      });

      socket.on('offer', async (data) => {
        console.log('[WebRTC] Received offer from:', data.fromSocketId);
        const { fromSocketId, fromUserId, fromUserName, signal } = data;
        let pc = peerConnections.current.get(fromSocketId);
        if (!pc) {
          pc = createPeerConnection(fromSocketId, { userId: fromUserId, userName: fromUserName });
        }

        if (pc.signalingState !== 'stable') {
          console.warn(`[WebRTC] Glare detected! Ignoring offer from ${fromSocketId} because state is ${pc.signalingState}`);
          return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        // Flush any ICE candidates that arrived before the remote description was set
        await flushPendingCandidates(fromSocketId, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { targetSocketId: fromSocketId, signal: answer, roomId });
      });

      socket.on('answer', async (data) => {
        console.log('[WebRTC] Received answer from:', data.fromSocketId);
        const { fromSocketId, signal } = data;
        const pc = peerConnections.current.get(fromSocketId);
        if (pc) {
          if (pc.signalingState !== 'have-local-offer') {
            console.warn(`[WebRTC] Ignoring answer from ${fromSocketId} because state is ${pc.signalingState}`);
            return;
          }
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          // Flush any ICE candidates that arrived before the remote description was set
          await flushPendingCandidates(fromSocketId, pc);
        }
      });

      socket.on('ice-candidate', async (data) => {
        const { fromSocketId, candidate } = data;
        if (!candidate) return;

        const pc = peerConnections.current.get(fromSocketId);

        // If the PC doesn't exist yet or remote description isn't set, buffer the candidate
        if (!pc || !pc.remoteDescription) {
          console.log(`[WebRTC] Buffering ICE candidate from ${fromSocketId} (no remote description yet)`);
          if (!pendingCandidates.current.has(fromSocketId)) {
            pendingCandidates.current.set(fromSocketId, []);
          }
          pendingCandidates.current.get(fromSocketId)!.push(candidate);
          return;
        }

        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC] Failed to add ICE candidate:', err);
        }
      });

      socket.on('user-left', (data) => {
        console.log('[WebRTC] User left:', data.socketId);
        const { socketId } = data;
        const pc = peerConnections.current.get(socketId);
        if (pc) {
          pc.close();
          peerConnections.current.delete(socketId);
        }
        pendingCandidates.current.delete(socketId);
        setPeers((prev) => {
          const newPeers = new Map(prev);
          newPeers.delete(socketId);
          return newPeers;
        });
      });

      socket.on('media-state-changed', (data) => {
        const { socketId, audioEnabled, videoEnabled } = data;
        setPeers((prev) => {
          const newPeers = new Map(prev);
          const peer = newPeers.get(socketId);
          if (peer) {
            newPeers.set(socketId, { ...peer, audioEnabled, videoEnabled });
          }
          return newPeers;
        });
      });

      socket.on('media-state-change', (data) => {
        const { socketId, audioEnabled, videoEnabled } = data;
        setPeers((prev) => {
          const newPeers = new Map(prev);
          const peer = newPeers.get(socketId);
          if (peer) {
            newPeers.set(socketId, { ...peer, audioEnabled, videoEnabled });
          }
          return newPeers;
        });
      });

      socket.on('raise-hand', (data) => {
        const { socketId, raisedHand } = data;

        setPeers(prev => {
          const newPeers = new Map(prev);
          const peer = newPeers.get(socketId);

          if (peer) {
            newPeers.set(socketId, {
              ...peer,
              raisedHand,
            });
          }

          return newPeers;
        });
      });

      // 4. NOW join the room — local stream is ready, handlers are registered
      console.log(`[WebRTC] Joining room ${roomId} as ${userName}`);
      socket.emit('join-room', { roomId, userId, userName, audioEnabled: initialAudio, videoEnabled: initialVideo });
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

      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      pendingCandidates.current.clear();
      localStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [socket, roomId, userId, userName, initialAudio, initialVideo, createPeerConnection, flushPendingCandidates]);

  const updateLocalStreamTrack = useCallback(async (newTrack: MediaStreamTrack) => {
    if (!localStreamRef.current) return;

    const existingTrack = localStreamRef.current.getTracks().find(t => t.kind === newTrack.kind);
    if (existingTrack) {
      localStreamRef.current.removeTrack(existingTrack);
      existingTrack.stop();
    }
    localStreamRef.current.addTrack(newTrack);
    setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

    for (const [targetSocketId, pc] of Array.from(peerConnections.current.entries())) {
      const sender = pc.getSenders().find(s => s.track?.kind === newTrack.kind || s.track === null);
      if (sender) {
        await sender.replaceTrack(newTrack);
      } else {
        pc.addTrack(newTrack, localStreamRef.current!);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.emit('offer', { targetSocketId, signal: pc.localDescription, roomId });
        } catch (e) {
          console.error('Renegotiation failed', e);
        }
      }
    }
  }, [socket, roomId]);

  return { peers, localStream, updateLocalStreamTrack, raisedHand, toggleRaiseHand };
};