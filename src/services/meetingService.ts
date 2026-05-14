import api from '@/lib/axios';

export interface CreateMeetingDto {
  title: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  maxParticipants?: number;
}

export interface Meeting {
  _id: string;
  title: string;
  meetingCode: string;
  meetingLink: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
  hostId: string;
  startTime: string;
  endTime?: string;
  roomId?: string;
  maxParticipants: number;
}

export interface JoinMeetingInfo {
  meetingId: string;
  title: string;
  hostId: string;
  status: string;
  meetingCode: string;
  roomId?: string;
  roomStatus?: string;
  participantCount: number;
  maxParticipants: number;
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export const meetingService = {
  getIceServers: async (): Promise<{ iceServers: IceServer[] }> => {
    const response = await api.get('/meetings/ice-servers');
    return response.data;
  },

  createMeeting: async (data: CreateMeetingDto): Promise<{ meeting: Meeting; joinUrl: string }> => {
    const response = await api.post('/meetings/create', data);
    return response.data;
  },

  getMyMeetings: async (): Promise<Meeting[]> => {
    const response = await api.get('/meetings/my');
    return response.data;
  },

  getMeetingByCode: async (code: string): Promise<JoinMeetingInfo> => {
    const response = await api.get(`/meetings/join/${code}`);
    return response.data;
  },

  startMeeting: async (id: string): Promise<Meeting> => {
    const response = await api.post(`/meetings/${id}/start`);
    return response.data;
  },

  endMeeting: async (id: string): Promise<Meeting> => {
    const response = await api.post(`/meetings/${id}/end`);
    return response.data;
  },

  getLiveDetails: async (id: string): Promise<{ meeting: Meeting; liveParticipants: any[] }> => {
    const response = await api.get(`/meetings/${id}/live`);
    return response.data;
  },

  getChatHistory: async (id: string): Promise<{ messages: any[] }> => {
    const response = await api.get(`/meetings/${id}/chat`);
    return response.data;
  },
};
