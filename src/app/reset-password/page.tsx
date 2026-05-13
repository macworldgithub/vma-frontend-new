'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/axios';

interface ResetPasswordFormData {
  code: string;
  password: string;
  confirmPassword: string;
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>();

  const password = watch('password');

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/auth/reset-password', {
        email,
        code: data.code,
        password: data.password,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!email) {
    router.push('/forgot-password');
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 glass p-10 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary shimmer" />

        <div className="text-center relative">
          <div className="inline-block p-3 rounded-xl bg-primary/10 border border-primary/20 mb-4">
            <div className="w-12 h-12 flex items-center justify-center text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Set New Password</h1>
          <p className="mt-2 text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Update credentials for <span className="text-primary">{email}</span>
          </p>
        </div>

        {error && (
          <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="text-emerald-400 font-bold text-xl uppercase tracking-tighter">Success!</div>
            <p className="text-muted-foreground text-sm font-medium">Your password has been updated. Redirecting to login...</p>
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Verification Code"
              type="text"
              placeholder="000000"
              maxLength={6}
              className="text-center text-2xl tracking-[0.5em] font-bold"
              {...register('code', { 
                required: 'Code is required',
                pattern: { value: /^[0-9]{6}$/, message: "Must be a 6-digit number" }
              })}
              error={errors.code?.message}
            />

            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              {...register('password', { 
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' }
              })}
              error={errors.password?.message}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              {...register('confirmPassword', { 
                required: 'Please confirm your password',
                validate: (value) => value === password || 'Passwords do not match'
              })}
              error={errors.confirmPassword?.message}
            />

            <Button type="submit" className="w-full mt-4" isLoading={isLoading} size="lg">
              Update Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
