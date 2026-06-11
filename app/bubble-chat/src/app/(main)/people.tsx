import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
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
  MoreVertical,
  ChevronRight,
} from 'lucide-react-native';
import { Link } from 'expo-router';

// ─────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────

const MOCK_CONTACTS = [
  {
    id: '1',
    full_name: 'Alex Rivera',
    username: 'alex_rivera',
    org_role: 'Product Designer',
    organization: 'Bubble',
    avatar: null,
    isOnline: true,
  },
  {
    id: '2',
    full_name: 'Sarah Chen',
    username: 'sarah_chen',
    org_role: 'Frontend Engineer',
    organization: 'Bubble',
    avatar: null,
    isOnline: true,
  },
  {
    id: '3',
    full_name: 'David Kim',
    username: 'david_kim',
    org_role: 'Backend Engineer',
    organization: 'Bubble',
    avatar: null,
    isOnline: false,
  },
  {
    id: '4',
    full_name: 'Emma Watson',
    username: 'emma_watson',
    org_role: 'UX Researcher',
    organization: 'Bubble',
    avatar: null,
    isOnline: false,
  },
  {
    id: '5',
    full_name: 'Marcus Johnson',
    username: 'marcus_j',
    org_role: 'Marketing Lead',
    organization: 'Bubble',
    avatar: null,
    isOnline: true,
  },
];

const MOCK_SUGGESTIONS = [
  { id: 's1', full_name: 'Helena Rostova', username: 'helena_r', org_role: 'Data Analyst' },
  { id: 's2', full_name: 'Tyler Durden', username: 'tyler_d', org_role: 'Operations' },
  { id: 's3', full_name: 'Priya Nair', username: 'priya_n', org_role: 'QA Engineer' },
];

const MOCK_COWORKERS = [
  {
    id: 'w1',
    full_name: 'Alice Johnson',
    username: 'alice_j',
    org_role: 'Lead Designer',
    organization: 'Bubble',
    isOnline: true,
  },
  {
    id: 'w2',
    full_name: 'Bob Smith',
    username: 'bob_smith',
    org_role: 'Engineer',
    organization: 'Bubble',
    isOnline: false,
  },
  {
    id: 'w3',
    full_name: 'Charlie Davis',
    username: 'charlie_d',
    org_role: 'Product Manager',
    organization: 'Bubble',
    isOnline: true,
  },
  {
    id: 'w4',
    full_name: 'Diana Prince',
    username: 'diana_p',
    org_role: 'Marketing Specialist',
    organization: 'Bubble',
    isOnline: false,
  },
  {
    id: 'w5',
    full_name: 'Ethan Hunt',
    username: 'ethan_h',
    org_role: 'DevOps Engineer',
    organization: 'Bubble',
    isOnline: true,
  },
  {
    id: 'w6',
    full_name: 'Fiona Gallagher',
    username: 'fiona_g',
    org_role: 'Customer Success',
    organization: 'Bubble',
    isOnline: false,
  },
];

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

// ─────────────────────────────────────────────
// Avatar Component
// ─────────────────────────────────────────────

