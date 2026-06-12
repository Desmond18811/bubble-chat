import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, Phone, Video, Search, MoreVertical,
  Smile, Paperclip, Mic, Send, X, Mail, Briefcase,
  Camera, FileText, Image as ImageIcon,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { getChatById, sendMessage, subscribeToChats, Message } from '../../../lib/mockData';

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
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string; type: string; url?: string } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const chat = getChatById(id as string);

  useEffect(() => {
    if (!chat) return;
    setMessages([...chat.messages]);
    chat.unreadCount = 0;

    const unsubscribe = subscribeToChats(() => {
      const updated = getChatById(id as string);
      if (updated) {
        setMessages([...updated.messages]);
        updated.unreadCount = 0;
      }
    });
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, chat?.status]);

  if (!chat) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: INK, fontFamily: 'Poppins_600SemiBold', fontSize: 15 }}>Conversation not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16, backgroundColor: PURPLE, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14 }}>
          <Text style={{ color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 13 }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleSend = () => {
    let text = messageText.trim();
    if (selectedFile) {
      const icon = selectedFile.type === 'image' ? '🖼️' : selectedFile.type === 'video' ? '🎥' : '📄';
      const fileStr = `${icon} ${selectedFile.name} (${selectedFile.size})`;
      text = text ? `${fileStr}\n${text}` : fileStr;
    }
    if (!text) return;
    sendMessage(chat.id, text);
    setMessageText('');
    setSelectedFile(null);
    setIsAttachmentOpen(false);
    setIsEmojiOpen(false);
  };

  const statusLine = chat.status === 'typing'
    ? 'typing…'
    : chat.isOnline
    ? 'Online'
    : chat.isGroupChat
    ? `${chat.messages.length} messages`
    : 'Offline';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>

      {/* ── Header ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 14, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
        backgroundColor: '#ffffff',
      }}>
        {/* Back + Avatar + Name */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginRight: 4 }}>
            <ChevronLeft size={20} color={PURPLE} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsInfoOpen(true)}
            activeOpacity={0.75}
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}
          >
            <View style={{ position: 'relative', flexShrink: 0, marginRight: 10 }}>
              {chat.avatar ? (
                <Image source={{ uri: chat.avatar }} style={{ width: 40, height: 40, borderRadius: 12 }} />
              ) : (
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: PURPLE_SOFT, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: PURPLE, fontFamily: 'Poppins_700Bold', fontSize: 13 }}>{getInitials(chat.name)}</Text>
                </View>
              )}
              {chat.isOnline && (
                <View style={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: 99, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#ffffff' }} />
              )}
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: 15.5, fontFamily: 'Poppins_700Bold', color: INK, lineHeight: 20 }}>
                {chat.name}
              </Text>
              <Text style={{ fontSize: 11.5, fontFamily: 'Poppins_400Regular', color: chat.status === 'typing' ? PURPLE : INK_SOFT, marginTop: 1 }}>
                {statusLine}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Action Icons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <IconBtn icon={<Search size={18} color={PURPLE} />} />
          <IconBtn icon={<Phone size={18} color={PURPLE} />} />
          <IconBtn icon={<Video size={18} color={PURPLE} />} />
          <IconBtn icon={<MoreVertical size={18} color={PURPLE} />} onPress={() => setIsInfoOpen(true)} />
        </View>
      </View>

      {/* ── Messages + Input ── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Subtle lavender bg for chat area */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, backgroundColor: BG }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(msg => {
            const isMe = msg.sender === 'me';
            return (
              <View key={msg.id} style={{ marginBottom: 10, flexDirection: 'row', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                {/* Group chat sender avatar */}
                {!isMe && chat.isGroupChat && (
                  <View style={{ width: 24, height: 24, borderRadius: 99, backgroundColor: PURPLE_SOFT, alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 2, alignSelf: 'flex-end', flexShrink: 0 }}>
                    <Text style={{ color: PURPLE, fontFamily: 'Poppins_700Bold', fontSize: 8 }}>
                      {msg.senderName ? getInitials(msg.senderName) : 'U'}
                    </Text>
                  </View>
                )}

                <View style={{
                  maxWidth: '75%',
                  borderRadius: 18,
                  borderBottomRightRadius: isMe ? 4 : 18,
                  borderBottomLeftRadius: isMe ? 18 : 4,
                  paddingHorizontal: 14,
                  paddingTop: 10,
                  paddingBottom: 8,
                  backgroundColor: isMe ? PURPLE : '#ffffff',
                  shadowColor: isMe ? PURPLE : '#000',
                  shadowOpacity: isMe ? 0.2 : 0.04,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                }}>
                  {!isMe && chat.isGroupChat && msg.senderName && (
                    <Text style={{ fontSize: 10, fontFamily: 'Poppins_700Bold', color: PURPLE, marginBottom: 3 }}>
                      {msg.senderName}
                    </Text>
                  )}
                  <Text style={{ fontSize: 14.5, lineHeight: 22, fontFamily: 'Poppins_400Regular', color: isMe ? '#ffffff' : INK }}>
                    {msg.text}
                  </Text>
                  <Text style={{ fontSize: 9.5, fontFamily: 'Poppins_400Regular', marginTop: 4, textAlign: 'right', color: isMe ? 'rgba(255,255,255,0.65)' : INK_SOFT }}>
                    {msg.time}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Typing bubble */}
          {chat.status === 'typing' && (
            <View style={{ marginBottom: 10, flexDirection: 'row', justifyContent: 'flex-start' }}>
              <View style={{ borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}>
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <View key={i} style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: PURPLE_SOFT }} />
                  ))}
                  <Text style={{ fontSize: 12, color: PURPLE, fontFamily: 'Poppins_500Medium', marginLeft: 4 }}>typing…</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── Input Bar ── */}
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

          {/* ── Main Input Bar Row with Glow State ── */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            {/* Paperclip icon */}
            <TouchableOpacity
              onPress={() => {
                setIsAttachmentOpen(prev => !prev);
                setIsEmojiOpen(false);
              }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(108,92,231,0.07)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 8,
              }}
            >
              <Paperclip size={20} color={isAttachmentOpen ? PURPLE : INK_SOFT} />
            </TouchableOpacity>

            {/* Input Capsule with Shadow Glow */}
            <View style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              borderRadius: 22,
              borderWidth: 1,
              borderColor: 'rgba(108,92,231,0.15)',
              paddingHorizontal: 12,
              paddingVertical: Platform.OS === 'ios' ? 8 : 4,
              minHeight: 44,
              maxHeight: 120,
              // Shadow glow effect
              shadowColor: '#6c5ce7',
              shadowOpacity: 0.12,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 4,
            }}>
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 14.5,
                  fontFamily: 'Poppins_400Regular',
                  color: INK,
                  maxHeight: 100,
                  paddingTop: 0,
                  paddingBottom: 0,
                }}
                placeholder={selectedFile ? "Add a caption..." : "Type a message..."}
                placeholderTextColor={INK_SOFT}
                multiline
                value={messageText}
                onChangeText={setMessageText}
              />

              {/* Smile Emoji button */}
              <TouchableOpacity
                onPress={() => {
                  setIsEmojiOpen(prev => !prev);
                  setIsAttachmentOpen(false);
                }}
                style={{ padding: 6, marginLeft: 4 }}
              >
                <Smile size={20} color={isEmojiOpen ? PURPLE : INK_SOFT} />
              </TouchableOpacity>
            </View>

            {/* Send / Mic button */}
            {messageText.trim().length > 0 || selectedFile ? (
              <TouchableOpacity
                onPress={handleSend}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: PURPLE,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8,
                  // Send button glow shadow
                  shadowColor: PURPLE,
                  shadowOpacity: 0.35,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 5,
                }}
              >
                <Send size={18} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  sendMessage(chat.id, "🎤 [Voice Memo - 0:14]");
                }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: 'rgba(108,92,231,0.07)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8,
                }}
              >
                <Mic size={20} color={PURPLE} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

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
