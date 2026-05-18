'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/axios';

interface ForgotPasswordFormData {
  email: string;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', data);
      setIsSent(true);
      // Redirect after a short delay or show success message
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(data.email)}`);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 glass p-10 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary shimmer" />

        <div className="text-center relative">
          <div className="inline-block p-3 rounded-xl bg-accent/10 border border-accent/30 mb-4 shadow-lg shadow-accent/5 hover:border-primary hover:shadow-primary/20 transition-all duration-300">
            <div className="w-12 h-12 flex items-center justify-center text-accent">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Reset Password</h1>
          <p className="mt-2 text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            {isSent ? 'Verification code sent' : 'Enter your staff email'}
          </p>
        </div>

        {error && (
          <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            {error}
          </div>
        )}

        {isSent ? (
          <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="text-primary font-bold text-lg">Check your inbox</div>
            <p className="text-muted-foreground text-sm">We've sent a 6-digit code to your email. Redirecting you to the reset page...</p>
            <div className="flex justify-center pt-4">
              <div className="h-1 w-24 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-progress w-full" />
              </div>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Staff Email"
              type="email"
              placeholder="name@pattersoncheney.com.au"
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address"
                }
              })}
              error={errors.email?.message}
            />

            <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
              Send Reset Code
            </Button>

            <div className="text-center text-sm text-muted-foreground font-medium">
              Remembered your password?{' '}
              <Link href="/login" className="text-primary hover:text-primary/80 transition-colors">
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
