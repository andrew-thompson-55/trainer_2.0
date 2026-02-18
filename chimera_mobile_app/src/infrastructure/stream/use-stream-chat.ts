import { useState, useEffect, useRef } from 'react';
import type { Channel as ChannelType } from 'stream-chat';
import { useStreamChatContext } from './stream-provider';
import { useAuth } from '@infra/auth/auth-provider';
import { authFetch } from '@infra/fetch/auth-fetch';

export function useStreamChat() {
  const { client, isReady } = useStreamChatContext();
  const { user } = useAuth();
  const [channel, setChannel] = useState<ChannelType | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const watchedRef = useRef(false);

  useEffect(() => {
    if (!client || !isReady || !user) {
      setIsConnecting(false);
      return;
    }

    if (watchedRef.current) return;

    const setupChannel = async () => {
      setIsConnecting(true);
      try {
        const channelId = `coach-${user.id}`;
        const ch = client.channel('messaging', channelId);
        await ch.watch();
        setChannel(ch);
        watchedRef.current = true;
        setConnectionError(null);
      } catch (e: any) {
        console.error('Channel watch error:', e);
        setConnectionError(e.message || 'Failed to connect to channel');
      } finally {
        setIsConnecting(false);
      }
    };

    setupChannel();

    return () => {
      if (channel) {
        channel.stopWatching();
        watchedRef.current = false;
      }
    };
  }, [client, isReady, user]);

  const sendMessage = async (text: string) => {
    if (!channel || !text.trim()) return;

    setIsSending(true);
    try {
      // Send user message to the Stream channel directly
      await channel.sendMessage({ text });

      // POST to backend — backend handles Gemini + pushes AI reply to channel
      const res = await authFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('Chat API error:', errData);
      }
    } catch (e) {
      console.error('Send message error:', e);
    } finally {
      setIsSending(false);
    }
  };

  return {
    channel,
    isConnecting,
    sendMessage,
    isSending,
    connectionError,
  };
}
