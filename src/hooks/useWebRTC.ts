'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import api from '@/lib/axios';

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

  const createPeerConnection = useCallback(async (targetSocketId: string, remoteUser: { userId: string, userName: string }) => {
    const pc = new RTCPeerConnection({
      iceServers: iceServers.current,
    });

    peerConnections.current.set(targetSocketId, pc);

    // Add local tracks to peer connection
    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('ice-candidate', {
          targetSocketId,
          candidate: event.candidate,
          roomId,
        });
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setPeers((prev) => {
        const newPeers = new Map(prev);
        newPeers.set(targetSocketId, {
          socketId: targetSocketId,
          userId: remoteUser.userId,
          userName: remoteUser.userName,
          stream: remoteStream,
          audioEnabled: true, // Default to true, will be updated via media-state-changed event
          videoEnabled: true,
        });
        return newPeers;
      });
    };

    return pc;
  }, [roomId, socket]);

  useEffect(() => {
    const init = async () => {
      // 1. Get ICE Servers
      const { data } = await api.get('/meetings/ice-servers');
      iceServers.current = data.iceServers;

      // 2. Get Local Stream with fallback logic
      let stream: MediaStream | null = null;
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('VMA: Browser media API not available. This happens on HTTP (non-localhost) or if the browser blocks it.');
        stream = new MediaStream();
      } else if (!initialVideo && !initialAudio) {
        // If both are explicitly false, don't request media right now to avoid TypeError.
        stream = new MediaStream();
      } else {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: initialVideo,
            audio: initialAudio,
          });
        } catch (err: any) {
          console.warn('VMA: Initial media capture failed, trying fallback...', err.name);
          
          if (initialVideo && initialAudio) {
            // If both were requested and failed, try audio only
            try {
              stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            } catch {
              // If audio only failed, try video only
              try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
              } catch {
                console.error('VMA: No camera or microphone found or permission denied. Joining with no media.');
                stream = new MediaStream();
              }
            }
          } else {
            console.error('VMA: Requested media not found or permission denied. Joining with no media.');
            stream = new MediaStream();
          }
        }
      }

      setLocalStream(stream);
      localStreamRef.current = stream;

      // 3. Join Room
      socket?.emit('join-room', { roomId, userId, userName });

      // 4. Handle signaling
      socket?.on('user-joined', async (data) => {
        const { socketId, userId: newUserId, userName: newUserName } = data;
        const pc = await createPeerConnection(socketId, { userId: newUserId, userName: newUserName });
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { targetSocketId: socketId, signal: offer, roomId });
      });

      socket?.on('offer', async (data) => {
        const { fromSocketId, fromUserId, fromUserName, signal } = data;
        let pc = peerConnections.current.get(fromSocketId);
        if (!pc) {
          pc = await createPeerConnection(fromSocketId, { userId: fromUserId, userName: fromUserName });
        }
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { targetSocketId: fromSocketId, signal: answer, roomId });
      });

      socket?.on('answer', async (data) => {
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
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });

      socket?.on('user-left', (data) => {
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
        setPeers((prev) => {
          const newPeers = new Map(prev);
          const peer = newPeers.get(socketId);
          if (peer) {
            newPeers.set(socketId, { ...peer, audioEnabled, videoEnabled });
          }
          return newPeers;
        });
      });
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
