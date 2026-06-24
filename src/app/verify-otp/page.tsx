'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

interface VerifyOtpFormData {
  code: string;
}

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!email) {
      router.push('/signup');
    }
  }, [email, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyOtpFormData>();

  const onSubmit = async (data: VerifyOtpFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const signupDataRaw = sessionStorage.getItem('signup_data');
      if (!signupDataRaw) {
        throw new Error('Registration data missing. Please sign up again.');
      }

      const signupData = JSON.parse(signupDataRaw);

      await api.post('/auth/verify-otp', {
        ...signupData,
        code: data.code,
      });

      setSuccess(true);
      sessionStorage.removeItem('signup_data');

      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 bg-card border border-border p-6 sm:p-10 rounded-2xl relative overflow-hidden text-center shadow-2xl animate-scale-in">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary shimmer" />
          <div className="inline-block p-4 rounded-full bg-primary/10 text-primary mb-4 border border-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-foreground uppercase">Account Verified!</h2>
          <p className="text-muted-foreground font-medium">Your account has been created successfully. Redirecting you to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-card border border-border p-6 sm:p-10 rounded-2xl relative overflow-hidden text-center shadow-2xl animate-scale-in">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary shimmer" />

        <div>
          <div className="inline-block p-3 rounded-xl bg-accent/10 border border-accent/30 mb-4 shadow-lg shadow-accent/5 hover:border-primary hover:shadow-primary/20 transition-all duration-300">
            <div className="w-12 h-12 flex items-center justify-center text-accent font-black text-2xl tracking-tighter">OTP</div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground uppercase">Verify Identity</h1>
          <p className="mt-2 text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Code sent to <span className="text-primary">{email}</span>
          </p>
        </div>

        {error && (
          <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Verification Code"
            type="text"
            placeholder="000000"
            maxLength={6}
            className="text-center text-3xl tracking-[0.6em] font-black py-5 bg-muted/40 border-border text-foreground"
            {...register('code', {
              required: 'Code is required',
              pattern: { value: /^[0-9]{6}$/, message: "Must be a 6-digit number" }
            })}
            error={errors.code?.message}
          />

          <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
            Verify & Continue
          </Button>

          <p className="text-sm text-muted-foreground font-medium">
            Didn't receive the code?{' '}
            <button
              type="button"
              className="text-primary hover:text-primary/80 transition-colors font-bold uppercase tracking-wider cursor-pointer"
              onClick={async () => {
                try {
                  await api.post('/auth/signup', { email });
                  alert('A new OTP has been sent to your email.');
                } catch (e) {
                  console.error(e);
                }
              }}
            >
              Resend
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    }>
      <VerifyOtpContent />
    </Suspense>
  );
}
