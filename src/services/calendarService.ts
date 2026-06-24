import api from '@/lib/axios';

export const calendarService = {
  getGoogleAuthUrl: async () => {
    const response = await api.get('/calendar/google/url');
    return response.data.url;
  },

  getMicrosoftAuthUrl: async () => {
    const response = await api.get('/calendar/microsoft/url');
    return response.data.url;
  },

  syncCalendar: async () => {
    const response = await api.get('/calendar/sync');
    return response.data;
  },

  getEvents: async () => {
    const response = await api.get('/calendar/events');
    return response.data;
  },

  connectGoogle: async (code: string, state: string) => {
    const response = await api.get(`/calendar/google/callback?code=${code}&state=${state}`);
    return response.data;
  },

  connectMicrosoft: async (code: string, state: string) => {
    const response = await api.get(`/calendar/microsoft/callback?code=${code}&state=${state}`);
    return response.data;
  }
};
