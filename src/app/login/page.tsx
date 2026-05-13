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
}

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', data);
      const { user, access_token } = response.data;
      
      setAuth(user, access_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 glass p-10 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary shimmer" />

        <div className="text-center relative">
          <div className="inline-block p-3 rounded-xl bg-primary/10 border border-primary/20 mb-4">
            <div className="w-12 h-12 flex items-center justify-center text-primary font-bold text-2xl">PC</div>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">
            Patterson Cheney
          </h1>
          <p className="mt-2 text-sm font-semibold text-muted-foreground uppercase tracking-[0.2em]">
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
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              {...register('password', { required: 'Password is required' })}
              error={errors.password?.message}
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
              <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-muted-foreground">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link href="/forgot-password" virtual-link="true" className="font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-tight">
                Forgot password?
              </Link>
            </div>
          </div>

          <Button type="submit" className="w-full mt-6" isLoading={isLoading} size="lg">
            Access Platform
          </Button>

          <div className="text-center text-sm text-muted-foreground font-medium pt-4">
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
