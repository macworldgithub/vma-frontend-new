'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import { Button } from '@/components/ui/Button';
import { Pencil, Save, X, Check } from 'lucide-react';
import { ProfilePageSkeleton } from '@/components/ui/skeletons/PageSkeletons';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { user: authUser, setAuth, token, logout } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const handleStartEditing = () => {
    if (profile) {
      setEditName(profile.name);
      setEditEmail(profile.email);
      setSaveError(null);
      setSaveSuccess(false);
      setIsEditing(true);
    }
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      setSaveError('Name and email are required.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await api.patch('/users/me', {
        name: editName.trim(),
        email: editEmail.trim(),
      });

      const updatedProfile = response.data;
      setProfile(updatedProfile);

      // Update the auth store so sidebar and other components reflect changes
      if (token && authUser) {
        setAuth(
          {
            ...authUser,
            name: updatedProfile.name,
            email: updatedProfile.email,
          },
          token
        );
      }

      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to update profile.';
      setSaveError(typeof msg === 'string' ? msg : msg[0] || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <ProfilePageSkeleton />;
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

      {/* Success Message */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3 animate-fade-in">
          <div className="p-1.5 rounded-full bg-primary text-primary-foreground">
            <Check className="h-3.5 w-3.5" />
          </div>
          <p className="text-sm font-bold text-primary uppercase tracking-wider">Profile updated successfully</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-card p-8 rounded-2xl bg-card border border-border text-center relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary shimmer" />
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-primary/20 shadow-xl shadow-primary/5">
              <span className="text-4xl font-black text-primary uppercase">
                {(isEditing ? editName : profile?.name)?.charAt(0) || 'U'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-foreground truncate">{isEditing ? editName : profile?.name}</h2>
            <p className="text-sm text-primary font-bold uppercase tracking-widest mt-1">
              {profile?.role}
            </p>
          </div>
        </div>

        {/* Details Card */}
        <div className="md:col-span-2">
          <div className="glass-card p-8 rounded-2xl bg-card border border-border relative overflow-hidden h-full shadow-sm">
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
              <h3 className="text-lg font-bold text-foreground uppercase tracking-wider">Personal Information</h3>
              {!isEditing && (
                <button
                  onClick={handleStartEditing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              )}
            </div>

            {/* Error display */}
            {saveError && (
              <div className="mb-6 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold uppercase tracking-wider animate-fade-in">
                {saveError}
              </div>
            )}

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full text-foreground font-medium bg-muted/40 p-3 rounded-lg border border-primary/30 focus:outline-none focus:border-primary/60 transition-all"
                      autoFocus
                    />
                  ) : (
                    <p className="text-foreground font-medium bg-muted/40 p-3 rounded-lg border border-border">{profile?.name}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Email Address</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full text-foreground font-medium bg-muted/40 p-3 rounded-lg border border-primary/30 focus:outline-none focus:border-primary/60 transition-all"
                    />
                  ) : (
                    <p className="text-foreground font-medium bg-muted/40 p-3 rounded-lg border border-border">{profile?.email}</p>
                  )}
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
              {isEditing ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleSaveProfile}
                    isLoading={isSaving}
                    className="gap-2 shadow-lg shadow-primary/20"
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelEditing}
                    disabled={isSaving}
                    className="gap-2 bg-white"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button className="w-full sm:w-auto gap-2" variant="secondary" onClick={handleStartEditing}>
                  <Pencil className="h-4 w-4" />
                  Edit Profile Information
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
