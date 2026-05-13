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
        api.get('/meetings/all'),
      ]);
      setUsers(u.data);
      setMeetings(m.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-white">Admin Console</h1>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-800 pb-1">
          <button onClick={() => setTab('users')} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === 'users' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-white'}`}>
            <Users className="h-4 w-4 inline mr-2" />Users ({users.length})
          </button>
          <button onClick={() => setTab('meetings')} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === 'meetings' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-white'}`}>
            <Video className="h-4 w-4 inline mr-2" />Meetings ({meetings.length})
          </button>
        </div>

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4">Email</th>
                  <th className="text-left p-4">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u._id} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="p-4 text-white font-medium">{u.name}</td>
                    <td className="p-4 text-slate-400">{u.email}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-300'}`}>
                        {u.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Meetings Tab */}
        {tab === 'meetings' && (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="text-left p-4">Title</th>
                  <th className="text-left p-4">Code</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Host</th>
                </tr>
              </thead>
              <tbody>
                {meetings.map((m: any) => (
                  <tr key={m._id} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="p-4 text-white font-medium">{m.title}</td>
                    <td className="p-4 text-slate-400 font-mono text-xs">{m.meetingCode}</td>
                    <td className="p-4">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                        m.status === 'LIVE' ? 'bg-green-400/10 text-green-400' :
                        m.status === 'SCHEDULED' ? 'bg-blue-400/10 text-blue-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>{m.status}</span>
                    </td>
                    <td className="p-4 text-slate-400">{m.hostId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
