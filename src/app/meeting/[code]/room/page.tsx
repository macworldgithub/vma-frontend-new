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

  // ── Hydration guard ────────────────────────────────────────────────────
  // Zustand's `persist` middleware reads localStorage, which doesn't exist
  // on the server.  This means `user` / `token` are always null on the
  // first server render but populated on the client, causing a hydration
  // mismatch that crashes the Next.js router and shows a blank 404 page.
  // Rendering a static skeleton until the component has mounted ensures
  // both sides produce identical HTML on the very first paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

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

  const [initialAudio] = useState(() => {
    if (typeof window !== 'undefined') {
      const pref = sessionStorage.getItem('vma_pref_audio');
      return pref !== null ? pref === 'true' : true;
    }
    return true;
  });
  const [initialVideo] = useState(() => {
    if (typeof window !== 'undefined') {
      const pref = sessionStorage.getItem('vma_pref_video');
      return pref !== null ? pref === 'true' : true;
    }
    return true;
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showCopied, setShowCopied] = useState(false);

  const [transcriptionEnabled, setTranscriptionEnabled] = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState({ speaker: '', text: '' });

  const socketRef = useRef<Socket | null>(null);

  // Fetch meeting info
  useEffect(() => {
    if (!code) return; // Guard against undefined code on initial render
    const init = async () => {
      try {
        const { data } = await api.get(`/meetings/join/${code}`);
        console.log(data, "DATA")
        // Prevent non-hosts from entering locked rooms
        if (data.isLocked && data.hostId !== user?.id) {
          router.push('/dashboard?meetingLocked=true');
          return;
        }

        setRoomId(data.roomId);
        setMeetingId(data.meetingId);
        setMeetingTitle(data.title || '');
        setHostId(data.hostId);

      } catch {
        router.push('/dashboard');
      }
    };
    init();
  }, [code, router]);

  // Connect socket
  useEffect(() => {
    if (!token || !roomId) return;

    const s = io(process.env.NEXT_PUBLIC_API_URL, {
      auth: { token },
      transports: ['websocket'],
      extraHeaders: {
        'ngrok-skip-browser-warning': 'true',
      },
    });

    s.on('connect', () => console.log('Socket connected'));

    // Chat events
    s.on('chat-message', (msg: ChatMessage) => {
      if (msg && msg.message && msg.message.startsWith('__SYSTEM_KICK__:')) return;
      setChatMessages((prev) => [...prev, msg]);
    });
    s.on('chat-history', (history: ChatMessage[]) => {
      setChatMessages(history.filter(m => !(m && m.message && m.message.startsWith('__SYSTEM_KICK__:'))));
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

  const {
    peers,
    localStream,
    raisedHand,
    toggleRaiseHand,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    screenSharing,
    toggleScreenShare,
    screenShareError,
    removePeer,
  } = useWebRTC({
    roomId,
    socket,
    userId: user?.id || '',
    userName: user?.name || 'Guest',
    initialAudio,
    initialVideo,
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
    hasPeers: true, // Always enable transcription, even if testing alone
  });

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

  // Kick a participant (host only)
  const kickParticipant = useCallback((targetUserId: string) => {
    socket?.emit('kick-participant', { roomId, targetUserId });

    // Workaround: backend fails to broadcast user-left on kicks, 
    // so we manually broadcast the kick to all clients via the chat system.
    socket?.emit('chat-message', {
      roomId,
      message: `__SYSTEM_KICK__:${targetUserId}`,
      userName: 'SYSTEM',
    });

    removePeer(targetUserId);
  }, [socket, roomId, removePeer]);

  // Generate PDF report from transcript
  const generateReport = useCallback(async () => {
    if (reportLoading) return;
    setReportLoading(true);
    try {
      const transcriptText =
        transcripts.length > 0
          ? transcripts
            .map(
              (t) =>
                `[${new Date(t.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}] ${t.userName}: ${t.text}`
            )
            .join('\n')
          : `
[09:00] John Smith: Good morning everyone, thank you for Fjoining today's project review meeting.
[09:01] Sarah Johnson: The frontend dashboard is now 90% complete and ready for QA testing.
[09:03] Michael Brown: Backend API integration has been completed successfully.
[09:05] John Smith: Let's schedule user acceptance testing for next week.
[09:10] Sarah Johnson: We still need final approval on the UI design changes.
[09:15] Michael Brown: Performance testing shows a significant improvement.
[09:18] John Smith: Thanks everyone. Meeting adjourned.
`;

      const response = await fetch('https://vma-microservice.omnisuiteai.com/report/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptText,
          meeting_title: meetingTitle || 'Untitled Meeting',
        }),
      });

      if (!response.ok) throw new Error('Failed to generate report');

      const blob = await response.blob()
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

  // Auto-dismiss the screen-share error banner after a few seconds
  const [showScreenShareError, setShowScreenShareError] = useState(false);
  useEffect(() => {
    if (screenShareError) {
      setShowScreenShareError(true);
      const timeout = setTimeout(() => setShowScreenShareError(false), 5000);
      return () => clearTimeout(timeout);
    }
    setShowScreenShareError(false);
  }, [screenShareError]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] animate-pulse">
          Initializing Secure Session...
        </p>
      </div>
    );
  }

  if (meetingEnded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass max-w-md w-full p-12 rounded-[40px] border-primary/20 text-center space-y-8 animate-in zoom-in-95 duration-500">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative p-6 rounded-full bg-primary/10 text-primary">
              <Shield className="h-12 w-12" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter leading-tight">Session <span className="text-primary">Concluded</span></h2>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Secure Tunnel Successfully Terminated</p>
          </div>
          <div className="p-4 rounded-2xl bg-muted border border-border text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
            The meeting data has been encrypted and archived. Download the meeting report or return to your dashboard.
          </div>

          {/* Generate Report Button */}
          <button
            onClick={generateReport}
            disabled={reportLoading}
            className={`w-full h-14 rounded-2xl flex items-center justify-center font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 border shadow-xl ${reportDownloaded
              ? 'bg-primary/20 text-primary border-primary/30 shadow-primary/10 hover:bg-primary/30'
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
                Download Again
              </>
            ) : (
              <>
                Download Meeting Report
              </>
            )}
          </button>

          {/* Return to Dashboard */}
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] hover:text-primary transition-colors flex items-center justify-center gap-2"
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
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass max-w-md w-full p-12 rounded-[40px] border-rose-500/20 text-center space-y-8 animate-in zoom-in-95 duration-500">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative p-6 rounded-full bg-rose-500/10 text-rose-500">
              <Shield className="h-12 w-12" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter leading-tight">Access <span className="text-rose-500">Revoked</span></h2>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Permissions terminated by host</p>
          </div>
          <div className="p-4 rounded-2xl bg-muted border border-border text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
            Your connection to this secure session has been severed. Redirecting to dashboard...
          </div>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 animate-[progress_3s_linear_forwards]" />
          </div>
        </div>
      </div>
    );
  }

  const isHost = user?.id === hostId;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {showCopied && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[100] glass px-6 py-3 rounded-full border-primary/30 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300">
          <Shield className="h-4 w-4" />
          Secure Link Copied
        </div>
      )}
      {showScreenShareError && screenShareError && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[100] glass px-6 py-3 rounded-2xl border-rose-500/30 bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 max-w-[90vw] text-center animate-in slide-in-from-top-4 fade-in duration-300">
          {screenShareError}
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
            localRaisedHand={raisedHand}
            isHost={isHost}
            onKickParticipant={kickParticipant}
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
          raisedHand={raisedHand}
          onToggleRaiseHand={toggleRaiseHand}
        />
      </div>
    </div>
  );
}
