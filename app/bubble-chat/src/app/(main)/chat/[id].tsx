import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Phone, Video, Search, MoreVertical, Smile, Paperclip, Mic, Send, X, User, Mail, Briefcase } from 'lucide-react-native';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Mock User details (corresponding to the chat ID)
  const isGroup = id === '1';
  const chatName = isGroup ? 'Design Team' : 'Alex Rivera';
  const avatarUrl = isGroup ? null : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop';
  const username = isGroup ? 'design_team' : 'alex_rivera';
  const bio = isGroup 
    ? 'Official collaborative space for the Bubblespace product and UI design team.'
    : 'Product Designer at Bubblespace. Love crafting sweet interfaces.';
  const email = isGroup ? 'design@bubblespace.co' : 'alex.rivera@bubblespace.co';
  const phone = isGroup ? 'N/A' : '+1 (555) 019-2834';
  const isOnline = !isGroup;

  const dummyMessages = [
    { id: '1', text: 'Hey team, how is the new design coming along?', sender: 'other', time: '10:00 AM' },
    { id: '2', text: 'Almost done, just finishing up the mobile views.', sender: 'me', time: '10:05 AM' },
    { id: '3', text: 'Great! Let me know if you need any assets.', sender: 'other', time: '10:10 AM' },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-black/5">
        <View className="flex-row items-center flex-1 min-w-0">
          <TouchableOpacity onPress={() => router.back()} className="mr-2 p-1">
            <ChevronLeft color="#1f2030" size={24} />
          </TouchableOpacity>
          
          {/* Clickable Header Info Area */}
          <TouchableOpacity 
            onPress={() => setIsInfoOpen(true)}
            className="flex-row items-center flex-1 min-w-0"
            activeOpacity={0.7}
          >
            {avatarUrl ? (
              <View className="relative shrink-0 mr-3">
                <View className="w-10 h-10 rounded-xl overflow-hidden bg-purple-soft">
                  <Text className="hidden" /> {/* Fallback space */}
                  {/* Avatar Image */}
                  <View style={{ width: 40, height: 40, backgroundColor: '#eae7fa' }}>
                    <Text className="text-purple font-bold text-center mt-2">{getInitials(chatName)}</Text>
                  </View>
                </View>
                {isOnline && (
                  <View className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-green-500" />
                )}
              </View>
            ) : (
              <View className="size-10 rounded-xl bg-purple/10 items-center justify-center mr-3 shrink-0">
                <Text className="text-purple font-bold text-sm">
                  {getInitials(chatName)}
                </Text>
              </View>
            )}
            <View className="flex-1 min-w-0">
              <Text className="text-[16px] font-bold text-ink leading-tight" numberOfLines={1}>
                {chatName}
              </Text>
              <Text className="text-[11px] text-ink-soft mt-0.5">
                {isOnline ? 'Online' : isGroup ? '2 members' : 'Offline'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Actions aligned on the same horizontal line */}
        <View className="flex-row items-center gap-4 shrink-0">
          <TouchableOpacity className="p-1">
            <Search color="#9a9aab" size={20} />
          </TouchableOpacity>
          <TouchableOpacity className="p-1">
            <Phone color="#6c5ce7" size={20} />
          </TouchableOpacity>
          <TouchableOpacity className="p-1">
            <Video color="#6c5ce7" size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsInfoOpen(true)} className="p-1">
            <MoreVertical color="#9a9aab" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Message List */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ paddingBottom: 20 }}>
          {dummyMessages.map(msg => {
            const isMe = msg.sender === 'me';
            return (
              <View key={msg.id} className={`mb-4 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
                <View className={`max-w-[80%] rounded-2xl p-3 ${isMe ? 'bg-purple rounded-br-sm' : 'bg-purple-soft/50 rounded-bl-sm'}`}>
                  <Text className={`text-[15px] ${isMe ? 'text-white' : 'text-ink'}`}>{msg.text}</Text>
                  <Text className={`text-[10px] mt-1 text-right ${isMe ? 'text-white/70' : 'text-ink-soft'}`}>{msg.time}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Input Area */}
        <View className="px-4 py-3 border-t border-black/5 bg-white flex-row items-end">
          <TouchableOpacity className="p-2 mr-1">
            <Paperclip color="#9a9aab" size={20} />
          </TouchableOpacity>
          
          <View className="flex-1 flex-row items-center bg-purple-soft/30 rounded-2xl px-3 py-2 min-h-[44px] max-h-[120px]">
            <TouchableOpacity className="mr-2">
              <Smile color="#9a9aab" size={20} />
            </TouchableOpacity>
            <TextInput
              className="flex-1 text-[15px] text-ink pt-0 pb-0"
              placeholder="Type a message..."
              placeholderTextColor="#9a9aab"
              multiline
              value={message}
              onChangeText={setMessage}
            />
          </View>

          {message.trim().length > 0 ? (
            <TouchableOpacity className="w-11 h-11 bg-purple rounded-full items-center justify-center ml-2 shadow-sm">
              <Send color="#fff" size={18} className="ml-1" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity className="p-3 ml-1">
              <Mic color="#6c5ce7" size={22} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Information Section Modal (White Background) */}
      <Modal visible={isInfoOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
          {/* Info Modal Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-black/5">
            <View>
              <Text className="text-xl font-bold text-ink">Information</Text>
              <Text className="text-xs text-ink-soft">{isGroup ? 'Group Details' : 'Contact Details'}</Text>
            </View>
            <TouchableOpacity onPress={() => setIsInfoOpen(false)} className="p-1">
              <X color="#1f2030" size={24} />
            </TouchableOpacity>
          </View>
          
          <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
            {/* Centered User/Group Info */}
            <View className="items-center bg-purple-soft/20 rounded-3xl p-6 border border-black/5 shadow-sm mb-6">
              <View className="w-20 h-20 rounded-3xl bg-purple/10 items-center justify-center mb-4 border border-purple/5 shadow-sm">
                {isGroup ? (
                  <Text className="text-purple font-bold text-2xl">{getInitials(chatName)}</Text>
                ) : (
                  <User color="#6c5ce7" size={36} />
                )}
              </View>
              <Text className="text-[20px] font-bold text-ink text-center leading-tight">{chatName}</Text>
              <Text className="text-[14px] font-bold text-purple mt-1">@{username}</Text>
              <Text className="text-[13px] text-ink-soft text-center mt-3 leading-relaxed px-4">{bio}</Text>
            </View>

            {/* Detailed Cards */}
            <View className="space-y-4">
              <View className="flex-row items-center bg-purple-soft/10 p-4 rounded-2xl border border-black/5 mb-3">
                <Mail color="#6c5ce7" size={20} />
                <View className="ml-3 flex-1">
                  <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">Email Address</Text>
                  <Text className="text-sm font-semibold text-ink mt-0.5">{email}</Text>
                </View>
              </View>

              {!isGroup && (
                <View className="flex-row items-center bg-purple-soft/10 p-4 rounded-2xl border border-black/5 mb-3">
                  <Phone color="#6c5ce7" size={20} />
                  <View className="ml-3 flex-1">
                    <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">Phone Number</Text>
                    <Text className="text-sm font-semibold text-ink mt-0.5">{phone}</Text>
                  </View>
                </View>
              )}

              <View className="flex-row items-center bg-purple-soft/10 p-4 rounded-2xl border border-black/5">
                <Briefcase color="#6c5ce7" size={20} />
                <View className="ml-3 flex-1">
                  <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">Organization</Text>
                  <Text className="text-sm font-semibold text-ink mt-0.5">Bubblespace (Staff)</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              onPress={() => setIsInfoOpen(false)}
              className="mt-8 bg-purple py-4 rounded-2xl items-center shadow-md shadow-purple/20 mb-8"
            >
              <Text className="text-white font-bold text-sm">Close Information</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
