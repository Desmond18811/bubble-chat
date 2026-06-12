import React, { useState } from "react";
import { Text, View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, User, Mail, Lock, Eye, EyeOff } from "lucide-react-native";

export default function Signup() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = () => {
    setLoading(true);
    // Mock signup and navigate to login
    setTimeout(() => {
      setLoading(false);
      router.replace("/login");
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
              Create account
            </Text>
            <Text className="text-sm text-ink-soft font-semibold text-center mt-2 mb-8">
              Join Bubblespace and float together
            </Text>

            <View>
              {/* Full Name Input */}
              <View className="w-full mb-4">
                <Text className="text-[13px] font-bold text-ink-soft mb-2 uppercase tracking-wider">
                  Full Name
                </Text>
                <View className="flex-row items-center bg-black/3 border border-black/5 rounded-[18px] px-4 py-3.5">
                  <User className="size-5 text-ink-soft mr-3" />
                  <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="John Doe"
                    placeholderTextColor="rgba(31,32,48,0.35)"
                    autoCapitalize="words"
                    className="flex-1 text-ink text-[15px] font-medium"
                  />
                </View>
              </View>

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

              {/* Username Input */}
              <View className="w-full mb-4">
                <Text className="text-[13px] font-bold text-ink-soft mb-2 uppercase tracking-wider">
                  Username
                </Text>
                <View className="flex-row items-center bg-black/3 border border-black/5 rounded-[18px] px-4 py-3.5">
                  <User className="size-5 text-ink-soft mr-3" />
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="johndoe"
                    placeholderTextColor="rgba(31,32,48,0.35)"
                    autoCapitalize="none"
                    className="flex-1 text-ink text-[15px] font-medium"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className="w-full">
                <Text className="text-[13px] font-bold text-ink-soft mb-2 uppercase tracking-wider">
                  Password
                </Text>
                <View className="flex-row items-center bg-black/3 border border-black/5 rounded-[18px] px-4 py-3.5">
                  <Lock className="size-5 text-ink-soft mr-3" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Choose a strong password"
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
              onPress={handleSignup}
              activeOpacity={0.9}
              className="w-full bg-purple py-4 rounded-[20px] items-center justify-center shadow-lg shadow-purple/20 mt-8"
            >
              <Text className="text-white font-bold text-[16px]">
                {loading ? "Creating account..." : "Create Account"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View className="items-center">
            <TouchableOpacity onPress={() => router.push("/login")} className="py-2">
              <Text className="text-sm font-semibold text-ink-soft">
                Already have an account? <Text className="text-purple">Log in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
