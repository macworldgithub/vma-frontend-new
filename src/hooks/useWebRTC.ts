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

  async testAudioBroadcast() {
    console.log('%c🎙️ Testing Audio Broadcasting to Remote User', 'font-size: 14px; font-weight: bold; color: #ff6600;');

    try {
      const script = `
        if (window.__webrtcDebug && window.__webrtcDebug.peerConnections) {
          const pcs = window.__webrtcDebug.peerConnections;
          console.log("📊 Found " + pcs.size + " peer connections");
          
          for (const [socketId, pc] of pcs.entries()) {
            console.log("\\n🔗 Peer: " + socketId);
            console.log("  Connection State: " + pc.connectionState);
            console.log("  ICE Connection: " + pc.iceConnectionState);
            console.log("  Signaling State: " + pc.signalingState);
            
            const senders = pc.getSenders();
            console.log("  Senders: " + senders.length);
            senders.forEach((s, i) => {
              if (s.track) {
                console.log("    " + (i + 1) + ". " + s.track.kind + " - " + s.track.label + " (Enabled: " + s.track.enabled + ")");
              }
            });
            
            const receivers = pc.getReceivers();
            console.log("  Receivers: " + receivers.length);
            receivers.forEach((r, i) => {
              if (r.track) {
                console.log("    " + (i + 1) + ". " + r.track.kind + " - " + r.track.label + " (Enabled: " + r.track.enabled + ")");
              }
            });
          }
        } else {
          console.warn("⚠️ Peer connections not available yet. Wait for other user to join.");
        }
      `;
      console.log(script);
      eval(script);
    } catch (err: any) {
      console.error('❌ Test failed:', err.message);
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
    console.log('WebRTCDiagnostics.testAudioBroadcast()- Check peer connections & audio senders/receivers');
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
}

export const useWebRTC = ({ roomId, socket, userId, userName, initialAudio, initialVideo }: UseWebRTCProps) => {
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceServers = useRef<any[]>([]);

  // 🔧 Debug: Expose to global for console access
  useEffect(() => {
    (globalThis as any).__webrtcDebug = {
      peerConnections: peerConnections.current,
      localStream: localStreamRef.current,
      peers,
    };
    console.log('[WebRTC] Debug utilities exposed. Access via window.__webrtcDebug');
  }, [peers, localStream]);

  const createPeerConnection = useCallback(async (targetSocketId: string, remoteUser: { userId: string, userName: string }) => {
    const pc = new RTCPeerConnection({
      iceServers: iceServers.current && iceServers.current.length > 0
        ? iceServers.current
        : [{ urls: ['stun:stun.l.google.com:19302'] }], // Fallback STUN server
    });

    peerConnections.current.set(targetSocketId, pc);

    // Add local tracks to peer connection
    localStreamRef.current?.getTracks().forEach((track) => {
      console.log(`[WebRTC] Adding local track: ${track.kind} (enabled: ${track.enabled})`);
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[WebRTC] ICE candidate for ${targetSocketId}:`, event.candidate.candidate);
        socket?.emit('ice-candidate', {
          targetSocketId,
          candidate: event.candidate,
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
        });
        return newPeers;
      });
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state for ${targetSocketId}:`, pc.connectionState);
    };

    pc.onicegatheringstatechange = () => {
      console.log(`[WebRTC] ICE gathering state for ${targetSocketId}:`, pc.iceGatheringState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE connection state for ${targetSocketId}:`, pc.iceConnectionState);
    };

    return pc;
  }, [roomId, socket]);

useEffect(() => {
  const init = async () => {
    // 1. Register all signaling event handlers FIRST (before join-room so no events are missed)
    socket?.on('user-joined', async (data) => {
      console.log('[WebRTC] User joined:', data);
      const { socketId, userId: newUserId, userName: newUserName } = data;
      const pc = await createPeerConnection(socketId, { userId: newUserId, userName: newUserName });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket?.emit('offer', { targetSocketId: socketId, signal: offer, roomId });
    });

    socket?.on('offer', async (data) => {
      console.log('[WebRTC] Received offer from:', data.fromSocketId);
      const { fromSocketId, fromUserId, fromUserName, signal } = data;
      let pc = peerConnections.current.get(fromSocketId);
      if (!pc) {
        pc = await createPeerConnection(fromSocketId, { userId: fromUserId, userName: fromUserName });
      }
      await pc.setRemoteDescription(new RTCSessionDescription(signal));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket?.emit('answer', { targetSocketId: fromSocketId, signal: answer, roomId });
    });

    socket?.on('answer', async (data) => {
      console.log('[WebRTC] Received answer from:', data.fromSocketId);
      const { fromSocketId, signal } = data;
      const pc = peerConnections.current.get(fromSocketId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
      }
    });

    socket?.on('ice-candidate', async (data) => {
      const { fromSocketId, candidate } = data;
      const pc = peerConnections.current.get(fromSocketId);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC] Failed to add ICE candidate:', err);
        }
      }
    });

    socket?.on('user-left', (data) => {
      console.log('[WebRTC] User left:', data.socketId);
      const { socketId } = data;
      const pc = peerConnections.current.get(socketId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(socketId);
      }
      setPeers((prev) => {
        const newPeers = new Map(prev);
        newPeers.delete(socketId);
        return newPeers;
      });
    });

    socket?.on('media-state-changed', (data) => {
      const { socketId, audioEnabled, videoEnabled } = data;
      console.log(`[WebRTC] Media state changed for ${socketId}:`, { audioEnabled, videoEnabled });
      setPeers((prev) => {
        const newPeers = new Map(prev);
        const peer = newPeers.get(socketId);
        if (peer) {
          newPeers.set(socketId, { ...peer, audioEnabled, videoEnabled });
        }
        return newPeers;
      });
    });

    socket?.on('media-state-change', (data) => {
      const { socketId, audioEnabled, videoEnabled } = data;
      console.log(`[WebRTC] Media state change for ${socketId}:`, { audioEnabled, videoEnabled });
      setPeers((prev) => {
        const newPeers = new Map(prev);
        const peer = newPeers.get(socketId);
        if (peer) {
          newPeers.set(socketId, { ...peer, audioEnabled, videoEnabled });
        }
        return newPeers;
      });
    });

    // 2. Join Room IMMEDIATELY — handlers are registered above so no events are missed.
    //    Joining here (before async ICE/media ops) ensures the socket is in the Socket.IO
    //    room right away so real-time chat messages are delivered without delay.
    console.log(`[WebRTC] Joining room ${roomId} as ${userName}`);
    socket?.emit('join-room', { roomId, userId, userName });

    // 3. Get ICE Servers
    try {
      const { data } = await api.get('/meetings/ice-servers');
      console.log('[WebRTC] ICE Servers received:', data.iceServers);
      iceServers.current = data.iceServers;
    } catch (err) {
      console.warn('[WebRTC] Failed to get ICE servers, using default STUN server', err);
      iceServers.current = [{ urls: ['stun:stun.l.google.com:19302'] }];
    }

    // 4. Get Local Stream with fallback logic
    let stream: MediaStream | null = null;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('[VMA] Browser media API not available. This happens on HTTP (non-localhost) or if the browser blocks it.');
      stream = new MediaStream();
    } else if (!initialVideo && !initialAudio) {
      console.log('[WebRTC] Both video and audio disabled, creating empty stream');
      stream = new MediaStream();
    } else {
      try {
        console.log(`[WebRTC] Requesting media: video = ${initialVideo}, audio = ${initialAudio}`);
        stream = await navigator.mediaDevices.getUserMedia({
          video: initialVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
          audio: initialAudio ? { echoCancellation: true, noiseSuppression: true } : false,
        });
        console.log(`[WebRTC] ✅ Local stream obtained with tracks:`, stream.getTracks().map(t => `${t.kind}(${t.enabled})`).join(', '));
      } catch (err: any) {
        console.warn(`[VMA] Initial media capture failed: ${err.name} - ${err.message}`);

        if (initialVideo && initialAudio) {
          try {
            console.log('[WebRTC] Fallback 1: trying audio only (no constraints)');
            stream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: true
            });
            console.log(`[WebRTC] ✅ Audio-only stream obtained:`, stream.getTracks().map(t => `${t.kind}(${t.enabled})`).join(', '));
          } catch (audioErr: any) {
            console.warn(`[VMA] Audio-only failed: ${audioErr.name} - ${audioErr.message}`);

            try {
              console.log('[WebRTC] Fallback 2: trying video only');
              stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
              });
              console.log(`[WebRTC] ✅ Video-only stream obtained:`, stream.getTracks().map(t => `${t.kind}(${t.enabled})`).join(', '));
            } catch (videoErr: any) {
              console.error(`[VMA] Video-only also failed: ${videoErr.name} - ${videoErr.message}`);
              console.error('[VMA] Possible causes:');
              console.error('  1. Camera/microphone is already in use by another app');
              console.error('  2. Browser permission is denied (check browser settings)');
              console.error('  3. No camera/microphone device found');
              console.error('  4. Device permissions not granted');
              console.error('  5. HTTPS required (or using localhost)');
              stream = new MediaStream();
            }
          }
        } else if (initialAudio) {
          try {
            console.log('[WebRTC] Fallback: trying audio only (audio was requested)');
            stream = await navigator.mediaDevices.getUserMedia({
              audio: true
            });
            console.log(`[WebRTC] ✅ Audio stream obtained:`, stream.getTracks().map(t => `${t.kind}(${t.enabled})`).join(', '));
          } catch (audioErr: any) {
            console.error(`[VMA] Audio capture failed: ${audioErr.name} - ${audioErr.message}`);
            stream = new MediaStream();
          }
        } else if (initialVideo) {
          try {
            console.log('[WebRTC] Fallback: trying video only (video was requested)');
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            console.log(`[WebRTC] ✅ Video stream obtained:`, stream.getTracks().map(t => `${t.kind}(${t.enabled})`).join(', '));
          } catch (videoErr: any) {
            console.error(`[VMA] Video capture failed: ${videoErr.name} - ${videoErr.message}`);
            stream = new MediaStream();
          }
        } else {
          stream = new MediaStream();
        }
      }
    }

    setLocalStream(stream);
    localStreamRef.current = stream;
  };

if (socket && roomId) {
  init();
}

return () => {
  socket?.off('user-joined');
  socket?.off('offer');
  socket?.off('answer');
  socket?.off('ice-candidate');
  socket?.off('user-left');
  socket?.off('media-state-changed');
  socket?.off('media-state-change');

  peerConnections.current.forEach(pc => pc.close());
  peerConnections.current.clear();
  localStreamRef.current?.getTracks().forEach(track => track.stop());
};
  }, [socket, roomId, userId, userName, initialAudio, initialVideo, createPeerConnection]);

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

return { peers, localStream, updateLocalStreamTrack };
};
