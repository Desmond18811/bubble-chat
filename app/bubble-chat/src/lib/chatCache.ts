import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAllUserChats, fetchMessages, getMyContacts, getSecureMediaUrl, sendTextMessage } from './api';
import { authStorage } from './authStorage';

// Storage Keys
const KEYS = {
  CACHED_CHATS: 'bubble_cached_chats',
  CACHED_CONTACTS: 'bubble_cached_contacts',
  CACHED_FOLDERS: 'bubble_cached_folders',
  FOLDER_MAPPINGS: 'bubble_chat_folder_mappings',
  MESSAGES_PREFIX: 'bubble_cached_messages_',
  OFFLINE_QUEUE: 'bubble_offline_message_queue',
};

const DEFAULT_FOLDERS = ["All", "Unread", "Friends", "Work", "Archive"];

// Date format helpers
const formatChatTime = (dateInput: any): string => {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const formatMessagePreciseTime = (dateInput: any): string => {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const chatCache = {
  // ─── Folders & Mappings ─────────────────────────────────────────────────────
  
  async getFolders(): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.CACHED_FOLDERS);
      if (!raw) {
        await AsyncStorage.setItem(KEYS.CACHED_FOLDERS, JSON.stringify(DEFAULT_FOLDERS));
        return DEFAULT_FOLDERS;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_FOLDERS;
    }
  },

  async addFolder(name: string): Promise<string[]> {
    const folders = await this.getFolders();
    const clean = name.trim();
    if (clean && !folders.includes(clean)) {
      folders.push(clean);
      await AsyncStorage.setItem(KEYS.CACHED_FOLDERS, JSON.stringify(folders));
    }
    return folders;
  },

  async getFolderMappings(): Promise<{ [id: string]: string[] }> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.FOLDER_MAPPINGS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  async moveChatToFolder(chatId: string, folderName: string): Promise<{ [id: string]: string[] }> {
    const mappings = await this.getFolderMappings();
    const folders = mappings[chatId] || [];
    
    if (folders.includes(folderName)) {
      mappings[chatId] = folders.filter(f => f !== folderName);
    } else {
      mappings[chatId] = [...folders, folderName];
    }
    
    await AsyncStorage.setItem(KEYS.FOLDER_MAPPINGS, JSON.stringify(mappings));
    return mappings;
  },

  // ─── Chats & Syncing ────────────────────────────────────────────────────────
  
  async getCachedChats(): Promise<any[]> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.CACHED_CHATS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async syncChatsWithBackend(): Promise<any[]> {
    const user = await authStorage.getUser();
    if (!user) return [];
    const currentUserId = String(user.id || user._id);

    // Fetch from API
    const response = await fetchAllUserChats();
    const list = response?.conversations || [];
    
    // Map to UI Chat objects
    const mapped = await Promise.all(list.map(async (c: any) => {
      const isGroup = !!c.isGroupChat;
      const otherUser = !isGroup 
        ? c.users.find((u: any) => String(u.id || u._id) !== currentUserId) 
        : null;

      // Pin check
      const isPinned = Array.isArray(c.pinnedBy) && c.pinnedBy.some((id: any) => String(id) === currentUserId);
      const isMuted = Array.isArray(c.mutedBy) && c.mutedBy.some((id: any) => String(id) === currentUserId);
      const isArchived = Array.isArray(c.archivedBy) && c.archivedBy.some((id: any) => String(id) === currentUserId);

      // Latest Message Text
      let latestText = null;
      if (c.latestMessage) {
        if (c.latestMessage.message_type === 'text') {
          latestText = c.latestMessage.content;
        } else {
          latestText = `📎 [${c.latestMessage.message_type || 'Media'}]`;
        }
      }

      // Check status
      let status: 'read_own' | 'unread_other' | 'typing' | 'delivered' | 'read_other_all' = 'read_own';
      if (c.latestMessage) {
        const senderId = String(c.latestMessage.sender?.id || c.latestMessage.sender?._id || c.latestMessage.sender);
        if (senderId === currentUserId) {
          status = c.latestMessage.isRead ? 'read_other_all' : 'delivered';
        } else {
          status = 'unread_other';
        }
      }

      return {
        id: String(c.id || c._id),
        name: isGroup ? (c.chatName || "Group Chat") : (otherUser?.full_name || otherUser?.username || "Unknown User"),
        avatar: isGroup ? getSecureMediaUrl(c.groupIcon) : getSecureMediaUrl(otherUser?.avatar),
        isGroupChat: isGroup,
        otherUserId: otherUser ? String(otherUser.id || otherUser._id) : null,
        latestMessage: latestText,
        time: c.latestMessage ? formatChatTime(c.latestMessage.sentAt || c.latestMessage.createdAt) : formatChatTime(c.updatedAt),
        unreadCount: c.unreadCount || 0,
        isPinned: isPinned,
        isMuted: isMuted || isArchived,
        isOnline: !isGroup && !!otherUser?.isOnline,
        typingUser: null,
        status: status,
        updatedAt: c.updatedAt,
        bio: isGroup ? (c.groupDescription || "Group Chat") : (otherUser?.bio || ""),
        email: otherUser?.email || "",
        phone: otherUser?.phone_number || "N/A",
        organization: otherUser?.organization || "",
        org_role: otherUser?.org_role || "",
        messages: [],
      };
    }));

    // Cache mapped list
    await AsyncStorage.setItem(KEYS.CACHED_CHATS, JSON.stringify(mapped));
    return mapped;
  },

  // ─── Messages & Syncing ─────────────────────────────────────────────────────
  
  async getCachedMessages(chatId: string): Promise<any[]> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.MESSAGES_PREFIX + chatId);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async syncMessagesWithBackend(chatId: string): Promise<any[]> {
    const user = await authStorage.getUser();
    if (!user) return [];
    const currentUserId = String(user.id || user._id);

    const response = await fetchMessages(chatId);
    const list = Array.isArray(response) ? response : [];

    const mapped = list.map((m: any) => {
      const senderId = String(m.sender?.id || m.sender?._id || m.sender);
      const isMe = senderId === currentUserId;

      return {
        id: String(m.id || m._id),
        text: m.content || (m.mediaUrl ? `📎 [${m.message_type || 'Media'}]` : ''),
        sender: isMe ? 'me' : 'other',
        senderName: m.sender?.full_name || m.sender?.username || undefined,
        time: formatMessagePreciseTime(m.createdAt),
        timestamp: m.createdAt,
        reactions: Array.isArray(m.reactions) ? m.reactions.map((r: any) => r.emoji) : [],
        isPinned: !!m.is_pinned,
        isRead: !!m.isRead,
        mediaUrl: m.mediaUrl,
        message_type: m.message_type,
        fileName: m.fileName,
        mimeType: m.mimeType,
      };
    });

    await AsyncStorage.setItem(KEYS.MESSAGES_PREFIX + chatId, JSON.stringify(mapped));
    return mapped;
  },

  // ─── Contacts Caching & Sync ──────────────────────────────────────────────────
  
  async getCachedContacts(): Promise<any[]> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.CACHED_CONTACTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async syncContactsWithBackend(): Promise<any[]> {
    const response = await getMyContacts();
    const list = response?.data || [];

    const mapped = list.map((u: any) => ({
      id: String(u.id || u._id),
      name: u.full_name || u.username || "Unknown",
      avatar: getSecureMediaUrl(u.avatar),
      isOnline: !!u.isOnline,
      username: u.username || "",
      bio: u.bio || "",
      email: u.email || "",
      phone: u.phone_number || "N/A",
      org_role: u.org_role || "Collaborator",
      category: u.category || "work",
    }));

    await AsyncStorage.setItem(KEYS.CACHED_CONTACTS, JSON.stringify(mapped));
    return mapped;
  },

  // ─── Offline Queue ─────────────────────────────────────────────────────────
  async getOfflineQueue(): Promise<any[]> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.OFFLINE_QUEUE);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async addToOfflineQueue(chatId: string, text: string): Promise<string> {
    const queue = await this.getOfflineQueue();
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newItem = {
      id: tempId,
      chatId,
      text,
      timestamp: new Date().toISOString(),
    };
    queue.push(newItem);
    await AsyncStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    return tempId;
  },

  async removeFromOfflineQueue(tempId: string): Promise<any[]> {
    const queue = await this.getOfflineQueue();
    const updated = queue.filter((item: any) => item.id !== tempId);
    await AsyncStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(updated));
    return updated;
  },

  async processOfflineQueue(): Promise<void> {
    const queue = await this.getOfflineQueue();
    if (queue.length === 0) return;
    
    console.log(`Processing offline queue: ${queue.length} items`);
    for (const item of queue) {
      try {
        await sendTextMessage(item.chatId, item.text);
        await this.removeFromOfflineQueue(item.id);
      } catch (err) {
        console.warn("Offline queue processing failed, stopping queue send:", err);
        break;
      }
    }
  },

  async saveMessageLocally(chatId: string, message: any): Promise<void> {
    const cached = await this.getCachedMessages(chatId);
    cached.push(message);
    await AsyncStorage.setItem(KEYS.MESSAGES_PREFIX + chatId, JSON.stringify(cached));

    try {
      const cachedChats = await this.getCachedChats();
      const updatedChats = cachedChats.map((c: any) => {
        if (String(c.id) === String(chatId)) {
          return {
            ...c,
            latestMessage: message.text,
            time: message.time || formatChatTime(message.timestamp),
            updatedAt: message.timestamp,
          };
        }
        return c;
      });
      await AsyncStorage.setItem(KEYS.CACHED_CHATS, JSON.stringify(updatedChats));
    } catch (err) {
      console.warn("Failed to update latest message in cached chats list:", err);
    }
  },

  async performCloudBackup(): Promise<boolean> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToBackup = allKeys.filter(k => 
        k.startsWith('bubble_cached_') || 
        k.startsWith('bubble_chat_') ||
        k === 'bubble_auto_backup' ||
        k === 'bubble_last_backup_time'
      );
      if (keysToBackup.length === 0) return false;

      const keyValues = await AsyncStorage.multiGet(keysToBackup);
      const backupObj = {
        version: 1,
        timestamp: Date.now(),
        data: keyValues,
      };

      const { uploadCloudBackup } = await import('./api');
      await uploadCloudBackup(JSON.stringify(backupObj));
      return true;
    } catch (err) {
      console.error('Failed to perform cloud backup:', err);
      return false;
    }
  },

  async restoreCloudBackup(): Promise<boolean> {
    try {
      const { fetchCloudBackup } = await import('./api');
      const res = await fetchCloudBackup();
      const { backupData } = res?.data || {};
      if (!backupData) {
        console.log('No backup data found in cloud to restore.');
        return false;
      }

      const backupObj = JSON.parse(backupData);
      const keyValues = backupObj?.data;
      if (Array.isArray(keyValues) && keyValues.length > 0) {
        await AsyncStorage.multiSet(keyValues);
        console.log(`Successfully restored ${keyValues.length} cached keys from cloud backup!`);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to restore cloud backup:', err);
      return false;
    }
  }
};
