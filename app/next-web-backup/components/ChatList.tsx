"use client";

import { useState, useEffect } from "react";
import { Search, Camera, MoreVertical, MessageCircle, Phone, Bell, User } from "lucide-react";
import Image from "next/image";

interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  activeUsers?: number;
}

const mockChats: Chat[] = [
  {
    id: "1",
    name: "Nick P.",
    avatar: "/avatars/nick.png",
    lastMessage: "Yeah, Sunday will be great",
    timestamp: "20min",
    unread: true,
  },
  {
    id: "2",
    name: "Project 1 Chat",
    avatar: "/avatars/group1.png",
    lastMessage: "You: I've to take another look before...",
    timestamp: "2min",
    unread: true,
  },
  {
    id: "3",
    name: "Noah K.",
    avatar: "/avatars/noah.png",
    lastMessage: "Thanks Noah, see ya later",
    timestamp: "12min",
    unread: false,
  },
  {
    id: "4",
    name: "Maya P. Lisa K. Nya R.",
    avatar: "/avatars/group2.png",
    lastMessage: "Lisa: Sure hahaha",
    timestamp: "15min",
    unread: false,
  },
  {
    id: "5",
    name: "Sofia B.",
    avatar: "/avatars/sofia.png",
    lastMessage: "I'll be there in 5 min",
    timestamp: "18min",
    unread: false,
  },
];

const storyUsers = [
  { id: "you", name: "You", avatar: "/avatars/you.png", stories: 0 },
  { id: "lisa", name: "Lisa", avatar: "/avatars/lisa.png", stories: 3 },
  { id: "nya", name: "Nya", avatar: "/avatars/nya.png", stories: 1 },
  { id: "lucas", name: "Lucas", avatar: "/avatars/lucas.png", stories: 2 },
  { id: "joe", name: "Joe", avatar: "/avatars/joe.png", stories: 0 },
];

const tabs = ["All", "Favorites", "Work", "Groups", "Communities"];

export default function ChatList({ onSelectChat }: { onSelectChat: (chatId: string) => void }) {
  const [activeTab, setActiveTab] = useState("All");
  const [chats, setChats] = useState(mockChats);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 pt-2">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-black">Chats</h1>
          <div className="flex gap-3">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Search className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Camera className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Stories */}
        <div className="flex gap-3 overflow-x-auto pb-4 mb-4 scrollbar-hide">
          {storyUsers.map((user) => (
            <div key={user.id} className="flex flex-col items-center gap-1 min-w-max">
              <div className="relative">
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full border-2 border-blue-500 object-cover"
                />
                {user.stories > 0 && (
                  <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                    {user.stories}
                  </div>
                )}
              </div>
              <span className="text-xs text-center truncate w-16">{user.name}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className="w-full px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left flex gap-3"
          >
            <div className="relative">
              <Image
                src={chat.avatar}
                alt={chat.name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover"
              />
              {chat.unread && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 rounded-full"></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 truncate">{chat.name}</h3>
                <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{chat.timestamp}</span>
              </div>
              <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-gray-200 p-4 flex justify-around">
        <button className="flex flex-col items-center gap-1 text-blue-500">
          <MessageCircle className="w-6 h-6" />
          <span className="text-xs">Chats</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-700">
          <Phone className="w-6 h-6" />
          <span className="text-xs">Call</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-700">
          <Bell className="w-6 h-6" />
          <span className="text-xs">Updates</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-700">
          <User className="w-6 h-6" />
          <span className="text-xs">Profile</span>
        </button>
      </div>
    </div>
  );
}
