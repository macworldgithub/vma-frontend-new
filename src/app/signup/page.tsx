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
  role: 'staff' | 'admin';
}

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    defaultValues: {
      role: 'staff'
    }
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/auth/signup', { email: data.email });
      
      // Store signup data temporarily for verification step
      sessionStorage.setItem('signup_data', JSON.stringify(data));

      // Redirect to OTP verification
      router.push(`/verify-otp?email=${encodeURIComponent(data.email)}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 glass p-10 rounded-2xl relative overflow-hidden animate-scale-in">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary shimmer" />
        
        <div className="text-center relative">
          <div className="inline-block p-3 rounded-xl bg-accent/10 border border-accent/30 mb-4 shadow-lg shadow-accent/5 hover:border-primary hover:shadow-primary/20 transition-all duration-300">
            <div className="w-12 h-12 flex items-center justify-center text-accent font-black text-2xl tracking-tighter">PC</div>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white uppercase">
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
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setValue('role', 'staff')}
                className={`p-3 rounded-xl border-2 transition-all duration-300 text-sm font-bold uppercase tracking-wider ${
                  selectedRole === 'staff'
                    ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/20'
                    : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                Staff
              </button>
              <button
                type="button"
                onClick={() => setValue('role', 'admin')}
                className={`p-3 rounded-xl border-2 transition-all duration-300 text-sm font-bold uppercase tracking-wider ${
                  selectedRole === 'admin'
                    ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/20'
                    : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                Admin
              </button>
            </div>

            <Input
              label="Full Name"
              type="text"
              placeholder="Enter your name"
              {...register('name', { required: 'Name is required' })}
              error={errors.name?.message}
            />
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

          <Button type="submit" className="w-full mt-6" isLoading={isLoading} size="lg">
            Create Account
          </Button>

          <div className="text-center text-sm text-muted-foreground font-medium pt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:text-primary/80 transition-colors">
              Log in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
