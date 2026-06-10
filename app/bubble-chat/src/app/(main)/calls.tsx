import React from "react";
import { Text, View, SafeAreaView } from "react-native";
import { Phone } from "lucide-react-native";

export default function Calls() {
  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center p-6">
      <View className="size-16 rounded-3xl bg-purple/10 items-center justify-center mb-4">
        <Phone className="size-8 text-purple" />
      </View>
      <Text className="text-xl font-bold text-ink mb-1">Calls & Meets</Text>
      <Text className="text-sm text-ink-soft text-center px-4">
        Start audio or video calls with your teammates instantly.
      </Text>
    </SafeAreaView>
  );
}
