import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Phone, Video, Search, MoreVertical, Smile, Paperclip, Mic, Send } from 'lucide-react-native';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState('');

  // Dummy chat data
  const chatName = id === '1' ? 'Design Team' : 'Alex Rivera';
  const isOnline = id !== '1';
  
  const dummyMessages = [
    { id: '1', text: 'Hey team, how is the new design coming along?', sender: 'other', time: '10:00 AM' },
    { id: '2', text: 'Almost done, just finishing up the mobile views.', sender: 'me', time: '10:05 AM' },
    { id: '3', text: 'Great! Let me know if you need any assets.', sender: 'other', time: '10:10 AM' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-black/5">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <ChevronLeft color="#1f2030" size={24} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[17px] font-bold text-ink" numberOfLines={1}>{chatName}</Text>
            {isOnline ? (
              <Text className="text-xs text-green-500 font-semibold">Online</Text>
            ) : (
              <Text className="text-xs text-ink-soft">2 members • 1 online</Text>
            )}
          </View>
        </View>
        
        <View className="flex-row items-center gap-4">
          <TouchableOpacity>
            <Search color="#9a9aab" size={20} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Phone color="#6c5ce7" size={20} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Video color="#6c5ce7" size={20} />
          </TouchableOpacity>
          <TouchableOpacity>
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
    </SafeAreaView>
  );
}
