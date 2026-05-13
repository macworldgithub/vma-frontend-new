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

      // 2. Get Local Stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: initialVideo,
        audio: initialAudio,
      });
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
        const pc = await createPeerConnection(fromSocketId, { userId: fromUserId, userName: fromUserName });
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

  return { peers, localStream };
};
