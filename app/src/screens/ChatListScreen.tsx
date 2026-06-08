import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { LinearGradient } from 'expo-linear-gradient';

type ChatListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ChatList'
>;

interface Props {
  navigation: ChatListScreenNavigationProp;
}

interface StoryItem {
  id: string;
  name: string;
  avatar: any;
  hasStory: boolean;
  unreadCount?: number;
}

interface ChatItem {
  id: string;
  name: string;
  avatar: any;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  pinned: boolean;
  sentByMe?: boolean;
  read?: boolean;
}

const MOCK_STORIES: StoryItem[] = [
  { id: 'you', name: 'You', avatar: require('../../assets/avatars/you.png'), hasStory: false },
  { id: '1', name: 'Lisa', avatar: require('../../assets/avatars/lisa.png'), hasStory: true, unreadCount: 3 },
  { id: '2', name: 'Nya', avatar: require('../../assets/avatars/nya.png'), hasStory: true, unreadCount: 1 },
  { id: '3', name: 'Lucas', avatar: require('../../assets/avatars/lucas.png'), hasStory: true, unreadCount: 2 },
  { id: '4', name: 'Joe', avatar: require('../../assets/avatars/joe.png'), hasStory: false },
];

const MOCK_CHATS: ChatItem[] = [
  {
    id: '1',
    name: 'Nick P.',
    avatar: require('../../assets/avatars/nick.png'),
    lastMessage: 'Yeah, Sunday will be great',
    timestamp: '20min',
    unreadCount: 3,
    pinned: true,
  },
  {
    id: '2',
    name: 'Project 1 Chat',
    avatar: require('../../assets/avatars/group1.png'),
    lastMessage: "You: I've to take another look before...",
    timestamp: '2min',
    unreadCount: 0,
    pinned: true,
  },
  {
    id: '3',
    name: 'Noah K.',
    avatar: require('../../assets/avatars/noah.png'),
    lastMessage: 'Thanks Noah, see ya later',
    timestamp: '12min',
    pinned: false,
    sentByMe: true,
    read: true,
  },
  {
    id: '4',
    name: 'Maya P. Lisa K. Nya R.',
    avatar: require('../../assets/avatars/group2.png'),
    lastMessage: 'Lisa: Sure hahaha',
    timestamp: '15min',
    pinned: false,
  },
  {
    id: '5',
    name: 'Sofia B.',
    avatar: require('../../assets/avatars/sofia.png'),
    lastMessage: "I'll be there in 5 min",
    timestamp: '18min',
    unreadCount: 1,
    pinned: false,
  },
  {
    id: '6',
    name: 'Malik Z.',
    avatar: require('../../assets/avatars/other.png'),
    lastMessage: 'Why would you do that?',
    timestamp: '20min',
    pinned: false,
  },
];

const TAB_OPTIONS = ['All', 'Favorites', 'Work', 'Groups', 'Communities'];

export default function ChatListScreen({ navigation }: Props) {
  const [selectedTab, setSelectedTab] = useState('All');

  const renderStoryItem = (item: StoryItem) => (
    <TouchableOpacity
      key={item.id}
      className="items-center mr-4 relative"
      activeOpacity={0.7}
    >
      {item.id === 'you' ? (
        <View className="w-14 h-14 rounded-full border-2 border-dashed border-gray-300 justify-center items-center bg-gray-50 mb-2">
          <Feather name="plus" size={20} color="#0066FF" />
        </View>
      ) : (
        <View className="relative mb-2">
          <View
            className={`w-14 h-14 rounded-full p-[2px] justify-center items-center bg-white ${
              item.hasStory ? 'border-2 border-[#0066FF]' : 'border border-gray-200'
            }`}
          >
            <Image source={item.avatar} className="w-full h-full rounded-full bg-gray-100" />
          </View>
          {item.unreadCount !== undefined && item.unreadCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-gray-300 border border-white rounded-full px-1.5 py-0.5 justify-center items-center min-w-[18px]">
              <Text className="text-[10px] font-bold text-gray-800">{item.unreadCount}</Text>
            </View>
          )}
        </View>
      )}
      <Text className="text-xs text-gray-600 text-center font-medium max-w-[64px]" numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderChatItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity
      className="flex-row items-center px-4 py-3 border-b border-gray-50"
      onPress={() => navigation.navigate('ChatDetail', { chat: item })}
      activeOpacity={0.7}
    >
      <Image source={item.avatar} className="w-14 h-14 rounded-full bg-gray-100 mr-3.5" />
      
      <View className="flex-1 justify-center">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-[16px] font-bold text-gray-950" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-xs text-gray-400 font-medium">{item.timestamp}</Text>
        </View>
        
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center flex-1 mr-4">
            {item.sentByMe && (
              <View className="flex-row mr-1">
                <Feather 
                  name={item.read ? "check" : "check"} 
                  size={14} 
                  color={item.read ? "#0066FF" : "#9ca3af"} 
                />
                {item.read && (
                  <Feather 
                    name="check" 
                    size={14} 
                    color="#0066FF" 
                    style={{ marginLeft: -8 }} 
                  />
                )}
              </View>
            )}
            <Text className="text-[14px] text-gray-500 font-medium flex-1" numberOfLines={1}>
              {item.lastMessage}
            </Text>
          </View>
          
          <View className="flex-row items-center gap-1.5">
            {item.pinned && (
              <Ionicons name="pin" size={14} color="#0066FF" style={{ transform: [{ rotate: '45deg' }] }} />
            )}
            {item.unreadCount !== undefined && item.unreadCount > 0 && (
              <View className="bg-[#0066FF] rounded-full px-1.5 py-0.5 justify-center items-center min-w-[20px]">
                <Text className="text-[11px] font-bold text-white">{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white relative" edges={['top']}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3">
        <Text className="text-3xl font-extrabold text-black tracking-tight">Chats</Text>
        <View className="flex-row gap-2">
          <TouchableOpacity className="p-2 rounded-full bg-gray-50">
            <Feather name="search" size={20} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity className="p-2 rounded-full bg-gray-50">
            <Feather name="camera" size={20} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity className="p-2 rounded-full bg-gray-50">
            <Feather name="more-vertical" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stories */}
      <View className="mb-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {MOCK_STORIES.map(renderStoryItem)}
        </ScrollView>
      </View>

      {/* Tabs */}
      <View className="mb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {TAB_OPTIONS.map((tab) => {
            const isActive = selectedTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                className={`px-4 py-2 rounded-full mr-2 ${
                  isActive ? 'bg-[#0066FF]' : 'bg-gray-100'
                }`}
                onPress={() => setSelectedTab(tab)}
              >
                <Text
                  className={`text-[13px] font-bold ${
                    isActive ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Chat List */}
      <View className="flex-1 relative">
        <FlatList
          data={MOCK_CHATS}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={true}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
        
        {/* Bottom Blur/Fade-out Overlay */}
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.75)', 'rgba(255,255,255,1)']}
          className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
        />
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity 
        className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-gray-100 border border-gray-200 justify-center items-center shadow-md active:scale-95"
        style={{ elevation: 5 }}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={24} color="#000" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
