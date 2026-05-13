'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Video, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'users' | 'meetings'>('users');

  useEffect(() => {
    if (user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [u, m] = await Promise.all([
        api.get('/users'),
        api.get('/meetings/all').catch(() => ({ data: [] })), // Fallback if no meetings route
      ]);
      setUsers(u.data);
      setMeetings(m.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to remove this user? This will revoke all access.')) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers(users.filter(u => u._id !== id));
    } catch (err) {
      alert('Failed to remove user.');
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex items-center justify-between">
          <div className="relative">
            <div className="absolute -top-6 -left-6 w-20 h-20 bg-primary/10 rounded-full blur-3xl" />
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tight relative">
              Admin <span className="text-primary">Console</span>
            </h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em] mt-1">
              Platform Management • 100 Seats
            </p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" size="icon" onClick={fetchData} className="rounded-full border-white/5 bg-white/5">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" className="hidden sm:flex">
              Generate Report
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: 'Active Users', value: users.length, icon: Users, color: 'text-primary' },
            { label: 'Platform Seats', value: '100', icon: Shield, color: 'text-blue-500' },
            { label: 'Meetings Handled', value: meetings.length, icon: Video, color: 'text-emerald-500' },
          ].map((stat, i) => (
            <div key={i} className="glass p-6 rounded-2xl border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-white/5 group-hover:bg-primary/30 transition-colors" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                  <p className="text-3xl font-black text-white mt-1 italic">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color} opacity-20`} />
              </div>
            </div>
          ))}
        </div>

        {/* Tabs Control */}
        <div className="flex gap-8 border-b border-white/5">
          <button 
            onClick={() => setTab('users')} 
            className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${tab === 'users' ? 'text-primary' : 'text-muted-foreground hover:text-white'}`}
          >
            User Directory
            {tab === 'users' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-full animate-in fade-in slide-in-from-bottom-1" />}
          </button>
          <button 
            onClick={() => setTab('meetings')} 
            className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${tab === 'meetings' ? 'text-primary' : 'text-muted-foreground hover:text-white'}`}
          >
            Meeting Logs
            {tab === 'meetings' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-full animate-in fade-in slide-in-from-bottom-1" />}
          </button>
        </div>

        {/* Content Area */}
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          {tab === 'users' && (
            <div className="glass rounded-2xl overflow-hidden border-white/5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 text-muted-foreground font-black uppercase tracking-widest text-[10px]">
                      <th className="text-left p-5">Staff Member</th>
                      <th className="text-left p-5">Role</th>
                      <th className="text-right p-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((u: any) => (
                      <tr key={u._id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-black text-primary border border-white/5 group-hover:border-primary/20 transition-colors">
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-white font-bold">{u.name}</div>
                              <div className="text-xs text-muted-foreground">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter ${u.role === 'admin' ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-white/5 text-muted-foreground border border-white/5'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-5 text-right">
                          <button 
                            onClick={() => deleteUser(u._id)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-2"
                            title="Revoke Access"
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'meetings' && (
            <div className="glass rounded-2xl overflow-hidden border-white/5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 text-muted-foreground font-black uppercase tracking-widest text-[10px]">
                      <th className="text-left p-5">Meeting Details</th>
                      <th className="text-left p-5">Status</th>
                      <th className="text-left p-5">Host Identity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {meetings.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-10 text-center text-muted-foreground font-medium uppercase tracking-widest text-xs">No activity logged in this period</td>
                      </tr>
                    ) : meetings.map((m: any) => (
                      <tr key={m._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-5">
                          <div className="text-white font-bold">{m.title}</div>
                          <div className="text-xs font-mono text-primary uppercase tracking-widest mt-1">CODE: {m.meetingCode}</div>
                        </td>
                        <td className="p-5">
                          <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter ${
                            m.status === 'LIVE' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                            m.status === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                            'bg-white/5 text-muted-foreground border border-white/5'
                          }`}>{m.status}</span>
                        </td>
                        <td className="p-5 text-xs font-mono text-muted-foreground">{m.hostId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
