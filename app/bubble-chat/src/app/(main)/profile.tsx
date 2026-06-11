import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { User, Pencil, Mail, Phone, Briefcase, X, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';

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
    chatsCount: 142,
    filesCount: 38
  });

  const [formData, setFormData] = useState({ ...user });

  const handleSave = () => {
    setUser({ ...formData });
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
            <View className="w-24 h-24 rounded-3xl bg-purple/10 items-center justify-center mb-4 shadow-sm border border-purple/5">
              <User color="#6c5ce7" size={40} />
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
