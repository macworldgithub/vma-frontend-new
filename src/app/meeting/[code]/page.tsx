'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Mic, MicOff, Video, VideoOff, Settings, ArrowRight } from 'lucide-react';
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
        setError('Meeting not found or has ended.');
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
    // Store preferences in sessionStorage or similar to pass to room
    sessionStorage.setItem('vma_pref_audio', audioEnabled.toString());
    sessionStorage.setItem('vma_pref_video', videoEnabled.toString());
    router.push(`/meeting/${code}/room`);
  };

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;
  if (error) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">{error}</div>;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row items-center justify-center p-6 gap-12">
      <div className="w-full max-w-2xl space-y-6">
        <div className="relative aspect-video rounded-2xl bg-slate-900 overflow-hidden border border-slate-800 shadow-2xl">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${!videoEnabled ? 'hidden' : ''}`}
          />
          {!videoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <div className="h-24 w-24 rounded-full bg-slate-800 flex items-center justify-center">
                <VideoOff className="h-10 w-10 text-slate-500" />
              </div>
            </div>
          )}

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <button
              onClick={toggleAudio}
              className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${audioEnabled ? 'bg-slate-800/80 hover:bg-slate-700' : 'bg-destructive hover:bg-destructive/90'
                }`}
            >
              {audioEnabled ? <Mic className="h-5 w-5 text-white" /> : <MicOff className="h-5 w-5 text-white" />}
            </button>
            <button
              onClick={toggleVideo}
              className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${videoEnabled ? 'bg-slate-800/80 hover:bg-slate-700' : 'bg-destructive hover:bg-destructive/90'
                }`}
            >
              {videoEnabled ? <Video className="h-5 w-5 text-white" /> : <VideoOff className="h-5 w-5 text-white" />}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-8 glass p-8 rounded-2xl">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white leading-tight">
            Ready to join?
          </h1>
          <p className="text-slate-400 font-medium">
            {meeting?.title}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800">
            <span className="text-sm text-slate-400">Status</span>
            <span className="text-sm font-bold text-green-400">{meeting?.status}</span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800">
            <span className="text-sm text-slate-400">Participants</span>
            <span className="text-sm font-bold text-white">{meeting?.participantCount || 0} active</span>
          </div>
        </div>

        <Button className="w-full gap-2 text-lg h-14" onClick={handleJoin}>
          Join Meeting
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
