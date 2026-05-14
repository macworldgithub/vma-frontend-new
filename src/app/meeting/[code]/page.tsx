'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Mic, MicOff, Video, VideoOff, Settings, 
  ArrowRight, Shield, Users, Clock, Info,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import api from '@/lib/axios';

export default function JoinPage() {
  const router = useRouter();
  const { code } = useParams();
  const [meeting, setMeeting] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const response = await api.get(`/meetings/join/${code}`);
        setMeeting(response.data);
      } catch (err) {
        setError('The requested session could not be found or has been concluded.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMeeting();
  }, [code]);

  useEffect(() => {
    const startPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing media devices:', err);
      }
    };

    startPreview();

    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const handleJoin = () => {
    sessionStorage.setItem('vma_pref_audio', audioEnabled.toString());
    sessionStorage.setItem('vma_pref_video', videoEnabled.toString());
    router.push(`/meeting/${code}/room`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] animate-pulse">Initializing Secure Tunnel...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="glass max-w-md w-full p-10 rounded-3xl border-rose-500/20 text-center space-y-6">
          <div className="inline-block p-4 rounded-full bg-rose-500/10 text-rose-500 mb-2">
            <AlertCircle className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Session Expired</h1>
          <p className="text-slate-400 font-medium">{error}</p>
          <Button onClick={() => router.push('/dashboard')} className="w-full h-12 uppercase font-black tracking-widest text-[10px]">Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row items-stretch justify-center p-0 overflow-hidden">
      {/* Left Panel: Video Preview */}
      <div className="flex-1 relative flex items-center justify-center p-6 md:p-12 bg-gradient-to-br from-slate-950 to-slate-900">
        <div className="absolute top-12 left-12 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black text-xl italic shadow-lg shadow-primary/20">PC</div>
            <div>
              <h2 className="text-white font-black uppercase italic tracking-tight leading-none">Patterson Cheney</h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Virtual Lobby • Secure Session</p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-4xl relative aspect-video group">
          <div className="absolute inset-0 bg-primary/10 rounded-3xl blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />
          
          <div className="relative h-full w-full rounded-3xl bg-slate-900 overflow-hidden border border-white/5 shadow-2xl flex items-center justify-center">
             <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover mirror ${!videoEnabled ? 'hidden' : ''}`}
              />
              {!videoEnabled && (
                <div className="text-center space-y-4">
                  <div className="h-24 w-24 rounded-full bg-white/5 flex items-center justify-center mx-auto border border-white/5">
                    <VideoOff className="h-10 w-10 text-slate-600" />
                  </div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Camera is deactivated</p>
                </div>
              )}

              {/* Video Overlay Controls */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 z-10">
                <div className="glass-dark px-6 py-3 rounded-full flex items-center gap-8 border border-white/10 shadow-2xl backdrop-blur-xl">
                  <button
                    onClick={toggleAudio}
                    className={`group flex flex-col items-center gap-1 transition-all ${audioEnabled ? 'text-white' : 'text-rose-500'}`}
                  >
                    <div className={`p-3 rounded-xl transition-all ${audioEnabled ? 'bg-white/5 group-hover:bg-white/10' : 'bg-rose-500/10 group-hover:bg-rose-500/20'}`}>
                      {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest">{audioEnabled ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    onClick={toggleVideo}
                    className={`group flex flex-col items-center gap-1 transition-all ${videoEnabled ? 'text-white' : 'text-rose-500'}`}
                  >
                    <div className={`p-3 rounded-xl transition-all ${videoEnabled ? 'bg-white/5 group-hover:bg-white/10' : 'bg-rose-500/10 group-hover:bg-rose-500/20'}`}>
                      {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest">{videoEnabled ? 'ON' : 'OFF'}</span>
                  </button>

                  <div className="w-[1px] h-8 bg-white/10 mx-2" />

                  <button className="group flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-all">
                    <div className="p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-all">
                      <Settings className="h-5 w-5" />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest">SETUP</span>
                  </button>
                </div>
              </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Information */}
      <div className="w-full lg:w-[480px] glass p-10 lg:p-16 flex flex-col justify-center border-l border-white/5 relative bg-slate-950/50 backdrop-blur-3xl">
        <div className="space-y-12 relative z-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full w-fit">
              <Shield className="h-3 w-3 text-emerald-500" />
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest italic">Encryption Active</span>
            </div>
            <h1 className="text-4xl font-black text-white leading-tight uppercase italic tracking-tighter">
              Ready to <span className="text-primary">Join?</span>
            </h1>
            <p className="text-lg text-slate-400 font-medium italic">
              "{meeting?.title}"
            </p>
          </div>

          <div className="space-y-6">
             <div className="space-y-3">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-4">Meeting Intelligence</p>
                <div className="grid grid-cols-1 gap-3">
                   <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-3">
                         <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Users className="h-4 w-4" />
                         </div>
                         <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Participants</span>
                      </div>
                      <span className="text-sm font-black text-white italic">{meeting?.participantCount || 0} / {meeting?.maxParticipants}</span>
                   </div>

                   <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-3">
                         <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                            <Clock className="h-4 w-4" />
                         </div>
                         <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Session Type</span>
                      </div>
                      <span className="text-sm font-black text-white italic uppercase">{meeting?.status}</span>
                   </div>
                </div>
             </div>

             <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex gap-4">
                <div className="p-2 h-fit rounded-lg bg-primary text-white">
                   <Info className="h-4 w-4" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-white uppercase tracking-wider mb-1">Regional Compliance</p>
                   <p className="text-[10px] text-slate-400 font-medium leading-relaxed uppercase tracking-tighter">This session is hosted on AU servers. All media data remains onshore within Australian jurisdiction.</p>
                </div>
             </div>
          </div>

          <div className="space-y-4 pt-4">
            <Button className="w-full gap-3 text-lg h-16 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase italic tracking-widest" onClick={handleJoin}>
              ENTER MEETING ROOM
              <ArrowRight className="h-6 w-6" />
            </Button>
            <button 
              onClick={() => router.push('/dashboard')}
              className="w-full py-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] hover:text-white transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>

        {/* Branding background text */}
        <div className="absolute bottom-0 right-0 opacity-[0.02] pointer-events-none select-none overflow-hidden translate-y-1/2 translate-x-1/4">
          <h2 className="text-[200px] font-black italic uppercase leading-none">VMA</h2>
        </div>
      </div>
    </div>
  );
}