function Avatar({
  name,
  size = 52,
  isOnline,
}: {
  name: string;
  size?: number;
  isOnline?: boolean;
}) {
  return (
    <View style={{ width: size, height: size }} className="relative shrink-0">
      <View
        style={{ width: size, height: size, borderRadius: size * 0.38 }}
        className="bg-purple/10 items-center justify-center"
      >
        <Text
          style={{ fontSize: size * 0.33 }}
          className="text-purple font-bold"
        >
          {getInitials(name)}
        </Text>
      </View>
      {isOnline && (
        <View
          className="absolute -bottom-0.5 -right-0.5 bg-green-500 rounded-full border-2 border-white"
          style={{ width: size * 0.27, height: size * 0.27 }}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
// Contacts Sub-Tab
// ─────────────────────────────────────────────

function ContactsTab() {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addIdentifier, setAddIdentifier] = useState('');
  const [contacts, setContacts] = useState(MOCK_CONTACTS);

  const filtered = contacts.filter((c) =>
    (c.full_name + c.username).toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    // Mock: just close the modal
    setAddIdentifier('');
    setShowAddModal(false);
  };

  return (
    <View className="flex-1">
      {/* Search + Action Row */}
      <View className="px-5 pb-3 pt-2 flex-row items-center gap-3">
        <View className="flex-1 flex-row items-center bg-purple/10 rounded-3xl border border-purple/5 px-4 py-2.5">
          <Search color="#6c5ce7" size={16} />
          <TextInput
            placeholder="Search contacts..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="rgba(108,92,231,0.4)"
            className="flex-1 text-[14px] text-ink font-medium ml-2"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X color="#9a9aab" size={14} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          className="flex-row items-center bg-purple rounded-2xl px-4 py-2.5"
        >
          <UserPlus color="#fff" size={15} />
          <Text className="text-white text-xs font-bold ml-1.5">Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Section header */}
        <View className="flex-row items-center mb-3 mt-1">
          <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">
            My Contacts
          </Text>
          <View className="flex-1 h-[1px] bg-black/5 ml-3" />
          <View className="ml-3 bg-purple/10 px-2 py-0.5 rounded-full">
            <Text className="text-[9px] font-bold text-purple uppercase">
              {contacts.length} Total
            </Text>
          </View>
        </View>

        {filtered.length === 0 ? (
          <View className="py-16 items-center justify-center border-2 border-dashed border-black/5 rounded-3xl mt-2">
            <View className="w-16 h-16 rounded-3xl bg-purple-soft/50 items-center justify-center mb-4">
              <Users color="#6c5ce7" size={28} />
            </View>
            <Text className="text-base font-bold text-ink">No contacts found</Text>
            <Text className="text-xs text-ink-soft mt-1 text-center max-w-[220px] leading-relaxed">
              {search
                ? 'Try a different name or username'
                : 'Add contacts to start connecting with people'}
            </Text>
            {!search && (
              <TouchableOpacity
                onPress={() => setShowAddModal(true)}
                className="mt-5 bg-purple px-5 py-3 rounded-2xl"
              >
                <Text className="text-white text-xs font-bold">
                  Add your first contact
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map((contact) => (
            <Link href={`/chat/${contact.id}`} key={contact.id} asChild>
              <TouchableOpacity
                activeOpacity={0.75}
                className="flex-row items-center bg-white border border-black/5 rounded-2xl px-4 py-3.5 mb-2.5"
              >
                <Avatar name={contact.full_name} size={50} isOnline={contact.isOnline} />

                {/* Info */}
                <View className="flex-1 min-w-0 ml-3">
                  <Text className="text-[15px] font-bold text-ink leading-tight" numberOfLines={1}>
                    {contact.full_name}
                  </Text>
                  <Text className="text-[11px] text-ink-soft mt-0.5" numberOfLines={1}>
                    @{contact.username}
                    {contact.org_role ? ` · ${contact.org_role}` : ''}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View className="flex-row items-center gap-2 ml-2">
                  <TouchableOpacity className="w-8 h-8 rounded-xl bg-purple-soft items-center justify-center">
                    <Phone color="#6c5ce7" size={14} />
                  </TouchableOpacity>
                  <TouchableOpacity className="w-8 h-8 rounded-xl bg-purple-soft items-center justify-center">
                    <Video color="#6c5ce7" size={14} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Link>
          ))
        )}

        {/* People You May Know */}
        {MOCK_SUGGESTIONS.length > 0 && (
          <View className="mt-4 mb-8">
            <View className="flex-row items-center mb-3">
              <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">
                People You May Know
              </Text>
              <View className="flex-1 h-[1px] bg-black/5 ml-3" />
            </View>
            {MOCK_SUGGESTIONS.map((s) => (
              <View
                key={s.id}
                className="flex-row items-center bg-white border border-black/5 rounded-2xl px-4 py-3.5 mb-2.5"
              >
                <Avatar name={s.full_name} size={44} />
                <View className="flex-1 min-w-0 ml-3">
                  <Text className="text-[14px] font-bold text-ink leading-tight" numberOfLines={1}>
                    {s.full_name}
                  </Text>
                  <Text className="text-[11px] text-ink-soft mt-0.5">{s.org_role}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setAddIdentifier(s.username);
                    setShowAddModal(true);
                  }}
                  className="flex-row items-center bg-purple/10 border border-purple/20 px-3 py-1.5 rounded-xl"
                >
                  <UserPlus color="#6c5ce7" size={13} />
                  <Text className="text-[11px] font-bold text-purple ml-1">Add</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Friend Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <SafeAreaView className="bg-white rounded-t-3xl" edges={['bottom']}>
            <View className="px-6 pt-6 pb-2">
              <View className="flex-row items-start justify-between mb-2">
                <View>
                  <Text className="text-lg font-bold text-ink">Add a Contact</Text>
                  <Text className="text-xs text-ink-soft mt-0.5">
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
                  <X color="#9a9aab" size={16} />
                </TouchableOpacity>
              </View>

              <View className="bg-purple-soft/30 rounded-2xl border border-purple/10 px-4 py-3.5 mt-4 mb-4">
                <TextInput
                  value={addIdentifier}
                  onChangeText={setAddIdentifier}
                  placeholder="e.g. bubble-A3F9X7K2 or @username"
                  placeholderTextColor="#9a9aab"
                  className="text-[15px] text-ink"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Suggestions in modal */}
              {MOCK_SUGGESTIONS.length > 0 && (
                <View className="mb-4">
                  <Text className="text-[10px] font-semibold text-ink-soft uppercase tracking-wider mb-2">
                    People you may know
                  </Text>
                  {MOCK_SUGGESTIONS.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setAddIdentifier(s.username)}
                      className={`flex-row items-center py-2 px-3 rounded-xl mb-1 ${
                        addIdentifier === s.username
                          ? 'bg-purple/10 border border-purple/20'
                          : 'bg-transparent'
                      }`}
                    >
                      <Avatar name={s.full_name} size={36} />
                      <View className="flex-1 ml-3 min-w-0">
                        <Text className="text-sm font-semibold text-ink">{s.full_name}</Text>
                        <Text className="text-[11px] text-ink-soft">@{s.username}</Text>
                      </View>
                      {addIdentifier === s.username && (
                        <Check color="#6c5ce7" size={16} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View className="flex-row gap-3 mb-2">
                <TouchableOpacity
                  onPress={() => {
                    setShowAddModal(false);
                    setAddIdentifier('');
                  }}
                  className="flex-1 border border-black/10 rounded-xl py-3 items-center"
                >
                  <Text className="text-sm font-semibold text-ink-soft">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAdd}
                  className="flex-1 bg-purple rounded-xl py-3 items-center flex-row justify-center"
                >
                  <Check color="#fff" size={14} />
                  <Text className="text-white text-sm font-bold ml-1.5">Add Contact</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────
// Workroom Sub-Tab
// ─────────────────────────────────────────────

function WorkroomTab() {
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');

  const filtered = MOCK_COWORKERS.filter((w) =>
    (w.full_name + w.username + w.org_role)
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <View className="flex-1">
      {/* Search + Create Group */}
      <View className="px-5 pb-3 pt-2 flex-row items-center gap-3">
        <View className="flex-1 flex-row items-center bg-purple/10 rounded-3xl border border-purple/5 px-4 py-2.5">
          <Search color="#6c5ce7" size={16} />
          <TextInput
            placeholder="Search coworkers..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="rgba(108,92,231,0.4)"
            className="flex-1 text-[14px] text-ink font-medium ml-2"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X color="#9a9aab" size={14} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          className="flex-row items-center bg-purple/10 border border-purple/20 rounded-2xl px-3.5 py-2.5"
        >
          <Plus color="#6c5ce7" size={15} />
          <Text className="text-purple text-xs font-bold ml-1">Group</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Section header */}
        <View className="flex-row items-center mb-3 mt-1">
          <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">
            Everyone in Your Org
          </Text>
          <View className="flex-1 h-[1px] bg-black/5 ml-3" />
          <View className="ml-3 bg-purple/10 px-2 py-0.5 rounded-full">
            <Text className="text-[9px] font-bold text-purple uppercase">
              {MOCK_COWORKERS.length} Members
            </Text>
          </View>
        </View>

        {filtered.length === 0 ? (
          <View className="py-16 items-center justify-center border-2 border-dashed border-black/5 rounded-3xl mt-2">
            <View className="w-16 h-16 rounded-3xl bg-purple-soft/50 items-center justify-center mb-4">
              <Briefcase color="#6c5ce7" size={28} />
            </View>
            <Text className="text-base font-bold text-ink">No coworkers found</Text>
            <Text className="text-xs text-ink-soft mt-1 text-center max-w-[240px] leading-relaxed">
              {search
                ? 'Try a different name or role'
                : 'Members of your organization will appear here'}
            </Text>
          </View>
        ) : (
          <>
            {filtered.map((worker) => (
              <Link href={`/chat/${worker.id}`} key={worker.id} asChild>
                <TouchableOpacity
                  activeOpacity={0.75}
                  className="flex-row items-center bg-white border border-black/5 rounded-[22px] px-4 py-4 mb-2.5"
                >
                  {/* Avatar */}
                  <Avatar name={worker.full_name} size={50} isOnline={worker.isOnline} />

                  {/* Info */}
                  <View className="flex-1 min-w-0 ml-3">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text className="text-[15px] font-bold text-ink leading-tight" numberOfLines={1}>
                        {worker.full_name}
                      </Text>
                      {worker.org_role && (
                        <View className="bg-purple/10 px-1.5 py-0.5 rounded-full">
                          <Text className="text-[9px] font-bold text-purple uppercase tracking-wider">
                            {worker.org_role}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-[11px] text-ink-soft mt-0.5">
                      @{worker.username}
                      {worker.isOnline ? ' · Online' : ''}
                    </Text>
                  </View>

                  {/* Message CTA */}
                  <View className="flex-row items-center gap-1.5 ml-2">
                    <TouchableOpacity className="h-8 flex-row items-center bg-purple px-3 rounded-xl gap-1 shadow-sm">
                      <MessageSquare color="#fff" size={13} />
                      <Text className="text-white text-[11px] font-bold">Chat</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Link>
            ))}

            {/* Bottom spacing */}
            <View className="h-8" />
          </>
        )}
      </ScrollView>

      {/* Create Group Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <SafeAreaView className="bg-white rounded-t-3xl" edges={['bottom']}>
            <View className="px-6 pt-6 pb-2">
              <View className="flex-row items-start justify-between mb-5">
                <View>
                  <Text className="text-lg font-bold text-ink">Create Group</Text>
                  <Text className="text-xs text-ink-soft mt-0.5">
                    Start a new group conversation
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setShowCreateModal(false);
                    setGroupName('');
                  }}
                  className="w-8 h-8 rounded-xl bg-black/5 items-center justify-center"
                >
                  <X color="#9a9aab" size={16} />
                </TouchableOpacity>
              </View>

              <Text className="text-xs font-bold text-ink uppercase mb-1.5">Group Name</Text>
              <View className="bg-purple-soft/30 rounded-2xl border border-purple/10 px-4 py-3.5 mb-5">
                <TextInput
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="e.g. Design Team"
                  placeholderTextColor="#9a9aab"
                  className="text-[15px] text-ink"
                />
              </View>

              <View className="flex-row gap-3 mb-2">
                <TouchableOpacity
                  onPress={() => {
                    setShowCreateModal(false);
                    setGroupName('');
                  }}
                  className="flex-1 border border-black/10 rounded-xl py-3 items-center"
                >
                  <Text className="text-sm font-semibold text-ink-soft">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowCreateModal(false);
                    setGroupName('');
                  }}
                  className="flex-1 bg-purple rounded-xl py-3 items-center flex-row justify-center"
                >
                  <Check color="#fff" size={14} />
                  <Text className="text-white text-sm font-bold ml-1.5">Create Group</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
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

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
        <View>
          <Text className="text-2xl font-extrabold text-purple tracking-tight">People</Text>
          <Text className="text-xs text-ink-soft mt-0.5">Contacts &amp; your organization</Text>
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
                className={`text-sm font-bold ${
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
      <View className="flex-1 pt-3">
        {activeTab === 'Contacts' ? <ContactsTab /> : <WorkroomTab />}
      </View>
    </SafeAreaView>
  );
}
