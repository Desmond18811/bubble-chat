"use client";

import { useState } from "react";
import { ArrowLeft, MoreVertical, Video, Send, Paperclip, Image as ImageIcon, Music, Film } from "lucide-react";
import Image from "next/image";

interface Message {
  id: string;
  sender: "user" | "other";
  content: string;
  timestamp: string;
  avatar?: string;
}

const mockMessages: Message[] = [
  {
    id: "1",
    sender: "other",
    content: "Hey Guys!\nHow's the project going?",
    timestamp: "12:32 PM",
    avatar: "/avatars/nick.png",
  },
  {
    id: "2",
    sender: "user",
    content: "Pretty good, actually Making solid progress — knocked out the main pieces and I'm ironing out a few details now. Still on track, just a couple small things left to tidy up.\n\nHow about you, anything new on your end?",
    timestamp: "12:34 PM",
  },
  {
    id: "3",
    sender: "other",
    content: `Yeah, it's one of those "almost there" phases 😄 You know everything works, now it's just polishing and double-checking so it doesn't bite me later.`,
    timestamp: "12:35 PM",
  },
  {
    id: "4",
    sender: "user",
    content: "I'm planning to wrap it up soon. What are you up to right now?",
    timestamp: "12:35 PM",
  },
];

export default function ChatDetail({
  chatId,
  onBack,
}: {
  chatId: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState(mockMessages);
  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (inputValue.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        sender: "user",
        content: inputValue,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages([...messages, newMessage]);
      setInputValue("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={onBack} className="md:hidden">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">Project 1 Chat</h2>
            <p className="text-xs text-green-500 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>2 People Active
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Video className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center text-gray-500 text-sm my-4">
          Today, 12 September
        </div>

        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`flex gap-2 max-w-xs ${message.sender === "user" ? "flex-row-reverse" : ""}`}>
              {message.sender === "other" && message.avatar && (
                <Image
                  src={message.avatar}
                  alt="avatar"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              )}
              <div>
                <div
                  className={`px-4 py-2 rounded-2xl ${
                    message.sender === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-900"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1 px-2">{message.timestamp}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        {/* Media Options */}
        <div className="flex gap-2 mb-3 pb-3 border-b border-gray-200">
          <button className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700 hover:bg-gray-200">
            <Paperclip className="w-4 h-4 inline mr-1" />
            Files
          </button>
          <button className="px-3 py-1 bg-blue-100 rounded-full text-xs font-medium text-blue-600 hover:bg-blue-200">
            <ImageIcon className="w-4 h-4 inline mr-1" />
            Images
          </button>
          <button className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700 hover:bg-gray-200">
            <Music className="w-4 h-4 inline mr-1" />
            Audio
          </button>
          <button className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700 hover:bg-gray-200">
            <Film className="w-4 h-4 inline mr-1" />
            Video
          </button>
        </div>

        {/* Input Field */}
        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type message..."
            className="flex-1 px-4 py-3 bg-gray-100 rounded-full text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
