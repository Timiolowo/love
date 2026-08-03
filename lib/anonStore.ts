// Local development fallback store for anonymous messages when D1 binding is unavailable in local Next.js dev server

export type AnonChatRecord = {
  id: string;
  senderId: string | null;
  recipientName?: string | null;
  recipientPhone: string | null;
  intent: string;
  initialMessage: string;
  status: "pending" | "accepted" | "declined" | "disrupted";
  senderRevealed: number;
  recipientRevealed: number;
  senderToken: string;
  recipientToken: string;
  createdAt: number;
  expiresAt: number;
  disruptedAt?: number | null;
};

export type AnonMessageRecord = {
  id: string;
  chatId: string;
  senderRole: "sender" | "recipient" | "system";
  text: string;
  createdAt: number;
};

// Global in-memory maps for dev server persistence
const globalChatsMap = new Map<string, AnonChatRecord>();
const globalMessagesMap = new Map<string, AnonMessageRecord[]>();

export function saveDevChat(chat: AnonChatRecord) {
  globalChatsMap.set(chat.id, chat);
  if (!globalMessagesMap.has(chat.id)) {
    globalMessagesMap.set(chat.id, []);
  }
}

export function saveDevMessage(msg: AnonMessageRecord) {
  const existing = globalMessagesMap.get(msg.chatId) || [];
  existing.push(msg);
  globalMessagesMap.set(msg.chatId, existing);
}

export function getDevChat(id: string): AnonChatRecord | undefined {
  return globalChatsMap.get(id);
}

export function getDevMessages(chatId: string): AnonMessageRecord[] {
  return globalMessagesMap.get(chatId) || [];
}

export function updateDevChatStatus(id: string, status: "pending" | "accepted" | "declined" | "disrupted", disruptedAt?: number) {
  const chat = globalChatsMap.get(id);
  if (chat) {
    chat.status = status;
    if (disruptedAt) chat.disruptedAt = disruptedAt;
    globalChatsMap.set(id, chat);
  }
}

export function updateDevChatReveal(id: string, role: "sender" | "recipient") {
  const chat = globalChatsMap.get(id);
  if (chat) {
    if (role === "sender") chat.senderRevealed = 1;
    if (role === "recipient") chat.recipientRevealed = 1;
    globalChatsMap.set(id, chat);
  }
}
