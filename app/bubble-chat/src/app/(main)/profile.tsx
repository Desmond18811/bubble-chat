import React from "react";
import { Text, View, SafeAreaView, TouchableOpacity } from "react-native";
import { User, LogOut } from "lucide-react-native";
import { useRouter } from "expo-router";

export default function Profile() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center p-6">
      <View className="size-20 rounded-[28px] bg-purple/10 items-center justify-center mb-4 border border-purple/20">
        <User className="size-10 text-purple" />
      </View>
      <Text className="text-xl font-bold text-ink mb-1">My Profile</Text>
      <Text className="text-sm text-ink-soft mb-8">Chief Executive Officer</Text>

      <TouchableOpacity
        onPress={() => router.replace("/login")}
        className="flex-row items-center gap-2 border border-red-200 bg-red-50/50 px-6 py-3.5 rounded-2xl"
      >
        <LogOut className="size-5 text-red-500 mr-1.5" />
        <Text className="text-red-500 font-bold text-[15px]">Log Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
