'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoGrid } from '@/components/meeting/VideoGrid';
import { ControlBar } from '@/components/meeting/ControlBar';
import { ChatPanel } from '@/components/meeting/ChatPanel';
import { TranscriptPanel } from '@/components/meeting/TranscriptPanel';
import { ClosedCaptions } from '@/components/meeting/ClosedCaptions';
import { useDeepgramTranscription } from '@/hooks/useDeepgramTranscription';
import api from '@/lib/axios';
import { Shield, FileDown, Loader2, ArrowLeft } from 'lucide-react';

interface ChatMessage {
  id?: string;
  userId: string;
  userName: string;
  message: string;
  sentAt: string;
}

export default function MeetingRoomPage() {
  const { code } = useParams();
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [hostId, setHostId] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [kicked, setKicked] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportDownloaded, setReportDownloaded] = useState(false);

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showCopied, setShowCopied] = useState(false);

  const [transcriptionEnabled, setTranscriptionEnabled] = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState({ speaker: '', text: '' });

  const screenStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Fetch meeting info
  useEffect(() => {
    if (!code) return; // Guard against undefined code on initial render
    const init = async () => {
      try {
        const { data } = await api.get(`/meetings/join/${code}`);
        setRoomId(data.roomId);
        setMeetingId(data.meetingId);
        setMeetingTitle(data.title || '');
        setHostId(data.hostId);

        // Read preferences from pre-join
        const prefAudio = sessionStorage.getItem('vma_pref_audio');
        const prefVideo = sessionStorage.getItem('vma_pref_video');
        if (prefAudio !== null) setAudioEnabled(prefAudio === 'true');
        if (prefVideo !== null) setVideoEnabled(prefVideo === 'true');
      } catch {
        router.push('/dashboard');
      }
    };
    init();
  }, [code, router]);

  // Connect socket
  useEffect(() => {
    if (!token || !roomId) return;

    // const s = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
    const s = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'https://vma-backend.omnisuiteai.com', {
      auth: { token },
      transports: ['websocket'],
      extraHeaders: {
        'ngrok-skip-browser-warning': 'true',
      },
    });

    s.on('connect', () => console.log('Socket connected'));

    // Chat events
    s.on('chat-message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });
    s.on('chat-history', (history: ChatMessage[]) => {
      setChatMessages(history);
    });

    // Transcript events
    s.on('new-transcript', (t: any) => {
      setTranscripts((prev) => [...prev, t]);
      // Clear interim subtitle when final transcription arrives
      setActiveSubtitle({ speaker: '', text: '' });
    });
    s.on('new-transcript-interim', (data: { userId: string; userName: string; text: string }) => {
      setActiveSubtitle({ speaker: data.userName, text: data.text });
    });
    s.on('transcript-history', (history: any[]) => {
      setTranscripts(history);
    });

    // After socket fully joins the Socket.IO room, re-fetch history to catch
    // any messages sent in the brief window between connect and join-room.
    s.on('room-joined', () => {
      s.emit('get-chat-history', { roomId });
      s.emit('get-transcript-history', { roomId });
    });

    // Meeting lifecycle events
    s.on('meeting-ended', () => setMeetingEnded(true));
    s.on('kicked', () => setKicked(true));
    s.on('room-locked', (data: { isLocked: boolean }) => setIsLocked(data.isLocked));

    socketRef.current = s;
    setSocket(s);

    // Request chat history
    s.emit('get-chat-history', { roomId });

    return () => {
      s.disconnect();
    };
  }, [token, roomId]);

  // WebRTC hook
  const { peers, localStream, updateLocalStreamTrack } = useWebRTC({
    roomId,
    socket,
    userId: user?.id || '',
    userName: user?.name || 'Guest',
    initialAudio: audioEnabled,
    initialVideo: videoEnabled,
  });

  // Deepgram transcription — captures each participant's audio and sends
  // chunks to the backend which streams them to Deepgram and broadcasts
  // 'new-transcript' / 'new-transcript-interim' events to the entire room.
  useDeepgramTranscription({
    roomId,
    socket,
    audioEnabled,
    transcriptionEnabled,
    localStream,
    hasPeers: peers.size > 0,
  });

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setAudioEnabled(track.enabled);
        socket?.emit('media-state-change', { roomId, audioEnabled: track.enabled, videoEnabled });
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const newTrack = stream.getAudioTracks()[0];
          await updateLocalStreamTrack(newTrack);
          setAudioEnabled(true);
          socket?.emit('media-state-change', { roomId, audioEnabled: true, videoEnabled });
        } catch (err) {
          console.error('Failed to get audio track', err);
        }
      }
    }
  }, [localStream, socket, roomId, videoEnabled, updateLocalStreamTrack]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (localStream) {
      const track = localStream.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setVideoEnabled(track.enabled);
        socket?.emit('media-state-change', { roomId, audioEnabled, videoEnabled: track.enabled });
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          const newTrack = stream.getVideoTracks()[0];
          await updateLocalStreamTrack(newTrack);
          setVideoEnabled(true);
          socket?.emit('media-state-change', { roomId, audioEnabled, videoEnabled: true });
        } catch (err) {
          console.error('Failed to get video track', err);
        }
      }
    }
  }, [localStream, socket, roomId, audioEnabled, updateLocalStreamTrack]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    if (screenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      socket?.emit('screen-share-stop', { roomId });
      setScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        socket?.emit('screen-share-start', { roomId });
        setScreenSharing(true);
        stream.getVideoTracks()[0].onended = () => {
          socket?.emit('screen-share-stop', { roomId });
          setScreenSharing(false);
        };
      } catch {
        console.log('Screen share cancelled');
      }
    }
  }, [screenSharing, socket, roomId]);

  // Send chat
  const sendChat = useCallback((message: string) => {
    socket?.emit('chat-message', { roomId, message });
  }, [socket, roomId]);

  // Copy Link
  const copyLink = useCallback(() => {
    const link = `${window.location.origin}/meeting/${code}`;
    navigator.clipboard.writeText(link);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 3000);
  }, [code]);

  // Leave meeting
  const leaveMeeting = useCallback(() => {
    socket?.emit('leave-room', { roomId });
    router.push('/dashboard');
  }, [socket, roomId, router]);

  // End meeting (host)
  const endMeeting = useCallback(() => {
    socket?.emit('end-meeting', { roomId });
  }, [socket, roomId]);

  // Lock toggle (host)
  const toggleLock = useCallback(() => {
    socket?.emit('toggle-lock', { roomId });
  }, [socket, roomId]);

  // Generate PDF report from transcript
  const generateReport = useCallback(async () => {
    if (reportLoading) return;
    setReportLoading(true);
    try {
      // Build a formatted transcript string from all transcript blocks
      const transcriptText = transcripts
        .map(
          (t) =>
            `[${new Date(t.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}] ${t.userName}: ${t.text}`
        )
        .join('\n');

      const response = await fetch('http://localhost:8000/report/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptText,
          meeting_title: meetingTitle || 'Untitled Meeting',
        }),
      });

      if (!response.ok) throw new Error('Failed to generate report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Extract filename from Content-Disposition header or use default
      const disposition = response.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="(.+?)"/);
      a.download = filenameMatch ? filenameMatch[1] : 'VMA_Report.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setReportDownloaded(true);
    } catch (err) {
      console.error('Failed to generate report:', err);
      alert('Failed to generate the meeting report. Please try again.');
    } finally {
      setReportLoading(false);
    }
  }, [transcripts, meetingTitle, reportLoading]);

  // Redirect only kicked users automatically; meeting-ended users stay to download report
  useEffect(() => {
    if (kicked) {
      const timeout = setTimeout(() => router.push('/dashboard'), 3000);
      return () => clearTimeout(timeout);
    }
  }, [kicked, router]);

  if (meetingEnded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="glass max-w-md w-full p-12 rounded-[40px] border-emerald-500/20 text-center space-y-8 animate-in zoom-in-95 duration-500">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative p-6 rounded-full bg-emerald-500/10 text-emerald-500">
              <Shield className="h-12 w-12" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">Session <span className="text-emerald-400">Concluded</span></h2>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Secure Tunnel Successfully Terminated</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
            The meeting data has been encrypted and archived. Download the meeting report or return to your dashboard.
          </div>

          {/* Generate Report Button */}
          <button
            onClick={generateReport}
            disabled={reportLoading}
            className={`w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 border shadow-xl ${
              reportDownloaded
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10 hover:bg-emerald-500/30'
                : 'bg-primary/20 text-primary border-primary/30 shadow-primary/10 hover:bg-primary/30 hover:-translate-y-0.5'
            } ${reportLoading ? 'opacity-70 cursor-wait' : 'active:scale-[0.98]'}`}
          >
            {reportLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating Report...
              </>
            ) : reportDownloaded ? (
              <>
                <FileDown className="h-5 w-5" />
                Download Again
              </>
            ) : (
              <>
                <FileDown className="h-5 w-5" />
                Download Meeting Report
              </>
            )}
          </button>

          {/* Return to Dashboard */}
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (kicked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="glass max-w-md w-full p-12 rounded-[40px] border-rose-500/20 text-center space-y-8 animate-in zoom-in-95 duration-500">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative p-6 rounded-full bg-rose-500/10 text-rose-500">
              <Shield className="h-12 w-12" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">Access <span className="text-rose-500">Revoked</span></h2>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Permissions terminated by host</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
            Your connection to this secure session has been severed. Redirecting to dashboard...
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 animate-[progress_3s_linear_forwards]" />
          </div>
        </div>
      </div>
    );
  }

  const isHost = user?.id === hostId;

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      {showCopied && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[100] glass-dark px-6 py-3 rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300">
          <Shield className="h-4 w-4" />
          Secure Link Copied
        </div>
      )}
      <div className="flex-1 flex overflow-hidden relative">
        <div className={`flex-1 transition-all ${chatOpen || transcriptOpen ? 'mr-0' : ''}`}>
          <VideoGrid
            peers={peers}
            localStream={localStream}
            localUserName={user?.name || 'You'}
            localAudioEnabled={audioEnabled}
            localVideoEnabled={videoEnabled}
          />
        </div>
        {chatOpen && (
          <ChatPanel
            messages={chatMessages}
            onSend={sendChat}
            onClose={() => setChatOpen(false)}
            currentUserId={user?.id || ''}
          />
        )}
        {transcriptOpen && (
          <TranscriptPanel
            transcripts={transcripts}
            onClose={() => setTranscriptOpen(false)}
            currentUserId={user?.id || ''}
          />
        )}
        <ClosedCaptions
          speakerName={activeSubtitle.speaker}
          text={activeSubtitle.text}
        />
        <ControlBar
          audioEnabled={audioEnabled}
          videoEnabled={videoEnabled}
          screenSharing={screenSharing}
          chatOpen={chatOpen}
          transcriptOpen={transcriptOpen}
          isHost={isHost}
          isLocked={isLocked}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          onToggleChat={() => {
            setChatOpen(!chatOpen);
            setTranscriptOpen(false);
          }}
          onToggleTranscript={() => {
            setTranscriptOpen(!transcriptOpen);
            setChatOpen(false);
          }}
          onCopyLink={copyLink}
          onLeave={leaveMeeting}
          onEndMeeting={endMeeting}
          onToggleLock={toggleLock}
        />
      </div>
    </div>
  );
}
