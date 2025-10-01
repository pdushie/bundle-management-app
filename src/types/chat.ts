// Chat message types
export interface ChatMessage {
  id: number;
  userId: number;
  adminId: number | null;
  message: string;
  senderType: 'user' | 'admin';
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

// Chat thread contains user info and latest message
export interface ChatThread {
  userId: number;
  userName: string;
  userEmail: string;
  lastMessage: ChatMessage;
  unreadCount: number;
}

// Response type for chat API endpoints
export interface ChatResponse {
  success: boolean;
  messages?: ChatMessage[];
  threads?: ChatThread[];
  message?: ChatMessage;
  error?: string;
}
