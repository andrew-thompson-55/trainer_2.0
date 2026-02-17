// Chat types - AI coach messaging

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  reply: string;
}
