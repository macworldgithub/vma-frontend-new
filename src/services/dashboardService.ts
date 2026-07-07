import api from '@/lib/axios';

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    suspended: number;
  };
  meetings: {
    total: number;
    live: number;
    scheduled: number;
    ended: number;
    cancelled: number;
  };
  realtime: {
    activeRooms: number;
    participantsOnline: number;
  };
}

export interface MeetingHistoryItem {
  date: string;
  total: number;
  completed: number;
  cancelled: number;
  avgDurationMinutes: number;
}

export interface RecentMeeting {
  _id: string;
  title: string;
  status: string;
  hostId: string;
  meetingCode: string;
  duration?: number;
  createdAt: string;
  actualStartTime?: string;
  actualEndTime?: string;
  maxParticipants: number;
}

export interface TopUser {
  userId: string;
  meetingsHosted: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },
  getMeetingHistory: async (days: number = 30): Promise<MeetingHistoryItem[]> => {
    const response = await api.get(`/dashboard/meeting-history?days=${days}`);
    return response.data;
  },
  getRecentMeetings: async (page: number = 1, limit: number = 20, search?: string, status?: string): Promise<PaginatedResponse<RecentMeeting>> => {
    let url = `/dashboard/recent-meetings?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (status && status !== 'all') url += `&status=${encodeURIComponent(status)}`;
    const response = await api.get(url);
    const data = response.data.data.map((meeting: RecentMeeting) => {
      let duration = meeting.duration;
      if (!duration && meeting.actualStartTime) {
        const start = new Date(meeting.actualStartTime).getTime();
        const end = meeting.actualEndTime ? new Date(meeting.actualEndTime).getTime() : Date.now();
        duration = Math.floor((end - start) / 1000);
      }
      return { ...meeting, duration };
    });
    return { ...response.data, data };
  },
  getTopUsers: async (limit: number = 10): Promise<TopUser[]> => {
    const response = await api.get(`/dashboard/top-users?limit=${limit}`);
    return response.data;
  },
};
