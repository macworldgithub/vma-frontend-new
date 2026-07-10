'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import { Transport, Producer, Consumer, Device } from 'mediasoup-client/lib/types';

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
  isScreenShare?: boolean;
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

  // Screen-share state
  const [screenSharing, setScreenSharing] = useState(false);
  const screenSharingRef = useRef(false);
  const screenProducerRef = useRef<Producer | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Mediasoup state
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);
  const audioProducerRef = useRef<Producer | null>(null);
  const videoProducerRef = useRef<Producer | null>(null);
  const consumersRef = useRef<Map<string, Consumer>>(new Map());

  const localStreamRef = useRef<MediaStream | null>(null);
  const mySocketId = useRef<string>('');

  // Ref mirrors so callbacks always see current values without stale closures.
  const audioEnabledRef = useRef(initialAudio);
  const videoEnabledRef = useRef(initialVideo);
  const socketRef = useRef<Socket | null>(null);

  // Keep socketRef current.
  useEffect(() => { socketRef.current = socket; }, [socket]);

  // ---------------------------------------------------------------------------
  // Emit media-state helper
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
  // ---------------------------------------------------------------------------
  const toggleAudio = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      console.warn('[WebRTC] toggleAudio: no audio track present');
      return;
    }

    const next = !audioEnabledRef.current;
    audioTrack.enabled = next;         // ← keep the track alive for Deepgram

    // Manage the Mediasoup producer
    const producer = audioProducerRef.current;
    if (producer) {
      try {
        if (next) {
          await socketRef.current?.emitWithAck('resumeProducer', { roomId, producerId: producer.id });
          producer.resume();
        } else {
          await socketRef.current?.emitWithAck('pauseProducer', { roomId, producerId: producer.id });
          producer.pause();
        }
      } catch (error) {
        console.error('[WebRTC] Error toggling audio producer', error);
      }
    }

    audioEnabledRef.current = next;
    setAudioEnabled(next);

    console.log(`[WebRTC] Audio ${next ? 'unmuted' : 'muted'} (track.enabled = ${next})`);
    emitMediaState(next, videoEnabledRef.current);
  }, [roomId, emitMediaState]);

  // ---------------------------------------------------------------------------
  // toggleVideo
  // ---------------------------------------------------------------------------
  const toggleVideo = useCallback(async () => {
    const stream = localStreamRef.current;
    const socket = socketRef.current;
    const sendTransport = sendTransportRef.current;
    if (!stream || !socket) return;

    const next = !videoEnabledRef.current;

    if (!next) {
      // ── Turning camera OFF ─────────────────────────────────────────────────
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = false;
        videoTrack.stop();                  // release camera hardware
        stream.removeTrack(videoTrack);
      }

      // Close the Mediasoup producer completely
      const producer = videoProducerRef.current;
      if (producer) {
        producer.close();
        videoProducerRef.current = null;
        socket.emit('closeProducer', { roomId, producerId: producer.id });
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

      // If we have a send transport, create a new producer for this track
      if (sendTransport && !videoProducerRef.current) {
        try {
          const producer = await sendTransport.produce({
            track: newTrack,
            encodings: [
              { maxBitrate: 100000, scaleResolutionDownBy: 4 },
              { maxBitrate: 300000, scaleResolutionDownBy: 2 },
              { maxBitrate: 900000, scaleResolutionDownBy: 1 },
            ],
            codecOptions: { videoGoogleStartBitrate: 1000 },
            appData: { kind: 'video' }
          });
          videoProducerRef.current = producer;

          producer.on('trackended', () => {
            console.log('[WebRTC] Video track ended');
            toggleVideo(); // automatically turn off if hardware is disconnected
          });
          producer.on('transportclose', () => {
            videoProducerRef.current = null;
          });
        } catch (error) {
          console.error('[WebRTC] Failed to produce video', error);
        }
      } else if (videoProducerRef.current) {
        // If we somehow already have a producer, just replace its track
        try {
          await videoProducerRef.current.replaceTrack({ track: newTrack });
        } catch (err) {
          console.error('[WebRTC] Failed to replace video track', err);
        }
      }
    }

    videoEnabledRef.current = next;
    setVideoEnabled(next);

    console.log(`[WebRTC] Video ${next ? 'started' : 'stopped'}`);
    emitMediaState(audioEnabledRef.current, next);
  }, [roomId, emitMediaState]);

  // ---------------------------------------------------------------------------
  // toggleScreenShare
  // ---------------------------------------------------------------------------
  // NOTE: we branch on screenSharingRef (not the `screenSharing` state) so that
  // the `track.onended` callback below — which fires when the browser's native
  // "Stop sharing" UI is used — always sees the current value instead of the
  // stale one captured when this callback was created.
  const toggleScreenShare = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket) return;

    // ── Turning screen share OFF ───────────────────────────────────────────
    if (screenSharingRef.current) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;

      const producer = screenProducerRef.current;
      if (producer) {
        producer.close();
        screenProducerRef.current = null;
        socket.emit('closeProducer', { roomId, producerId: producer.id });
      }

      screenSharingRef.current = false;
      setScreenSharing(false);
      return;
    }

    // ── Turning screen share ON ────────────────────────────────────────────
    const sendTransport = sendTransportRef.current;
    if (!sendTransport) {
      console.warn('[WebRTC] toggleScreenShare: send transport not ready yet');
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    } catch (err) {
      console.log('[WebRTC] Screen share cancelled by user');
      return;
    }

    const track = stream.getVideoTracks()[0];
    screenStreamRef.current = stream;

    try {
      const producer = await sendTransport.produce({
        track,
        encodings: [{ maxBitrate: 1_500_000 }],
        appData: { kind: 'screen' },
      });
      screenProducerRef.current = producer;

      // Fires when the user stops sharing via the browser's native control
      // (e.g. the "Stop sharing" bar) rather than our own UI button.
      track.onended = () => {
        toggleScreenShare();
      };

      producer.on('transportclose', () => {
        screenProducerRef.current = null;
      });

      screenSharingRef.current = true;
      setScreenSharing(true);
    } catch (error) {
      console.error('[WebRTC] Failed to produce screen share', error);
      stream.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

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
  // Main effect — Mediasoup Initialization
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!socket || !roomId) return;

    mySocketId.current = socket.id ?? '';
    if (!mySocketId.current) {
      socket.once('connect', () => { mySocketId.current = socket.id ?? ''; });
    }

    const init = async () => {
      // 1. Acquire local media.
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

      // 2. Join the room to get existing peers and Router RTP Capabilities
      console.log(`[WebRTC] Joining room ${roomId} as ${userName}`);
      socket.emit('join-room', {
        roomId,
        userId,
        userName,
        audioEnabled: audioEnabledRef.current,
        videoEnabled: videoEnabledRef.current,
      });
    };

    // ── Signaling handlers ─────────────────────────────────────────────────

    socket.on('room-joined', async ({ participants, routerRtpCapabilities, existingProducers }) => {
      console.log(`[WebRTC] Room joined. Participants: ${participants.length}`);

      // Add existing participants to state (with empty streams initially)
      const initialPeers = new Map<string, Peer>();
      for (const p of participants) {
        initialPeers.set(p.socketId, {
          socketId: p.socketId,
          userId: p.userId,
          userName: p.userName,
          stream: new MediaStream(),
          audioEnabled: p.audioEnabled,
          videoEnabled: p.videoEnabled,
          raisedHand: false,
        });
      }
      setPeers(initialPeers);

      try {
        // Initialize Mediasoup Device
        const device = new mediasoupClient.Device();
        await device.load({ routerRtpCapabilities });
        deviceRef.current = device;
        console.log('[WebRTC] Mediasoup device loaded');

        // Create Transports
        await setupTransports(device);

        // Consume existing producers
        if (existingProducers && existingProducers.length > 0) {
          for (const producer of existingProducers) {
            await consumeRemote(producer);
          }
        }
      } catch (error) {
        console.error('[WebRTC] Failed to initialize Mediasoup', error);
      }
    });

    socket.on('user-joined', ({ socketId, userId: uid, userName: uname, audioEnabled, videoEnabled }) => {
      console.log('[WebRTC] user-joined:', socketId);
      setPeers(prev => {
        const next = new Map(prev);
        if (!next.has(socketId)) {
          next.set(socketId, {
            socketId,
            userId: uid,
            userName: uname,
            stream: new MediaStream(),
            audioEnabled: audioEnabled ?? true,
            videoEnabled: videoEnabled ?? true,
            raisedHand: false,
          });
        }
        return next;
      });
    });

    socket.on('user-left', ({ socketId }) => {
      console.log('[WebRTC] user-left:', socketId);
      setPeers(prev => {
        const next = new Map(prev);
        next.delete(socketId);
        // Clean up any screen-share virtual peer this user may have had
        next.delete(`${socketId}-screen`);
        return next;
      });
    });

    socket.on('media-state-changed', ({ socketId, audioEnabled: remoteAudio, videoEnabled: remoteVideo }) => {
      setPeers(prev => {
        const next = new Map(prev);
        const peer = next.get(socketId);
        if (peer) next.set(socketId, { ...peer, audioEnabled: remoteAudio, videoEnabled: remoteVideo });
        return next;
      });
    });

    socket.on('raise-hand', ({ socketId, raisedHand: raised }) => {
      setPeers(prev => {
        const next = new Map(prev);
        const peer = next.get(socketId);
        if (peer) next.set(socketId, { ...peer, raisedHand: raised });
        return next;
      });
    });

    socket.on('newProducer', async (producerData) => {
      console.log(`[WebRTC] New remote producer: ${producerData.kind}`, producerData.appData);
      await consumeRemote(producerData);
    });

    socket.on('producerClosed', ({ producerId, socketId }) => {
      console.log(`[WebRTC] Remote producer closed: ${producerId}`);

      // Find the consumer corresponding to this producer
      let targetConsumerId: string | null = null;
      for (const [id, consumer] of consumersRef.current.entries()) {
        if (consumer.producerId === producerId) {
          targetConsumerId = id;
          break;
        }
      }

      if (targetConsumerId) {
        const consumer = consumersRef.current.get(targetConsumerId);
        if (consumer) {
          setPeers((prev) => {
            const next = new Map(prev);

            // If this producer belonged to a screen-share virtual peer,
            // remove the whole virtual tile rather than just the track.
            const screenKey = `${socketId}-screen`;
            const screenPeer = next.get(screenKey);
            if (screenPeer && screenPeer.stream.getTracks().includes(consumer.track)) {
              next.delete(screenKey);
              return next;
            }

            // Otherwise remove the track from the peer's (camera) stream so
            // the UI updates.
            const peer = next.get(socketId);
            if (peer) {
              peer.stream.removeTrack(consumer.track);
              next.set(socketId, { ...peer });
            }
            return next;
          });

          consumer.close();
          consumersRef.current.delete(targetConsumerId);
        }
      }
    });

    // ── Helper: Setup Transports ──────────────────────────────────────
    const setupTransports = async (device: Device) => {
      // 1. Send Transport
      const sendTransportData = await emitWithAck('createWebRtcTransport', { roomId, direction: 'send' });
      const sendTransport = device.createSendTransport({
        ...sendTransportData,
        iceServers: sendTransportData.iceServers,
      });

      sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          await emitWithAck('connectWebRtcTransport', { roomId, transportId: sendTransport.id, dtlsParameters });
          callback();
        } catch (error: any) {
          errback(error);
        }
      });

      sendTransport.on('produce', async (parameters, callback, errback) => {
        try {
          const { id } = await emitWithAck('produce', {
            roomId,
            transportId: sendTransport.id,
            kind: parameters.kind,
            rtpParameters: parameters.rtpParameters,
            appData: parameters.appData,
          });
          callback({ id });
        } catch (error: any) {
          errback(error);
        }
      });

      sendTransportRef.current = sendTransport;

      // Start producing local media if any
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack && audioEnabledRef.current) {
          const producer = await sendTransport.produce({ track: audioTrack, appData: { kind: 'audio' } });
          audioProducerRef.current = producer;
        }

        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack && videoEnabledRef.current) {
          const producer = await sendTransport.produce({
            track: videoTrack,
            encodings: [
              { maxBitrate: 100000, scaleResolutionDownBy: 4 },
              { maxBitrate: 300000, scaleResolutionDownBy: 2 },
              { maxBitrate: 900000, scaleResolutionDownBy: 1 },
            ],
            codecOptions: { videoGoogleStartBitrate: 1000 },
            appData: { kind: 'video' }
          });
          videoProducerRef.current = producer;
        }
      }

      // 2. Receive Transport
      const recvTransportData = await emitWithAck('createWebRtcTransport', { roomId, direction: 'recv' });
      const recvTransport = device.createRecvTransport({
        ...recvTransportData,
        iceServers: recvTransportData.iceServers,
      });

      recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          await emitWithAck('connectWebRtcTransport', { roomId, transportId: recvTransport.id, dtlsParameters });
          callback();
        } catch (error: any) {
          errback(error);
        }
      });

      recvTransportRef.current = recvTransport;

      sendTransport.on('connectionstatechange', async (state) => {
        console.log('[WebRTC] send:', state);
        if (state === 'disconnected' || state === 'failed') {
          try {
            const { iceParameters } = await emitWithAck('restartIce', { roomId, transportId: sendTransport.id });
            await sendTransport.restartIce({ iceParameters });
            console.log('[WebRTC] send transport ICE restarted');
          } catch (err) {
            console.error('[WebRTC] send ICE restart failed', err);
          }
        }
      });

      recvTransport.on('connectionstatechange', async (state) => {
        console.log('[WebRTC] recv:', state);
        if (state === 'disconnected' || state === 'failed') {
          try {
            const { iceParameters } = await emitWithAck('restartIce', { roomId, transportId: recvTransport.id });
            await recvTransport.restartIce({ iceParameters });
            console.log('[WebRTC] recv transport ICE restarted');
          } catch (err) {
            console.error('[WebRTC] recv ICE restart failed', err);
          }
        }
      });
    };

    // ── Helper: Consume Remote Producer ──────────────────────────────
    const consumeRemote = async (producerData: any) => {
      const device = deviceRef.current;
      const recvTransport = recvTransportRef.current;
      if (!device || !recvTransport) return;

      const { producerId, socketId, appData } = producerData;
      const isScreen = appData?.kind === 'screen';
      // Screen shares get their own "virtual peer" tile so they render
      // separately from the presenter's camera feed in the VideoGrid.
      const peerKey = isScreen ? `${socketId}-screen` : socketId;

      try {
        const { id, kind, rtpParameters } = await emitWithAck('consume', {
          roomId,
          producerId,
          rtpCapabilities: device.rtpCapabilities
        });

        const consumer = await recvTransport.consume({
          id,
          producerId,
          kind,
          rtpParameters
        });

        consumersRef.current.set(consumer.id, consumer);

        // Add the track to the corresponding peer's MediaStream
        setPeers(prev => {
          const next = new Map(prev);
          let peer = next.get(peerKey);
          if (!peer) {
            const basePeer = next.get(socketId);
            peer = {
              socketId: peerKey,
              userId: producerData.userId || basePeer?.userId || '',
              userName: isScreen
                ? `${producerData.userName || basePeer?.userName || 'Someone'}'s screen`
                : (producerData.userName || ''),
              stream: new MediaStream(),
              audioEnabled: true,
              videoEnabled: true,
              raisedHand: false,
              isScreenShare: isScreen,
            };
          }

          peer.stream.addTrack(consumer.track);
          next.set(peerKey, { ...peer });
          return next;
        });

        // The server creates consumers in "paused" state. Resume it.
        await emitWithAck('resumeConsumer', { roomId, consumerId: consumer.id });
        consumer.resume();

        if (kind === 'video') {
          const statsInterval = setInterval(async () => {
            try {
              const stats = await consumer.getStats();
              stats.forEach((r: any) => {
                if (r.type === 'inbound-rtp' && r.kind === 'video') {
                  console.log(
                    `[Stats] video packetsLost=${r.packetsLost} jitter=${r.jitter} framesDropped=${r.framesDropped}`
                  );
                }
              });
            } catch (err) {
              clearInterval(statsInterval); // consumer likely closed
            }
          }, 5000);

          // Stop polling once this consumer closes, so it doesn't run forever
          consumer.on('transportclose', () => clearInterval(statsInterval));
          consumer.on('trackended', () => clearInterval(statsInterval));
        }
      } catch (error) {
        console.error(`[WebRTC] Failed to consume producer ${producerId}`, error);
      }
    };

    // ── Helper: Promise-wrapper for socket.emit ───────────────────────
    const emitWithAck = (event: string, data: any): Promise<any> => {
      return new Promise((resolve, reject) => {
        socket.emit(event, data, (response: any) => {
          // If backend uses return statements without callbacks, nestjs typically
          // sends { event: 'something', data: {...} } back via normal events, not ACKs.
          // Wait, our backend returns objects. NestJS Gateway @SubscribeMessage returning an object 
          // acts as an Acknowledgement.
          if (response?.event === 'error') return reject(new Error(response.data?.message));
          resolve(response?.data || response);
        });
      });
    };

    // Workaround for NestJS not natively using socket.io ack callbacks 
    // when returning data from @SubscribeMessage. Actually, it DOES use ACK callbacks.
    // If a NestJS gateway returns a value from a method, it is sent as the ACK response.

    init();

    return () => {
      socket.off('room-joined');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('media-state-changed');
      socket.off('raise-hand');
      socket.off('newProducer');
      socket.off('producerClosed');

      if (sendTransportRef.current) sendTransportRef.current.close();
      if (recvTransportRef.current) recvTransportRef.current.close();

      consumersRef.current.forEach(c => c.close());
      consumersRef.current.clear();

      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;

      // Screen share cleanup
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      screenProducerRef.current = null;
      screenSharingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId, userId, userName, initialAudio, initialVideo]);

  // ---------------------------------------------------------------------------
  // updateLocalStreamTrack
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

    // Update Mediasoup Producer
    if (newTrack.kind === 'audio' && audioProducerRef.current) {
      await audioProducerRef.current.replaceTrack({ track: newTrack });
    } else if (newTrack.kind === 'video' && videoProducerRef.current) {
      await videoProducerRef.current.replaceTrack({ track: newTrack });
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
    screenSharing,
    toggleScreenShare,
  };
};