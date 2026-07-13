import React from 'react';

/**
 * Skeleton — A shimmer-animated placeholder block.
 *
 * Usage:
 *   <Skeleton className="h-5 w-40" />                 — default rounded-md line
 *   <Skeleton variant="circle" className="h-24 w-24" /> — avatar circle
 *   <Skeleton variant="card" className="h-64" />      — rounded card
 *   <Skeleton variant="button" className="h-10 w-28" /> — button shape
 */

export type SkeletonVariant = 'line' | 'circle' | 'card' | 'button';

interface SkeletonProps {
  /** Visual shape preset */
  variant?: SkeletonVariant;
  /** Additional / override classes (height, width, etc.) */
  className?: string;
}

const variantClasses: Record<SkeletonVariant, string> = {
  line: 'rounded-md',
  circle: 'rounded-full',
  card: 'rounded-2xl',
  button: 'rounded-xl',
};

export function Skeleton({ variant = 'line', className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-muted shimmer ${variantClasses[variant]} ${className}`}
    />
  );
}

/**
 * SkeletonText — Renders multiple skeleton lines to mimic a text block.
 */
interface SkeletonTextProps {
  /** Number of lines */
  lines?: number;
  /** Gap between lines */
  gap?: string;
  /** Additional classes applied to the wrapper */
  className?: string;
}

export function SkeletonText({ lines = 3, gap = 'gap-2', className = '' }: SkeletonTextProps) {
  return (
    <div className={`flex flex-col ${gap} ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3.5 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}
