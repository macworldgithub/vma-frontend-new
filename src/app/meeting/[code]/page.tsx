"use client";

import React, { useEffect, useState, useRef } from "react";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Settings,
  ArrowRight,
  Shield,
  Users,
  Clock,
  Info,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import api from "@/lib/axios";

export default function JoinPage() {
  const router = useRouter();
  const { code } = useParams();
  const { user } = useAuthStore();

  // ── Hydration guard ──────────────────────────────────────────────────────
  // Zustand persist reads localStorage (client-only).  `user` is null on the
  // server but populated on the client, so `isHost` would differ between the
  // two renders and trigger Next.js's hydration error which crashes the
  // router and shows a 404.  We render a static skeleton until mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [meeting, setMeeting] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isHost = user?.id === meeting?.hostId;
  const isScheduled = meeting?.status === "SCHEDULED";

  useEffect(() => {
    if (!code) return; // Guard against undefined code on initial render
    const fetchMeeting = async () => {
      try {
        const response = await api.get(`/meetings/join/${code}`);
        if (response.data.status === "ENDED") {
          const isTimeframeActive = response.data.endTime && new Date(response.data.endTime) > new Date();
          if (!isTimeframeActive) {
            setError("This meeting has already ended.");
            return;
          }
        }
        setMeeting(response.data);
      } catch (err) {
        setError(
          "The requested session could not be found or has been concluded.",
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchMeeting();
  }, [code]);

  // Polling for guests if the meeting is scheduled
  useEffect(() => {
    if (!meeting || !isScheduled || isHost) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await api.get(`/meetings/join/${code}`);
        if (response.data.status === "LIVE") {
          setMeeting(response.data);
          clearInterval(pollInterval);
        } else if (response.data.status === "ENDED") {
          const isTimeframeActive = response.data.endTime && new Date(response.data.endTime) > new Date();
          if (!isTimeframeActive) {
            setError("This meeting has already ended.");
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error("Failed to poll meeting status:", err);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [meeting, isScheduled, isHost, code]);

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
        console.error("Error accessing media devices:", err);
      }
    };

    startPreview();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
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

  const handleJoin = async () => {
    sessionStorage.setItem("vma_pref_audio", audioEnabled.toString());
    sessionStorage.setItem("vma_pref_video", videoEnabled.toString());

    if (isScheduled && isHost) {
      setIsStarting(true);
      try {
        await api.post(`/meetings/${meeting.meetingId}/start`);
      } catch (err) {
        console.error("Failed to start meeting:", err);
        toast.error("Could not start meeting. Please try again.");
        setIsStarting(false);
        return;
      }
    }

    toast.success("You have entered the meeting room.");
    setTimeout(() => {
      router.push(`/meeting/${code}/room`);
    }, 120);
  };

  // Show identical skeleton on server + initial client paint, then also
  // while the meeting API call is in flight.
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] animate-pulse">
          Initializing Secure Tunnel...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass max-w-md w-full p-10 rounded-3xl border-rose-500/20 text-center space-y-6">
          <div className="inline-block p-4 rounded-full bg-rose-500/10 text-rose-500 mb-2">
            <AlertCircle className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter">
            Session Expired
          </h1>
          <p className="text-muted-foreground font-medium">{error}</p>
          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full h-12 uppercase font-black tracking-widest text-[10px]"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row items-stretch justify-center p-0 lg:h-screen lg:overflow-hidden overflow-y-auto">
      {/* Left Panel: Video Preview */}
      <div className="flex-1 relative flex items-center justify-center p-6 md:p-12 bg-gradient-to-br from-secondary/30 via-background to-secondary/10 min-h-[450px] lg:min-h-0 pt-20 lg:pt-12 border-r border-border">
        <div className="absolute top-6 left-6 md:top-12 md:left-12 z-20">
          <Link href="/dashboard" className="flex items-center cursor-pointer">
            <Image
              src="/images/logo.png"
              alt="Patterson Cheney Logo"
              width={160}
              height={52}
              className="object-contain h-10 w-auto"
              priority
            />
          </Link>
        </div>

        <div className="w-full max-w-4xl relative aspect-video group animate-float">
          <div className="absolute inset-0 bg-primary/10 rounded-3xl blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />

          <div className="relative h-full w-full rounded-3xl bg-card overflow-hidden border border-border shadow-xl flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover mirror ${!videoEnabled ? "hidden" : ""}`}
            />
            {!videoEnabled && (
              <div className="text-center space-y-4">
                <div className="h-16 w-16 sm:h-24 sm:w-24 rounded-full bg-white/5 flex items-center justify-center mx-auto border border-white/5">
                  <VideoOff className="h-6 w-6 sm:h-10 sm:w-10 text-slate-600" />
                </div>
                <p className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
                  Camera is deactivated
                </p>
              </div>
            )}

            {/* Video Overlay Controls */}
            <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 sm:gap-6 z-10 w-[95%] sm:w-auto justify-center">
              <div className="glass px-4 sm:px-6 py-2.5 sm:py-3 rounded-full flex items-center gap-4 sm:gap-8 border border-border shadow-xl backdrop-blur-xl max-w-full">
                <button
                  onClick={toggleAudio}
                  className={`group flex flex-col items-center gap-1 transition-all ${audioEnabled ? "text-foreground" : "text-rose-500"}`}
                >
                  <div
                    className={`p-2.5 sm:p-3 rounded-xl transition-all ${audioEnabled ? "bg-muted group-hover:bg-muted/80" : "bg-rose-500/10 group-hover:bg-rose-500/20"}`}
                  >
                    {audioEnabled ? (
                      <Mic className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                    ) : (
                      <MicOff className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                    )}
                  </div>
                  <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                    {audioEnabled ? "ON" : "OFF"}
                  </span>
                </button>

                <button
                  onClick={toggleVideo}
                  className={`group flex flex-col items-center gap-1 transition-all ${videoEnabled ? "text-foreground" : "text-rose-500"}`}
                >
                  <div
                    className={`p-2.5 sm:p-3 rounded-xl transition-all ${videoEnabled ? "bg-muted group-hover:bg-muted/80" : "bg-rose-500/10 group-hover:bg-rose-500/20"}`}
                  >
                    {videoEnabled ? (
                      <Video className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                    ) : (
                      <VideoOff className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                    )}
                  </div>
                  <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                    {videoEnabled ? "ON" : "OFF"}
                  </span>
                </button>

                <div className="w-[1px] h-6 sm:h-8 bg-border mx-1 sm:mx-2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Information */}
      <div className="w-full lg:w-[480px] glass p-6 sm:p-10 lg:p-16 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-border relative bg-background/50 backdrop-blur-3xl animate-fade-in-up">
        <div className="space-y-12 relative z-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full w-fit">
              <Shield className="h-3 w-3 text-primary" />
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                Encryption Active
              </span>
            </div>
            <h1 className="text-4xl font-black text-foreground leading-tight uppercase tracking-tighter">
              Ready to <span className="text-primary">Join?</span>
            </h1>
            <p className="text-lg text-muted-foreground font-medium">
              "{meeting?.title}"
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-4">
                Meeting Intelligence
              </p>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Users className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Participants
                    </span>
                  </div>
                  <span className="text-sm font-black text-foreground">
                    {meeting?.participantCount || 0} /{" "}
                    {meeting?.maxParticipants}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                      <Clock className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Session Type
                    </span>
                  </div>
                  <span className="text-sm font-black text-foreground uppercase">
                    {meeting?.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex gap-4">
              <div className="p-2 h-fit rounded-lg bg-primary text-primary-foreground">
                <Info className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-black text-foreground uppercase tracking-wider mb-1">
                  Regional Compliance
                </p>
                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed uppercase tracking-tighter">
                  This session is hosted on AU servers. All media data remains
                  onshore within Australian jurisdiction.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            {isScheduled && !isHost ? (
              <Button
                className="w-full gap-3 text-lg h-16 rounded-2xl shadow-md font-black uppercase tracking-widest bg-muted border-border text-muted-foreground cursor-not-allowed active:scale-100"
                disabled
              >
                <div className="h-2 w-2 rounded-full bg-slate-400 animate-ping mr-1" />
                Waiting for host to start...
              </Button>
            ) : (
              <Button
                className="w-full gap-3 text-lg h-16 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest"
                onClick={handleJoin}
                isLoading={isStarting}
              >
                {isScheduled && isHost
                  ? "Start & Enter Meeting"
                  : "Enter Meeting Room"}
                <ArrowRight className="h-6 w-6" />
              </Button>
            )}
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] hover:text-primary transition-colors animate-in"
            >
              Return to Dashboard
            </button>
          </div>
        </div>

        {/* Branding background text */}
        <div className="absolute bottom-0 right-0 opacity-[0.02] pointer-events-none select-none overflow-hidden translate-y-1/2 translate-x-1/4">
          <h2 className="text-[200px] font-black uppercase leading-none">
            VMA
          </h2>
        </div>
      </div>
    </div>
  );
}
