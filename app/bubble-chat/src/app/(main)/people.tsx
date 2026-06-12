import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  UserPlus,
  Plus,
  Phone,
  Video,
  MessageSquare,
  Users,
  Briefcase,
  X,
  Check,
  PhoneOff,
  MicOff,
  Volume2,
} from 'lucide-react-native';
import { Link, useNavigation } from 'expo-router';
import { Image } from 'expo-image';
import {
  Contact,
  Chat,
  subscribeToPlusButton,
} from '../../lib/mockData';
import { chatCache } from '../../lib/chatCache';
import { addContact, createGroupChat, searchUsers } from '../../lib/api';
import { Alert } from 'react-native';
import Svg, { Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';

// ─────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────
function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getGroupInitials(name: string) {
  const clean = name.trim().replace(/\s+/g, ' ');
  const parts = clean.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

// ─────────────────────────────────────────────
// Avatar Component
// ─────────────────────────────────────────────
function Avatar({
  name,
  avatar,
  size = 52,
  isOnline,
  isGroup = false,
}: {
  name: string;
  avatar?: string | null;
  size?: number;
  isOnline?: boolean;
  isGroup?: boolean;
}) {
  return (
    <View style={{ width: size, height: size }} className="relative shrink-0">
      {avatar && !isGroup ? (
        <Image
          source={{ uri: avatar }}
          style={{ width: size, height: size, borderRadius: size * 0.38 }}
        />
      ) : (
        <View
          style={{ width: size, height: size, borderRadius: size * 0.38, backgroundColor: isGroup ? '#000000' : 'rgba(108,92,231,0.1)' }}
          className="items-center justify-center"
        >
          <Text
            style={{ fontSize: size * 0.33, color: isGroup ? '#ffffff' : '#6c5ce7' }}
            className="font-bold font-sans"
          >
            {isGroup ? getGroupInitials(name) : getInitials(name)}
          </Text>
        </View>
      )}
      {isOnline && !isGroup && (
        <View
          className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 rounded-full border-2 border-white shadow-xs"
          style={{ width: size * 0.27, height: size * 0.27 }}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
// Contacts Sub-Tab
// ─────────────────────────────────────────────
function ContactsTab({
  showAddModal,
  setShowAddModal,
  onStartCall,
}: {
  showAddModal: boolean;
  setShowAddModal: (v: boolean) => void;
  onStartCall: (user: any, type: 'voice' | 'video') => void;
}) {
  const [search, setSearch] = useState('');
  const [addIdentifier, setAddIdentifier] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [chats, setChats] = useState<any[]>([]);

  const loadCache = async () => {
    const cached = await chatCache.getCachedContacts();
    setContacts(cached);
    const cachedChats = await chatCache.getCachedChats();
    setChats(cachedChats);
  };

  const syncContacts = async () => {
    try {
      const fresh = await chatCache.syncContactsWithBackend();
      setContacts(fresh);
      const freshChats = await chatCache.syncChatsWithBackend();
      setChats(freshChats);
    } catch (err) {
      console.warn("Silent sync failed in ContactsTab:", err);
    }
  };

  useEffect(() => {
    loadCache();
    syncContacts();
  }, []);

  useEffect(() => {
    const interval = setInterval(syncContacts, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = contacts.filter((c) =>
    (c.name + c.username + c.org_role).toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    const tag = addIdentifier.trim();
    if (!tag) return;
    try {
      await addContact(tag);
      setAddIdentifier('');
      setShowAddModal(false);
      await syncContacts();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add contact.");
    }
  };

  return (
    <View className="flex-1">
      {/* Search + Action Row */}
      <View className="px-5 pb-3 pt-2 flex-row items-center gap-3">
        <View className="flex-1 flex-row items-center bg-purple/10 rounded-3xl border border-purple/5 px-4 py-2.5 shadow-sm shadow-purple/5">
          <Search color="#6c5ce7" size={16} />
          <TextInput
            placeholder="Search contacts..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="rgba(108,92,231,0.4)"
            className="flex-1 text-[14px] text-ink font-medium font-sans ml-2"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X color="#9a9aab" size={14} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          className="flex-row items-center bg-purple rounded-2xl px-4 py-2.5 shadow-xs"
        >
          <UserPlus color="#fff" size={15} />
          <Text className="text-white text-xs font-bold font-sans ml-1.5">Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Section header */}
        <View className="flex-row items-center mb-3 mt-1">
          <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-widest font-sans">
            My Contacts
          </Text>
          <View className="flex-1 h-[1px] bg-black/5 ml-3" />
          <View className="ml-3 bg-purple/10 px-2 py-0.5 rounded-full">
            <Text className="text-[9px] font-bold text-purple uppercase font-sans">
              {contacts.length} Total
            </Text>
          </View>
        </View>

        {filtered.length === 0 ? (
          <View className="py-16 items-center justify-center border-2 border-dashed border-black/5 rounded-3xl mt-2 bg-white/50">
            <View className="w-16 h-16 rounded-3xl bg-purple-soft/50 items-center justify-center mb-4">
              <Users color="#6c5ce7" size={28} />
            </View>
            <Text className="text-base font-bold text-ink font-sans">No contacts found</Text>
            <Text className="text-xs text-ink-soft mt-1 text-center max-w-[220px] leading-relaxed font-sans">
              {search
                ? 'Try a different name or username'
                : 'Add contacts to start connecting with people'}
            </Text>
            {!search && (
              <TouchableOpacity
                onPress={() => setShowAddModal(true)}
                className="mt-5 bg-purple px-5 py-3 rounded-2xl shadow-sm"
              >
                <Text className="text-white text-xs font-bold font-sans">
                  Add your first contact
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map((contact) => {
            const matchingChat = chats.find(c => String(c.otherUserId) === String(contact.id) || String(c.id) === String(contact.id));
            const isTyping = matchingChat?.status === 'typing';

            return (
              <View
                key={contact.id}
                className="flex-row items-center bg-white border border-black/5 rounded-2xl px-4 py-3.5 mb-2.5 shadow-sm shadow-purple/5"
              >
                <Link href={`/chat/${contact.id}`} asChild>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    className="flex-1 flex-row items-center"
                  >
                    <Avatar name={contact.name} avatar={contact.avatar} size={50} isOnline={contact.isOnline} />

                    {/* Info */}
                    <View className="flex-1 min-w-0 ml-3">
                      <Text className="text-[15px] font-bold text-ink leading-tight font-sans" numberOfLines={1}>
                        {contact.name}
                      </Text>
                      {isTyping ? (
                        <Text className="text-[11px] font-semibold text-purple mt-0.5 font-sans">
                          typing…
                        </Text>
                      ) : (
                        <Text className="text-[11px] text-ink-soft mt-0.5 font-sans" numberOfLines={1}>
                          @{contact.username}
                          {contact.org_role ? ` · ${contact.org_role}` : ''}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                </Link>

                {/* Action Buttons */}
                <View className="flex-row items-center gap-2 ml-2">
                  <Link href={`/chat/${contact.id}`} asChild>
                    <TouchableOpacity className="w-8 h-8 rounded-xl bg-purple-soft/40 items-center justify-center">
                      <MessageSquare color="#6c5ce7" size={14} />
                    </TouchableOpacity>
                  </Link>
                  <TouchableOpacity
                    onPress={() => onStartCall(contact, 'voice')}
                    className="w-8 h-8 rounded-xl bg-purple-soft/40 items-center justify-center"
                  >
                    <Phone color="#6c5ce7" size={14} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onStartCall(contact, 'video')}
                    className="w-8 h-8 rounded-xl bg-purple-soft/40 items-center justify-center"
                  >
                    <Video color="#6c5ce7" size={14} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Friend Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            setShowAddModal(false);
            setAddIdentifier('');
          }}
          className="flex-1 bg-black/60 justify-end"
        >
          <TouchableOpacity activeOpacity={1}>
            <SafeAreaView className="bg-white rounded-t-3xl shadow-2xl" edges={['bottom']}>
              <View className="px-6 pt-6 pb-2">
                <View className="flex-row items-start justify-between mb-2">
                  <View>
                    <Text className="text-lg font-bold text-ink font-display">Add a Contact</Text>
                    <Text className="text-xs text-ink-soft mt-0.5 font-sans">
                      Enter their unique ID or @username
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowAddModal(false);
                      setAddIdentifier('');
                    }}
                    className="w-8 h-8 rounded-xl bg-black/5 items-center justify-center"
                  >
                    <X color="#6c5ce7" size={16} />
                  </TouchableOpacity>
                </View>

                <View className="bg-purple-soft/30 rounded-2xl border border-purple/10 px-4 py-3.5 mt-4 mb-4">
                  <TextInput
                    value={addIdentifier}
                    onChangeText={setAddIdentifier}
                    placeholder="e.g. bubble-A3F9X7K2 or @username"
                    placeholderTextColor="#9a9aab"
                    className="text-[15px] text-ink font-sans"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View className="flex-row gap-3 mb-2">
                  <TouchableOpacity
                    onPress={() => {
                      setShowAddModal(false);
                      setAddIdentifier('');
                    }}
                    className="flex-1 border border-black/10 rounded-xl py-3 items-center"
                  >
                    <Text className="text-sm font-semibold text-ink-soft font-sans">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAdd}
                    className="flex-1 bg-purple rounded-xl py-3 items-center flex-row justify-center shadow-sm"
                  >
                    <Text className="text-white text-sm font-bold font-sans">Add Contact</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────
// Workroom Sub-Tab
// ─────────────────────────────────────────────
function WorkroomTab({
  onStartCall,
}: {
  onStartCall: (user: any, type: 'voice' | 'video') => void;
}) {
  const [search, setSearch] = useState('');
  const [chats, setChats] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

  const loadCacheAndSync = async () => {
    const cachedChats = await chatCache.getCachedChats();
    setChats(cachedChats);

    try {
      const response = await searchUsers('');
      const coworkersList = response?.users || [];
      setContacts(coworkersList);
    } catch (err) {
      console.warn("Workroom coworker fetch failed, fallback to cache:", err);
      const cachedContacts = await chatCache.getCachedContacts();
      setContacts(cachedContacts);
    }
  };

  useEffect(() => {
    loadCacheAndSync();
    const interval = setInterval(loadCacheAndSync, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter and display group chats and regular workspace members
  const filteredGroups = chats.filter(
    (c) => c.isGroupChat && c.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMembers = contacts.filter((m) =>
    (m.name + (m.org_role || '')).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View className="flex-1">
      {/* Search Bar */}
      <View className="px-5 pb-3 pt-2 flex-row items-center gap-3">
        <View className="flex-1 flex-row items-center bg-purple/10 rounded-3xl border border-purple/5 px-4 py-2.5 shadow-sm shadow-purple/5">
          <Search color="#6c5ce7" size={16} />
          <TextInput
            placeholder="Search groups or members..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="rgba(108,92,231,0.4)"
            className="flex-1 text-[14px] text-ink font-medium font-sans ml-2"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X color="#9a9aab" size={14} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Active Collaborative Groups */}
        {filteredGroups.length > 0 && (
          <View className="mb-4">
            <View className="flex-row items-center mb-3">
              <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-widest font-sans">
                Group Workspaces
              </Text>
              <View className="flex-1 h-[1px] bg-black/5 ml-3" />
            </View>

            {filteredGroups.map((group) => (
              <Link href={`/chat/${group.id}`} key={group.id} asChild>
                <TouchableOpacity
                  activeOpacity={0.75}
                  className="flex-row items-center bg-white border border-black/5 rounded-[22px] px-4 py-4 mb-2.5 shadow-sm shadow-purple/5"
                >
                  <Avatar name={group.name} avatar={group.avatar} size={50} isOnline={false} isGroup={true} />
                  <View className="flex-1 min-w-0 ml-3">
                    <Text className="text-[15px] font-bold text-ink leading-tight font-sans" numberOfLines={1}>
                      {group.name}
                    </Text>
                    <Text className="text-[11px] text-ink-soft mt-0.5 font-sans">
                      Group Chat · {group.messages.length} messages
                    </Text>
                  </View>
                  <View className="h-8 flex-row items-center bg-purple px-3.5 rounded-xl gap-1 shadow-xs">
                    <MessageSquare color="#fff" size={13} />
                    <Text className="text-white text-[11px] font-bold font-sans">Open</Text>
                  </View>
                </TouchableOpacity>
              </Link>
            ))}
          </View>
        )}

        {/* Organization Members */}
        {filteredMembers.length > 0 && (
          <View className="mb-8">
            <View className="flex-row items-center mb-3">
              <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-widest font-sans">
                Org Members
              </Text>
              <View className="flex-1 h-[1px] bg-black/5 ml-3" />
            </View>

            {filteredMembers.map((member) => (
              <View
                key={member.id}
                className="flex-row items-center bg-white border border-black/5 rounded-[22px] px-4 py-3.5 mb-2.5 shadow-sm shadow-purple/5"
              >
                <Link href={`/chat/${member.id}`} asChild>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    className="flex-1 flex-row items-center"
                  >
                    <Avatar name={member.name} avatar={member.avatar} size={50} isOnline={member.isOnline} />
                    <View className="flex-1 min-w-0 ml-3">
                      <View className="flex-row items-center gap-1.5 flex-wrap">
                        <Text className="text-[15px] font-bold text-ink leading-tight font-sans" numberOfLines={1}>
                          {member.name}
                        </Text>
                        {member.org_role && (
                          <View className="bg-purple/10 px-1.5 py-0.5 rounded-full">
                            <Text className="text-[9px] font-bold text-purple uppercase tracking-wider font-sans">
                              {member.org_role}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-[11px] text-ink-soft mt-0.5 font-sans">
                        @{member.username}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Link>

                {/* Action Buttons */}
                <View className="flex-row items-center gap-2 ml-2">
                  <Link href={`/chat/${member.id}`} asChild>
                    <TouchableOpacity className="w-8 h-8 rounded-xl bg-purple-soft/40 items-center justify-center">
                      <MessageSquare color="#6c5ce7" size={14} />
                    </TouchableOpacity>
                  </Link>
                  <TouchableOpacity
                    onPress={() => onStartCall(member, 'voice')}
                    className="w-8 h-8 rounded-xl bg-purple-soft/40 items-center justify-center"
                  >
                    <Phone color="#6c5ce7" size={14} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onStartCall(member, 'video')}
                    className="w-8 h-8 rounded-xl bg-purple-soft/40 items-center justify-center"
                  >
                    <Video color="#6c5ce7" size={14} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────
// Main People Screen
// ─────────────────────────────────────────────
const TABS = ['Contacts', 'Workroom'] as const;
type TabType = (typeof TABS)[number];

export default function PeopleScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('Contacts');
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Call state
  const [activeCall, setActiveCall] = useState<{ user: any; type: 'voice' | 'video' } | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallMuted, setIsCallMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  useEffect(() => {
    let timer: any;
    if (activeCall) {
      setCallDuration(0);
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeCall]);

  const handleStartCall = (user: any, type: 'voice' | 'video') => {
    setActiveCall({ user, type });
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const navigation = useNavigation();
  const [isFocused, setIsFocused] = useState(navigation.isFocused());

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      setIsFocused(true);
    });
    const unsubscribeBlur = navigation.addListener('blur', () => {
      setIsFocused(false);
    });
    setIsFocused(navigation.isFocused());

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

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

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-5 pb-2">
        <View>
          <Svg height="36" width="120">
            <Defs>
              <LinearGradient id="peopleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#6c5ce7" />
                <Stop offset="100%" stopColor="rgba(108,92,231,0.6)" />
              </LinearGradient>
            </Defs>
            <SvgText
              fill="url(#peopleGrad)"
              fontSize="26"
              fontFamily="SpaceGrotesk_700Bold"
              x="0"
              y="26"
              letterSpacing="-0.5"
            >
              People
            </SvgText>
          </Svg>
          <Text className="text-xs text-ink-soft mt-0.5 font-sans">Contacts &amp; your organization</Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View className="flex-row px-6 pb-1 border-b border-black/5">
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`mr-6 pb-3 pt-1 border-b-2 ${
                isActive ? 'border-purple' : 'border-transparent'
              }`}
            >
              <Text
                className={`text-sm font-bold font-sans ${
                  isActive ? 'text-purple' : 'text-ink-soft'
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      <View className="flex-1 pt-3 bg-purple-soft/5">
        {activeTab === 'Contacts' ? (
          <ContactsTab showAddModal={showAddModal} setShowAddModal={setShowAddModal} onStartCall={handleStartCall} />
        ) : (
          <WorkroomTab onStartCall={handleStartCall} />
        )}
      </View>

      {/* ── Tap Outside FAB Menu Dismiss Overlay ── */}
      {isFabMenuOpen && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsFabMenuOpen(false)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99,
            backgroundColor: 'transparent',
          }}
        />
      )}

      {/* ── FAB Side Popover Menu ── */}
      {isFabMenuOpen && (
        <View style={{
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
        }}>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 14 }}
            onPress={() => {
              setIsFabMenuOpen(false);
              setShowAddModal(true);
            }}
          >
            <UserPlus size={16} color="#6c5ce7" style={{ marginRight: 10 }} />
            <Text style={{ fontSize: 13, color: "#1f2030", fontFamily: "Poppins_500Medium" }}>Add Contact</Text>
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.05)" }} />
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 14 }}
            onPress={() => {
              setIsFabMenuOpen(false);
              setShowCreateGroupModal(true);
            }}
          >
            <Users size={16} color="#6c5ce7" style={{ marginRight: 10 }} />
            <Text style={{ fontSize: 13, color: "#1f2030", fontFamily: "Poppins_500Medium" }}>Create Group</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Create Group Chat Modal ── */}
      <Modal visible={showCreateGroupModal} transparent animationType="slide">
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowCreateGroupModal(false)}
          style={{ flex: 1, backgroundColor: "rgba(31,32,48,0.4)", justifyContent: "center", alignItems: "center", padding: 20 }}
        >
          <TouchableOpacity activeOpacity={1} style={{ width: "100%", maxWidth: 320, backgroundColor: "#ffffff", borderRadius: 24, padding: 20, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 17, fontFamily: "SpaceGrotesk_700Bold", color: "#1f2030" }}>Create Group Chat</Text>
              <TouchableOpacity onPress={() => setShowCreateGroupModal(false)}>
                <X size={20} color="#6c5ce7" />
              </TouchableOpacity>
            </View>
            
            <Text style={{ fontSize: 11, fontFamily: "Poppins_700Bold", color: "#9a9aab", textTransform: "uppercase", marginBottom: 6, letterSpacing: 0.5 }}>Group Name</Text>
            <TextInput
              style={{ width: "100%", backgroundColor: "rgba(108,92,231,0.05)", borderWidth: 1, borderColor: "rgba(108,92,231,0.08)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Poppins_400Regular", color: "#1f2030", marginBottom: 16 }}
              placeholder="e.g. Design Sync"
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholderTextColor="#9a9aab"
            />

            <TouchableOpacity
              style={{ backgroundColor: "#6c5ce7", borderRadius: 14, paddingVertical: 12, alignItems: "center", marginTop: 4 }}
              onPress={async () => {
                const name = newGroupName.trim();
                if (!name) return;
                try {
                  await createGroupChat(name, []);
                  setNewGroupName("");
                  setShowCreateGroupModal(false);
                  await chatCache.syncChatsWithBackend();
                } catch (err: any) {
                  Alert.alert("Error", err.message || "Failed to create group.");
                }
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 13, fontFamily: "Poppins_700Bold" }}>Create Group</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Call Overlay Modal ── */}
      <Modal visible={activeCall !== null} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#1f2030' }} className="items-center justify-between py-16 px-6">
          {/* Header */}
          <View className="items-center mt-8">
            <Text className="text-white/60 text-xs font-bold font-sans uppercase tracking-widest mb-2">
              BUBBLE {activeCall?.type === 'video' ? 'VIDEO CALL' : 'VOICE CALL'}
            </Text>
            <Text className="text-white text-2xl font-bold font-sans mt-2">
              {activeCall?.user?.name || activeCall?.user?.full_name || 'Unknown Colleague'}
            </Text>
            <Text className="text-[#6c5ce7] text-sm font-semibold font-sans mt-2">
              {callDuration === 0 ? 'Ringing...' : `Connected • ${formatDuration(callDuration)}`}
            </Text>
          </View>

          {/* Avatar / Video Preview area */}
          <View className="items-center justify-center my-8">
            {activeCall?.type === 'video' ? (
              <View style={{ width: 220, height: 320, borderRadius: 28, backgroundColor: '#000', overflow: 'hidden' }} className="relative shadow-2xl">
                {activeCall?.user?.avatar ? (
                  <Image source={{ uri: activeCall.user.avatar }} style={{ width: '100%', height: '100%', opacity: 0.8 }} />
                ) : (
                  <View className="flex-1 items-center justify-center bg-purple/20">
                    <Text className="text-white text-5xl font-bold font-sans">
                      {getInitials(activeCall?.user?.name || activeCall?.user?.full_name || 'UC')}
                    </Text>
                  </View>
                )}
                {/* Small Self Video Preview overlay */}
                <View style={{ position: 'absolute', bottom: 16, right: 16, width: 70, height: 100, borderRadius: 12, backgroundColor: '#2d3748', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
                  <View className="flex-1 items-center justify-center bg-purple/40">
                    <Text className="text-white/80 text-[10px] font-bold">You</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(108,92,231,0.15)', borderWidth: 4, borderColor: '#6c5ce7' }} className="items-center justify-center shadow-lg">
                {activeCall?.user?.avatar ? (
                  <Image source={{ uri: activeCall.user.avatar }} style={{ width: 132, height: 132, borderRadius: 66 }} />
                ) : (
                  <Text className="text-white text-4xl font-bold font-sans">
                    {getInitials(activeCall?.user?.name || activeCall?.user?.full_name || 'UC')}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Action buttons */}
          <View className="w-full flex-row justify-around items-center px-4 mb-4">
            <TouchableOpacity 
              onPress={() => setIsCallMuted(!isCallMuted)}
              style={{ backgroundColor: isCallMuted ? '#6c5ce7' : 'rgba(255,255,255,0.08)' }} 
              className="w-14 h-14 rounded-full items-center justify-center"
            >
              <MicOff color={isCallMuted ? '#fff' : '#9a9aab'} size={22} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setActiveCall(null)}
              className="w-16 h-16 rounded-full bg-red-500 items-center justify-center shadow-lg shadow-red-500/30"
            >
              <PhoneOff color="#fff" size={24} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setIsSpeakerOn(!isSpeakerOn)}
              style={{ backgroundColor: isSpeakerOn ? '#6c5ce7' : 'rgba(255,255,255,0.08)' }} 
              className="w-14 h-14 rounded-full items-center justify-center"
            >
              <Volume2 color={isSpeakerOn ? '#fff' : '#9a9aab'} size={22} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
