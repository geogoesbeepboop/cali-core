// src/chat/chathistory/chat-history.entity.ts
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string; // ISO string for easier serialization
  }
  
  export interface ChatHistory {
    id: string;
    userId: string;
    sessionId: string;
    messages: ChatMessage[];
    createdAt: string;
    updatedAt: string;
  }
  
  // Table name constant
  export const CHAT_HISTORY_TABLE = 'chat_history';