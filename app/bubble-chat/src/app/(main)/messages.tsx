import React, { useState } from "react";
import { Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView } from "react-native";
import { Search, Plus, Pin, BellOff, MessageSquare } from "lucide-react-native";
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
    typingUser: null
  },
  {
    id: "2",
    name: "Alex Rivera",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop",
    isGroupChat: false,
    latestMessage: "🎤 Voice message (0:14)",
    time: "Yesterday",
    unreadCount: 0,
    isPinned: true,
    isOnline: true,
    typingUser: null
  },
  {
    id: "3",
    name: "Product Sync",
    avatar: null,
    isGroupChat: true,
    latestMessage: null,
    time: "Monday",
    unreadCount: 0,
    isPinned: false,
    isOnline: false,
    typingUser: { name: "Alice", username: "alice" }
  },
  {
    id: "4",
    name: "Sarah Chen",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop",
    isGroupChat: false,
    time: "2 days ago",
    latestMessage: "Are we still on for the 2 PM meeting?",
    unreadCount: 1,
    isPinned: false,
    isOnline: true,
    typingUser: null
  }
];

const MOCK_CONTACTS = [
  { id: "5", name: "David Kim", avatar: null, isOnline: true },
  { id: "6", name: "Emily Watson", avatar: null, isOnline: false },
  { id: "7", name: "Marcus Johnson", avatar: null, isOnline: true }
];

export default function Messages() {
  const [search, setSearch] = useState("");

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
        <TouchableOpacity className="flex-row items-center gap-1.5 rounded-full bg-purple/10 px-4 py-2">
          <Plus className="size-4 text-purple mr-1" />
          <Text className="text-xs font-bold text-purple">New Group</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View className="px-6 py-2">
        <View className="flex-row items-center gap-3 rounded-full bg-purple/5 border border-purple/5 px-4 py-3">
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
            <TouchableOpacity
              key={chat.id}
              activeOpacity={0.7}
              className="flex-row items-center gap-3 rounded-2xl p-2.5 mb-1 hover:bg-purple-light/40"
            >
              {/* Avatar */}
              <View className="relative">
                {chat.avatar ? (
                  <Image
                    source={{ uri: chat.avatar }}
                    className="size-12 rounded-2xl"
                  />
                ) : (
                  <View className="size-12 rounded-2xl bg-purple-soft items-center justify-center">
                    <Text className="text-purple font-bold text-base">
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
                  <Text className="text-[15px] font-semibold text-ink flex-row items-center truncate">
                    {chat.isPinned && <Pin className="size-3 text-purple mr-1 fill-purple" />}
                    {chat.name}
                  </Text>
                  <Text className="text-xs text-ink-soft font-semibold">{chat.time}</Text>
                </View>

                <View className="mt-1 flex-row items-center justify-between">
                  {chat.typingUser ? (
                    <Text className="text-[13px] text-purple font-semibold animate-pulse">
                      @{chat.typingUser.username} is typing…
                    </Text>
                  ) : (
                    <Text className="text-[13px] text-ink-soft truncate pr-4" numberOfLines={1}>
                      {chat.latestMessage || "Say hello! 👋"}
                    </Text>
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
            <TouchableOpacity
              key={contact.id}
              activeOpacity={0.7}
              className="flex-row items-center gap-3 rounded-2xl p-2.5 mb-1 hover:bg-purple/5"
            >
              {/* Avatar */}
              <View className="relative">
                <View className="size-12 rounded-2xl bg-purple-soft/60 items-center justify-center">
                  <Text className="text-purple/80 font-bold text-base">
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
                <Text className="text-xs text-ink-soft italic mt-0.5">Not messaged yet • Click to chat</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
