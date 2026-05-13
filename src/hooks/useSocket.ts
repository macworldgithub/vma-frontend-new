import { useEffect, useRef } from 'react';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';

export const useSocket = () => {
  const token = useAuthStore((state) => state.token);
  const socketRef = useRef(token ? getSocket(token) : null);

  useEffect(() => {
    return () => {
      // We don't necessarily want to disconnect on every unmount if we're just navigating
      // but for a meeting room, it's safer.
    };
  }, []);

  return socketRef.current;
};
