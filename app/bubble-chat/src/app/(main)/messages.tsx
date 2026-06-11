import React, { useState } from "react";
import { Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView } from "react-native";
import { Link } from "expo-router";
import { Search, Plus, Pin, BellOff, MessageSquare, Check, CheckCheck } from "lucide-react-native";
import { Image } from "expo-image";

const MOCK_CHATS = [
  {
    id: "1",
    name: "Design Team",
    avatar: null,
    isGroupChat: true,
    latestMessage: "Let's review the mobile splash screens",
    time: "10:42 AM",
    unreadCount: 3,
    isPinned: true,
    isOnline: false,
    typingUser: null,
    status: "read_own"
  },
  {
    id: "2",
    name: "Alex Rivera",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop",
    isGroupChat: false,
    latestMessage: "🎤 Voice message (0:14)",
    time: "10:15 AM",
    unreadCount: 0,
    isPinned: true,
    isOnline: true,
    typingUser: null,
    status: "unread_other"
  },
  {
    id: "9",
    name: "Company Announcements",
    avatar: null,
    isGroupChat: true,
    latestMessage: "📢 Welcome our 50 new employee additions!",
    time: "9:30 AM",
    unreadCount: 0,
    isPinned: true,
    isMuted: true,
    isOnline: false,
    typingUser: null,
    status: "read_own"
  },
  {
    id: "3",
    name: "Product Sync",
    avatar: null,
    isGroupChat: true,
    latestMessage: null,
    time: "Yesterday",
    unreadCount: 0,
    isPinned: false,
    isOnline: false,
    typingUser: { name: "Alice", username: "alice" },
    status: "typing"
  },
  {
    id: "4",
    name: "Sarah Chen",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop",
    isGroupChat: false,
    time: "Yesterday",
    latestMessage: "Are we still on for the 2 PM meeting?",
    unreadCount: 1,
    isPinned: false,
    isOnline: true,
    typingUser: null,
    status: "unread_other"
  },
  {
    id: "8",
    name: "David Kim",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop",
    isGroupChat: false,
    time: "Monday",
    latestMessage: "Sounds good. Let's catch up later today.",
    unreadCount: 0,
    isPinned: false,
    isOnline: true,
    typingUser: null,
    status: "delivered"
  },
  {
    id: "5",
    name: "Marketing HQ",
    avatar: null,
    isGroupChat: true,
    latestMessage: "New campaign launch plan draft uploaded",
    time: "Monday",
    unreadCount: 0,
    isPinned: false,
    isOnline: false,
    typingUser: null,
    status: "read_other_all"
  },
  {
    id: "6",
    name: "Development Sync",
    avatar: null,
    isGroupChat: true,
    latestMessage: "Vite build runs successfully on staging",
    time: "May 31",
    unreadCount: 0,
    isPinned: false,
    isOnline: false,
    typingUser: null,
    status: "read_other_all"
  },
  {
    id: "7",
    name: "Emma Watson",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop",
    isGroupChat: false,
    time: "May 30",
    latestMessage: "Thanks for the feedback!",
    unreadCount: 0,
    isPinned: false,
    isOnline: false,
    typingUser: null,
    status: "read_other_all"
  },
  {
    id: "10",
    name: "General Channel",
    avatar: null,
    isGroupChat: true,
    latestMessage: "Floating in a delightful place 🫧",
    time: "May 28",
    unreadCount: 0,
    isPinned: false,
    isOnline: false,
    typingUser: null,
    status: "read_other_all"
  }
];

const MOCK_CONTACTS = [
  { id: "101", name: "Emily Watson", avatar: null, isOnline: false },
  { id: "102", name: "Marcus Johnson", avatar: null, isOnline: true },
  { id: "103", name: "Helena Rostova", avatar: null, isOnline: true },
  { id: "104", name: "Tyler Durden", avatar: null, isOnline: false }
];

