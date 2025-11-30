/**
 * Chat Storage Service
 * Persists chat history to AsyncStorage
 * Requirements: 10.4, 10.5, 12.1, 12.2
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserContext, ChatMessage } from '../types';

const STORAGE_KEY = '@snowboard_chat_history';

export interface StoredChat {
  id: string;
  trick: string;
  context: UserContext;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatHistoryItem {
  id: string;
  trick: string;
  lastMessage: string;
  updatedAt: Date;
}

/**
 * Get all stored chats
 */
export async function getAllChats(): Promise<StoredChat[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const chats: StoredChat[] = JSON.parse(data);
    return chats.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error('Error loading chats:', error);
    return [];
  }
}

/**
 * Get chat history items for sidebar display
 */
export async function getChatHistoryItems(): Promise<ChatHistoryItem[]> {
  const chats = await getAllChats();
  
  return chats.map(chat => ({
    id: chat.id,
    trick: chat.trick || 'General',
    lastMessage: chat.messages[chat.messages.length - 1]?.content || '',
    updatedAt: new Date(chat.updatedAt),
  }));
}

/**
 * Get a specific chat by ID
 */
export async function getChatById(chatId: string): Promise<StoredChat | null> {
  const chats = await getAllChats();
  return chats.find(c => c.id === chatId) || null;
}

/**
 * Save a new chat or update existing
 */
export async function saveChat(chat: StoredChat): Promise<void> {
  try {
    const chats = await getAllChats();
    const existingIndex = chats.findIndex(c => c.id === chat.id);
    
    if (existingIndex >= 0) {
      chats[existingIndex] = {
        ...chat,
        updatedAt: new Date().toISOString(),
      };
    } else {
      chats.unshift({
        ...chat,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error('Error saving chat:', error);
    throw error;
  }
}

/**
 * Add a message to an existing chat
 */
export async function addMessageToChat(
  chatId: string, 
  message: ChatMessage
): Promise<void> {
  const chat = await getChatById(chatId);
  if (!chat) {
    throw new Error(`Chat ${chatId} not found`);
  }
  
  chat.messages.push(message);
  await saveChat(chat);
}

/**
 * Create a new chat
 */
export async function createChat(
  context: UserContext,
  initialMessage?: ChatMessage
): Promise<StoredChat> {
  const chat: StoredChat = {
    id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    trick: context.trick,
    context,
    messages: initialMessage ? [initialMessage] : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await saveChat(chat);
  return chat;
}

/**
 * Delete a chat
 */
export async function deleteChat(chatId: string): Promise<void> {
  try {
    const chats = await getAllChats();
    const filtered = chats.filter(c => c.id !== chatId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting chat:', error);
    throw error;
  }
}

/**
 * Clear all chat history
 */
export async function clearAllChats(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing chats:', error);
    throw error;
  }
}

/**
 * Get chats grouped by trick
 */
export async function getChatsByTrick(): Promise<Record<string, StoredChat[]>> {
  const chats = await getAllChats();
  const grouped: Record<string, StoredChat[]> = {};
  
  for (const chat of chats) {
    const trick = chat.trick || 'General';
    if (!grouped[trick]) {
      grouped[trick] = [];
    }
    grouped[trick].push(chat);
  }
  
  return grouped;
}

export default {
  getAllChats,
  getChatHistoryItems,
  getChatById,
  saveChat,
  addMessageToChat,
  createChat,
  deleteChat,
  clearAllChats,
  getChatsByTrick,
};
