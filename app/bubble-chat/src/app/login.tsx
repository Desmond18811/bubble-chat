import React, { useState } from "react";
import { Text, View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react-native";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    // Mock login and navigate to dashboard messages screen
    setTimeout(() => {
      setLoading(false);
      router.replace("/messages");
    }, 1000);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-[#fbfbfe]"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-between py-12 px-6">
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center py-2"
            >
              <ArrowLeft className="h-5 w-5 text-ink-soft mr-1.5" />
              <Text className="text-sm font-semibold text-ink-soft">Back</Text>
            </TouchableOpacity>
            <View className="size-10 rounded-xl bg-purple/10 items-center justify-center">
              <View className="size-5 rounded-full bg-purple relative">
                <View className="absolute top-0.5 left-0.5 size-1.5 rounded-full bg-white/40" />
              </View>
            </View>
          </View>

          {/* Form Content */}
          <View className="w-full my-auto py-6">
            <Text className="text-3xl font-extrabold text-ink tracking-tight text-center">
              Welcome back
            </Text>
            <Text className="text-sm text-ink-soft font-semibold text-center mt-2 mb-8">
              Log in to your Bubblespace account
            </Text>

            <View className="space-y-4">
              {/* Email Input */}
              <View className="w-full mb-4">
                <Text className="text-[13px] font-bold text-ink-soft mb-2 uppercase tracking-wider">
                  Email Address
                </Text>
                <View className="flex-row items-center bg-black/3 border border-black/5 rounded-[18px] px-4 py-3.5">
                  <Mail className="size-5 text-ink-soft mr-3" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="name@company.com"
                    placeholderTextColor="rgba(31,32,48,0.35)"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    className="flex-1 text-ink text-[15px] font-medium"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className="w-full">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-[13px] font-bold text-ink-soft uppercase tracking-wider">
                    Password
                  </Text>
                  <TouchableOpacity>
                    <Text className="text-[13px] font-bold text-purple">Forgot?</Text>
                  </TouchableOpacity>
                </View>
                <View className="flex-row items-center bg-black/3 border border-black/5 rounded-[18px] px-4 py-3.5">
                  <Lock className="size-5 text-ink-soft mr-3" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="rgba(31,32,48,0.35)"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    className="flex-1 text-ink text-[15px] font-medium"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
                    {showPassword ? (
                      <EyeOff className="size-5 text-ink-soft" />
                    ) : (
                      <Eye className="size-5 text-ink-soft" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Actions */}
            <TouchableOpacity
              onPress={handleLogin}
              activeOpacity={0.9}
              className="w-full bg-purple py-4 rounded-[20px] items-center justify-center shadow-lg shadow-purple/20 mt-8"
            >
              <Text className="text-white font-bold text-[16px]">
                {loading ? "Logging in..." : "Log In"}
              </Text>
            </TouchableOpacity>

            {/* Google Sign In */}
            <TouchableOpacity
              activeOpacity={0.8}
              className="w-full bg-white border border-black/5 py-4 rounded-[20px] items-center justify-center flex-row gap-2 mt-4"
            >
              <Text className="text-ink font-semibold text-[15px]">Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View className="items-center">
            <TouchableOpacity onPress={() => router.push("/signup")} className="py-2">
              <Text className="text-sm font-semibold text-ink-soft">
                Don't have an account? <Text className="text-purple">Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
