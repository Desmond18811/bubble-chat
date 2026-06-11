import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Search, Pin, BellOff, Check, CheckCheck, MessageSquarePlus } from "lucide-react-native";
import { Image } from "expo-image";
import { getChats, getContacts, subscribeToChats, Chat, Contact } from "../../lib/mockData";
import Svg, { Text as SvgText, Defs, LinearGradient, Stop } from "react-native-svg";

const FILTERS = ["All", "Unread", "Friends", "Work", "Archive"];

export default function Messages() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [chatsList, setChatsList] = useState<Chat[]>([]);
  const [contactsList, setContactsList] = useState<Contact[]>([]);

  useEffect(() => {
    setChatsList(getChats());
    setContactsList(getContacts());

    const unsubscribe = subscribeToChats(() => {
      setChatsList(getChats());
      setContactsList(getContacts());
    });

    return () => unsubscribe();
  }, []);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  // Filter conversations by active tab
  const filteredChats = chatsList.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === "Unread") return c.unreadCount > 0;
    if (activeFilter === "Work") return c.isGroupChat;
    if (activeFilter === "Archive") return !!c.isMuted;
    if (activeFilter === "Friends") return !!c.isFriend; // show friend DMs
    return true; // "All"
  });

  // Filter contacts visible per tab
  const filteredContacts = contactsList.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === "All") return true;
    if (activeFilter === "Friends") return c.category === "friend" || c.category === "other";
    if (activeFilter === "Work") return c.category === "work";
    return false;
  });

  const isEmpty = filteredChats.length === 0 && filteredContacts.length === 0;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#f8f7ff" }} edges={["top"]}>
      {/* ── Header ── */}
      <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
        <Svg height="36" width="160">
          <Defs>
            <LinearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#6c5ce7" />
              <Stop offset="100%" stopColor="rgba(108,92,231,0.6)" />
            </LinearGradient>
          </Defs>
          <SvgText
            fill="url(#textGrad)"
            fontSize="26"
            fontFamily="SpaceGrotesk_700Bold"
            x="0"
            y="26"
            letterSpacing="-0.5"
          >
            Messages
          </SvgText>
        </Svg>
      </View>

      {/* ── Search ── */}
      <View className="px-5 pb-3">
        <View
          className="flex-row items-center rounded-[24px] px-4 py-3"
          style={{ backgroundColor: "rgba(108,92,231,0.08)", borderWidth: 1, borderColor: "rgba(108,92,231,0.08)" }}
        >
          <Search size={18} color="#6c5ce7" style={{ marginRight: 10, flexShrink: 0 }} />
          <TextInput
            placeholder="Search conversations..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="rgba(31,32,48,0.35)"
            style={{ flex: 1, fontSize: 14.5, color: "#1f2030", fontFamily: "Poppins_400Regular" }}
          />
        </View>
      </View>

      {/* ── Filter Tabs ── */}
      <View className="pb-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 7,
                  borderRadius: 100,
                  backgroundColor: isActive ? "#6c5ce7" : "rgba(108,92,231,0.08)",
                  borderWidth: 1,
                  borderColor: isActive ? "#6c5ce7" : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: isActive ? "Poppins_700Bold" : "Poppins_500Medium",
                    color: isActive ? "#ffffff" : "#9a9aab",
                  }}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Chat / Contact List ── */}
      <ScrollView className="flex-1 px-2 pt-2" showsVerticalScrollIndicator={false}>
        {isEmpty ? (
          <View className="items-center justify-center py-20">
            <MessageSquarePlus size={36} color="rgba(31,32,48,0.12)" />
            <Text style={{ marginTop: 12, fontSize: 14, fontFamily: "Poppins_500Medium", color: "rgba(31,32,48,0.3)" }}>
              No conversations yet
            </Text>
            <Text style={{ fontSize: 12, fontFamily: "Poppins_400Regular", color: "rgba(31,32,48,0.2)", marginTop: 4 }}>
              Message a contact to get started
            </Text>
          </View>
        ) : (
          <>
            {/* Recent Messages */}
            {filteredChats.length > 0 && (
              <View className="mb-5">
                <View className="flex-row items-center px-3 mb-2">
                  <Text style={{ fontSize: 10, fontFamily: "Poppins_700Bold", color: "rgba(31,32,48,0.3)", letterSpacing: 1.5, fontStyle: "italic", textTransform: "uppercase" }}>
                    RECENT MESSAGES
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: "rgba(0,0,0,0.05)", marginLeft: 10 }} />
                </View>

                {filteredChats.map((chat) => (
                  <ChatRow key={chat.id} chat={chat} getInitials={getInitials} />
                ))}
              </View>
            )}

            {/* Contacts */}
            {filteredContacts.length > 0 && (
              <View className="mb-8">
                <View className="flex-row items-center px-3 mb-2">
                  <Text style={{ fontSize: 10, fontFamily: "Poppins_700Bold", color: "rgba(31,32,48,0.3)", letterSpacing: 1.5, fontStyle: "italic", textTransform: "uppercase" }}>
                    CONTACTS
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: "rgba(0,0,0,0.05)", marginLeft: 10 }} />
                </View>

                {filteredContacts.map((contact) => (
                  <ContactRow key={contact.id} contact={contact} getInitials={getInitials} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ChatRow({ chat, getInitials }: { chat: Chat; getInitials: (n: string) => string }) {
  return (
    <Link href={`/chat/${chat.id}`} asChild>
      <TouchableOpacity
        activeOpacity={0.7}
        style={{ flexDirection: "row", alignItems: "center", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 2 }}
      >
        {/* Avatar */}
        <View style={{ position: "relative", flexShrink: 0 }}>
          {chat.avatar ? (
            <Image source={{ uri: chat.avatar }} style={{ width: 52, height: 52, borderRadius: 14 }} />
          ) : (
            <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: "rgba(108,92,231,0.12)", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#6c5ce7", fontFamily: "Poppins_700Bold", fontSize: 17 }}>
                {getInitials(chat.name)}
              </Text>
            </View>
          )}
          {chat.isOnline && (
            <View style={{ position: "absolute", bottom: -1, right: -1, width: 13, height: 13, borderRadius: 99, backgroundColor: "#22c55e", borderWidth: 2, borderColor: "#f8f7ff" }} />
          )}
        </View>

        {/* Details */}
        <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 }}>
              {chat.isPinned && <Pin size={11} color="#6c5ce7" style={{ marginRight: 4 }} />}
              <Text numberOfLines={1} style={{ fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#1f2030", flex: 1 }}>
                {chat.name}
              </Text>
            </View>
            <Text style={{ fontSize: 11.5, fontFamily: "Poppins_400Regular", color: "#9a9aab", marginLeft: 8, flexShrink: 0 }}>
              {chat.time}
            </Text>
          </View>

          <View style={{ marginTop: 3, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            {chat.status === "typing" ? (
              <Text style={{ fontSize: 13, color: "#6c5ce7", fontFamily: "Poppins_600SemiBold" }}>
                typing…
              </Text>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0, paddingRight: 8 }}>
                {chat.status === "delivered" && <Check size={13} color="rgba(0,0,0,0.2)" style={{ marginRight: 3 }} />}
                {chat.status === "read_other_all" && <CheckCheck size={13} color="#6c5ce7" style={{ marginRight: 3 }} />}
                {chat.isMuted && <BellOff size={12} color="rgba(0,0,0,0.2)" style={{ marginRight: 3 }} />}
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 13,
                    fontFamily: chat.unreadCount > 0 ? "Poppins_600SemiBold" : "Poppins_400Regular",
                    color: chat.unreadCount > 0 ? "#1f2030" : "rgba(31,32,48,0.45)",
                    flex: 1,
                  }}
                >
                  {chat.latestMessage || "Say hello! 👋"}
                </Text>
              </View>
            )}
            {chat.unreadCount > 0 && (
              <View style={{ width: 20, height: 20, borderRadius: 99, backgroundColor: "#f4663b", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 10, fontFamily: "Poppins_700Bold", color: "#fff", lineHeight: 13 }}>
                  {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );
}

function ContactRow({ contact, getInitials }: { contact: Contact; getInitials: (n: string) => string }) {
  return (
    <Link href={`/chat/${contact.id}`} asChild>
      <TouchableOpacity
        activeOpacity={0.7}
        style={{ flexDirection: "row", alignItems: "center", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 2 }}
      >
        <View style={{ position: "relative", flexShrink: 0 }}>
          {contact.avatar ? (
            <Image source={{ uri: contact.avatar }} style={{ width: 52, height: 52, borderRadius: 14, opacity: 0.88 }} />
          ) : (
            <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: "rgba(108,92,231,0.12)", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#6c5ce7", fontFamily: "Poppins_700Bold", fontSize: 17 }}>
                {getInitials(contact.name)}
              </Text>
            </View>
          )}
          {contact.isOnline && (
            <View style={{ position: "absolute", bottom: -1, right: -1, width: 13, height: 13, borderRadius: 99, backgroundColor: "#22c55e", borderWidth: 2, borderColor: "#f8f7ff" }} />
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
          <Text numberOfLines={1} style={{ fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "rgba(31,32,48,0.65)" }}>
            {contact.name}
          </Text>
          <Text style={{ fontSize: 12, fontFamily: "Poppins_400Regular", color: "rgba(31,32,48,0.3)", fontStyle: "italic", marginTop: 2 }}>
            Not messaged yet • Tap to chat
          </Text>
        </View>

        <MessageSquarePlus size={16} color="#6c5ce7" style={{ opacity: 0.4, marginLeft: 8, flexShrink: 0 }} />
      </TouchableOpacity>
    </Link>
  );
}
