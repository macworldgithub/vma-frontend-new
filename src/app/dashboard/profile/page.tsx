'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import { Button } from '@/components/ui/Button';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { user: authUser, logout } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/users/me');
        setProfile(response.data);
      } catch (err: any) {
        setError('Failed to load profile data.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground animate-pulse font-medium">Syncing profile data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Staff Profile</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-sm">Account Management</p>
        </div>
        <Button variant="outline" onClick={logout} className="w-full sm:w-auto bg-white shadow-sm">
          Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-card p-8 rounded-2xl bg-card border border-border text-center relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary shimmer" />
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-primary/20 shadow-xl shadow-primary/5">
              <span className="text-4xl font-black text-primary uppercase">
                {profile?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-foreground truncate">{profile?.name}</h2>
            <p className="text-sm text-primary font-bold uppercase tracking-widest mt-1">
              {profile?.role}
            </p>
          </div>
        </div>

        {/* Details Card */}
        <div className="md:col-span-2">
          <div className="glass-card p-8 rounded-2xl bg-card border border-border relative overflow-hidden h-full shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-6 uppercase tracking-wider border-b border-border pb-4">Personal Information</h3>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Full Name</label>
                  <p className="text-foreground font-medium bg-muted/40 p-3 rounded-lg border border-border">{profile?.name}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Email Address</label>
                  <p className="text-foreground font-medium bg-muted/40 p-3 rounded-lg border border-border">{profile?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Account Role</label>
                  <p className="text-primary font-black bg-primary/5 p-3 rounded-lg border border-primary/10 uppercase">{profile?.role}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Member Since</label>
                  <p className="text-foreground font-medium bg-muted/40 p-3 rounded-lg border border-border">
                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-AU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-border">
              <Button className="w-full sm:w-auto" variant="secondary">
                Edit Profile Information
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