export default function Messages() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const FILTERS = ["All", "Unread", "Friends", "Work", "Archive"];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const filteredChats = MOCK_CHATS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredContacts = MOCK_CONTACTS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
        <Text className="text-2xl font-extrabold text-purple tracking-tight">
          Messages
        </Text>
        <TouchableOpacity className="flex-row items-center rounded-full bg-purple/10 px-4 py-2">
          <Plus className="size-4 text-purple mr-1" />
          <Text className="text-xs font-bold text-purple">New Group</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View className="px-6 py-2">
        <View className="flex-row items-center rounded-3xl bg-purple/10 border border-purple/5 px-4 py-3">
          <Search className="size-5 text-purple mr-2" />
          <TextInput
            placeholder="Search conversations..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="rgba(108,92,231,0.4)"
            className="flex-1 text-[15px] text-ink font-medium"
          />
        </View>
      </View>

      <View className="px-6 pb-2 pt-1">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row overflow-visible">
          {FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              className={`mr-2 px-4 py-1.5 rounded-full border transition-colors ${
                activeFilter === filter
                  ? "bg-purple border-purple"
                  : "bg-transparent border-purple/10"
              }`}
            >
              <Text
                className={`text-[13px] font-semibold ${
                  activeFilter === filter ? "text-white" : "text-ink-soft"
                }`}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView className="flex-1 px-4 mt-2" showsVerticalScrollIndicator={false}>
        {/* Recent Messages Section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between px-2 mb-3">
            <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">
              RECENT MESSAGES
            </Text>
            <View className="flex-1 h-[1px] bg-black/5 ml-3" />
          </View>

          {filteredChats.map((chat) => (
            <Link href={`/chat/${chat.id}`} key={chat.id} asChild>
              <TouchableOpacity
                activeOpacity={0.7}
                className="flex-row items-center rounded-[24px] px-3 py-3 mb-1 active:bg-purple/5"
              >
                {/* Avatar */}
                <View className="relative shrink-0">
                  {chat.avatar ? (
                    <Image
                      source={{ uri: chat.avatar }}
                      className="size-[52px] rounded-2xl"
                    />
                  ) : (
                    <View className="size-[52px] rounded-2xl bg-purple/10 items-center justify-center">
                      <Text className="text-purple font-bold text-xl">
                        {getInitials(chat.name)}
                      </Text>
                    </View>
                  )}
                  {chat.isOnline && (
                    <View className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white bg-green-500 shadow-sm" />
                  )}
                </View>

                {/* Chat details */}
                <View className="flex-1 min-w-0 ml-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[15px] font-semibold text-ink flex-row items-center truncate max-w-[70%]">
                      {chat.isPinned && <Pin className="size-3 text-purple mr-1 fill-purple" />}
                      {chat.name}
                    </Text>
                    <Text className="text-xs text-ink-soft font-semibold">{chat.time}</Text>
                  </View>

                  <View className="mt-1 flex-row items-center justify-between">
                    {chat.typingUser ? (
                      <Text className="text-[13px] text-purple font-semibold">
                        @{chat.typingUser.username} is typing…
                      </Text>
                    ) : (
                      <View className="flex-row items-center flex-1 min-w-0 pr-4">
                        {chat.status === "delivered" && (
                          <Check className="size-3.5 text-black/20 mr-1" />
                        )}
                        {chat.status === "read_other_all" && (
                          <CheckCheck className="size-3.5 text-purple mr-1" />
                        )}
                        <Text className="text-[13px] text-black/50 truncate" numberOfLines={1}>
                          {chat.isMuted && <BellOff className="size-3 text-black/20 mr-1" />}
                          {chat.latestMessage || "Say hello! 👋"}
                        </Text>
                      </View>
                    )}
                    {chat.unreadCount > 0 && (
                      <View className="flex size-5 items-center justify-center rounded-full bg-accent-orange">
                        <Text className="text-[10px] font-bold text-white leading-none">
                          {chat.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </Link>
          ))}
        </View>

        {/* Contacts Section */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between px-2 mb-3">
            <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">
              CONTACTS
            </Text>
            <View className="flex-1 h-[1px] bg-black/5 ml-3" />
          </View>

          {filteredContacts.map((contact) => (
            <Link href={`/chat/${contact.id}`} key={contact.id} asChild>
              <TouchableOpacity
                activeOpacity={0.7}
                className="flex-row items-center rounded-[24px] px-3 py-3 mb-1 active:bg-purple/5"
              >
                {/* Avatar */}
                <View className="relative shrink-0">
                  <View className="size-[52px] rounded-2xl bg-purple/10 items-center justify-center">
                    <Text className="text-purple font-bold text-xl">
                      {getInitials(contact.name)}
                    </Text>
                  </View>
                  {contact.isOnline && (
                    <View className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white bg-green-500 shadow-sm" />
                  )}
                </View>

                {/* Contact details */}
                <View className="flex-1 min-w-0 ml-3">
                  <Text className="text-[15px] font-semibold text-ink">{contact.name}</Text>
                  <Text className="text-xs text-black/40 italic mt-0.5">Not messaged yet • Click to chat</Text>
                </View>
              </TouchableOpacity>
            </Link>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
