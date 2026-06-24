'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

interface LoginFormData {
  email: string;
  password: string;
  role: 'staff' | 'admin';
}

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: {
      role: 'staff'
    }
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', data);
      const { access_token, user } = response.data;

      // Store token in localStorage
      localStorage.setItem('vma_token', access_token);

      setAuth(user, access_token);

      try {
        // Hit the Calendar OAuth URL APIs in the background with the access token
        await Promise.allSettled([
          api.get('/calendar/google/url'),
          api.get('/calendar/microsoft/url')
        ]);
      } catch (urlErr) {
        console.error('Failed to hit Calendar auth URL APIs:', urlErr);
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email, password, or role.');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 glass p-6 sm:p-10 rounded-2xl relative overflow-hidden animate-scale-in">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary shimmer" />

        <div className="text-center relative">
          <div className="inline-block p-3 rounded-xl bg-accent/10 border border-accent/30 mb-4 shadow-lg shadow-accent/5 hover:border-primary hover:shadow-primary/20 transition-all duration-300">
            <div className="w-12 h-12 flex items-center justify-center text-accent font-black text-2xl tracking-tighter">PC</div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">
            Patterson Cheney
          </h1>
          <p className="mt-2 text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-[0.2em]">
            Virtual Meeting Assistant
          </p>
        </div>

        {error && (
          <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setValue('role', 'staff')}
                className={`p-2 sm:p-3 rounded-xl border-2 transition-all duration-300 text-xs sm:text-sm font-bold uppercase tracking-wider ${selectedRole === 'staff'
                  ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/20'
                  : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/10'
                  }`}
              >
                Staff
              </button>
              <button
                type="button"
                onClick={() => setValue('role', 'admin')}
                className={`p-2 sm:p-3 rounded-xl border-2 transition-all duration-300 text-xs sm:text-sm font-bold uppercase tracking-wider ${selectedRole === 'admin'
                  ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/20'
                  : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/10'
                  }`}
              >
                Admin
              </button>
            </div>

            <Input
              label="Email Address"
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
              className="text-xs sm:text-sm placeholder:text-[10px] sm:placeholder:text-sm"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              {...register('password', { required: 'Password is required' })}
              error={errors.password?.message}
              className="text-xs sm:text-sm placeholder:text-[10px] sm:placeholder:text-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-white/10 bg-black/40 text-primary focus:ring-primary/20"
              />
              <label htmlFor="remember-me" className="ml-2 block text-[10px] md:text-sm font-medium text-muted-foreground">
                Remember me
              </label>
            </div>

            <div className="text-[10px] md:text-sm">
              <Link href="/forgot-password" virtual-link="true" className="font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-tight">
                Forgot password?
              </Link>
            </div>
          </div>

          <Button type="submit" className="w-full mt-2" isLoading={isLoading} size="md">
            Access Platform
          </Button>

          <div className="text-center text-sm text-muted-foreground font-medium pt-2">
            New to VMA?{' '}
            <Link href="/signup" className="text-primary hover:text-primary/80 transition-colors">
              Request Access
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
