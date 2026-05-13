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
  const setAuth = useAuthStore((state) => state.setAuth);

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
      const response = await api.post('/auth/verify-otp', {
        email,
        code: data.code,
      });
      
      const { user, access_token } = response.data;
      setAuth(user, access_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-md space-y-8 glass p-8 rounded-2xl text-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Verify OTP</h1>
          <p className="mt-2 text-sm text-slate-400">
            Enter the code sent to <span className="text-primary font-medium">{email}</span>
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Verification Code"
            type="text"
            placeholder="Enter 6-digit code"
            maxLength={6}
            className="text-center text-2xl tracking-[0.5em] font-bold"
            {...register('code', { 
              required: 'Code is required',
              pattern: { value: /^[0-9]{6}$/, message: "Must be a 6-digit number" }
            })}
            error={errors.code?.message}
          />

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Verify & Continue
          </Button>

          <p className="text-sm text-slate-400">
            Didn't receive the code?{' '}
            <button 
              type="button"
              className="font-medium text-primary hover:text-primary/80 disabled:opacity-50"
              onClick={async () => {
                // Implement resend OTP if backend supports it
                try {
                  await api.post('/auth/resend-otp', { email });
                  alert('OTP Resent!');
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
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    }>
      <VerifyOtpContent />
    </Suspense>
  );
}
