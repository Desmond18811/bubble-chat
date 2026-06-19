import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Clipboard, Switch, Platform } from 'react-native';
import { Image } from 'expo-image';
import { User, Pencil, Mail, Phone, Briefcase, X, Check, LogOut, Copy, Share, Database, ChevronLeft, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Avatar } from '../../components/Avatar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRouter } from 'expo-router';
import { subscribeToPlusButton } from '../../lib/mockData';
import Svg, { Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { authStorage } from '../../lib/authStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getMyProfile, updateProfile, getSecureMediaUrl } from '../../lib/api';

const AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop",
];

const PURPLE = '#6c5ce7';

function getInitials(name: string) {
  if (!name) return 'UC';
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function getGroupInitials(name: string) {
  if (!name) return 'UC';
  const clean = name.trim().replace(/\s+/g, ' ');
  const parts = clean.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export default function ProfileScreen() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const [autoBackup, setAutoBackup] = useState(true);
  const [lastBackupTime, setLastBackupTime] = useState<string>("Today at 2:00 AM");
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Organization settings states
  const [orgData, setOrgData] = useState<{
    name: string;
    inviteCode: string;
    logo: string;
    description: string;
    allowMembersToShareInvite: boolean;
    isAdmin?: boolean;
  } | null>(null);
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [orgFormData, setOrgFormData] = useState({
    name: '',
    description: '',
    logo: '',
    allowMembersToShareInvite: true,
  });
  const [activeOrgTab, setActiveOrgTab] = useState<'info' | 'people' | 'transcripts'>('info');
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [orgTranscripts, setOrgTranscripts] = useState<any[]>([]);
  const [expandedTranscriptId, setExpandedTranscriptId] = useState<string | null>(null);

  useEffect(() => {
    async function loadBackupSettings() {
      try {
        const auto = await AsyncStorage.getItem("bubble_auto_backup");
        if (auto !== null) {
          setAutoBackup(auto === "true");
        }
        const last = await AsyncStorage.getItem("bubble_last_backup_time");
        if (last !== null) {
          setLastBackupTime(last);
        }
      } catch (err) {
        console.warn("Failed to load backup settings:", err);
      }
    }
    loadBackupSettings();
  }, []);

  const toggleAutoBackup = async (value: boolean) => {
    setAutoBackup(value);
    try {
      await AsyncStorage.setItem("bubble_auto_backup", value ? "true" : "false");
    } catch (err) {
      console.warn("Failed to save backup toggle state:", err);
    }
  };

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    try {
      const { chatCache } = await import('../../lib/chatCache');
      const success = await chatCache.performCloudBackup();
      setIsBackingUp(false);
      if (success) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
        const fullTime = `${dateStr} at ${timeStr}`;
        setLastBackupTime(fullTime);
        await AsyncStorage.setItem("bubble_last_backup_time", fullTime);
        Alert.alert(
          "Backup Complete",
          "All end-to-end encrypted chats, message history, and private keypairs have been backed up securely to the cloud."
        );
      } else {
        Alert.alert("Backup Failed", "Failed to backup E2E databases to the cloud. Please check your network and try again.");
      }
    } catch (err: any) {
      setIsBackingUp(false);
      Alert.alert("Backup Failed", err.message || "An unexpected error occurred during backup.");
    }
  };
  const [user, setUser] = useState({
    full_name: 'John Doe',
    username: 'johndoe123',
    org_role: 'Lead Developer',
    organization: 'Bubble',
    bio: 'Passionate about building scalable mobile experiences.',
    email: 'john.doe@example.com',
    phone_number: '+1 234 567 8900',
    chatsCount: 0,
    filesCount: 0,
    avatar: '',
    uniqueTag: '',
    role: '',
  });

  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [isJoiningOrg, setIsJoiningOrg] = useState(false);

  const handleJoinOrg = async () => {
    if (!inviteCodeInput.trim()) {
      Alert.alert("Error", "Please enter an invite code.");
      return;
    }
    setIsJoiningOrg(true);
    try {
      const { joinOrganizationByInvite } = await import('../../lib/api');
      const res = await joinOrganizationByInvite(inviteCodeInput.trim());
      if (res && res.organization) {
        Alert.alert("Success", `Successfully joined ${res.organization.name}!`);
        
        // Refresh local user state
        const updatedUser = {
          ...user,
          organization: res.organization.name,
          role: 'employee',
          org_role: 'Collaborator',
        };
        setUser(updatedUser);
        setFormData(updatedUser);
        await authStorage.updateUser(updatedUser);

        // Fetch organization settings/details
        const { getOrgInviteCode } = await import('../../lib/api');
        const orgRes = await getOrgInviteCode();
        if (orgRes) {
          setOrgData(orgRes);
          setOrgFormData({
            name: orgRes.name || '',
            description: orgRes.description || '',
            logo: orgRes.logo || '',
            allowMembersToShareInvite: orgRes.allowMembersToShareInvite ?? true,
          });
        }
        
        // Sync local chat caches
        const { chatCache } = await import('../../lib/chatCache');
        await chatCache.syncChatsWithBackend();
        await chatCache.syncContactsWithBackend();

        setInviteCodeInput("");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to join organization.");
    } finally {
      setIsJoiningOrg(false);
    }
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

  const [formData, setFormData] = useState({ ...user });

  useEffect(() => {
    if (!isFocused) return;

    async function loadUser() {
      try {
        let currentOrg = '';
        const stored = await authStorage.getUser();
        if (stored) {
          const mapped = {
            ...user,
            ...stored,
            email: stored.email || user.email,
            phone_number: stored.phone_number || user.phone_number,
            full_name: stored.full_name || user.full_name,
            username: stored.username || user.username,
            bio: stored.bio || user.bio,
            org_role: stored.org_role || user.org_role,
            organization: stored.organization || user.organization,
            uniqueTag: stored.uniqueTag || user.uniqueTag,
            role: stored.role || user.role,
          };
          setUser(mapped);
          setFormData(mapped);
          currentOrg = stored.organization || '';
        }
        
        const fresh = await getMyProfile();
        if (fresh?.data) {
          const u = fresh.data;
          await authStorage.updateUser(u);
          const mappedFresh = {
            ...user,
            ...u,
            email: u.email || user.email,
            phone_number: u.phone_number || user.phone_number,
            full_name: u.full_name || user.full_name,
            username: u.username || user.username,
            bio: u.bio || user.bio,
            org_role: u.org_role || user.org_role,
            organization: u.organization || user.organization,
            chatsCount: u.chatsCount ?? user.chatsCount,
            filesCount: u.filesCount ?? user.filesCount,
            uniqueTag: u.uniqueTag || user.uniqueTag,
            role: u.role || user.role,
          };
          setUser(mappedFresh);
          setFormData(mappedFresh);
          currentOrg = u.organization || '';
        }

        if (currentOrg) {
          const { getOrgInviteCode, getOrgMembers, getOrgTranscripts } = await import('../../lib/api');
          const orgRes = await getOrgInviteCode();
          if (orgRes) {
            setOrgData(orgRes);
            setOrgFormData({
              name: orgRes.name || '',
              description: orgRes.description || '',
              logo: orgRes.logo || '',
              allowMembersToShareInvite: orgRes.allowMembersToShareInvite ?? true,
            });
          }
          try {
            const membersRes = await getOrgMembers();
            if (membersRes?.members) {
              setOrgMembers(membersRes.members);
            }
            const transcriptsRes = await getOrgTranscripts();
            if (transcriptsRes?.transcripts) {
              setOrgTranscripts(transcriptsRes.transcripts);
            }
          } catch (orgErr) {
            console.warn("Failed to fetch organization details:", orgErr);
          }
        }
      } catch (e) {
        console.warn("Failed to load user profile in ProfileScreen:", e);
      }
    }
    loadUser();

    const unsubscribePlus = subscribeToPlusButton(() => {
      setIsEditing(true);
    });

    return () => {
      unsubscribePlus();
    };
  }, [isFocused]);

  const handleSave = async () => {
    try {
      const res = await updateProfile({
        full_name: formData.full_name.trim(),
        username: formData.username.trim().toLowerCase(),
        bio: formData.bio.trim(),
        email: formData.email.trim().toLowerCase(),
        phone_number: formData.phone_number.trim(),
      });
      if (res?.data) {
        const u = res.data;
        await authStorage.updateUser(u);
        const updatedUser = {
          ...user,
          ...u,
          full_name: u.full_name || user.full_name,
          username: u.username || user.username,
          bio: u.bio || user.bio,
          email: u.email || user.email,
          phone_number: u.phone_number || user.phone_number,
        };
        setUser(updatedUser);
      }
      setIsEditing(false);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile.");
    }
  };

  const handlePressAvatar = () => {
    Alert.alert(
      "Profile Image",
      "Would you like to change or remove your profile image?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove Image", style: "destructive", onPress: handleRemoveAvatar },
        { text: "Change Image", onPress: () => setIsAvatarModalOpen(true) },
      ]
    );
  };

  const handleRemoveAvatar = async () => {
    try {
      const res = await updateProfile({ avatar: "" });
      if (res?.data) {
        await authStorage.updateUser(res.data);
        setUser(prev => ({ ...prev, avatar: "" }));
      } else {
        setUser(prev => ({ ...prev, avatar: "" }));
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to remove profile image.");
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your gallery to upload a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setIsAvatarModalOpen(false);
        const { uploadAvatar } = await import('../../lib/api');
        const res = await uploadAvatar(uri);
        if (res?.data) {
          const u = res.data.user;
          if (u) {
            await authStorage.updateUser(u);
            setUser(prev => ({ ...prev, avatar: u.avatar }));
          } else {
            setUser(prev => ({ ...prev, avatar: res.data.avatarUrl }));
          }
          Alert.alert("Success", "Profile picture updated successfully!");
          
          // Also sync avatar cache
          const { chatCache } = await import('../../lib/chatCache');
          await chatCache.syncAvatarsWithBackend();
        }
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to upload profile picture.");
    }
  };

  const handleSelectAvatar = async (url: string) => {
    try {
      const res = await updateProfile({ avatar: url });
      if (res?.data) {
        const u = res.data;
        await authStorage.updateUser(u);
        setUser(prev => ({ ...prev, avatar: u.avatar }));
      } else {
        setUser(prev => ({ ...prev, avatar: url }));
      }
      setIsAvatarModalOpen(false);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile image.");
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await authStorage.clearSession();
            router.replace('/login' as any);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center justify-between px-6 pt-5 pb-3 border-b border-black/5">
        <View>
          <Svg height="36" width="140">
            <Defs>
              <LinearGradient id="profileGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#6c5ce7" />
                <Stop offset="100%" stopColor="rgba(108,92,231,0.6)" />
              </LinearGradient>
            </Defs>
            <SvgText
              fill="url(#profileGrad)"
              fontSize="26"
              fontFamily="SpaceGrotesk_700Bold"
              x="0"
              y="26"
              letterSpacing="-0.5"
            >
              Profile
            </SvgText>
          </Svg>
          <Text className="text-xs text-ink-soft font-sans mt-0.5">Manage your account</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 180 }} showsVerticalScrollIndicator={false}>
        <View className="w-full bg-purple-soft/5">
          {/* Hero Card */}
          <View className="bg-purple-soft/20 items-center w-full p-6 border-b border-black/5">
            <TouchableOpacity
              onPress={handlePressAvatar}
              activeOpacity={0.8}
              style={{
                width: 96,
                height: 96,
                borderRadius: 28,
                backgroundColor: user.avatar ? 'rgba(108,92,231,0.1)' : '#000000',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                shadowColor: '#6c5ce7',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
                overflow: 'hidden',
                borderWidth: 1.5,
                borderColor: 'rgba(108,92,231,0.2)',
              }}
            >
              <Avatar
                url={user.avatar}
                userId={(user as any).id || (user as any)._id}
                name={user.organization || user.full_name}
                size={96}
                isGroup={!!user.organization}
                style={{ borderRadius: 28 }}
                imageStyle={{ borderRadius: 28 }}
              />
            </TouchableOpacity>
            <Text className="text-[22px] font-bold text-ink leading-tight font-sans">{user.full_name}</Text>
            <Text className="text-[14px] font-bold text-purple mt-1.5 font-sans">@{user.username}</Text>
            <Text className="text-[14px] font-semibold text-ink-soft mt-1.5 font-sans">{user.org_role}</Text>
            <Text className="text-[14px] text-ink-soft text-center mt-4 leading-relaxed max-w-sm font-sans">{user.bio}</Text>

            {/* Stats row */}
            <View className="flex-row w-full items-center justify-around rounded-2xl bg-white shadow-sm py-4 mt-6 max-w-sm border border-black/5">
              <View className="items-center px-6">
                <Text className="text-[20px] font-bold text-purple font-sans">{user.chatsCount}</Text>
                <Text className="text-[10px] font-semibold text-ink-soft uppercase tracking-wider mt-0.5 font-sans">Chats</Text>
              </View>
              <View className="items-center px-6 border-l border-black/5">
                <Text className="text-[20px] font-bold text-purple font-sans">{user.filesCount}</Text>
                <Text className="text-[10px] font-semibold text-ink-soft uppercase tracking-wider mt-0.5 font-sans">Files</Text>
              </View>
            </View>

            {/* Buttons Row */}
            <View className="flex-row gap-3 mt-6 w-full max-w-sm justify-center">
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                className="flex-1 flex-row items-center justify-center rounded-2xl bg-purple py-3 shadow-lg shadow-purple/20"
              >
                <Pencil color="#fff" size={14} />
                <Text className="text-white text-[14px] font-bold ml-2 font-sans">Edit profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsQrModalOpen(true)}
                className="flex-1 flex-row items-center justify-center rounded-2xl bg-purple py-3 shadow-lg shadow-purple/20"
              >
                <Share color="#fff" size={14} />
                <Text className="text-white text-[14px] font-bold ml-2 font-sans">Share Info</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Contact Details Card */}
          <View className="bg-white w-full p-6 border-b border-black/5">
            <Text className="text-[15px] font-bold text-ink border-b border-black/10 pb-3 mb-5 font-sans">
              Contact details
            </Text>
            
            <View className="space-y-4">
              <View className="flex-row items-center bg-purple-soft/10 p-4 rounded-2xl border border-black/5 mb-3">
                <Mail color="#6c5ce7" size={20} />
                <View className="ml-3 flex-1">
                  <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-wider font-sans">Email</Text>
                  <Text className="text-sm font-semibold text-ink mt-0.5 font-sans">{user.email}</Text>
                </View>
              </View>
              
              <View className="flex-row items-center bg-purple-soft/10 p-4 rounded-2xl border border-black/5 mb-3">
                <Phone color="#6c5ce7" size={20} />
                <View className="ml-3 flex-1">
                  <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-wider font-sans">Phone</Text>
                  <Text className="text-sm font-semibold text-ink mt-0.5 font-sans">{user.phone_number}</Text>
                </View>
              </View>
              
              {user.organization && (
                <View className="flex-row items-center bg-purple-soft/10 p-4 rounded-2xl border border-black/5">
                  <Briefcase color="#6c5ce7" size={20} />
                  <View className="ml-3 flex-1">
                    <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-wider font-sans">Organization</Text>
                    <Text className="text-sm font-semibold text-ink mt-0.5 font-sans">{user.organization} ({user.org_role})</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Organization Settings Card */}
          {user.organization && orgData && (
            <View className="bg-white w-full p-6 border-b border-black/5 mt-3">
              <View className="flex-row justify-between items-center border-b border-black/10 pb-3 mb-4">
                <Text className="text-[15px] font-bold text-ink font-sans">
                  Organization Settings
                </Text>
                {orgData.isAdmin && (
                  <TouchableOpacity onPress={() => setIsEditingOrg(true)} className="bg-purple/10 px-3 py-1 rounded-xl">
                    <Text className="text-purple text-[12px] font-bold font-sans">Edit Settings</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Organization Info Hero */}
              <View className="bg-purple-soft/10 p-4 rounded-2xl border border-black/5 mb-3 flex-row items-center">
                <Avatar
                  url={orgData.logo}
                  name={orgData.name}
                  size={50}
                  isGroup={true}
                  style={{ borderRadius: 16 }}
                  imageStyle={{ borderRadius: 16 }}
                />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-bold text-ink font-sans">{orgData.name}</Text>
                  <Text className="text-xs text-ink-soft mt-0.5 font-sans" numberOfLines={2}>
                    {orgData.description || 'No description set'}
                  </Text>
                </View>
              </View>

              {/* Tab Switcher */}
              <View className="flex-row border-b border-black/5 mb-4 mt-2">
                <TouchableOpacity
                  onPress={() => setActiveOrgTab('info')}
                  className={`mr-4 pb-2 border-b-2 ${activeOrgTab === 'info' ? 'border-purple' : 'border-transparent'}`}
                >
                  <Text className={`text-[12.5px] font-bold ${activeOrgTab === 'info' ? 'text-purple' : 'text-ink-soft'}`}>General</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveOrgTab('people')}
                  className={`mr-4 pb-2 border-b-2 ${activeOrgTab === 'people' ? 'border-purple' : 'border-transparent'}`}
                >
                  <Text className={`text-[12.5px] font-bold ${activeOrgTab === 'people' ? 'text-purple' : 'text-ink-soft'}`}>People</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveOrgTab('transcripts')}
                  className={`pb-2 border-b-2 ${activeOrgTab === 'transcripts' ? 'border-purple' : 'border-transparent'}`}
                >
                  <Text className={`text-[12.5px] font-bold ${activeOrgTab === 'transcripts' ? 'text-purple' : 'text-ink-soft'}`}>Transcripts</Text>
                </TouchableOpacity>
              </View>

              {/* General Tab */}
              {activeOrgTab === 'info' && (
                <View style={{ gap: 10 }}>
                  {orgData.inviteCode ? (
                    <View className="flex-row items-center justify-between bg-purple-soft/10 p-4 rounded-2xl border border-black/5">
                      <View className="flex-1 pr-2">
                        <Text className="text-[13px] font-bold text-ink font-sans">Organization Invite Code</Text>
                        <Text className="text-[11px] text-ink-soft mt-0.5 font-sans leading-tight">Share this code with employees to let them join</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          Clipboard.setString(orgData.inviteCode);
                          Alert.alert("Copied", "Organization invite code copied to clipboard!");
                        }}
                        className="bg-white px-3 py-1.5 rounded-xl border border-black/5 flex-row items-center"
                      >
                        <Copy color="#6c5ce7" size={13} style={{ marginRight: 4 }} />
                        <Text className="text-purple font-bold text-[11.5px] font-sans">{orgData.inviteCode}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View className="bg-red-50/50 p-4 rounded-2xl border border-red-100/30">
                      <Text className="text-[12px] font-bold text-red-500 font-sans">Invite Code Hidden</Text>
                      <Text className="text-[11px] text-ink-soft mt-0.5 font-sans leading-tight">Your administrator has disabled invite code sharing for members.</Text>
                    </View>
                  )}

                  {orgData.isAdmin && (
                    <View className="flex-row items-center justify-between bg-purple-soft/10 p-4 rounded-2xl border border-black/5">
                      <View className="flex-1 pr-2">
                        <Text className="text-[13px] font-bold text-ink font-sans">Allow members to share code</Text>
                        <Text className="text-[11px] text-ink-soft mt-0.5 font-sans leading-tight">If disabled, only admins can view/share the organization code</Text>
                      </View>
                      <Switch
                        value={orgData.allowMembersToShareInvite}
                        onValueChange={async (val) => {
                          try {
                            const { updateOrgProfile } = await import('../../lib/api');
                            const res = await updateOrgProfile({ allowMembersToShareInvite: val });
                            if (res) {
                              setOrgData(prev => prev ? { ...prev, allowMembersToShareInvite: val } : null);
                              setOrgFormData(prev => ({ ...prev, allowMembersToShareInvite: val }));
                            }
                          } catch (e: any) {
                            Alert.alert("Error", e.message || "Failed to update sharing settings.");
                          }
                        }}
                        trackColor={{ false: "#e2e8f0", true: "#6c5ce7" }}
                        thumbColor={Platform.OS === 'ios' ? undefined : orgData.allowMembersToShareInvite ? "#6c5ce7" : "#f4f3f4"}
                      />
                    </View>
                  )}
                </View>
              )}

              {/* People Tab */}
              {activeOrgTab === 'people' && (
                <View style={{ gap: 10 }}>
                  <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-wider mb-1">Employee Directory ({orgMembers.length})</Text>
                  {orgMembers.length === 0 ? (
                    <Text className="text-xs text-ink-soft italic font-sans">No members found</Text>
                  ) : (
                    orgMembers.map(member => (
                      <View key={member.username} className="flex-row items-center bg-purple-soft/5 p-3 rounded-2xl border border-black/5">
                        <Avatar
                          url={member.avatar}
                          userId={member.id || member._id}
                          name={member.full_name || member.username}
                          size={36}
                          style={{ borderRadius: 10 }}
                          imageStyle={{ borderRadius: 10 }}
                        />
                        <View className="ml-3 flex-1">
                          <Text className="text-xs font-bold text-ink font-sans">{member.full_name || member.username}</Text>
                          <Text className="text-[10px] text-ink-soft font-sans">@{member.username}</Text>
                        </View>
                        <View className="bg-purple/10 px-2 py-0.5 rounded-lg">
                          <Text className="text-purple font-bold text-[9px] uppercase font-sans">
                            {member.org_role || (member.role === 'admin' ? 'Admin' : 'Member')}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* Transcripts Tab */}
              {activeOrgTab === 'transcripts' && (
                <View style={{ gap: 10 }}>
                  <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-wider mb-1">Meeting History ({orgTranscripts.length})</Text>
                  {orgTranscripts.length === 0 ? (
                    <Text className="text-xs text-ink-soft italic font-sans">No meeting history found</Text>
                  ) : (
                    orgTranscripts.map(meeting => {
                      const isExpanded = expandedTranscriptId === meeting.roomId;
                      return (
                        <View key={meeting.roomId} className="bg-purple-soft/5 rounded-2xl border border-black/5 overflow-hidden">
                          <TouchableOpacity
                            onPress={() => setExpandedTranscriptId(isExpanded ? null : meeting.roomId)}
                            className="p-4 flex-row items-center justify-between"
                          >
                            <View className="flex-1 pr-2">
                              <Text className="text-xs font-bold text-ink font-sans">{meeting.title || 'Untitled Meeting'}</Text>
                              <Text className="text-[10.5px] text-ink-soft font-sans mt-0.5">
                                Hosted by {meeting.host?.name || 'Unknown'} · {new Date(meeting.timing || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </Text>
                            </View>
                            <ChevronLeft size={16} color="#6c5ce7" style={{ transform: [{ rotate: isExpanded ? '-90deg' : '0deg' }] }} />
                          </TouchableOpacity>

                          {isExpanded && (
                            <View className="px-4 pb-4 border-t border-black/5 pt-3" style={{ gap: 12 }}>
                              <View className="flex-row items-center justify-between">
                                <Text className="text-[10.5px] text-ink-soft font-sans">Duration: {Math.ceil((meeting.duration || 0) / 60)} mins</Text>
                                <Text className="text-[10.5px] text-ink-soft font-sans">Type: {meeting.type || 'Voice'}</Text>
                              </View>

                              {meeting.summary ? (
                                <View className="bg-purple-soft/10 p-3 rounded-xl border border-purple/5">
                                  <Text className="text-[11px] font-bold text-purple uppercase mb-1">Detailed Intelligence</Text>
                                  <Text className="text-[11.5px] text-ink font-sans leading-relaxed">{meeting.summary}</Text>
                                </View>
                              ) : null}

                              {meeting.actionItems && meeting.actionItems.length > 0 ? (
                                <View>
                                  <Text className="text-[11px] font-bold text-purple uppercase mb-1">Action Items</Text>
                                  <View style={{ gap: 4 }} className="mt-1">
                                    {meeting.actionItems.map((item: string, idx: number) => (
                                      <View key={idx} className="flex-row items-start gap-1">
                                        <Text className="text-[11.5px] text-ink">•</Text>
                                        <Text className="text-[11.5px] text-ink font-sans flex-1">{item}</Text>
                                      </View>
                                    ))}
                                  </View>
                                </View>
                              ) : null}

                              {meeting.rawTranscript ? (
                                <View>
                                  <Text className="text-[11px] font-bold text-ink-soft uppercase mb-1">Raw Transcript</Text>
                                  <ScrollView style={{ maxHeight: 100 }} nestedScrollEnabled className="bg-black/5 p-2.5 rounded-xl border border-black/5">
                                    <Text className="text-[10px] text-ink-soft font-mono leading-relaxed">{meeting.rawTranscript}</Text>
                                  </ScrollView>
                                </View>
                              ) : null}
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          )}

          {/* Join Organization Card */}
          {!user.organization && (
            <View className="bg-white w-full p-6 border-b border-black/5 mt-3">
              <Text className="text-[15px] font-bold text-ink border-b border-black/10 pb-3 mb-5 font-sans">
                Join Organization
              </Text>
              
              <View className="bg-purple-soft/10 p-4 rounded-2xl border border-black/5">
                <Text className="text-[13px] font-bold text-ink font-sans mb-1">Have an Organization Code?</Text>
                <Text className="text-[11px] text-ink-soft mb-3 font-sans leading-tight">
                  Enter the invite code provided by your organization admin to gain access to workspace resources and chats immediately.
                </Text>
                
                <View className="flex-row gap-2.5 items-center">
                  <TextInput
                    placeholder="Enter Invite Code"
                    value={inviteCodeInput}
                    onChangeText={setInviteCodeInput}
                    placeholderTextColor="#9a9aab"
                    className="flex-1 bg-white border border-black/5 h-11 px-3.5 rounded-xl text-ink font-sans text-sm"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={handleJoinOrg}
                    disabled={isJoiningOrg}
                    className="bg-purple h-11 px-4 rounded-xl items-center justify-center shadow-xs"
                  >
                    <Text className="text-white text-xs font-bold font-sans">
                      {isJoiningOrg ? 'Joining...' : 'Join'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Backup & Restore Card */}
          <View className="bg-white w-full p-6 border-b border-black/5 mt-3">
            <Text className="text-[15px] font-bold text-ink border-b border-black/10 pb-3 mb-5 font-sans">
              Backup & Encrypted Storage
            </Text>
            
            <View className="bg-purple-soft/10 p-4 rounded-2xl border border-black/5">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1 pr-2">
                  <Database color="#6c5ce7" size={20} style={{ marginRight: 10 }} />
                  <View className="flex-1">
                    <Text className="text-[14px] font-bold text-ink font-sans">Automatic Backup</Text>
                    <Text className="text-[11px] text-ink-soft mt-0.5 font-sans leading-tight">Cloud backup of E2E keys and chats at 2:00 AM</Text>
                  </View>
                </View>
                <Switch
                  value={autoBackup}
                  onValueChange={toggleAutoBackup}
                  trackColor={{ false: "#e2e8f0", true: "#6c5ce7" }}
                  thumbColor={Platform.OS === 'ios' ? undefined : autoBackup ? "#6c5ce7" : "#f4f3f4"}
                />
              </View>
              
              <View className="border-t border-black/5 pt-3 flex-row items-center justify-between">
                <Text className="text-[11.5px] font-semibold text-ink-soft font-sans">
                  Last Backup: {lastBackupTime || 'Never'}
                </Text>
                <TouchableOpacity 
                  onPress={handleManualBackup}
                  disabled={isBackingUp}
                  className="bg-purple/10 px-4 py-1.5 rounded-xl border border-purple/20"
                >
                  <Text className="text-purple text-[11px] font-bold font-sans">
                    {isBackingUp ? 'Backing up...' : 'Backup Now'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Logout */}
          <View className="bg-white w-full p-6">
            <TouchableOpacity
              onPress={handleLogout}
              className="flex-row items-center justify-center rounded-2xl border border-red-100 bg-red-50 px-6 py-4"
            >
              <LogOut color="#ef4444" size={18} />
              <Text className="text-red-500 text-[15px] font-bold ml-2 font-sans">Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={isEditing} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-black/5">
            <View>
              <Text className="text-xl font-bold text-ink">Edit profile</Text>
              <Text className="text-xs text-ink-soft">Update your information</Text>
            </View>
            <TouchableOpacity onPress={() => { setFormData(user); setIsEditing(false); }}>
              <X color="#6c5ce7" size={20} />
            </TouchableOpacity>
          </View>
          
          <ScrollView className="flex-1 px-6 pt-6">
            <View className="bg-purple-soft/30 rounded-3xl border border-black/5 p-6 mb-8">
              <View className="mb-4">
                <Text className="text-xs font-bold text-ink uppercase mb-1">Full Name</Text>
                <TextInput
                  value={formData.full_name}
                  onChangeText={(t) => setFormData({...formData, full_name: t})}
                  className="bg-white rounded-2xl p-4 text-ink border border-black/5"
                />
              </View>
              
              <View className="mb-4">
                <Text className="text-xs font-bold text-ink uppercase mb-1">Username</Text>
                <TextInput
                  value={formData.username}
                  onChangeText={(t) => setFormData({...formData, username: t})}
                  className="bg-white rounded-2xl p-4 text-ink border border-black/5"
                  autoCapitalize="none"
                />
              </View>
              
              <View className="mb-4">
                <Text className="text-xs font-bold text-ink uppercase mb-1">Bio</Text>
                <TextInput
                  value={formData.bio}
                  onChangeText={(t) => setFormData({...formData, bio: t})}
                  className="bg-white rounded-2xl p-4 text-ink border border-black/5 min-h-[80px]"
                  multiline
                  textAlignVertical="top"
                />
              </View>
              
              <View className="mb-4">
                <Text className="text-xs font-bold text-ink uppercase mb-1">Email</Text>
                <TextInput
                  value={formData.email}
                  onChangeText={(t) => setFormData({...formData, email: t})}
                  className="bg-white rounded-2xl p-4 text-ink border border-black/5"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View className="mb-4">
                <Text className="text-xs font-bold text-ink uppercase mb-1">Phone Number</Text>
                <TextInput
                  value={formData.phone_number}
                  onChangeText={(t) => setFormData({...formData, phone_number: t})}
                  className="bg-white rounded-2xl p-4 text-ink border border-black/5"
                  keyboardType="phone-pad"
                />
              </View>
              
              <TouchableOpacity
                onPress={handleSave}
                className="bg-purple py-4 rounded-xl items-center flex-row justify-center mt-2"
              >
                <Check color="#fff" size={16} />
                <Text className="text-white font-bold ml-2">Save Changes</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Organization Modal */}
      <Modal visible={isEditingOrg} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-black/5">
            <View>
              <Text className="text-xl font-bold text-ink">Edit Organization</Text>
              <Text className="text-xs text-ink-soft">Update your organization's settings</Text>
            </View>
            <TouchableOpacity onPress={() => setIsEditingOrg(false)}>
              <X color="#6c5ce7" size={20} />
            </TouchableOpacity>
          </View>
          
          <ScrollView className="flex-1 px-6 pt-6">
            <View className="bg-purple-soft/30 rounded-3xl border border-black/5 p-6 mb-8">
              <View className="mb-4">
                <Text className="text-xs font-bold text-ink uppercase mb-2">Organization Logo</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 5 }}>
                  {AVATARS.map((url) => (
                    <TouchableOpacity
                      key={url}
                      onPress={() => setOrgFormData({...orgFormData, logo: url})}
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 16,
                        borderWidth: orgFormData.logo === url ? 3 : 0,
                        borderColor: PURPLE,
                        overflow: 'hidden',
                      }}
                    >
                      <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View className="mb-4">
                <Text className="text-xs font-bold text-ink uppercase mb-1">Organization Name</Text>
                <TextInput
                  value={orgFormData.name}
                  onChangeText={(t) => setOrgFormData({...orgFormData, name: t})}
                  className="bg-white rounded-2xl p-4 text-ink border border-black/5"
                />
              </View>
              
              <View className="mb-4">
                <Text className="text-xs font-bold text-ink uppercase mb-1">Description</Text>
                <TextInput
                  value={orgFormData.description}
                  onChangeText={(t) => setOrgFormData({...orgFormData, description: t})}
                  className="bg-white rounded-2xl p-4 text-ink border border-black/5 min-h-[80px]"
                  multiline
                  textAlignVertical="top"
                />
              </View>
              
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const { updateOrgProfile } = await import('../../lib/api');
                    const res = await updateOrgProfile({
                      name: orgFormData.name.trim(),
                      description: orgFormData.description.trim(),
                      logo: orgFormData.logo,
                      allowMembersToShareInvite: orgFormData.allowMembersToShareInvite,
                    });
                    if (res?.organization) {
                      setOrgData(res.organization);
                      setUser(prev => ({ ...prev, organization: res.organization.name }));
                      Alert.alert("Success", "Organization settings updated successfully.");
                      setIsEditingOrg(false);
                    }
                  } catch (err: any) {
                    Alert.alert("Error", err.message || "Failed to update organization settings.");
                  }
                }}
                className="bg-purple py-4 rounded-xl items-center flex-row justify-center mt-2"
              >
                <Check color="#fff" size={16} />
                <Text className="text-white font-bold ml-2">Save Settings</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Choose Avatar Modal */}
      <Modal visible={isAvatarModalOpen} transparent animationType="slide">
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsAvatarModalOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(31,32,48,0.4)',
            justifyContent: 'flex-end',
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', color: '#1f2030' }}>
                Select Profile Image
              </Text>
              <TouchableOpacity onPress={() => setIsAvatarModalOpen(false)} style={{ padding: 4 }}>
                <X color={PURPLE} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 10 }}>
              {/* Pick from Gallery Option */}
              <TouchableOpacity
                onPress={handlePickFromGallery}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: PURPLE,
                  borderStyle: 'dashed',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(108,92,231,0.05)',
                }}
              >
                <Plus color={PURPLE} size={22} />
                <Text style={{ fontSize: 9, color: PURPLE, fontFamily: 'Poppins_600SemiBold', marginTop: 2 }}>Gallery</Text>
              </TouchableOpacity>

              {AVATARS.map((url) => (
                <TouchableOpacity
                  key={url}
                  onPress={() => handleSelectAvatar(url)}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 20,
                    borderWidth: user.avatar === url ? 3 : 0,
                    borderColor: PURPLE,
                    overflow: 'hidden',
                  }}
                >
                  <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* QR Info Share Modal */}
      <Modal visible={isQrModalOpen} transparent animationType="slide">
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsQrModalOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(31,32,48,0.4)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              width: '100%',
              maxWidth: 320,
              backgroundColor: '#ffffff',
              borderRadius: 28,
              padding: 24,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', color: '#1f2030' }}>
                Share Contact Info
              </Text>
              <TouchableOpacity onPress={() => setIsQrModalOpen(false)} style={{ padding: 4 }}>
                <X color={PURPLE} size={20} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: '#9a9aab', fontFamily: 'Poppins_500Medium', textAlign: 'center', marginBottom: 16 }}>
              Let others scan this QR to instantly add you on Bubble Chat.
            </Text>

            <View style={{ width: 220, height: 220, borderRadius: 20, backgroundColor: '#f8f7ff', borderWidth: 1, borderColor: 'rgba(108,92,231,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20, overflow: 'hidden' }}>
              <Image 
                source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=6c5ce7&data=${encodeURIComponent(user.uniqueTag || user.email || user.username || 'unknown')}` }} 
                style={{ width: 200, height: 200 }} 
              />
            </View>

            <Text style={{ fontSize: 11, fontFamily: 'Poppins_700Bold', color: '#9a9aab', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>
              Your Bubble ID
            </Text>
            
            <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(108,92,231,0.05)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 20 }}>
              <Text style={{ flex: 1, fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#1f2030' }} numberOfLines={1}>
                {user.uniqueTag || user.email || user.username || 'N/A'}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  const tag = user.uniqueTag || user.email || user.username || '';
                  Clipboard.setString(tag);
                  setCopiedText(true);
                  setTimeout(() => setCopiedText(false), 2000);
                }}
                style={{ padding: 4 }}
              >
                <Copy color={PURPLE} size={16} />
              </TouchableOpacity>
            </View>

            {copiedText && (
              <Text style={{ fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: '#22c55e', marginBottom: 12 }}>
                Copied to Clipboard!
              </Text>
            )}

            <TouchableOpacity
              onPress={() => setIsQrModalOpen(false)}
              style={{ width: '100%', backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'Poppins_700Bold' }}>Dismiss</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
