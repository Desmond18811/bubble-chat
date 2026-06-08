"use client";

import { useState } from "react";
import ChatList from "@/components/ChatList";
import ChatDetail from "@/components/ChatDetail";

export default function Home() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  return (
    <div className="flex h-screen bg-white">
      {/* Chat List */}
      <div
        className={`${
          selectedChat ? "hidden" : "flex"
        } md:flex w-full md:w-1/3 flex-col bg-white border-r border-gray-200`}
      >
        <ChatList onSelectChat={setSelectedChat} />
      </div>

      {/* Chat Detail */}
      {selectedChat && (
        <div className="w-full md:w-2/3 flex flex-col bg-white">
          <ChatDetail chatId={selectedChat} onBack={() => setSelectedChat(null)} />
        </div>
      )}
    </div>
  );
}
