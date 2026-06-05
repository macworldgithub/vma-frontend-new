"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Users,
  Video,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface MeetingCardProps {
  meeting: {
    _id: string;
    title: string;
    meetingCode: string;
    status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
    startTime?: string;
    participantCount?: number;
    hostId?: string;
  };
}

export const MeetingCard = ({ meeting }: MeetingCardProps) => {
  const router = useRouter();

  const statusConfig = {
    SCHEDULED: {
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      label: "Upcoming",
    },
    LIVE: {
      color: "text-primary",
      bg: "bg-primary/10",
      label: "Live Now",
    },
    ENDED: { color: "text-slate-500", bg: "bg-white/5", label: "Ended" },
    CANCELLED: {
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      label: "Cancelled",
    },
  };

  const currentStatus = statusConfig[meeting.status];

  const handleJoin = () => {
    router.push(`/meeting/${meeting.meetingCode}`);
  };

  return (
    <div className="glass group relative overflow-hidden rounded-2xl border-white/5 hover-float">
      {/* Dynamic Status Border */}
      <div
        className={`absolute top-0 left-0 w-full h-1 opacity-20 group-hover:opacity-100 transition-opacity ${meeting.status === "LIVE" ? "bg-primary" : "bg-primary"
          }`}
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <h3 className="font-black text-base sm:text-lg text-white uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-1">
              {meeting.title}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5">
                {meeting.meetingCode}
              </span>
              {meeting.status === "LIVE" && (
                <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
              )}
            </div>
          </div>
          <span
            className={`text-[8px] sm:text-[9px] px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-black uppercase tracking-widest border border-white/10 ${currentStatus.color} ${currentStatus.bg}`}
          >
            {currentStatus.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-4 pt-1 sm:pt-2">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-tighter">
            <div className="p-1.5 sm:p-2 rounded-lg bg-white/5">
              <Calendar className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
            </div>
            {meeting.startTime
              ? new Date(meeting.startTime).toLocaleDateString("en-AU", {
                day: "2-digit",
                month: "short",
              })
              : "Instant"}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-tighter">
            <div className="p-1.5 sm:p-2 rounded-lg bg-white/5">
              <Clock className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
            </div>
            {meeting.startTime
              ? new Date(meeting.startTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
              : "Now"}
          </div>
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5 sm:-space-x-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/10 border border-slate-950 flex items-center justify-center"
                >
                  <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                </div>
              ))}
              {meeting.status === "LIVE" && (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/20 border border-slate-950 flex items-center justify-center text-[7px] sm:text-[8px] font-black text-primary">
                  +{meeting.participantCount || 0}
                </div>
              )}
            </div>
            <span className="text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
              {meeting.status === "LIVE" ? "Active" : "Ready"}
            </span>
          </div>

          {/* <Button
            variant={meeting.status === "LIVE" ? "primary" : "outline"}
            size="sm"
            className={`rounded-lg sm:rounded-xl px-2.5 sm:px-4 gap-1.5 sm:gap-2 font-black uppercase tracking-widest text-[8px] sm:text-[10px] h-8 sm:h-10 transition-all ${
              meeting.status === "LIVE"
                ? "shadow-lg shadow-primary/20 border-primary hover:bg-primary/80"
                : "border-white/10 hover:bg-white/10"
            }`}
            onClick={handleJoin}
            disabled={
              meeting.status === "ENDED" || meeting.status === "CANCELLED"
            }
          >
            {meeting.status === "LIVE" ? "JOIN" : "LOBBY"}
            <ChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </Button> */}

          <div className="relative z-50">
            <button
              type="button"
              onClick={() => router.push(`/meeting/${meeting.meetingCode}`)}
              disabled={
                meeting.status === "ENDED" || meeting.status === "CANCELLED"
              }
              className={`
      w-full sm:w-auto
      flex items-center justify-center
      gap-2
      px-4 py-2
      h-10
      rounded-xl
      font-black
      uppercase
      tracking-widest
      text-[10px]
      transition-all
      touch-manipulation
      ${meeting.status === "LIVE"
                  ? "bg-primary text-black hover:bg-[#00808a]"
                  : "border border-white/10 bg-transparent text-black hover:bg-white/10"
                }
      ${meeting.status === "ENDED" || meeting.status === "CANCELLED"
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
                }
    `}
            >
              JOIN
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Decorative Accent */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
    </div>
  );
};
