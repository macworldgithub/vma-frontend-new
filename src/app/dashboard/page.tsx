'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Video, Calendar as CalendarIcon, RefreshCw, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MeetingCard } from '@/components/dashboard/MeetingCard';
import api from '@/lib/axios';

export default function DashboardPage() {
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMeetings = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/meetings/my');
      setMeetings(response.data);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const createInstantMeeting = async () => {
    try {
      const response = await api.post('/meetings/create', { title: 'Quick Sync' });
      // Redirect to the meeting join page
      window.location.href = `/meeting/${response.data.meetingCode}`;
    } catch (error) {
      alert('Failed to create instant meeting');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">My Meetings</h1>
          <p className="text-slate-400 mt-1">Manage and join your virtual sessions</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchMeetings}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => window.location.href = '/dashboard/profile'}>
            <User className="h-4 w-4" />
            Profile
          </Button>
          <Button className="gap-2" onClick={createInstantMeeting}>
            <Plus className="h-4 w-4" />
            Instant Meeting
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 glass-card animate-pulse" />
          ))}
        </div>
      ) : meetings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meetings.map((meeting: any) => (
            <MeetingCard key={meeting._id} meeting={meeting} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 glass-card">
          <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Video className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white">No meetings found</h3>
          <p className="text-slate-400 mt-1">Create an instant meeting to get started</p>
          <Button className="mt-6" onClick={createInstantMeeting}>
            Start Your First Meeting
          </Button>
        </div>
      )}
    </div>
  );
}
