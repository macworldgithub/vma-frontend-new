import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-10 pb-20">
      {/* Header Section Skeleton */}
      <div className="relative overflow-hidden sm:rounded-[40px] bg-muted/40 border border-border p-6 sm:p-10 lg:p-14">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-10">
          <div className="space-y-3 sm:space-y-4 flex-1">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-12 sm:h-16 lg:h-20 w-3/4" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
            <Skeleton variant="button" className="h-11 sm:h-14 w-full sm:w-40" />
            <Skeleton variant="button" className="h-11 sm:h-14 w-full sm:w-36" />
          </div>
        </div>

        {/* Quick Stats Grid Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-14 border-t border-border pt-10">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 px-2">
        <Skeleton className="h-12 w-full max-w-md" />
        <div className="flex items-center gap-3">
          <Skeleton variant="button" className="h-9 sm:h-10 w-10" />
          <div className="h-8 sm:h-10 w-px bg-border mx-1 sm:mx-2" />
          <Skeleton variant="button" className="h-10 w-28" />
        </div>
      </div>

      {/* Meetings Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-muted/40 border border-border rounded-2xl p-6 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-center gap-2 pt-4">
              <Skeleton variant="circle" className="h-8 w-8" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-10 w-full mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MeetingsPageSkeleton() {
  return (
    <div className="space-y-10 pb-20">
      {/* Header Block Skeleton */}
      <div className="relative overflow-hidden rounded-[24px] sm:rounded-[40px] bg-muted/40 border border-border p-6 sm:p-10 lg:p-14">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
          <div className="space-y-3 sm:space-y-4 flex-1">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-12 sm:h-16 lg:h-20 w-2/3" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <div className="flex gap-3 sm:gap-4 w-full sm:w-auto">
            <Skeleton variant="card" className="h-16 sm:h-20 w-24 sm:w-32" />
            <Skeleton variant="card" className="h-16 sm:h-20 w-24 sm:w-32" />
          </div>
        </div>
      </div>

      {/* Control Bar Skeleton */}
      <div className="flex flex-col lg:flex-row gap-4">
        <Skeleton className="h-12 flex-1 max-w-xl" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="button" className="h-10 w-20" />
          ))}
        </div>
      </div>

      {/* Sessions Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-muted/40 border border-border rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 space-y-4 min-h-[200px] sm:min-h-[220px]">
            <div className="flex justify-between items-start gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton variant="button" className="h-6 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <div className="flex items-center justify-between gap-4 mt-6 pt-5 border-t border-border">
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-2">
                <Skeleton variant="button" className="h-8 w-16" />
                <Skeleton variant="button" className="h-8 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CalendarPageSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header section skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton variant="button" className="h-10 w-32" />
          <Skeleton variant="button" className="h-10 w-24" />
        </div>
      </div>

      {/* Provider tab skeleton */}
      <div className="flex border-b border-border">
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Main content skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Event cards skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-muted/40 border border-border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex gap-6 items-start">
                <Skeleton variant="card" className="h-16 w-20 min-w-[80px]" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-64" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton variant="button" className="h-10 w-40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminPageSkeleton() {
  return (
    <div className="min-h-screen p-4 md:p-8 space-y-10">
      {/* Header Section Skeleton */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Skeleton variant="button" className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton variant="button" className="h-10 w-10" />
          <Skeleton variant="button" className="h-10 w-32" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation Tabs Skeleton */}
        <div className="flex gap-1 p-1 bg-muted/60 border border-border rounded-2xl w-full sm:w-fit">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="button" className="h-10 w-24" />
          ))}
        </div>

        {/* Analytics Tab Content Skeleton */}
        <div className="space-y-8">
          {/* Stats Overview Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-muted/40 border border-border rounded-2xl p-6 space-y-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>

          {/* Chart and Top Users Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-muted/40 border border-border rounded-2xl p-6 h-80" />
            <div className="lg:col-span-1 bg-muted/40 border border-border rounded-2xl p-6 space-y-4 h-80">
              <Skeleton className="h-6 w-32" />
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton variant="circle" className="h-8 w-8" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Meetings Table Skeleton */}
          <div className="bg-muted/40 border border-border rounded-2xl p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-muted/30 rounded-xl">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton variant="button" className="h-10 w-24" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile avatar card skeleton */}
        <div className="md:col-span-1">
          <div className="bg-muted/40 border border-border p-8 rounded-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-muted shimmer" />
            <Skeleton variant="circle" className="w-24 h-24 mx-auto mb-6" />
            <Skeleton className="h-5 w-32 mx-auto mb-2" />
            <Skeleton className="h-4 w-16 mx-auto" />
          </div>
        </div>

        {/* Details card skeleton */}
        <div className="md:col-span-2">
          <div className="bg-muted/40 border border-border p-8 rounded-2xl relative overflow-hidden h-full">
            {/* Section header */}
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
              <Skeleton className="h-5 w-44" />
              <Skeleton variant="button" className="h-8 w-16" />
            </div>

            {/* Form fields */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-11 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-11 w-full" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-11 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-11 w-full" />
                </div>
              </div>
            </div>

            {/* Action button skeleton */}
            <div className="mt-10 pt-6 border-t border-border">
              <Skeleton variant="button" className="h-10 w-48" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
