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
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-md space-y-8 glass p-8 rounded-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Welcome Back</h1>
          <p className="mt-2 text-sm text-slate-400">
            Log in to manage your meetings
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="john@example.com"
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
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary/20"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link href="/forgot-password" virtual-link="true" className="font-medium text-primary hover:text-primary/80">
                Forgot password?
              </Link>
            </div>
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Sign in
          </Button>

          <div className="text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:text-primary/80">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
