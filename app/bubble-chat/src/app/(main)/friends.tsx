import React from "react";
import { Text, View, SafeAreaView } from "react-native";
import { Users } from "lucide-react-native";

export default function Friends() {
  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center p-6">
      <View className="size-16 rounded-3xl bg-purple/10 items-center justify-center mb-4">
        <Users className="size-8 text-purple" />
      </View>
      <Text className="text-xl font-bold text-ink mb-1">Friends & Contacts</Text>
      <Text className="text-sm text-ink-soft text-center px-4">
        Manage your contacts, teammates, and check who is online.
      </Text>
    </SafeAreaView>
  );
}
