// useCoach - Business logic for AI coach chat
// Extracted from app/(tabs)/chat.tsx

import { useState, useCallback } from 'react';
import { authFetch } from '@infra/fetch/auth-fetch';

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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      _id: 1,
      text: "Hey! I'm your AI coach. Ask me anything about your training plan, pacing strategy, or recovery. 🏃‍♂️",
      createdAt: new Date(),
      user: {
        _id: 2,
        name: 'Coach',
        avatar: 'https://placeimg.com/140/140/any',
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

    try {
      const response = await authFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();
      const aiReply = data.reply || "Sorry, I couldn't process that.";

      const aiMessage: ChatMessage = {
        _id: Date.now() + 1,
        text: aiReply,
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'Coach',
          avatar: 'https://placeimg.com/140/140/any',
        },
      };

      setMessages(prev => [aiMessage, ...prev]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        _id: Date.now() + 1,
        text: 'Oops! Something went wrong. Try again?',
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'Coach',
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
        text: "Hey! I'm your AI coach. Ask me anything!",
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'Coach',
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
