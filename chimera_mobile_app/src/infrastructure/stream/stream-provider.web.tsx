import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { StreamChat } from 'stream-chat';
import { useAuth } from '../auth/auth-provider';
import { authFetch } from '../fetch/auth-fetch';

type StreamChatContextType = {
  client: StreamChat | null;
  isReady: boolean;
  error: string | null;
};

const StreamChatContext = createContext<StreamChatContextType>({
  client: null,
  isReady: false,
  error: null,
});

export const useStreamChatContext = () => useContext(StreamChatContext);

export const StreamChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [client, setClient] = useState<StreamChat | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connectingRef = useRef(false);

  useEffect(() => {
    if (!user) {
      if (client) {
        client.disconnectUser().then(() => {
          setClient(null);
          setIsReady(false);
        });
      }
      return;
    }

    if (connectingRef.current || isReady) return;

    const connect = async () => {
      connectingRef.current = true;
      try {
        const res = await authFetch('/auth/stream-token');
        if (!res.ok) throw new Error('Failed to fetch stream token');
        const data = await res.json();

        const chatClient = StreamChat.getInstance(data.stream_api_key);

        await chatClient.connectUser(
          {
            id: data.user_id,
            name: user.name || 'Athlete',
          },
          data.stream_token,
        );

        setClient(chatClient);
        setIsReady(true);
        setError(null);
      } catch (e: any) {
        console.error('Stream connect error:', e);
        setError(e.message || 'Stream connection failed');
      } finally {
        connectingRef.current = false;
      }
    };

    connect();

    return () => {
      if (client) {
        client.disconnectUser();
      }
    };
  }, [user]);

  // On web, skip stream-chat-expo's OverlayProvider/Chat (React Native only)
  return (
    <StreamChatContext.Provider value={{ client, isReady, error }}>
      {children}
    </StreamChatContext.Provider>
  );
};
