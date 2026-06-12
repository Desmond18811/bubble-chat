import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Image } from 'react-native';
import { User, Pencil, Mail, Phone, Briefcase, X, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { subscribeToPlusButton } from '../../lib/mockData';
import Svg, { Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { appStorage, getMyProfile, updateProfile } from '../../lib/api';

const AVATAR_OPTIONS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=160&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=160&auto=format&fit=crop",
];

const getInitials = (name?: string) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export default function ProfileScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState({
    full_name: 'John Doe',
    username: 'johndoe123',
    org_role: 'Lead Developer',
    organization: 'Bubble',
    bio: 'Passionate about building scalable mobile experiences.',
    email: 'john.doe@example.com',
    phone_number: '+1 234 567 8900',
    avatar: '',
    chatsCount: 142,
    filesCount: 38
  });

  const navigation = useNavigation();
  const [isFocused, setIsFocused] = useState(navigation.isFocused());
  const [formData, setFormData] = useState({ ...user });

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
    const loadProfile = async () => {
      // 1. Sync from local cache immediately
      const cached = appStorage.getItem('user_data');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setUser(prev => ({ ...prev, ...parsed }));
          setFormData(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          console.log("Error parsing cached profile:", e);
        }
      }

      // 2. Fetch fresh details from API
      try {
        const res = await getMyProfile();
        if (res && res.data) {
          const freshData = res.data;
          setUser(prev => ({ ...prev, ...freshData }));
          setFormData(prev => ({ ...prev, ...freshData }));
          appStorage.setItem('user_data', JSON.stringify(freshData));
        }
      } catch (err) {
        console.log("Error loading profile from API:", err);
      }
    };

    if (isFocused) {
      loadProfile();
    }
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused) return;

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
        full_name: formData.full_name,
        username: formData.username,
        bio: formData.bio,
        email: formData.email,
        phone_number: formData.phone_number,
        avatar: formData.avatar,
      });
      if (res && res.data) {
        setUser(prev => ({ ...prev, ...res.data }));
        appStorage.setItem('user_data', JSON.stringify(res.data));
      }
    } catch (err: any) {
      console.error("Failed to update profile via API:", err);
      setUser(prev => ({ ...prev, ...formData }));
    }
    setIsEditing(false);
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

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="w-full bg-purple-soft/5">
          {/* Hero Card */}
          <View className="bg-purple-soft/20 items-center w-full p-6 border-b border-black/5">
            <View className="w-24 h-24 rounded-3xl bg-purple/10 overflow-hidden items-center justify-center mb-4 shadow-sm border border-purple/5">
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={{ width: 96, height: 96 }} />
              ) : (
                <Text style={{ fontSize: 32, fontFamily: 'Poppins_700Bold', color: '#6c5ce7' }}>
                  {getInitials(user.full_name)}
                </Text>
              )}
            </View>
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

            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              className="flex-row items-center justify-center rounded-2xl bg-purple px-6 py-3 mt-6 shadow-lg shadow-purple/20"
            >
              <Pencil color="#fff" size={14} />
              <Text className="text-white text-[14px] font-bold ml-2 font-sans">Edit profile</Text>
            </TouchableOpacity>
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
              {/* Avatar Picker Section */}
              <View className="items-center mb-6">
                <View className="w-20 h-20 rounded-2xl bg-purple/10 overflow-hidden mb-3 border border-purple/15">
                  {formData.avatar ? (
                    <Image source={{ uri: formData.avatar }} style={{ width: 80, height: 80 }} />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <User color="#6c5ce7" size={32} />
                    </View>
                  )}
                </View>
                <Text className="text-xs font-bold text-purple mb-2.5 uppercase tracking-wider font-sans">
                  Choose a Profile Avatar
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
                  {AVATAR_OPTIONS.map((url, idx) => {
                    const isSelected = formData.avatar === url;
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => setFormData({ ...formData, avatar: url })}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          borderWidth: 2,
                          borderColor: isSelected ? "#6c5ce7" : "transparent",
                          overflow: "hidden",
                          marginHorizontal: 4,
                        }}
                      >
                        <Image source={{ uri: url }} style={{ width: 40, height: 40 }} />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

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
    </SafeAreaView>
  );
}
