// Chat API - Pure functions for AI coach messaging

import type { FetchFn } from './client';
import type { ChatRequest, ChatResponse } from '../types/chat';

export async function sendMessage(
  fetch: FetchFn,
  message: string
): Promise<ChatResponse> {
  const res = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message } as ChatRequest),
  });
  if (!res.ok) throw new Error(`Chat request failed: ${res.status}`);
  return res.json();
}
