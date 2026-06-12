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
import { Link, useNavigation, useRouter } from "expo-router";
import { Search, Pin, BellOff, Check, CheckCheck, MessageSquarePlus, UserPlus, FolderPlus, X, Trash2, Archive, Ban } from "lucide-react-native";
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
  addMockContact,
  deleteChat,
  deleteContact
} from "../../lib/mockData";
import Svg, { Text as SvgText, Defs, LinearGradient, Stop } from "react-native-svg";

export default function Messages() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [chatsList, setChatsList] = useState<Chat[]>([]);
  const [contactsList, setContactsList] = useState<Contact[]>([]);

  // Selection states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Context Menu state
  const [activeContextItem, setActiveContextItem] = useState<{
    type: 'chat' | 'contact';
    id: string;
    name: string;
    isPinned: boolean;
    isMuted: boolean;
  } | null>(null);

  // Custom Toast Notifier
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleLongPressItem = (type: 'chat' | 'contact', id: string, name: string, isPinned: boolean, isMuted: boolean) => {
    if (isSelectionMode) return;
    setActiveContextItem({ type, id, name, isPinned, isMuted });
  };

  const handlePressItem = (type: 'chat' | 'contact', id: string) => {
    if (isSelectionMode) {
      setSelectedItemIds(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    } else {
      router.push(`/chat/${id}`);
    }
  };

  const handleTogglePin = (id: string) => {
    const chat = chatsList.find(c => c.id === id);
    if (chat) {
      chat.isPinned = !chat.isPinned;
      showToast(chat.isPinned ? "Chat pinned" : "Chat unpinned");
    }
    setActiveContextItem(null);
    setChatsList(getChats());
  };

  const handleToggleArchive = (id: string) => {
    const chat = chatsList.find(c => c.id === id);
    if (chat) {
      chat.isMuted = !chat.isMuted;
      showToast(chat.isMuted ? "Chat archived" : "Chat unarchived");
    }
    setActiveContextItem(null);
    setChatsList(getChats());
  };

  const handleDeleteItem = (id: string, type: 'chat' | 'contact') => {
    if (type === 'chat') {
      deleteChat(id);
      showToast("Chat deleted");
    } else {
      deleteContact(id);
      showToast("Contact deleted");
    }
    setActiveContextItem(null);
  };

  const handleBlockContact = (name: string) => {
    showToast(`${name} has been blocked`);
    setActiveContextItem(null);
  };

  const handleToggleSelectMode = (id: string) => {
    setIsSelectionMode(true);
    setSelectedItemIds([id]);
    setActiveContextItem(null);
  };
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
          <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 80 }}>
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
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, marginBottom: 8 }}>
                  <Text style={{ fontSize: 10, fontFamily: "Poppins_700Bold", color: "rgba(31,32,48,0.3)", letterSpacing: 1.5, fontStyle: "italic", textTransform: "uppercase" }}>
                    RECENT MESSAGES
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: "rgba(0,0,0,0.05)", marginLeft: 10 }} />
                </View>

                {filteredChats.map((chat, index) => {
                  const isSelected = selectedItemIds.includes(chat.id);
                  return (
                    <React.Fragment key={chat.id}>
                      <ChatRow
                        chat={chat}
                        getInitials={getInitials}
                        isSelectionMode={isSelectionMode}
                        isSelected={isSelected}
                        onPress={() => handlePressItem('chat', chat.id)}
                        onLongPress={() => handleLongPressItem('chat', chat.id, chat.name, chat.isPinned, !!chat.isMuted)}
                      />
                      {index < filteredChats.length - 1 && (
                        <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.04)", marginHorizontal: 12, marginVertical: 3 }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            )}

            {/* Contacts */}
            {filteredContacts.length > 0 && (
              <View style={{ marginBottom: 32 }}>
                <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, marginBottom: 8 }}>
                  <Text style={{ fontSize: 10, fontFamily: "Poppins_700Bold", color: "rgba(31,32,48,0.3)", letterSpacing: 1.5, fontStyle: "italic", textTransform: "uppercase" }}>
                    CONTACTS
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: "rgba(0,0,0,0.05)", marginLeft: 10 }} />
                </View>

                {filteredContacts.map((contact, index) => {
                  const isSelected = selectedItemIds.includes(contact.id);
                  return (
                    <React.Fragment key={contact.id}>
                      <ContactRow
                        contact={contact}
                        getInitials={getInitials}
                        isSelectionMode={isSelectionMode}
                        isSelected={isSelected}
                        onPress={() => handlePressItem('contact', contact.id)}
                        onLongPress={() => handleLongPressItem('contact', contact.id, contact.name, false, false)}
                      />
                      {index < filteredContacts.length - 1 && (
                        <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.04)", marginHorizontal: 12, marginVertical: 3 }} />
                      )}
                    </React.Fragment>
                  );
                })}
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
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
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
          <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderRadius: 24,
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: "rgba(108,92,231,0.08)",
                borderWidth: 1,
                borderColor: "rgba(108,92,231,0.08)",
              }}
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
          <View style={{ paddingBottom: 8 }}>
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

      {/* ── Selection Mode Bulk Actions Bottom Bar ── */}
      {isSelectionMode && (
        <View style={{
          position: "absolute",
          bottom: 100,
          left: 16,
          right: 16,
          backgroundColor: "#ffffff",
          borderRadius: 20,
          paddingVertical: 14,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderWidth: 1,
          borderColor: "rgba(108,92,231,0.1)",
          shadowColor: "#6c5ce7",
          shadowOpacity: 0.15,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 10,
          zIndex: 1000,
        }}>
          <TouchableOpacity onPress={() => {
            setIsSelectionMode(false);
            setSelectedItemIds([]);
          }}>
            <Text style={{ fontSize: 13.5, fontFamily: "Poppins_600SemiBold", color: "#9a9aab" }}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => {
            const allIds = [...filteredChats.map(c => c.id), ...filteredContacts.map(c => c.id)];
            setSelectedItemIds(allIds);
          }}>
            <Text style={{ fontSize: 13.5, fontFamily: "Poppins_600SemiBold", color: "#6c5ce7" }}>Select All</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={() => {
                let count = 0;
                selectedItemIds.forEach(id => {
                  const chat = chatsList.find(c => c.id === id);
                  if (chat) {
                    chat.isMuted = true;
                    count++;
                  }
                });
                showToast(`${count} chats archived`);
                setIsSelectionMode(false);
                setSelectedItemIds([]);
                setChatsList(getChats());
              }}
              disabled={selectedItemIds.length === 0}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: selectedItemIds.length > 0 ? "rgba(108,92,231,0.08)" : "transparent",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
              }}
            >
              <Archive size={14} color={selectedItemIds.length > 0 ? "#6c5ce7" : "#9a9aab"} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12.5, fontFamily: "Poppins_700Bold", color: selectedItemIds.length > 0 ? "#6c5ce7" : "#9a9aab" }}>Archive</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                selectedItemIds.forEach(id => {
                  const chatIndex = chatsList.findIndex(c => c.id === id);
                  if (chatIndex !== -1) {
                    deleteChat(id);
                  } else {
                    const contactIndex = contactsList.findIndex(c => c.id === id);
                    if (contactIndex !== -1) {
                      deleteContact(id);
                    }
                  }
                });
                showToast(`Deleted selected items`);
                setIsSelectionMode(false);
                setSelectedItemIds([]);
              }}
              disabled={selectedItemIds.length === 0}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: selectedItemIds.length > 0 ? "rgba(239, 68, 68, 0.08)" : "transparent",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
              }}
            >
              <Trash2 size={14} color={selectedItemIds.length > 0 ? "red" : "#9a9aab"} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12.5, fontFamily: "Poppins_700Bold", color: selectedItemIds.length > 0 ? "red" : "#9a9aab" }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Custom Floating Toast Alert Overlay ── */}
      {toastMessage && (
        <View style={{
          position: 'absolute',
          top: 80,
          alignSelf: 'center',
          backgroundColor: 'rgba(31,32,48,0.9)',
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 20,
          zIndex: 9999,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 5,
        }}>
          <Text style={{ color: '#ffffff', fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}>
            {toastMessage}
          </Text>
        </View>
      )}

      {/* ── Contact/Chat Context Menu Modal ── */}
      <Modal visible={activeContextItem !== null} transparent animationType="fade">
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setActiveContextItem(null)}
          style={{
            flex: 1,
            backgroundColor: "rgba(31,32,48,0.4)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          {activeContextItem && (
            <TouchableOpacity
              activeOpacity={1}
              style={{
                width: "100%",
                maxWidth: 290,
                backgroundColor: "#ffffff",
                borderRadius: 24,
                padding: 18,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 10,
              }}
            >
              <Text style={{ fontSize: 10, fontFamily: "Poppins_700Bold", color: "#9a9aab", textTransform: "uppercase", marginBottom: 4, letterSpacing: 0.5 }}>
                {activeContextItem.type === 'chat' ? 'Conversation Options' : 'Contact Options'}
              </Text>
              <Text style={{ fontSize: 15.5, fontFamily: "Poppins_700Bold", color: "#1f2030", marginBottom: 12 }}>
                {activeContextItem.name}
              </Text>

              <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.05)", marginBottom: 8 }} />

              {activeContextItem.type === 'chat' && (
                <ContextMenuItem
                  icon={<Pin size={16} color="#9a9aab" />}
                  label={activeContextItem.isPinned ? "Unpin Chat" : "Pin Chat"}
                  onPress={() => handleTogglePin(activeContextItem.id)}
                />
              )}

              {activeContextItem.type === 'chat' && (
                <ContextMenuItem
                  icon={<Archive size={16} color="#9a9aab" />}
                  label={activeContextItem.isMuted ? "Unarchive Chat" : "Archive Chat"}
                  onPress={() => handleToggleArchive(activeContextItem.id)}
                />
              )}

              <ContextMenuItem
                icon={<Ban size={16} color="#9a9aab" />}
                label="Block Contact"
                onPress={() => handleBlockContact(activeContextItem.name)}
              />

              <ContextMenuItem
                icon={<Check size={16} color="#9a9aab" />}
                label="Select"
                onPress={() => handleToggleSelectMode(activeContextItem.id)}
              />

              <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.05)", marginVertical: 8 }} />

              <ContextMenuItem
                icon={<Trash2 size={16} color="red" />}
                label={activeContextItem.type === 'chat' ? "Delete Chat" : "Delete Contact"}
                labelStyle={{ color: "red" }}
                onPress={() => handleDeleteItem(activeContextItem.id, activeContextItem.type)}
              />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ChatRow({
  chat,
  getInitials,
  isSelectionMode,
  isSelected,
  onPress,
  onLongPress
}: {
  chat: Chat;
  getInitials: (n: string) => string;
  isSelectionMode: boolean;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ flexDirection: "row", alignItems: "center", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 2 }}
    >
      {isSelectionMode && (
        <View style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: isSelected ? "#6c5ce7" : "#9a9aab",
          backgroundColor: isSelected ? "#6c5ce7" : "transparent",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
          flexShrink: 0,
        }}>
          {isSelected && <Check size={12} color="#ffffff" />}
        </View>
      )}

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
  );
}

function ContactRow({
  contact,
  getInitials,
  isSelectionMode,
  isSelected,
  onPress,
  onLongPress
}: {
  contact: Contact;
  getInitials: (n: string) => string;
  isSelectionMode: boolean;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ flexDirection: "row", alignItems: "center", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 2 }}
    >
      {isSelectionMode && (
        <View style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: isSelected ? "#6c5ce7" : "#9a9aab",
          backgroundColor: isSelected ? "#6c5ce7" : "transparent",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
          flexShrink: 0,
        }}>
          {isSelected && <Check size={12} color="#ffffff" />}
        </View>
      )}

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

function ContextMenuItem({
  icon,
  label,
  onPress,
  labelStyle
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  labelStyle?: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
      }}
    >
      {icon}
      <Text style={[{ fontSize: 13.5, color: '#1f2030', fontFamily: 'Poppins_500Medium', marginLeft: 10 }, labelStyle]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
