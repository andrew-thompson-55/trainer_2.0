// useCoach - Business logic for AI coach chat
// Extracted from app/(tabs)/chat.tsx

import { useState, useCallback } from 'react';
import { authFetch } from '@infra/fetch/auth-fetch';
import { pkg } from '@infra/package';
import { useAnalytics } from '@infra/analytics';

const { persona } = pkg;

interface ChatMessage {
  _id: string | number;
  text: string;
  createdAt: Date;
  user: {
    _id: number;
    name: string;
    avatar?: string;
  };
}

interface UseCoachReturn {
  messages: ChatMessage[];
  sending: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
}

export function useCoach(): UseCoachReturn {
  const { track } = useAnalytics();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      _id: 1,
      text: `${persona.coachGreeting} ${persona.coachGreetingEmoji}`,
      createdAt: new Date(),
      user: {
        _id: 2,
        name: persona.coachName,
        avatar: persona.coachAvatarUrl,
      },
    },
  ]);
  const [sending, setSending] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;

    // Add user message
    const userMessage: ChatMessage = {
      _id: Date.now(),
      text: text.trim(),
      createdAt: new Date(),
      user: {
        _id: 1,
        name: 'You',
      },
    };

    setMessages(prev => [userMessage, ...prev]);
    setSending(true);
    track('coach_message_sent', { message_length: text.trim().length });
    const sendStart = Date.now();

    try {
      const response = await authFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();
      track('coach_response_received', { response_time_ms: Date.now() - sendStart });
      const aiReply = data.reply || persona.chatProcessError;

      const aiMessage: ChatMessage = {
        _id: Date.now() + 1,
        text: aiReply,
        createdAt: new Date(),
        user: {
          _id: 2,
          name: persona.coachName,
          avatar: persona.coachAvatarUrl,
        },
      };

      setMessages(prev => [aiMessage, ...prev]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        _id: Date.now() + 1,
        text: persona.chatNetworkError,
        createdAt: new Date(),
        user: {
          _id: 2,
          name: persona.coachName,
        },
      };
      setMessages(prev => [errorMessage, ...prev]);
    } finally {
      setSending(false);
    }
  }, [sending]);

  const clearMessages = useCallback(() => {
    setMessages([
      {
        _id: 1,
        text: persona.coachClearGreeting,
        createdAt: new Date(),
        user: {
          _id: 2,
          name: persona.coachName,
        },
      },
    ]);
  }, []);

  return {
    messages,
    sending,
    sendMessage,
    clearMessages,
  };
}
