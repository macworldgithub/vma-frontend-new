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
      const signupDataRaw = sessionStorage.getItem('signup_data');
      if (!signupDataRaw) {
        throw new Error('Registration data missing. Please sign up again.');
      }

      const signupData = JSON.parse(signupDataRaw);

      const response = await api.post('/auth/verify-otp', {
        ...signupData,
        code: data.code,
      });
      
      const { user, access_token } = response.data;
      
      // Cleanup
      sessionStorage.removeItem('signup_data');
      
      setAuth(user, access_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 glass p-10 rounded-2xl relative overflow-hidden text-center">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary shimmer" />

        <div>
          <div className="inline-block p-3 rounded-xl bg-primary/10 border border-primary/20 mb-4">
            <div className="w-12 h-12 flex items-center justify-center text-primary font-bold text-2xl">OTP</div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Verify Identity</h1>
          <p className="mt-2 text-sm font-semibold text-muted-foreground uppercase tracking-widest">
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
            className="text-center text-3xl tracking-[0.6em] font-black py-5 bg-black/60 border-white/10"
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
              className="text-primary hover:text-primary/80 transition-colors font-bold uppercase tracking-wider"
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
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    }>
      <VerifyOtpContent />
    </Suspense>
  );
}
