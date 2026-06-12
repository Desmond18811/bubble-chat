import React, { useState } from "react";
import { Text, View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, KeyRound } from "lucide-react-native";
import { verifyOTP, resendOTP, appStorage, getMyProfile } from "../lib/api";

export default function Verify() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const displayEmail = typeof email === "string" ? email : "";

  const handleVerify = async () => {
    if (otp.length < 5) {
      Alert.alert("Invalid Code", "Please enter the full 5-digit verification code.");
      return;
    }
    setLoading(true);
    try {
      const res = await verifyOTP(displayEmail, otp.trim());
      
      if (res && res.data) {
        if (res.data.accessToken) {
          appStorage.setItem("access_token", res.data.accessToken);
          if (res.data.refreshToken) {
            appStorage.setItem("refresh_token", res.data.refreshToken);
          }
          if (res.data.user) {
            appStorage.setItem("user_data", JSON.stringify(res.data.user));
          } else {
            // Try fetching profile to populate local storage user details
            try {
              const profileRes = await getMyProfile();
              if (profileRes && profileRes.data) {
                appStorage.setItem("user_data", JSON.stringify(profileRes.data));
              }
            } catch (e) {
              console.log("Could not load user profile on verify complete:", e);
            }
          }
          Alert.alert("Success", "Account verified! Welcome to Bubblespace.");
          router.replace("/messages");
        } else {
          Alert.alert("Authentication Failed", "Verification succeeded but no session token was received.");
        }
      } else {
        Alert.alert("Verification Failed", "Invalid response from the server.");
      }
    } catch (err: any) {
      console.error("Verify OTP Error:", err);
      Alert.alert("Verification Failed", err.message || "The code entered is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!displayEmail) {
      Alert.alert("Error", "Missing email address.");
      return;
    }
    setResending(true);
    try {
      const res = await resendOTP(displayEmail);
      Alert.alert("Sent", res.message || "A new 5-digit verification code has been sent to your email.");
    } catch (err: any) {
      console.error("Resend OTP Error:", err);
      Alert.alert("Resend Failed", err.message || "Unable to resend code at this time.");
    } finally {
      setResending(false);
    }
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
            <View className="size-16 rounded-[24px] bg-purple/10 items-center justify-center mx-auto mb-6">
              <KeyRound className="size-8 text-purple" />
            </View>
            <Text className="text-3xl font-extrabold text-ink tracking-tight text-center font-sans">
              Verify your email
            </Text>
            <Text className="text-sm text-ink-soft font-semibold text-center mt-3 mb-8 px-4 font-sans leading-relaxed">
              We sent a 5-digit pulse verification code to{"\n"}
              <Text className="text-purple font-bold">{displayEmail}</Text>
            </Text>

            <View className="space-y-4">
              {/* OTP Input */}
              <View className="w-full mb-4">
                <Text className="text-[13px] font-bold text-ink-soft mb-2 uppercase tracking-wider text-center font-sans">
                  Enter 5-Digit Verification Code
                </Text>
                <View className="flex-row items-center bg-black/3 border border-black/5 rounded-[18px] px-6 py-4 justify-center">
                  <TextInput
                    value={otp}
                    onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, "").slice(0, 5))}
                    placeholder="• • • • •"
                    placeholderTextColor="rgba(31,32,48,0.25)"
                    keyboardType="number-pad"
                    autoFocus
                    maxLength={5}
                    style={{ letterSpacing: 12 }}
                    className="text-center text-ink text-[22px] font-bold w-full"
                  />
                </View>
              </View>
            </View>

            {/* Actions */}
            <TouchableOpacity
              onPress={handleVerify}
              activeOpacity={0.9}
              className="w-full bg-purple py-4 rounded-[20px] items-center justify-center shadow-lg shadow-purple/20 mt-8"
            >
              <Text className="text-white font-bold text-[16px] font-sans">
                {loading ? <ActivityIndicator size="small" color="#ffffff" /> : "Verify Code"}
              </Text>
            </TouchableOpacity>

            {/* Resend Options */}
            <View className="flex-row justify-center items-center mt-6">
              <Text className="text-sm font-semibold text-ink-soft font-sans">Didn't receive the code? </Text>
              <TouchableOpacity onPress={handleResend} disabled={resending}>
                <Text className="text-sm font-bold text-purple font-sans">
                  {resending ? "Sending..." : "Resend"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View className="items-center">
            <TouchableOpacity onPress={() => router.replace("/login")} className="py-2">
              <Text className="text-sm font-semibold text-ink-soft font-sans">
                Already have an account? <Text className="text-purple">Log in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
