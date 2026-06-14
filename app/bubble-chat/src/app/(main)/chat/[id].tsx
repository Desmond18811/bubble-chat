import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, Modal, Alert, Clipboard, Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, Phone, Video, Search, MoreVertical,
  Smile, Paperclip, Mic, Send, X, Mail, Briefcase,
  Camera, FileText, Image as ImageIcon,
  Info, Sparkles, BellOff, EyeOff, Archive, Trash2,
  Copy, Pin, Edit2, Check, CheckCheck,
  MicOff, PhoneOff, Volume2, Clock, Play, Pause,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Message } from '../../../lib/mockData';
import { chatCache } from '../../../lib/chatCache';
import { getSocket } from '../../../lib/socket';
import {
  sendTextMessage,
  sendMediaMessage,
  reactToMessage,
  toggleMessagePin,
  deleteMessageForMe,
  deleteMessageForEveryone,
  updateMessage,
  muteChat,
  clearChat,
  toggleChatPin,
  deleteChat,
  getAidaWritingSuggestions,
  getSecureMediaUrl,
  uploadGroupOrOrgImage,
} from '../../../lib/api';
import { startOutgoingCall } from '../../../lib/callManager';
import { authStorage } from '../../../lib/authStorage';
import { Avatar } from '../../../components/Avatar';

const PURPLE = '#6c5ce7';
const INK = '#1f2030';
const INK_SOFT = '#9a9aab';
const BG = '#f8f7ff';
const PURPLE_SOFT = 'rgba(108,92,231,0.10)';

const AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop",
];

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [messageText, setMessageText] = useState('');
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<any>(null);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string; type: string; url?: string } | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [typingUser, setTypingUser] = useState<{ id: string; name?: string; username?: string } | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPulsing, setIsPulsing] = useState(true);
  const [ownUser, setOwnUser] = useState<any>(null);

  // User details for own-typing socket filters
  const currentUserIdRef = useRef<string | null>(null);
  const chatRef = useRef<any>(null);

  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [groupFormData, setGroupFormData] = useState({
    chatName: '',
    groupDescription: '',
    groupIcon: '',
  });

  const handleStartEditGroup = () => {
    setGroupFormData({
      chatName: chat?.name || '',
      groupDescription: chat?.bio || '',
      groupIcon: chat?.avatar || '',
    });
    setIsEditingGroup(true);
  };

  useEffect(() => {
    authStorage.getUser().then((user) => {
      if (user) {
        currentUserIdRef.current = String(user.id || user._id);
        setOwnUser(user);
      }
    });
  }, []);

  useEffect(() => {
    chatRef.current = chat;
  }, [chat]);

  useEffect(() => {
    let timerInterval: any = null;
    let pulseInterval: any = null;

    if (isRecording) {
      setRecordingSeconds(0);
      setIsPulsing(true);

      timerInterval = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

      pulseInterval = setInterval(() => {
        setIsPulsing(prev => !prev);
      }, 500);
    } else {
      setRecordingSeconds(0);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (pulseInterval) clearInterval(pulseInterval);
    };
  }, [isRecording]);

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Aida Suggestions state
  const [aidaSuggestions, setAidaSuggestions] = useState<string[]>([]);

  const handleStartCall = (type: 'voice' | 'video') => {
    startOutgoingCall(chat, type);
  };

  useEffect(() => {
    if (!chat || messages.length === 0) return;
    
    // Find the last received message (sender !== 'me')
    const lastReceived = [...messages].reverse().find(m => m.sender !== 'me');
    if (!lastReceived) {
      setAidaSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const response = await getAidaWritingSuggestions(lastReceived.text, String(id));
        const suggestionsList = response?.suggestions || response?.data || [];
        setAidaSuggestions(suggestionsList);
      } catch (err) {
        // Fallback suggestions
        setAidaSuggestions([
          "Sounds good!",
          "Let's sync up later.",
          "Can you share the file?",
          "Got it, thanks!"
        ]);
      }
    };
    fetchSuggestions();
  }, [messages, id]);

  const typingTimer = useRef<any>(null);

  const handleTextChange = (text: string) => {
    setMessageText(text);

    const socket = getSocket();
    if (socket && chat) {
      const targetUserId = chat.otherUserId;
      if (!text.trim()) {
        if (typingTimer.current) clearTimeout(typingTimer.current);
        socket.emit('typing_stop', { toUserId: targetUserId, chatId: chat.id });
        return;
      }
      socket.emit('typing_start', { toUserId: targetUserId, chatId: chat.id });
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        socket.emit('typing_stop', { toUserId: targetUserId, chatId: chat.id });
      }, 2000);
    }
  };

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onTypingStart = (data: { fromUserId: string; chatId: string; fromName?: string; fromUsername?: string }) => {
      if (currentUserIdRef.current && String(data.fromUserId) === String(currentUserIdRef.current)) return;
      if (String(data.chatId) === String(id)) {
        setChat((prev: any) => prev ? { ...prev, status: 'typing' } : prev);
        setTypingUser({ id: data.fromUserId, name: data.fromName, username: data.fromUsername });
      }
    };

    const onTypingStop = (data: { fromUserId: string; chatId: string }) => {
      if (currentUserIdRef.current && String(data.fromUserId) === String(currentUserIdRef.current)) return;
      if (String(data.chatId) === String(id)) {
        setChat((prev: any) => prev ? { ...prev, status: 'read_own' } : prev);
        setTypingUser(null);
      }
    };

    const onConnect = () => {
      console.log("Socket connected/reconnected in Chat detail screen. Flushing and syncing...");
      syncChatAndMessages();
    };

    socket.emit('join_room', id);

    socket.on('typing_start', onTypingStart);
    socket.on('typing_stop', onTypingStop);
    socket.on('connect', onConnect);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.emit('leave_room', id);
      socket.off('typing_start', onTypingStart);
      socket.off('typing_stop', onTypingStop);
      socket.off('connect', onConnect);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (chatRef.current) {
        socket.emit('typing_stop', { toUserId: chatRef.current.otherUserId, chatId: chatRef.current.id });
      }
    };
  }, [id]);

  // Header Dropdown Actions states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAiSummaryOpen, setIsAiSummaryOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

  // Message context & long-press actions
  const [activeContextMessage, setActiveContextMessage] = useState<Message | null>(null);

  // Selection mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);

  // Editing message ID
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // Custom Toast Notifier
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const loadCachedChatAndMessages = async () => {
    const cachedChats = await chatCache.getCachedChats();
    const foundChat = cachedChats.find((c: any) => String(c.id) === String(id));
    if (foundChat) {
      setChat(foundChat);
      setIsMuted(!!foundChat.isMuted);
    }
    const cachedMsgs = await chatCache.getCachedMessages(id as string);
    setMessages(cachedMsgs);
  };

  const syncChatAndMessages = async () => {
    try {
      // Flush offline queue if online/reconnected
      await chatCache.processOfflineQueue();

      const cachedChats = await chatCache.getCachedChats();
      const foundChat = cachedChats.find((c: any) => String(c.id) === String(id));
      if (foundChat) {
        setChat(foundChat);
        setIsMuted(!!foundChat.isMuted);
      }
      
      const freshMsgs = await chatCache.syncMessagesWithBackend(id as string);
      setMessages(freshMsgs);
    } catch (err) {
      console.warn("Silent sync failed in ChatScreen:", err);
    }
  };

  useEffect(() => {
    loadCachedChatAndMessages();
    syncChatAndMessages();
  }, [id]);

  useEffect(() => {
    const interval = setInterval(syncChatAndMessages, 5000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, chat?.status]);

  if (!chat) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }} edges={['top', 'bottom']}>
        <Text style={{ color: INK, fontFamily: 'Poppins_600SemiBold', fontSize: 15 }}>Loading conversation...</Text>
      </SafeAreaView>
    );
  }

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const getGroupInitials = (name: string) => {
    const clean = name.trim().replace(/\s+/g, ' ');
    const parts = clean.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const handleSend = async () => {
    let text = messageText.trim();
    
    const socket = getSocket();
    if (socket && chat) {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      socket.emit('typing_stop', { toUserId: chat.otherUserId, chatId: chat.id });
    }
    
    try {
      if (editingMessageId) {
        if (!text) return;
        await updateMessage(editingMessageId, text);
        setEditingMessageId(null);
        setMessageText('');
        showToast("Message edited");
        await syncChatAndMessages();
        return;
      }

      if (selectedFile) {
        const fileObj = {
          uri: selectedFile.url || 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=200',
          name: selectedFile.name,
          type: selectedFile.type === 'image' ? 'image/jpeg' : selectedFile.type === 'video' ? 'video/mp4' : 'application/pdf'
        } as any;
        await sendMediaMessage(chat.id, fileObj, { content: text });
      } else {
        if (!text) return;
        try {
          await sendTextMessage(chat.id, text);
        } catch (sendErr) {
          console.warn("API send failed, queuing offline:", sendErr);
          const tempId = await chatCache.addToOfflineQueue(chat.id, text);
          const tempMsg = {
            id: tempId,
            text: text,
            sender: 'me',
            senderName: 'Me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date().toISOString(),
            reactions: [],
            isPinned: false,
            isRead: false,
            status: 'queued',
          } as any;
          setMessages(prev => [...prev, tempMsg]);
          await chatCache.saveMessageLocally(chat.id, tempMsg);
        }
      }

      setMessageText('');
      setSelectedFile(null);
      setIsAttachmentOpen(false);
      setIsEmojiOpen(false);
      await syncChatAndMessages();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send message.");
    }
  };

  const statusLine = chat.status === 'typing'
    ? 'typing…'
    : chat.isOnline
    ? 'Online'
    : chat.isGroupChat
    ? `${messages.length} messages`
    : 'Offline';

  const filteredMessages = messages.filter(msg => {
    if (msg.senderIsBot || msg.senderName === 'aida' || msg.senderName?.toLowerCase() === 'aida') {
      return false;
    }
    if (!searchQuery.trim()) return true;
    return msg.text.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleReactMessage = async (messageId: string, emoji: string) => {
    try {
      await reactToMessage(messageId, emoji);
      await syncChatAndMessages();
    } catch (err) {
      showToast("Reaction failed");
    }
    setActiveContextMessage(null);
  };

  const handleTogglePinMessage = async (messageId: string) => {
    try {
      await toggleMessagePin(messageId);
      showToast("Message pin toggled");
      await syncChatAndMessages();
    } catch (err) {
      showToast("Pin failed");
    }
    setActiveContextMessage(null);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessageForMe(messageId);
      showToast("Message deleted");
      await syncChatAndMessages();
    } catch (err) {
      showToast("Delete failed");
    }
    setActiveContextMessage(null);
  };

  const handleEditMessage = (msg: Message) => {
    setEditingMessageId(msg.id);
    setMessageText(msg.text);
    setActiveContextMessage(null);
  };

  const handleToggleMessageSelect = (msgId: string) => {
    setSelectedMessageIds(prev =>
      prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]
    );
  };

  const renderedItems: Array<{ type: 'divider'; id: string; text: string } | { type: 'message'; id: string; data: Message }> = [];
  let lastDateText = '';

  const formatDividerDate = (date: Date) => {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  };

  filteredMessages.forEach(msg => {
    const msgDate = msg.timestamp ? new Date(msg.timestamp) : new Date();
    const dateText = formatDividerDate(msgDate);
    if (dateText && dateText !== lastDateText) {
      renderedItems.push({
        type: 'divider',
        id: `div-${msg.id}-${dateText}`,
        text: dateText,
      });
      lastDateText = dateText;
    }
    renderedItems.push({
      type: 'message',
      id: msg.id,
      data: msg,
    });
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>

      {/* ── Tap Outside Popups Dismiss Overlays ── */}
      {isMenuOpen && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsMenuOpen(false)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 199,
            backgroundColor: 'transparent',
          }}
        />
      )}

      {(isAttachmentOpen || isEmojiOpen) && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            setIsAttachmentOpen(false);
            setIsEmojiOpen(false);
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 90,
            backgroundColor: 'transparent',
          }}
        />
      )}

      {/* ── Header ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 14, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
        backgroundColor: '#ffffff',
        zIndex: 200,
      }}>
        {isSearching ? (
          <View style={{
            flexDirection: 'row', alignItems: 'center', flex: 1,
            backgroundColor: 'rgba(108,92,231,0.06)', borderRadius: 14,
            paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 4,
          }}>
            <Search size={16} color={PURPLE} style={{ marginRight: 8 }} />
            <TextInput
              style={{ flex: 1, fontSize: 14, fontFamily: 'Poppins_400Regular', color: INK, padding: 0 }}
              placeholder="Search messages..."
              placeholderTextColor={INK_SOFT}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); }} style={{ padding: 4 }}>
              <X size={16} color={INK} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Back + Avatar + Name */}
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(108,92,231,0.08)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                <ChevronLeft size={20} color={PURPLE} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsInfoOpen(true)}
                activeOpacity={0.75}
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}
              >
                <View style={{ position: 'relative', flexShrink: 0, marginRight: 10 }}>
                  <Avatar
                    url={chat.avatar}
                    name={chat.name || chat.organization}
                    size={40}
                    isGroup={!!(chat.isGroupChat || chat.organization)}
                  />
                  {chat.isOnline && (
                    <View style={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: 99, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#ffffff' }} />
                  )}
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text numberOfLines={2} style={{ fontSize: 14, fontFamily: 'Poppins_700Bold', color: INK, lineHeight: 17, marginRight: 4 }}>
                      {chat.name.toUpperCase().replace(/\s+/g, '\n')}
                    </Text>
                    {isMuted && <BellOff size={11} color={INK_SOFT} style={{ marginLeft: 2 }} />}
                  </View>
                  <Text style={{ fontSize: 11, fontFamily: 'Poppins_400Regular', color: chat.status === 'typing' ? PURPLE : INK_SOFT, marginTop: 1 }}>
                    {chat.status === 'typing' 
                      ? (typingUser?.username ? `@${typingUser.username} is typing…` : typingUser?.name ? `${typingUser.name} is typing…` : 'typing…') 
                      : chat.isOnline ? 'Online' : chat.isGroupChat ? `${messages.length} messages` : 'Offline'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Action Icons */}
            {(() => {
              const hideCallButtons = chat?.is_bot || chat?.username === 'aida' || chat?.username?.toLowerCase() === 'aida' || (chat?.otherUserId && String(chat.otherUserId) === String(currentUserIdRef.current));
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <IconBtn icon={<Search size={18} color={INK_SOFT} />} onPress={() => setIsSearching(true)} />
                  {!hideCallButtons && (
                    <>
                      <IconBtn icon={<Phone size={18} color={INK_SOFT} />} onPress={() => handleStartCall('voice')} />
                      <IconBtn icon={<Video size={18} color={INK_SOFT} />} onPress={() => handleStartCall('video')} />
                    </>
                  )}
                  <IconBtn icon={<Info size={18} color={INK_SOFT} />} onPress={() => setIsInfoOpen(true)} />
                  <IconBtn icon={<MoreVertical size={18} color={INK_SOFT} />} onPress={() => setIsMenuOpen(prev => !prev)} />
                </View>
              );
            })()}
          </>
        )}
      </View>

      {/* ── More Options Dropdown Menu (Popover style) ── */}
      {isMenuOpen && (
        <View style={{
          position: 'absolute',
          top: 60,
          right: 14,
          width: 195,
          backgroundColor: '#ffffff',
          borderRadius: 20,
          paddingVertical: 6,
          borderWidth: 1,
          borderColor: 'rgba(108,92,231,0.08)',
          shadowColor: '#6c5ce7',
          shadowOpacity: 0.12,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 10,
          zIndex: 1000,
        }}>
          <DropdownItem
            icon={<Info size={16} color={INK_SOFT} />}
            label="Information"
            onPress={() => {
              setIsMenuOpen(false);
              setIsInfoOpen(true);
            }}
          />
          <DropdownItem
            icon={<Sparkles size={16} color={INK_SOFT} />}
            label="AI Summary"
            onPress={() => {
              setIsMenuOpen(false);
              setIsAiSummaryOpen(true);
            }}
          />
          <DropdownItem
            icon={<Search size={16} color={INK_SOFT} />}
            label="Search in Chat"
            onPress={() => {
              setIsMenuOpen(false);
              setIsSearching(true);
            }}
          />
          <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.05)' }} />
          <DropdownItem
            icon={<BellOff size={16} color={INK_SOFT} />}
            label={isMuted ? "Unmute" : "Mute"}
            onPress={() => {
              setIsMenuOpen(false);
              setIsMuted(prev => !prev);
              showToast(isMuted ? "Chat unmuted" : "Chat muted");
            }}
          />
          <DropdownItem
            icon={<EyeOff size={16} color={INK_SOFT} />}
            label="Clear Chat"
            onPress={() => {
              setIsMenuOpen(false);
              setMessages([]);
              showToast("Chat cleared");
            }}
          />
          <DropdownItem
            icon={<Archive size={16} color={INK_SOFT} />}
            label={isArchived ? "Unarchive Chat" : "Archive Chat"}
            onPress={() => {
              setIsMenuOpen(false);
              setIsArchived(prev => !prev);
              showToast(isArchived ? "Chat unarchived" : "Chat archived");
            }}
          />
          <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.05)' }} />
          <DropdownItem
            icon={<Trash2 size={16} color="red" />}
            label="Delete Chat"
            labelStyle={{ color: 'red' }}
            onPress={() => {
              setIsMenuOpen(false);
              router.back();
              showToast("Chat deleted");
            }}
          />
        </View>
      )}

      {/* ── Messages + Input ── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Subtle lavender bg for chat area */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, backgroundColor: BG }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {renderedItems.map(item => {
            if (item.type === 'divider') {
              return (
                <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 18, paddingHorizontal: 10 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.06)' }} />
                  <Text style={{ marginHorizontal: 16, fontSize: 12, fontFamily: 'Poppins_500Medium', color: INK_SOFT }}>
                    {item.text}
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.06)' }} />
                </View>
              );
            }

            const msg = item.data as any;
            const isMe = msg.sender === 'me';
            const isSelected = selectedMessageIds.includes(msg.id);

            return (
              <View key={msg.id} style={{ marginBottom: 14, flexDirection: 'row', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end' }}>
                {/* Checkbox for selection mode */}
                {isSelectionMode && (
                  <TouchableOpacity
                    onPress={() => handleToggleMessageSelect(msg.id)}
                    style={{
                      justifyContent: 'center',
                      alignItems: 'center',
                      paddingRight: 10,
                      alignSelf: 'center',
                    }}
                  >
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: isSelected ? PURPLE : INK_SOFT,
                      backgroundColor: isSelected ? PURPLE : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {isSelected && <Check size={12} color="#ffffff" />}
                    </View>
                  </TouchableOpacity>
                )}

                {/* Left (Received) message avatar */}
                {!isMe && (
                  <View style={{ marginRight: 8, marginBottom: 2, alignSelf: 'flex-end', flexShrink: 0 }}>
                    <Avatar
                      url={chat.avatar}
                      name={chat.isGroupChat && msg.senderName ? msg.senderName : chat.name}
                      size={28}
                      isGroup={chat.isGroupChat ? false : !!chat.organization}
                    />
                  </View>
                )}

                <View style={{ maxWidth: '70%', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  <TouchableOpacity
                    activeOpacity={isSelectionMode ? 0.75 : 1}
                    onPress={() => {
                      if (isSelectionMode) {
                        handleToggleMessageSelect(msg.id);
                      }
                    }}
                    onLongPress={() => {
                      if (!isSelectionMode) {
                        setActiveContextMessage(msg);
                      }
                    }}
                    style={{
                      position: 'relative',
                      borderRadius: 18,
                      borderBottomRightRadius: isMe ? 4 : 18,
                      borderBottomLeftRadius: isMe ? 18 : 4,
                      paddingHorizontal: 14,
                      paddingTop: 10,
                      paddingBottom: msg.reactions && msg.reactions.length > 0 ? 14 : 10,
                      backgroundColor: isMe ? PURPLE : '#f1f2f6',
                      shadowColor: isMe ? PURPLE : '#000',
                      shadowOpacity: isMe ? 0.15 : 0.02,
                      shadowRadius: 4,
                      shadowOffset: { width: 0, height: 1 },
                      elevation: 1,
                    }}
                  >
                    {!isMe && chat.isGroupChat && msg.senderName && (
                      <Text style={{ fontSize: 10, fontFamily: 'Poppins_700Bold', color: PURPLE, marginBottom: 3 }}>
                        {msg.senderName}
                      </Text>
                    )}
                    {msg.message_type === 'voice' ? (
                      <VoiceMessagePlayer msg={msg} isMe={isMe} />
                    ) : msg.message_type === 'image' && (msg.mediaUrl || msg.media_url) ? (
                      <View style={{ marginVertical: 4 }}>
                        <Image
                          source={{ uri: getSecureMediaUrl(msg.mediaUrl || msg.media_url) || undefined }}
                          style={{ width: 200, height: 150, borderRadius: 12 }}
                          contentFit="cover"
                        />
                        {msg.text && msg.text !== (msg.mediaUrl || msg.media_url) && (
                          <Text style={{ fontSize: 14, lineHeight: 20, fontFamily: 'Poppins_400Regular', color: isMe ? '#ffffff' : INK, marginTop: 6 }}>
                            {msg.text}
                          </Text>
                        )}
                      </View>
                    ) : msg.message_type === 'video' && (msg.mediaUrl || msg.media_url) ? (
                      <View style={{ marginVertical: 4 }}>
                        <View style={{ width: 200, height: 150, borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                          <Image
                            source={{ uri: getSecureMediaUrl(msg.mediaUrl || msg.media_url) || undefined }}
                            style={{ width: '100%', height: '100%', opacity: 0.6, position: 'absolute' }}
                            contentFit="cover"
                          />
                          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center' }}>
                            <Play size={16} color="#000" style={{ marginLeft: 2 }} />
                          </View>
                        </View>
                        {msg.text && msg.text !== (msg.mediaUrl || msg.media_url) && (
                          <Text style={{ fontSize: 14, lineHeight: 20, fontFamily: 'Poppins_400Regular', color: isMe ? '#ffffff' : INK, marginTop: 6 }}>
                            {msg.text}
                          </Text>
                        )}
                      </View>
                    ) : msg.message_type === 'file' && (msg.mediaUrl || msg.media_url) ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, width: 200 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(108,92,231,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                          <FileText size={16} color={isMe ? '#ffffff' : PURPLE} />
                        </View>
                        <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: isMe ? '#ffffff' : INK, flex: 1 }}>
                          {msg.text || 'Document File'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 14, lineHeight: 20, fontFamily: 'Poppins_400Regular', color: isMe ? '#ffffff' : INK }}>
                        {msg.text}
                      </Text>
                    )}

                    {/* Reaction badge */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <View style={{
                        position: 'absolute',
                        bottom: -10,
                        right: isMe ? undefined : 12,
                        left: isMe ? 12 : undefined,
                        flexDirection: 'row',
                        backgroundColor: '#ffffff',
                        borderRadius: 12,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderWidth: 1,
                        borderColor: 'rgba(108,92,231,0.15)',
                        shadowColor: '#000',
                        shadowOpacity: 0.05,
                        shadowRadius: 3,
                        elevation: 1,
                      }}>
                        {(msg.reactions as any[]).map((emoji: string, idx: number) => (
                          <Text key={idx} style={{ fontSize: 11, marginRight: idx < msg.reactions!.length - 1 ? 2 : 0 }}>{emoji}</Text>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Time and checkmarks outside/under the bubble */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: msg.reactions && msg.reactions.length > 0 ? 12 : 4,
                    paddingHorizontal: 6,
                  }}>
                    {msg.isPinned && <Pin size={10} color={INK_SOFT} style={{ marginRight: 4 }} />}
                    <Text style={{ fontSize: 9.5, fontFamily: 'Poppins_400Regular', color: INK_SOFT }}>
                      {msg.time}
                    </Text>
                    {isMe && (
                      msg.status === 'queued' ? (
                        <Clock size={11} color={INK_SOFT} style={{ marginLeft: 4 }} />
                      ) : msg.isRead ? (
                        <CheckCheck size={11} color="#38bdf8" style={{ marginLeft: 4 }} />
                      ) : (
                        <Check size={11} color={INK_SOFT} style={{ marginLeft: 4 }} />
                      )
                    )}
                  </View>
                </View>

                {/* Right (Sent) message avatar */}
                {isMe && (
                  <View style={{ marginLeft: 8, marginBottom: 2, alignSelf: 'flex-end', flexShrink: 0 }}>
                    <Avatar
                      url={ownUser?.avatar || null}
                      name={ownUser?.name || 'Me'}
                      size={28}
                      isGroup={false}
                    />
                  </View>
                )}
              </View>
            );
          })}

          {/* Typing bubble */}
          {chat.status === 'typing' && (
            <View style={{ marginBottom: 10, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-end' }}>
              <View style={{ marginRight: 8, marginBottom: 2, alignSelf: 'flex-end', flexShrink: 0 }}>
                <Avatar
                  url={chat.avatar}
                  name={chat.isGroupChat && typingUser?.name ? typingUser.name : chat.name}
                  size={28}
                  isGroup={chat.isGroupChat ? false : !!chat.organization}
                />
              </View>
              <View style={{ borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#f1f2f6' }}>
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <View key={i} style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: INK_SOFT }} />
                  ))}
                  <Text style={{ fontSize: 12, color: INK_SOFT, fontFamily: 'Poppins_500Medium', marginLeft: 4 }}>
                    {typingUser?.username ? `@${typingUser.username} is typing…` : typingUser?.name ? `${typingUser.name} is typing…` : 'typing…'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── Bottom Bar (Contextual depending on Selection Mode) ── */}
        {isSelectionMode ? (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderTopWidth: 1,
            borderTopColor: 'rgba(0,0,0,0.06)',
            backgroundColor: '#ffffff',
          }}>
            <TouchableOpacity onPress={() => {
              setIsSelectionMode(false);
              setSelectedMessageIds([]);
            }}>
              <Text style={{ fontSize: 13.5, fontFamily: 'Poppins_600SemiBold', color: INK_SOFT }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => {
              setSelectedMessageIds(messages.map(m => m.id));
            }}>
              <Text style={{ fontSize: 13.5, fontFamily: 'Poppins_600SemiBold', color: PURPLE }}>Select All</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  const textToCopy = messages
                    .filter(m => selectedMessageIds.includes(m.id))
                    .map(m => `[${m.time}] ${m.sender === 'me' ? 'Me' : chat.name}: ${m.text}`)
                    .join('\n');
                  showToast(`${selectedMessageIds.length} messages copied`);
                  setIsSelectionMode(false);
                  setSelectedMessageIds([]);
                }}
                disabled={selectedMessageIds.length === 0}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: selectedMessageIds.length > 0 ? 'rgba(108,92,231,0.08)' : 'transparent',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                }}
              >
                <Copy size={14} color={selectedMessageIds.length > 0 ? PURPLE : INK_SOFT} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12.5, fontFamily: 'Poppins_700Bold', color: selectedMessageIds.length > 0 ? PURPLE : INK_SOFT }}>
                  Copy
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setMessages(prev => prev.filter(m => !selectedMessageIds.includes(m.id)));
                  showToast(`${selectedMessageIds.length} messages deleted`);
                  setIsSelectionMode(false);
                  setSelectedMessageIds([]);
                }}
                disabled={selectedMessageIds.length === 0}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: selectedMessageIds.length > 0 ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                }}
              >
                <Trash2 size={14} color={selectedMessageIds.length > 0 ? 'red' : INK_SOFT} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12.5, fontFamily: 'Poppins_700Bold', color: selectedMessageIds.length > 0 ? 'red' : INK_SOFT }}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            {/* Editing banner alert */}
            {editingMessageId && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(108,92,231,0.06)',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(108,92,231,0.1)',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Edit2 size={14} color={PURPLE} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 12, fontFamily: 'Poppins_500Medium', color: INK_SOFT }}>
                    Editing message...
                  </Text>
                </View>
                <TouchableOpacity onPress={() => { setEditingMessageId(null); setMessageText(''); }}>
                  <X size={14} color={INK} />
                </TouchableOpacity>
              </View>
            )}

            {/* Input Bar */}
            <View style={{
              position: 'relative',
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: '#ffffff',
              borderTopWidth: 1,
              borderTopColor: 'rgba(0,0,0,0.05)',
            }}>
              {/* ── Attachment popover menu ── */}
              {isAttachmentOpen && (
                <View style={{
                  position: 'absolute',
                  bottom: 70,
                  left: 16,
                  width: 190,
                  backgroundColor: '#ffffff',
                  borderRadius: 18,
                  padding: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(108,92,231,0.08)',
                  shadowColor: '#6c5ce7',
                  shadowOpacity: 0.12,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 8,
                  zIndex: 100,
                }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Poppins_700Bold', color: INK_SOFT, textTransform: 'uppercase', paddingHorizontal: 12, paddingVertical: 6, letterSpacing: 0.8 }}>
                    Upload attachment
                  </Text>
                  
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedFile({ name: 'IMG_4829.jpg', size: '1.4 MB', type: 'image', url: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=200' });
                      setIsAttachmentOpen(false);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 }}
                  >
                    <ImageIcon size={16} color={PURPLE} style={{ marginRight: 10 }} />
                    <Text style={{ fontSize: 13, fontFamily: 'Poppins_500Medium', color: INK }}>Photo & Video</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedFile({ name: 'screen_record.mov', size: '12.8 MB', type: 'video' });
                      setIsAttachmentOpen(false);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 }}
                  >
                    <Video size={16} color={PURPLE} style={{ marginRight: 10 }} />
                    <Text style={{ fontSize: 13, fontFamily: 'Poppins_500Medium', color: INK }}>Video Clip</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedFile({ name: 'project_spec.pdf', size: '2.1 MB', type: 'file' });
                      setIsAttachmentOpen(false);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 }}
                  >
                    <FileText size={16} color={PURPLE} style={{ marginRight: 10 }} />
                    <Text style={{ fontSize: 13, fontFamily: 'Poppins_500Medium', color: INK }}>Document File</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── Emoji reactions quick-select ── */}
              {isEmojiOpen && (
                <View style={{
                  position: 'absolute',
                  bottom: 70,
                  right: 16,
                  backgroundColor: '#ffffff',
                  borderRadius: 20,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(108,92,231,0.08)',
                  shadowColor: '#6c5ce7',
                  shadowOpacity: 0.12,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 8,
                  zIndex: 100,
                  flexDirection: 'row',
                  gap: 8,
                }}>
                  {['👍', '❤️', '😂', '😮', '😢', '🔥', '👎', '🎉'].map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => {
                        setMessageText(prev => prev + emoji);
                        setIsEmojiOpen(false);
                      }}
                      style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 20 }}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* ── Selected Attachment Preview Card ── */}
              {selectedFile && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'rgba(108,92,231,0.05)',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(108,92,231,0.1)',
                  padding: 10,
                  marginBottom: 10,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    {selectedFile.type === 'image' && selectedFile.url ? (
                      <Image source={{ uri: selectedFile.url }} style={{ width: 40, height: 40, borderRadius: 8, marginRight: 10 }} />
                    ) : (
                      <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(108,92,231,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                        {selectedFile.type === 'video' ? <Video size={18} color={PURPLE} /> : <FileText size={18} color={PURPLE} />}
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: INK }}>
                        {selectedFile.name}
                      </Text>
                      <Text style={{ fontSize: 11, fontFamily: 'Poppins_400Regular', color: INK_SOFT }}>
                        {selectedFile.size} · {selectedFile.type.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedFile(null)}
                    style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={12} color={INK} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Aida Writing Suggestions Chips */}
              {aidaSuggestions.length > 0 && (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingBottom: 8 }}
                >
                  {aidaSuggestions.map((suggestion, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        setMessageText(suggestion);
                        setAidaSuggestions([]);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(108,92,231,0.08)',
                        borderColor: 'rgba(108,92,231,0.15)',
                        borderWidth: 1,
                        borderRadius: 100,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                      }}
                    >
                      <Sparkles size={11} color={PURPLE} style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: PURPLE }}>
                        {suggestion}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* ── Main Input Bar Row styled as a single continuous capsule ── */}
              {isRecording ? (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  borderRadius: 24,
                  paddingHorizontal: 16,
                  paddingVertical: 5,
                  minHeight: 48,
                  justifyContent: 'space-between',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {/* Pulsing red dot */}
                    <View style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'red',
                      opacity: isPulsing ? 1 : 0.2,
                    }} />
                    <Text style={{ fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: 'red' }}>
                      Recording... {formatRecordingTime(recordingSeconds)}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {/* Cancel button */}
                    <TouchableOpacity
                      onPress={() => setIsRecording(false)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: 'rgba(0,0,0,0.05)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <X size={16} color={INK} />
                    </TouchableOpacity>

                    {/* Send voice message button */}
                    <TouchableOpacity
                      onPress={async () => {
                        const durationSecs = recordingSeconds;
                        setIsRecording(false);
                        try {
                          await sendMediaMessage(
                            chat.id,
                            {
                              uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                              name: 'voice_memo.mp3',
                              type: 'audio/mpeg'
                            },
                            {
                              message_type: 'voice',
                              media_duration: durationSecs,
                              content: 'Voice Memo'
                            }
                          );
                          await syncChatAndMessages();
                        } catch (err: any) {
                          Alert.alert("Error", err.message || "Failed to send voice memo.");
                        }
                      }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: PURPLE,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Send size={14} color="#ffffff" style={{ marginLeft: 2 }} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  backgroundColor: '#f1f2f6',
                  borderRadius: 24,
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                  minHeight: 48,
                  maxHeight: 120,
                }}>
                  {/* Paperclip icon inside the capsule */}
                  <TouchableOpacity
                    onPress={() => {
                      setIsAttachmentOpen(prev => !prev);
                      setIsEmojiOpen(false);
                    }}
                    style={{
                      width: 38,
                      height: 38,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Paperclip size={20} color={isAttachmentOpen ? PURPLE : INK_SOFT} />
                  </TouchableOpacity>

                  {/* Input text inside the capsule */}
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 15,
                      fontFamily: 'Poppins_400Regular',
                      color: INK,
                      maxHeight: 100,
                      paddingVertical: Platform.OS === 'ios' ? 8 : 4,
                      paddingHorizontal: 4,
                      textAlignVertical: 'center',
                    }}
                    placeholder={selectedFile ? "Add a caption..." : "Type a message..."}
                    placeholderTextColor="rgba(31,32,48,0.35)"
                    multiline
                    value={messageText}
                    onChangeText={handleTextChange}
                  />

                  {/* Smile Emoji button inside the capsule */}
                  <TouchableOpacity
                    onPress={() => {
                      setIsEmojiOpen(prev => !prev);
                      setIsAttachmentOpen(false);
                    }}
                    style={{
                      width: 38,
                      height: 38,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Smile size={20} color={isEmojiOpen ? PURPLE : INK_SOFT} />
                  </TouchableOpacity>

                  {/* Send / Mic button inside the capsule */}
                  {messageText.trim().length > 0 || selectedFile ? (
                    <TouchableOpacity
                      onPress={handleSend}
                      style={{
                        width: 38,
                        height: 38,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Send size={20} color={PURPLE} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        setIsRecording(true);
                      }}
                      style={{
                        width: 38,
                        height: 38,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Mic size={20} color={INK_SOFT} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ── Custom Floating Toast Alert Overlay ── */}
      {toastMessage && (
        <View style={{
          position: 'absolute',
          top: 80,
          alignSelf: 'center',
          backgroundColor: 'rgba(31,32,48,0.9)',
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 20,
          zIndex: 9999,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 5,
        }}>
          <Text style={{ color: '#ffffff', fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}>
            {toastMessage}
          </Text>
        </View>
      )}

      {/* ── Message Context Menu Modal ── */}
      <Modal visible={activeContextMessage !== null} transparent animationType="fade">
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setActiveContextMessage(null)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(31,32,48,0.4)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          {activeContextMessage && (
            <TouchableOpacity
              activeOpacity={1}
              style={{
                width: '100%',
                maxWidth: 290,
                backgroundColor: '#ffffff',
                borderRadius: 24,
                padding: 16,
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 10,
              }}
            >
              {/* Emojis reaction row */}
              <Text style={{ fontSize: 10, fontFamily: 'Poppins_700Bold', color: INK_SOFT, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>
                React
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                {['👍', '❤️', '😂', '😮', '😢', '🔥', '👎', '🎉'].map(emoji => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleReactMessage(activeContextMessage.id, emoji)}
                    style={{ padding: 4 }}
                  >
                    <Text style={{ fontSize: 22 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginBottom: 8 }} />

              {/* Actions */}
              <ContextMenuItem
                icon={<Copy size={16} color={INK_SOFT} />}
                label="Copy Text"
                onPress={() => {
                  showToast("Copied to clipboard!");
                  setActiveContextMessage(null);
                }}
              />
              <ContextMenuItem
                icon={<Pin size={16} color={INK_SOFT} />}
                label={activeContextMessage.isPinned ? "Unpin Message" : "Pin Message"}
                onPress={() => handleTogglePinMessage(activeContextMessage.id)}
              />
              
              {activeContextMessage.sender === 'me' && (
                <ContextMenuItem
                  icon={<Edit2 size={16} color={INK_SOFT} />}
                  label="Edit Message"
                  onPress={() => handleEditMessage(activeContextMessage)}
                />
              )}

              <ContextMenuItem
                icon={<Check size={16} color={INK_SOFT} />}
                label="Select Message"
                onPress={() => {
                  setIsSelectionMode(true);
                  setSelectedMessageIds([activeContextMessage.id]);
                  setActiveContextMessage(null);
                }}
              />

              <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 8 }} />

              <ContextMenuItem
                icon={<Trash2 size={16} color="red" />}
                label="Delete Message"
                labelStyle={{ color: 'red' }}
                onPress={() => handleDeleteMessage(activeContextMessage.id)}
              />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Modal>

      {/* ── AI Summary Modal ── */}
      <Modal visible={isAiSummaryOpen} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(31,32,48,0.5)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            maxHeight: '60%',
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Sparkles size={20} color={PURPLE} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', color: INK }}>AI Conversation Summary</Text>
              </View>
              <TouchableOpacity onPress={() => setIsAiSummaryOpen(false)} style={{ padding: 4 }}>
                <X size={20} color={PURPLE} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ backgroundColor: 'rgba(108,92,231,0.05)', borderRadius: 18, padding: 16, borderLeftWidth: 4, borderLeftColor: PURPLE, marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontFamily: 'Poppins_400Regular', color: INK, lineHeight: 20 }}>
                  This conversation centers around alignment on Bubblespace product updates. Major key points discussed:
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'Poppins_500Medium', color: INK, lineHeight: 20, marginTop: 10 }}>
                  • Verified mobile-view responsiveness adjustments.
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'Poppins_500Medium', color: INK, lineHeight: 20, marginTop: 4 }}>
                  • Discussed PR progress for onboarding flow UI updates.
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'Poppins_500Medium', color: INK, lineHeight: 20, marginTop: 4 }}>
                  • Sync scheduled for 2 PM today to lock down high-fidelity templates.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  showToast("Summary copied!");
                  setIsAiSummaryOpen(false);
                }}
                style={{
                  backgroundColor: PURPLE,
                  borderRadius: 14,
                  paddingVertical: 12,
                  alignItems: 'center',
                  marginTop: 8,
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'Poppins_700Bold' }}>Copy Summary</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Info Modal ── */}
      <Modal visible={isInfoOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
          {/* Modal Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}>
            <View>
              <Text style={{ fontSize: 19, fontFamily: 'SpaceGrotesk_700Bold', color: INK }}>Information</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Poppins_400Regular', color: INK_SOFT, marginTop: 1 }}>
                {chat.isGroupChat ? 'Group Details' : 'Contact Details'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setIsInfoOpen(false)} style={{ padding: 6 }}>
              <X size={20} color={PURPLE} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
            {/* Profile Card */}
            <View style={{ alignItems: 'center', backgroundColor: 'rgba(108,92,231,0.06)', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', marginBottom: 20 }}>
              <View style={{ marginBottom: 14 }}>
                <Avatar
                  url={chat.avatar}
                  name={chat.name || chat.organization}
                  size={76}
                  isGroup={!!(chat.isGroupChat || chat.organization)}
                  style={{ borderRadius: 22 }}
                  imageStyle={{ borderRadius: 22 }}
                />
              </View>
              <Text style={{ fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', color: INK, textAlign: 'center' }}>{chat.name}</Text>
              <Text style={{ fontSize: 13.5, fontFamily: 'Poppins_700Bold', color: PURPLE, marginTop: 4 }}>
                @{chat.isGroupChat ? 'group_' + chat.name.toLowerCase().replace(/\s/g, '_') : chat.name.toLowerCase().replace(/\s/g, '_')}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'Poppins_400Regular', color: INK_SOFT, textAlign: 'center', marginTop: 10, lineHeight: 20, paddingHorizontal: 10 }}>
                {chat.bio}
              </Text>
            </View>

            {/* Info Cards - Only displayed for 1-on-1 chats */}
            {!chat.isGroupChat && (
              <>
                <InfoCard icon={<Mail size={19} color={PURPLE} />} label="Email Address" value={chat.email} />
                <InfoCard icon={<Phone size={19} color={PURPLE} />} label="Phone Number" value={chat.phone} />
                <InfoCard icon={<Briefcase size={19} color={PURPLE} />} label="Organization & Role" value={`${chat.organization} · ${chat.org_role}`} />
              </>
            )}

            {/* Group Administration settings */}
            {chat.isGroupChat && (() => {
              const isGroupAdmin = chat.groupAdmin && String(chat.groupAdmin.id || chat.groupAdmin._id || chat.groupAdmin) === String(currentUserIdRef.current);
              return (
                <View style={{ backgroundColor: 'rgba(108,92,231,0.06)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', paddingBottom: 10, marginBottom: 10 }}>
                    <Text style={{ fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', color: INK }}>Group Administration</Text>
                    {isGroupAdmin && (
                      <TouchableOpacity onPress={handleStartEditGroup} style={{ backgroundColor: PURPLE, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'Poppins_700Bold' }}>Edit Info</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={{ fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: INK }}>Admin Permission</Text>
                      <Text style={{ fontSize: 10.5, color: INK_SOFT, marginTop: 2 }}>
                        {isGroupAdmin ? 'Allow members to share invite' : 'Members can share code: ' + (chat.allowMembersToShareInvite ? 'Yes' : 'No')}
                      </Text>
                    </View>
                    {isGroupAdmin ? (
                      <Switch
                        value={chat.allowMembersToShareInvite ?? true}
                        onValueChange={async (val) => {
                          try {
                            const { updateGroupSettings } = await import('../../../lib/api');
                            const res = await updateGroupSettings(chat.id, { allowMembersToShareInvite: val });
                            if (res?.conversation) {
                              setChat(res.conversation);
                            }
                          } catch (e: any) {
                            Alert.alert("Error", e.message || "Failed to update group settings.");
                          }
                        }}
                        trackColor={{ false: "#e2e8f0", true: "#6c5ce7" }}
                        thumbColor={Platform.OS === 'ios' ? undefined : (chat.allowMembersToShareInvite ?? true) ? "#6c5ce7" : "#f4f3f4"}
                      />
                    ) : null}
                  </View>
                </View>
              );
            })()}

            {/* Group Invite Code Card */}
            {chat.isGroupChat && chat.inviteCode && (() => {
              const isGroupAdmin = chat.groupAdmin && String(chat.groupAdmin.id || chat.groupAdmin._id || chat.groupAdmin) === String(currentUserIdRef.current);
              if (isGroupAdmin || (chat.allowMembersToShareInvite ?? true)) {
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(108,92,231,0.06)', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', marginBottom: 10 }}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={{ fontSize: 10, fontFamily: 'Poppins_700Bold', color: INK_SOFT, textTransform: 'uppercase', letterSpacing: 1 }}>Group Invite Code</Text>
                      <Text style={{ fontSize: 11.5, fontFamily: 'Poppins_500Medium', color: INK_SOFT, marginTop: 2 }}>Anyone with this code can join the group</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Clipboard.setString(chat.inviteCode);
                        Alert.alert("Copied", "Group invite code copied to clipboard!");
                      }}
                      style={{ backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', flexDirection: 'row', alignItems: 'center' }}
                    >
                      <Copy size={12} color={PURPLE} style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 13, fontFamily: 'Poppins_700Bold', color: PURPLE }}>{chat.inviteCode}</Text>
                    </TouchableOpacity>
                  </View>
                );
              }
              return null;
            })()}

            {/* List group members */}
            {chat.isGroupChat && chat.users && chat.users.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', color: INK, marginTop: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Group Members ({chat.users.length})
                </Text>
                <View style={{ gap: 10 }}>
                  {chat.users.map((member: any) => {
                    const isAdmin = chat.groupAdmin && String(member.id || member._id || member) === String(chat.groupAdmin.id || chat.groupAdmin._id || chat.groupAdmin);
                    return (
                      <View key={member.id || member._id || member} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(108,92,231,0.04)', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)' }}>
                        <Avatar
                          url={member.avatar}
                          name={member.full_name || member.username}
                          size={36}
                          style={{ borderRadius: 10 }}
                          imageStyle={{ borderRadius: 10 }}
                        />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                          <Text style={{ fontSize: 13.5, fontFamily: 'Poppins_600SemiBold', color: INK }}>
                            {member.full_name || member.username}
                          </Text>
                          {member.username && (
                            <Text style={{ fontSize: 11, fontFamily: 'Poppins_500Medium', color: INK_SOFT }}>
                              @{member.username}
                            </Text>
                          )}
                        </View>
                        {isAdmin && (
                          <View style={{ backgroundColor: 'rgba(108,92,231,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                            <Text style={{ fontSize: 10, fontFamily: 'Poppins_700Bold', color: PURPLE, textTransform: 'uppercase' }}>Admin</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Dynamic Shared Resources / Storage center */}
            <Text style={{ fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', color: INK, marginTop: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              {chat.isGroupChat ? 'Shared Resources' : 'Storage Center'}
            </Text>

            {(() => {
              const mediaSummary = countMedia(messages);
              const accordionSections = [
                { key: 'photos', label: `Photos & Videos (${mediaSummary.images + mediaSummary.videos})`, icon: <ImageIcon size={16} color={PURPLE} />, items: [
                  ...mediaSummary.imageUrls.map((url, idx) => ({ label: `Photo ${idx + 1}`, url })),
                  ...mediaSummary.videoItems.map(item => ({ label: item.label, url: item.url }))
                ] },
                { key: 'voice', label: `Voice Notes & Audio (${mediaSummary.voice + mediaSummary.audio})`, icon: <Mic size={16} color={PURPLE} />, items: [
                  ...mediaSummary.voiceItems.map(item => ({ label: item.label, url: item.url })),
                  ...mediaSummary.audioItems.map(item => ({ label: item.label, url: item.url }))
                ] },
                { key: 'links', label: `Links (${mediaSummary.linkItems.length})`, icon: <Sparkles size={16} color={PURPLE} />, items: mediaSummary.linkItems },
                { key: 'files', label: `Documents & Files (${mediaSummary.files})`, icon: <FileText size={16} color={PURPLE} />, items: mediaSummary.fileItems },
              ];

              return accordionSections.map((section) => {
                const isOpen = openSection === section.key;
                return (
                  <View key={section.key} style={{ backgroundColor: 'rgba(108,92,231,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)', marginBottom: 8, overflow: 'hidden' }}>
                    <TouchableOpacity
                      onPress={() => setOpenSection(isOpen ? null : section.key)}
                      activeOpacity={0.7}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        {section.icon}
                        <Text style={{ fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: INK }}>
                          {section.label}
                        </Text>
                      </View>
                      <ChevronLeft size={16} color={INK_SOFT} style={{ transform: [{ rotate: isOpen ? '-90deg' : '0deg' }] }} />
                    </TouchableOpacity>

                    {isOpen && (
                      <View style={{ paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)', paddingTop: 10 }}>
                        {section.items.length === 0 ? (
                          <Text style={{ fontSize: 12, fontFamily: 'Poppins_400Regular', color: INK_SOFT, fontStyle: 'italic' }}>
                            No shared items yet.
                          </Text>
                        ) : (
                          section.items.map((item, idx) => (
                            <TouchableOpacity
                              key={idx}
                              onPress={() => {
                                import('react-native').then(({ Linking }) => {
                                  const secureUrl = getSecureMediaUrl(item.url);
                                  if (secureUrl) Linking.openURL(secureUrl).catch(() => {});
                                });
                              }}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}
                            >
                              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: PURPLE }} />
                              <Text numberOfLines={1} style={{ fontSize: 12.5, fontFamily: 'Poppins_500Medium', color: PURPLE, textDecorationLine: 'underline', flex: 1 }}>
                                {item.label}
                              </Text>
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                );
              });
            })()}

            <TouchableOpacity
              onPress={() => setIsInfoOpen(false)}
              style={{ marginTop: 28, backgroundColor: PURPLE, paddingVertical: 16, borderRadius: 18, alignItems: 'center', shadowColor: PURPLE, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5, marginBottom: 32 }}
            >
              <Text style={{ color: '#ffffff', fontFamily: 'Poppins_700Bold', fontSize: 14 }}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Group Info Modal */}
      <Modal visible={isEditingGroup} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}>
            <View>
              <Text style={{ fontSize: 19, fontFamily: 'SpaceGrotesk_700Bold', color: INK }}>Edit Group Info</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Poppins_400Regular', color: INK_SOFT, marginTop: 1 }}>Update group details</Text>
            </View>
            <TouchableOpacity onPress={() => setIsEditingGroup(false)}>
              <X color={PURPLE} size={20} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
            <View style={{ backgroundColor: 'rgba(108,92,231,0.06)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', marginBottom: 20 }}>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Poppins_700Bold', color: INK, textTransform: 'uppercase', marginBottom: 6 }}>Group Avatar</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 5 }}>
                  {AVATARS.map((url) => (
                    <TouchableOpacity
                      key={url}
                      onPress={() => setGroupFormData({...groupFormData, groupIcon: url})}
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 16,
                        borderWidth: groupFormData.groupIcon === url ? 3 : 0,
                        borderColor: PURPLE,
                        overflow: 'hidden',
                      }}
                    >
                      <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={async () => {
                      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                      if (!permissionResult.granted) {
                        Alert.alert("Permission Denied", "Camera roll permissions are required to choose a group icon.");
                        return;
                      }

                      const pickerResult = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: true,
                        quality: 0.8,
                      });

                      if (pickerResult.canceled) return;
                      const uri = pickerResult.assets[0].uri;
                      try {
                        const uploadedUrl = await uploadGroupOrOrgImage(uri);
                        setGroupFormData({ ...groupFormData, groupIcon: uploadedUrl });
                        Alert.alert("Success", "Custom avatar uploaded!");
                      } catch (err: any) {
                        Alert.alert("Error", err.message || "Failed to upload image.");
                      }
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: PURPLE_SOFT,
                      borderWidth: 1,
                      borderColor: 'rgba(108,92,231,0.2)',
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: PURPLE, fontSize: 11, fontFamily: 'Poppins_700Bold' }}>Upload Custom</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setGroupFormData({ ...groupFormData, groupIcon: '' });
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(239,68,68,0.05)',
                      borderWidth: 1,
                      borderColor: 'rgba(239,68,68,0.1)',
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#ef4444', fontSize: 11, fontFamily: 'Poppins_700Bold' }}>Remove Avatar</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Poppins_700Bold', color: INK, textTransform: 'uppercase', marginBottom: 6 }}>Group Name</Text>
                <TextInput
                  value={groupFormData.chatName}
                  onChangeText={(t) => setGroupFormData({...groupFormData, chatName: t})}
                  style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 14, color: INK, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' }}
                />
              </View>
              
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Poppins_700Bold', color: INK, textTransform: 'uppercase', marginBottom: 6 }}>Description / Bio</Text>
                <TextInput
                  value={groupFormData.groupDescription}
                  onChangeText={(t) => setGroupFormData({...groupFormData, groupDescription: t})}
                  style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 14, color: INK, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', minHeight: 80 }}
                  multiline
                  textAlignVertical="top"
                />
              </View>
              
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const { updateGroupSettings } = await import('../../../lib/api');
                    const res = await updateGroupSettings(chat.id, {
                      chatName: groupFormData.chatName.trim(),
                      groupDescription: groupFormData.groupDescription.trim(),
                      groupIcon: groupFormData.groupIcon,
                    });
                    if (res?.conversation) {
                      setChat(res.conversation);
                      Alert.alert("Success", "Group settings updated successfully.");
                      setIsEditingGroup(false);
                    }
                  } catch (err: any) {
                    Alert.alert("Error", err.message || "Failed to update group settings.");
                  }
                }}
                style={{ backgroundColor: PURPLE, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function IconBtn({ icon, onPress }: { icon: React.ReactNode; onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>
      {icon}
    </TouchableOpacity>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(108,92,231,0.06)', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', marginBottom: 10 }}>
      {icon}
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{ fontSize: 10, fontFamily: 'Poppins_700Bold', color: INK_SOFT, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Text>
        <Text style={{ fontSize: 13.5, fontFamily: 'Poppins_600SemiBold', color: '#1f2030', marginTop: 2 }}>{value}</Text>
      </View>
    </View>
  );
}

function DropdownItem({
  icon,
  label,
  onPress,
  labelStyle
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  labelStyle?: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
      }}
    >
      {icon}
      <Text style={[{ fontSize: 13, color: '#1f2030', fontFamily: 'Poppins_500Medium', marginLeft: 10 }, labelStyle]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ContextMenuItem({
  icon,
  label,
  onPress,
  labelStyle
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  labelStyle?: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
      }}
    >
      {icon}
      <Text style={[{ fontSize: 13.5, color: '#1f2030', fontFamily: 'Poppins_500Medium', marginLeft: 10 }, labelStyle]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function countMedia(messages: any[]) {
  let images = 0, videos = 0, audio = 0, files = 0, voice = 0;
  const imageUrls: string[] = [];
  const videoItems: any[] = [];
  const audioItems: any[] = [];
  const fileItems: any[] = [];
  const voiceItems: any[] = [];
  const linkItems: any[] = [];

  for (const m of messages) {
    const url = m.mediaUrl;
    const t = m.message_type || '';

    if (m.text) {
      const match = m.text.match(/(https?:\/\/[^\s]+)/gi);
      if (match) {
        match.forEach((link: string) => {
          linkItems.push({
            label: link.replace(/^https?:\/\/(www\.)?/, '').split('/')[0],
            url: link,
          });
        });
      }
    }

    if (!url) continue;

    if (t === 'image' || m.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)) {
      images++;
      imageUrls.push(url);
    } else if (t === 'video' || m.mimeType?.startsWith('video/') || /\.(mp4|webm|mov|mkv)(\?|$)/i.test(url)) {
      videos++;
      videoItems.push({
        label: m.fileName || url.split('/').pop() || 'Video file',
        url: url,
      });
    } else if (t === 'voice' || t === 'audio' || m.mimeType?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|weba)(\?|$)/i.test(url)) {
      if (t === 'voice') {
        voice++;
        voiceItems.push({
          label: `Voice note (${m.duration || '0:14'})`,
          url: url,
        });
      } else {
        audio++;
        audioItems.push({
          label: m.fileName || url.split('/').pop() || 'Audio file',
          url: url,
        });
      }
    } else {
      files++;
      fileItems.push({
        label: m.fileName || url.split('/').pop() || 'Attachment file',
        url: url,
      });
    }
  }

  return {
    images,
    videos,
    audio,
    files,
    voice,
    imageUrls,
    videoItems,
    audioItems,
    fileItems,
    voiceItems,
    linkItems,
  };
}

function VoiceMessagePlayer({ msg, isMe }: { msg: any; isMe: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const duration = msg.media_duration || msg.duration || 14; // default to 14s
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handlePlayPause = () => {
    if (isPlaying) {
      clearInterval(intervalRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      const step = 0.1 / duration;
      intervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 1) {
            clearInterval(intervalRef.current);
            setIsPlaying(false);
            return 0;
          }
          return prev + step;
        });
      }, 100);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentSecs = Math.floor(progress * duration);

  // Mock waveform heights (15 bars)
  const waveformBars = [12, 18, 8, 24, 14, 28, 10, 16, 22, 12, 26, 8, 18, 14, 20];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', width: 220, paddingVertical: 4 }}>
      <TouchableOpacity
        onPress={handlePlayPause}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: isMe ? '#ffffff' : '#6c5ce7',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 10,
        }}
      >
        {isPlaying ? (
          <Pause size={14} color={isMe ? '#6c5ce7' : '#ffffff'} />
        ) : (
          <Play size={14} color={isMe ? '#6c5ce7' : '#ffffff'} style={{ marginLeft: 2 }} />
        )}
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        {/* Waveform Mockup */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2.5, height: 32, marginBottom: 2 }}>
          {waveformBars.map((barHeight, idx) => {
            const barProgress = idx / waveformBars.length;
            const isPlayed = progress >= barProgress;
            return (
              <View
                key={idx}
                style={{
                  width: 3,
                  height: barHeight,
                  borderRadius: 1.5,
                  backgroundColor: isMe
                    ? (isPlayed ? '#ffffff' : 'rgba(255,255,255,0.4)')
                    : (isPlayed ? '#6c5ce7' : 'rgba(108,92,231,0.2)'),
                }}
              />
            );
          })}
        </View>

        {/* Duration / Progress Text */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 10.5, color: isMe ? 'rgba(255,255,255,0.8)' : '#9a9aab', fontFamily: 'Poppins_400Regular' }}>
            {formatTime(currentSecs)}
          </Text>
          <Text style={{ fontSize: 10.5, color: isMe ? 'rgba(255,255,255,0.8)' : '#9a9aab', fontFamily: 'Poppins_400Regular' }}>
            {formatTime(duration)}
          </Text>
        </View>
      </View>
    </View>
  );
}
