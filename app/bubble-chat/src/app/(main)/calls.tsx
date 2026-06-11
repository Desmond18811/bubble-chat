import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Phone, Video, Users, User } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CallsScreen() {
  // Dummy data mirroring the web version
  const [activeRooms] = useState([
    { id: '1', title: 'Design Sync', members: 4, callers: ['A', 'B', 'C'] },
    { id: '2', title: 'Engineering Standup', members: 12, callers: ['D', 'E', 'F'] }
  ]);
  const [coworkers] = useState([
    { id: '1', full_name: 'Alice Johnson', org_role: 'Lead Designer', organization: 'Bubble', isOnline: true },
    { id: '2', full_name: 'Bob Smith', org_role: 'Engineer', organization: 'Bubble', isOnline: false },
    { id: '3', full_name: 'Charlie Davis', org_role: 'Product Manager', organization: 'Bubble', isOnline: true },
  ]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-black/5">
        <View>
          <Text className="text-xl font-bold text-ink">Calls</Text>
          <Text className="text-xs text-ink-soft">Experience seamless communication</Text>
        </View>
        <TouchableOpacity className="bg-purple px-4 py-2 rounded-xl shadow-sm">
          <Text className="text-white text-xs font-bold">Start New Meeting</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {/* Live Collaborative Spaces (Active Rooms) */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-4 px-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-black/30 italic">Live Collaborative Spaces</Text>
            <View className="flex-row items-center bg-emerald-500/10 px-3 py-1 rounded-full">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
              <Text className="text-[10px] font-bold text-emerald-600">{activeRooms.length} ACTIVE ROOMS</Text>
            </View>
          </View>

          <View className="space-y-4">
            {activeRooms.map(room => (
              <TouchableOpacity key={room.id} className="w-full bg-purple-soft/40 p-5 rounded-[28px] border border-purple/5 shadow-sm">
                <Text className="text-[17px] font-bold text-ink">{room.title}</Text>
                <Text className="text-[11px] text-ink-soft font-medium uppercase mt-1">{room.members} members joined</Text>
                
                <View className="flex-row items-end justify-between mt-6">
                  <View className="flex-row -space-x-3">
                    {room.callers.map((c, i) => (
                      <View key={i} className="w-10 h-10 rounded-full border-2 border-white bg-purple items-center justify-center shadow-sm">
                        <Text className="text-white text-[12px] font-bold">{c}</Text>
                      </View>
                    ))}
                  </View>
                  <View className="w-12 h-12 rounded-2xl bg-purple items-center justify-center shadow-lg shadow-purple/20">
                    <Video color="#fff" size={20} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* People in the Office */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-4 px-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-black/30 italic">People in the office</Text>
            <View className="bg-purple/10 px-2 py-0.5 rounded-full">
              <Text className="text-[10px] font-bold text-purple uppercase">All Active Staff</Text>
            </View>
          </View>

          <View className="flex-row flex-wrap justify-between">
            {coworkers.map(worker => (
              <View key={worker.id} className="w-[48%] bg-white border border-black/5 rounded-[32px] p-5 mb-4 items-center shadow-sm relative overflow-hidden">
                <View className="relative">
                  <View className="w-20 h-20 rounded-[24px] bg-purple-soft items-center justify-center shadow-md">
                    <User color="#6c5ce7" size={32} />
                  </View>
                  {worker.isOnline && (
                    <View className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-white bg-green-500 shadow-sm" />
                  )}
                </View>
                <Text className="text-[15px] font-bold text-ink mt-4 text-center w-full" numberOfLines={1}>{worker.full_name}</Text>
                <Text className="text-[10px] font-bold text-purple uppercase italic mt-1 text-center w-full" numberOfLines={1}>{worker.org_role}</Text>
                <Text className="text-[9px] text-ink-soft font-medium text-center mt-0.5 w-full" numberOfLines={1}>{worker.organization}</Text>

                <View className="flex-row items-center justify-center gap-2 mt-5">
                  <TouchableOpacity className="w-10 h-10 rounded-xl bg-purple-soft items-center justify-center">
                    <Phone color="#6c5ce7" size={16} />
                  </TouchableOpacity>
                  <TouchableOpacity className="w-10 h-10 rounded-xl bg-purple-soft items-center justify-center">
                    <Video color="#6c5ce7" size={16} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
