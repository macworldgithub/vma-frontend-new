import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-sm font-medium text-slate-300 ml-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full rounded-lg border border-border bg-slate-800/50 px-4 py-3 text-slate-100 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-slate-500 disabled:opacity-50 ${
            error ? 'border-destructive focus:ring-destructive/20' : ''
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="text-xs text-destructive mt-1 ml-1 font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
