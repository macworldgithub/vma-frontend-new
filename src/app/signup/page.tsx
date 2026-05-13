'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/axios';

interface SignupFormData {
  name: string;
  email: string;
  password: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>();

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/auth/signup', {
        ...data,
        role: 'user', // Default role
      });
      // Redirect to OTP verification with email in state
      router.push(`/verify-otp?email=${encodeURIComponent(data.email)}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-md space-y-8 glass p-8 rounded-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Create Account</h1>
          <p className="mt-2 text-sm text-slate-400">
            Join the Branded VMA Platform today
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
              label="Full Name"
              type="text"
              placeholder="John Doe"
              {...register('name', { required: 'Name is required' })}
              error={errors.name?.message}
            />
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
              {...register('password', { 
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' }
              })}
              error={errors.password?.message}
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Sign up
          </Button>

          <div className="text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:text-primary/80">
              Log in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
