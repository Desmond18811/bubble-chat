import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';

type ChatDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ChatDetail'
>;

type ChatDetailScreenRouteProp = RouteProp<RootStackParamList, 'ChatDetail'>;

interface Props {
  route: ChatDetailScreenRouteProp;
  navigation: ChatDetailScreenNavigationProp;
}

interface MessageItem {
  id: string;
  text: string;
  sender: 'user' | 'other';
  timestamp: string;
  avatar?: any;
  read?: boolean;
}

const MOCK_MESSAGES: MessageItem[] = [
  {
    id: '1',
    text: "Hey Guys!\nHow's the project going? 🎨",
    sender: 'other',
    timestamp: '12:32 PM',
    avatar: require('../../assets/avatars/other.png'),
  },
  {
    id: '2',
    text: "Pretty good, actually! Making solid progress — knocked out the main pieces and I'm ironing out a few details now. Still on track, just a couple small things left to tidy up.\n\nHow about you, anything new on your end?",
    sender: 'user',
    timestamp: '12:34 PM',
    read: true,
  },
  {
    id: '3',
    text: "Yeah, it's one of those \"almost there\" phases 🤪 You know everything works, now it's just polishing and double-checking so it doesn't bite me later.",
    sender: 'other',
    timestamp: '12:35 PM',
    avatar: require('../../assets/avatars/other.png'),
  },
  {
    id: '4',
    text: 'I\'m planning to wrap it up soon. What are you up to right now?',
    sender: 'other',
    timestamp: '12:35 PM',
    avatar: require('../../assets/avatars/other.png'),
  },
];

export default function ChatDetailScreen({ route, navigation }: Props) {
  const { chat } = route.params || {};
  const [messages, setMessages] = useState<MessageItem[]>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState('');

  const handleSendMessage = () => {
    if (inputText.trim()) {
      const newMessage: MessageItem = {
        id: (messages.length + 1).toString(),
        text: inputText,
        sender: 'user',
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        read: true,
      };
      setMessages([...messages, newMessage]);
      setInputText('');
    }
  };

  const renderMessage = ({ item }: { item: MessageItem }) => {
    const isMe = item.sender === 'user';
    return (
      <View
        className={`flex-row mb-3 items-end ${
          isMe ? 'justify-end' : 'justify-start'
        }`}
      >
        {!isMe && (
          <Image
            source={item.avatar}
            className="w-8 h-8 rounded-full bg-gray-100 mr-2"
          />
        )}
        <View
          className={`max-w-[76%] rounded-[20px] px-4 py-2.5 ${
            isMe ? 'bg-[#0066FF] rounded-br-none' : 'bg-gray-100 rounded-bl-none'
          }`}
        >
          <Text
            className={`text-[15px] leading-[20px] ${
              isMe ? 'text-white' : 'text-gray-950'
            }`}
          >
            {item.text}
          </Text>
          
          <View className="flex-row justify-end items-center mt-1">
            <Text
              className={`text-[10px] ${
                isMe ? 'text-white/70' : 'text-gray-400'
              }`}
            >
              {item.timestamp}
            </Text>
            {isMe && item.read && (
              <Feather name="check" size={12} color="#fff" style={{ marginLeft: 3 }} />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-3 py-2 border-b border-gray-100 justify-between">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            className="p-2 mr-1"
            onPress={() => navigation.goBack()}
          >
            <Feather name="chevron-left" size={24} color="#000" />
          </TouchableOpacity>
          <View className="justify-center">
            <Text className="text-[16px] font-bold text-gray-950" numberOfLines={1}>
              {chat?.name || 'Project 1 Chat'}
            </Text>
            <Text className="text-[12px] text-green-600 font-semibold mt-0.5">
              🟢 2 People Active
            </Text>
          </View>
        </View>
        
        <View className="flex-row items-center gap-1">
          <TouchableOpacity className="p-2">
            <Feather name="video" size={20} color="#0066FF" />
          </TouchableOpacity>
          <TouchableOpacity className="p-2">
            <Feather name="more-vertical" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Indicator */}
      <View className="align-center items-center py-2.5">
        <Text className="text-[11px] font-medium text-gray-400">Today, 12 September</Text>
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16 }}
        scrollEnabled={true}
      />

      {/* Attachment Pills Menu */}
      <View className="flex-row justify-between px-4 py-3 bg-gray-50/50 border-t border-gray-100">
        <TouchableOpacity className="flex-row items-center bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm active:opacity-70">
          <Feather name="folder" size={15} color="#0066FF" className="mr-1.5" />
          <Text className="text-xs font-bold text-gray-600">Files</Text>
        </TouchableOpacity>
        
        <TouchableOpacity className="flex-row items-center bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm active:opacity-70">
          <Feather name="image" size={15} color="#0066FF" className="mr-1.5" />
          <Text className="text-xs font-bold text-gray-600">Images</Text>
        </TouchableOpacity>
        
        <TouchableOpacity className="flex-row items-center bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm active:opacity-70">
          <Feather name="volume-2" size={15} color="#0066FF" className="mr-1.5" />
          <Text className="text-xs font-bold text-gray-600">Audio</Text>
        </TouchableOpacity>
        
        <TouchableOpacity className="flex-row items-center bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm active:opacity-70">
          <Feather name="video" size={15} color="#0066FF" className="mr-1.5" />
          <Text className="text-xs font-bold text-gray-600">Video</Text>
        </TouchableOpacity>
      </View>

      {/* Input controls */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="px-3 py-2 bg-white"
      >
        <View className="flex-row items-center bg-gray-50 border border-gray-200/60 rounded-full px-4 py-1.5">
          <TextInput
            placeholder="Type message..."
            placeholderTextColor="#9ca3af"
            value={inputText}
            onChangeText={setInputText}
            multiline
            className="flex-1 text-[15px] text-gray-900 mr-2 py-1 max-h-[100px]"
          />
          <TouchableOpacity
            className="w-9 h-9 rounded-full bg-[#0066FF] justify-center items-center active:scale-95"
            onPress={handleSendMessage}
            activeOpacity={0.8}
          >
            <Feather name="send" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
