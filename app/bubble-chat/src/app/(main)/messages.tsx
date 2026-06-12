import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Link, useNavigation } from "expo-router";
import { Search, Pin, BellOff, Check, CheckCheck, MessageSquarePlus, UserPlus, FolderPlus, X } from "lucide-react-native";
import { Image } from "expo-image";
import { 
  getChats, 
  getContacts, 
  subscribeToChats, 
  Chat, 
  Contact,
  subscribeToPlusButton,
  getFolders,
  addFolder,
  addMockContact
} from "../../lib/mockData";
import Svg, { Text as SvgText, Defs, LinearGradient, Stop } from "react-native-svg";

export default function Messages() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [chatsList, setChatsList] = useState<Chat[]>([]);
  const [contactsList, setContactsList] = useState<Contact[]>([]);
  const [foldersList, setFoldersList] = useState<string[]>([]);

  // FAB Menu States
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isCreateTabOpen, setIsCreateTabOpen] = useState(false);

  // New Contact Inputs
  const [newContactName, setNewContactName] = useState("");
  const [newContactCategory, setNewContactCategory] = useState("Friends");

  // New Tab Inputs
  const [newTabName, setNewTabName] = useState("");

  const navigation = useNavigation();
  const [isFocused, setIsFocused] = useState(navigation.isFocused());

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener("focus", () => {
      setIsFocused(true);
    });
    const unsubscribeBlur = navigation.addListener("blur", () => {
      setIsFocused(false);
    });
    setIsFocused(navigation.isFocused());

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  useEffect(() => {
    setChatsList(getChats());
    setContactsList(getContacts());
    setFoldersList(getFolders());

    const unsubscribe = subscribeToChats(() => {
      setChatsList(getChats());
      setContactsList(getContacts());
      setFoldersList(getFolders());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isFocused) {
      setIsFabMenuOpen(false);
      return;
    }

    const unsubscribePlus = subscribeToPlusButton(() => {
      setIsFabMenuOpen(prev => !prev);
    });

    return () => {
      unsubscribePlus();
    };
  }, [isFocused]);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  // Filter conversations by active tab
  const filteredChats = chatsList.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === "Unread") return c.unreadCount > 0;
    if (activeFilter === "Work") return c.isGroupChat;
    if (activeFilter === "Archive") return !!c.isMuted;
    if (activeFilter === "Friends") return !!c.isFriend;

    if (activeFilter !== "All") {
      const contact = contactsList.find(con => con.id === c.id);
      if (contact && contact.category?.toLowerCase() === activeFilter.toLowerCase()) return true;
      return false;
    }
    return true; // "All"
  });

  // Filter contacts visible per tab
  const filteredContacts = contactsList.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === "All") return true;
    if (activeFilter === "Friends") return c.category === "friend" || c.category === "other";
    if (activeFilter === "Work") return c.category === "work";
    
    return c.category?.toLowerCase() === activeFilter.toLowerCase();
  });

  const isEmpty = filteredChats.length === 0 && filteredContacts.length === 0;

  const insets = useSafeAreaInsets();
  const headerHeight = 170 + insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: "#f8f7ff" }}>
      {/* ── Chat / Contact List ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: headerHeight + 10, // Starts below the header, clean solid layout!
          paddingBottom: 125, // Leave room for the bottom blurred tab bar
          paddingHorizontal: 8,
        }}
        showsVerticalScrollIndicator={false}
      >
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

      {/* ── Fixed Solid Header Overlay ── */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: headerHeight,
          backgroundColor: "#f8f7ff", // Solid background to prevent overlap issues
          borderBottomWidth: 1,
          borderBottomColor: "rgba(108,92,231,0.06)",
          zIndex: 10,
        }}
      >
        <View style={{ paddingTop: insets.top }}>
          {/* Header Title with Deep Indigo/Purple Gradient */}
          <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
            <Svg height="36" width="160">
              <Defs>
                <LinearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#5e52e6" />
                  <Stop offset="100%" stopColor="#8a7bf3" />
                </LinearGradient>
              </Defs>
              <SvgText
                fill="url(#textGrad)"
                fontSize="28"
                fontFamily="SpaceGrotesk_700Bold"
                x="0"
                y="27"
                letterSpacing="-0.5"
              >
                Messages
              </SvgText>
            </Svg>
          </View>

          {/* Search */}
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

          {/* Filter Tabs */}
          <View className="pb-2">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
              {foldersList.map((filter) => {
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
        </View>
      </View>

      {/* ── FAB Side Popover Menu ── */}
      {isFabMenuOpen && (
        <View style={styles.fabMenu}>
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setIsFabMenuOpen(false);
              setIsAddContactOpen(true);
            }}
          >
            <UserPlus size={16} color="#6c5ce7" style={{ marginRight: 10 }} />
            <Text style={styles.fabMenuText}>Add Contact</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setIsFabMenuOpen(false);
              setIsCreateTabOpen(true);
            }}
          >
            <FolderPlus size={16} color="#6c5ce7" style={{ marginRight: 10 }} />
            <Text style={styles.fabMenuText}>New Folder Tab</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Add Contact Modal ── */}
      <Modal visible={isAddContactOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Contact</Text>
              <TouchableOpacity onPress={() => setIsAddContactOpen(false)}>
                <X size={20} color="#6c5ce7" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. John Doe"
              value={newContactName}
              onChangeText={setNewContactName}
              placeholderTextColor="#9a9aab"
            />

            <Text style={styles.inputLabel}>Category / Folder</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }} contentContainerStyle={{ gap: 6 }}>
              {foldersList.filter(f => f !== "All" && f !== "Unread" && f !== "Archive").map((cat) => {
                const isSelected = newContactCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setNewContactCategory(cat)}
                    style={[
                      styles.catBtn,
                      isSelected && { backgroundColor: "#6c5ce7", borderColor: "#6c5ce7" }
                    ]}
                  >
                    <Text style={[styles.catBtnText, isSelected && { color: "#ffffff" }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => {
                if (!newContactName.trim()) return;
                addMockContact(newContactName.trim(), newContactCategory);
                setNewContactName("");
                setIsAddContactOpen(false);
              }}
            >
              <Text style={styles.saveBtnText}>Save Contact</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Create Folder Tab Modal ── */}
      <Modal visible={isCreateTabOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Folder Tab</Text>
              <TouchableOpacity onPress={() => setIsCreateTabOpen(false)}>
                <X size={20} color="#6c5ce7" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.inputLabel}>Folder Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. VIP or Personal"
              value={newTabName}
              onChangeText={setNewTabName}
              placeholderTextColor="#9a9aab"
              autoFocus
            />

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => {
                if (!newTabName.trim()) return;
                addFolder(newTabName.trim());
                setActiveFilter(newTabName.trim());
                setNewTabName("");
                setIsCreateTabOpen(false);
              }}
            >
              <Text style={styles.saveBtnText}>Create Tab</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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

const styles = StyleSheet.create({
  fabMenu: {
    position: "absolute",
    bottom: 96,
    right: 16,
    width: 175,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingVertical: 6,
    shadowColor: "#6c5ce7",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.08)",
    zIndex: 100,
  },
  fabMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  fabMenuText: {
    fontSize: 13,
    color: "#1f2030",
    fontFamily: "Poppins_500Medium",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(31,32,48,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#1f2030",
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
    color: "#9a9aab",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    width: "100%",
    backgroundColor: "rgba(108,92,231,0.05)",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.08)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#1f2030",
    marginBottom: 16,
  },
  catBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.15)",
    backgroundColor: "transparent",
  },
  catBtnText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#9a9aab",
  },
  saveBtn: {
    backgroundColor: "#6c5ce7",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },
});
