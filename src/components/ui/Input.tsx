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
          <label className="text-sm font-semibold text-muted-foreground ml-1 uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full rounded-xl border border-border bg-black/40 px-4 py-3 text-foreground transition-all duration-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 placeholder:text-muted-foreground/50 disabled:opacity-50 ${
            error ? 'border-destructive focus:ring-destructive/10' : ''
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
