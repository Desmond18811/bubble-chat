import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, Modal, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, Phone, Video, Search, MoreVertical,
  Smile, Paperclip, Mic, Send, X, Mail, Briefcase,
  Camera, FileText, Image as ImageIcon,
  Info, Sparkles, BellOff, EyeOff, Archive, Trash2,
  Copy, Pin, Edit2, Check, CheckCheck,
  MicOff, PhoneOff, Volume2,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { Message } from '../../../lib/mockData';
import { chatCache } from '../../../lib/chatCache';
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
} from '../../../lib/api';

const PURPLE = '#6c5ce7';
const INK = '#1f2030';
const INK_SOFT = '#9a9aab';
const BG = '#f8f7ff';
const PURPLE_SOFT = 'rgba(108,92,231,0.10)';

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
  const scrollViewRef = useRef<ScrollView>(null);

  // Call state
  const [activeCall, setActiveCall] = useState<{ user: any; type: 'voice' | 'video' } | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallMuted, setIsCallMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  // Aida Suggestions state
  const [aidaSuggestions, setAidaSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let timer: any;
    if (activeCall) {
      setCallDuration(0);
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeCall]);

  const handleStartCall = (type: 'voice' | 'video') => {
    setActiveCall({ user: chat, type });
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        await sendTextMessage(chat.id, text);
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
                  {chat.avatar && !chat.isGroupChat ? (
                    <Image source={{ uri: chat.avatar }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                  ) : (
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: chat.isGroupChat ? '#000000' : PURPLE_SOFT, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: chat.isGroupChat ? '#ffffff' : PURPLE, fontFamily: 'Poppins_700Bold', fontSize: 13 }}>
                        {chat.isGroupChat ? getGroupInitials(chat.name) : getInitials(chat.name)}
                      </Text>
                    </View>
                  )}
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
                    {chat.status === 'typing' ? 'typing…' : chat.isOnline ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Action Icons */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <IconBtn icon={<Search size={18} color={INK_SOFT} />} onPress={() => setIsSearching(true)} />
              <IconBtn icon={<Phone size={18} color={INK_SOFT} />} onPress={() => handleStartCall('voice')} />
              <IconBtn icon={<Video size={18} color={INK_SOFT} />} onPress={() => handleStartCall('video')} />
              <IconBtn icon={<Info size={18} color={INK_SOFT} />} onPress={() => setIsInfoOpen(true)} />
              <IconBtn icon={<MoreVertical size={18} color={INK_SOFT} />} onPress={() => setIsMenuOpen(prev => !prev)} />
            </View>
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

            const msg = item.data;
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
                  <View style={{ width: 28, height: 28, borderRadius: 14, overflow: 'hidden', marginRight: 8, marginBottom: 2, alignSelf: 'flex-end', flexShrink: 0, backgroundColor: PURPLE_SOFT, alignItems: 'center', justifyContent: 'center' }}>
                    {chat.avatar ? (
                      <Image source={{ uri: chat.avatar }} style={{ width: 28, height: 28 }} />
                    ) : (
                      <Text style={{ color: PURPLE, fontFamily: 'Poppins_700Bold', fontSize: 9 }}>
                        {msg.senderName ? getInitials(msg.senderName) : getInitials(chat.name)}
                      </Text>
                    )}
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
                    <Text style={{ fontSize: 14, lineHeight: 20, fontFamily: 'Poppins_400Regular', color: isMe ? '#ffffff' : INK }}>
                      {msg.text}
                    </Text>

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
                        {msg.reactions.map((emoji, idx) => (
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
                      msg.isRead ? (
                        <CheckCheck size={11} color="#38bdf8" style={{ marginLeft: 4 }} />
                      ) : (
                        <Check size={11} color={INK_SOFT} style={{ marginLeft: 4 }} />
                      )
                    )}
                  </View>
                </View>

                {/* Right (Sent) message avatar */}
                {isMe && (
                  <View style={{ width: 28, height: 28, borderRadius: 14, overflow: 'hidden', marginLeft: 8, marginBottom: 2, alignSelf: 'flex-end', flexShrink: 0, backgroundColor: PURPLE_SOFT, alignItems: 'center', justifyContent: 'center' }}>
                    <Image source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop' }} style={{ width: 28, height: 28 }} />
                  </View>
                )}
              </View>
            );
          })}

          {/* Typing bubble */}
          {chat.status === 'typing' && (
            <View style={{ marginBottom: 10, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-end' }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, overflow: 'hidden', marginRight: 8, marginBottom: 2, alignSelf: 'flex-end', flexShrink: 0, backgroundColor: PURPLE_SOFT, alignItems: 'center', justifyContent: 'center' }}>
                {chat.avatar ? (
                  <Image source={{ uri: chat.avatar }} style={{ width: 28, height: 28 }} />
                ) : (
                  <Text style={{ color: PURPLE, fontFamily: 'Poppins_700Bold', fontSize: 9 }}>
                    {getInitials(chat.name)}
                  </Text>
                )}
              </View>
              <View style={{ borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#f1f2f6' }}>
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <View key={i} style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: INK_SOFT }} />
                  ))}
                  <Text style={{ fontSize: 12, color: INK_SOFT, fontFamily: 'Poppins_500Medium', marginLeft: 4 }}>typing…</Text>
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
                  onChangeText={setMessageText}
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
                    onPress={async () => {
                      try {
                        await sendTextMessage(chat.id, "🎤 [Voice Memo - 0:14]");
                        await syncChatAndMessages();
                      } catch (err: any) {
                        Alert.alert("Error", err.message || "Failed to send voice memo.");
                      }
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
              <View style={{ width: 76, height: 76, borderRadius: 22, overflow: 'hidden', backgroundColor: PURPLE_SOFT, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                {chat.avatar ? (
                  <Image source={{ uri: chat.avatar }} style={{ width: 76, height: 76 }} />
                ) : (
                  <Text style={{ color: PURPLE, fontFamily: 'Poppins_700Bold', fontSize: 24 }}>{getInitials(chat.name)}</Text>
                )}
              </View>
              <Text style={{ fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', color: INK, textAlign: 'center' }}>{chat.name}</Text>
              <Text style={{ fontSize: 13.5, fontFamily: 'Poppins_700Bold', color: PURPLE, marginTop: 4 }}>
                @{chat.isGroupChat ? 'group_' + chat.name.toLowerCase().replace(/\s/g, '_') : chat.name.toLowerCase().replace(/\s/g, '_')}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'Poppins_400Regular', color: INK_SOFT, textAlign: 'center', marginTop: 10, lineHeight: 20, paddingHorizontal: 10 }}>
                {chat.bio}
              </Text>
            </View>

            {/* Info Cards */}
            <InfoCard icon={<Mail size={19} color={PURPLE} />} label="Email Address" value={chat.email} />
            {!chat.isGroupChat && <InfoCard icon={<Phone size={19} color={PURPLE} />} label="Phone Number" value={chat.phone} />}
            <InfoCard icon={<Briefcase size={19} color={PURPLE} />} label="Organization & Role" value={`${chat.organization} · ${chat.org_role}`} />

            <TouchableOpacity
              onPress={() => setIsInfoOpen(false)}
              style={{ marginTop: 28, backgroundColor: PURPLE, paddingVertical: 16, borderRadius: 18, alignItems: 'center', shadowColor: PURPLE, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5, marginBottom: 32 }}
            >
              <Text style={{ color: '#ffffff', fontFamily: 'Poppins_700Bold', fontSize: 14 }}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Call Overlay Modal ── */}
      <Modal visible={activeCall !== null} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#1f2030' }} className="items-center justify-between py-16 px-6">
          {/* Header */}
          <View className="items-center mt-8">
            <Text className="text-white/60 text-xs font-bold font-sans uppercase tracking-widest mb-2">
              BUBBLE {activeCall?.type === 'video' ? 'VIDEO CALL' : 'VOICE CALL'}
            </Text>
            <Text className="text-white text-2xl font-bold font-sans mt-2">
              {activeCall?.user?.name || 'Unknown Colleague'}
            </Text>
            <Text className="text-[#6c5ce7] text-sm font-semibold font-sans mt-2">
              {callDuration === 0 ? 'Ringing...' : `Connected • ${formatDuration(callDuration)}`}
            </Text>
          </View>

          {/* Avatar / Video Preview area */}
          <View className="items-center justify-center my-8">
            {activeCall?.type === 'video' ? (
              <View style={{ width: 220, height: 320, borderRadius: 28, backgroundColor: '#000', overflow: 'hidden' }} className="relative shadow-2xl">
                {activeCall?.user?.avatar ? (
                  <Image source={{ uri: activeCall.user.avatar }} style={{ width: '100%', height: '100%', opacity: 0.8 }} />
                ) : (
                  <View className="flex-1 items-center justify-center bg-purple/20">
                    <Text className="text-white text-5xl font-bold font-sans">
                      {getInitials(activeCall?.user?.name || 'UC')}
                    </Text>
                  </View>
                )}
                {/* Small Self Video Preview overlay */}
                <View style={{ position: 'absolute', bottom: 16, right: 16, width: 70, height: 100, borderRadius: 12, backgroundColor: '#2d3748', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
                  <View className="flex-1 items-center justify-center bg-purple/40">
                    <Text className="text-white/80 text-[10px] font-bold">You</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(108,92,231,0.15)', borderWidth: 4, borderColor: '#6c5ce7' }} className="items-center justify-center shadow-lg">
                {activeCall?.user?.avatar ? (
                  <Image source={{ uri: activeCall.user.avatar }} style={{ width: 132, height: 132, borderRadius: 66 }} />
                ) : (
                  <Text className="text-white text-4xl font-bold font-sans">
                    {getInitials(activeCall?.user?.name || 'UC')}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Action buttons */}
          <View className="w-full flex-row justify-around items-center px-4 mb-4">
            <TouchableOpacity 
              onPress={() => setIsCallMuted(!isCallMuted)}
              style={{ backgroundColor: isCallMuted ? '#6c5ce7' : 'rgba(255,255,255,0.08)' }} 
              className="w-14 h-14 rounded-full items-center justify-center"
            >
              <MicOff color={isCallMuted ? '#fff' : '#9a9aab'} size={22} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setActiveCall(null)}
              className="w-16 h-16 rounded-full bg-red-500 items-center justify-center shadow-lg shadow-red-500/30"
            >
              <PhoneOff color="#fff" size={24} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setIsSpeakerOn(!isSpeakerOn)}
              style={{ backgroundColor: isSpeakerOn ? '#6c5ce7' : 'rgba(255,255,255,0.08)' }} 
              className="w-14 h-14 rounded-full items-center justify-center"
            >
              <Volume2 color={isSpeakerOn ? '#fff' : '#9a9aab'} size={22} />
            </TouchableOpacity>
          </View>
        </View>
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
