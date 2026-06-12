import React, { useEffect, useRef, useState } from "react";
import { Text, View, TouchableOpacity, Animated, Dimensions, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { appStorage, getMyProfile, refreshToken } from "../lib/api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function Splash() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Animated values for bubbles
  const bubble1Y = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const bubble2Y = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const bubble3Y = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Animated values for logo and content scale/opacity
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkSession = async () => {
      const token = appStorage.getItem("access_token");
      if (token) {
        try {
          // Verify current access token by loading user profile
          const profileRes = await getMyProfile();
          if (profileRes && profileRes.data) {
            // Save the user data locally
            appStorage.setItem("user_data", JSON.stringify(profileRes.data));
            router.replace("/messages");
            return;
          }
        } catch (err) {
          console.log("Access token invalid, attempting silent refresh...", err);
          const rToken = appStorage.getItem("refresh_token");
          if (rToken) {
            try {
              const refreshRes = await refreshToken(rToken);
              if (refreshRes && refreshRes.data) {
                appStorage.setItem("access_token", refreshRes.data.accessToken);
                if (refreshRes.data.refreshToken) {
                  appStorage.setItem("refresh_token", refreshRes.data.refreshToken);
                }
                // Fetch profile with new token to cache user data
                const profileRes = await getMyProfile();
                if (profileRes && profileRes.data) {
                  appStorage.setItem("user_data", JSON.stringify(profileRes.data));
                }
                router.replace("/messages");
                return;
              }
            } catch (refreshErr) {
              console.log("Token refresh failed:", refreshErr);
            }
          }
        }
      }
      // No active session or token invalid; show onboarding UI
      setCheckingAuth(false);
    };

    checkSession();
  }, []);

  useEffect(() => {
    if (checkingAuth) return;

    // Animate bubbles floating upwards
    const animateBubble = (value: Animated.Value, delay: number, duration: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: -120,
            duration,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: SCREEN_HEIGHT,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateBubble(bubble1Y, 0, 15000);
    animateBubble(bubble2Y, 2000, 18000);
    animateBubble(bubble3Y, 4000, 22000);

    // Entrance animation for content
    Animated.stagger(250, [
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [checkingAuth]);

  if (checkingAuth) {
    return (
      <View className="flex-1 bg-canvas items-center justify-center">
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas justify-between py-16 px-6 relative overflow-hidden">
      {/* Background Animated Bubbles */}
      <Animated.View
        style={{
          position: "absolute",
          left: SCREEN_WIDTH * 0.15,
          transform: [{ translateY: bubble1Y }],
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: "rgba(255,255,255,0.22)",
        }}
      />
      <Animated.View
        style={{
          position: "absolute",
          right: SCREEN_WIDTH * 0.2,
          transform: [{ translateY: bubble2Y }],
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: "rgba(255,255,255,0.13)",
        }}
      />
      <Animated.View
        style={{
          position: "absolute",
          left: SCREEN_WIDTH * 0.5,
          transform: [{ translateY: bubble3Y }],
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: "rgba(255,255,255,0.18)",
        }}
      />

      {/* Top spacing */}
      <View />

      {/* Center Branding Content */}
      <View className="items-center">
        <Animated.View
          style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}
          className="size-24 rounded-[32px] bg-white items-center justify-center shadow-xl shadow-black/10 border border-white/40 mb-6"
        >
          {/* Bubble Logo */}
          <View className="size-14 rounded-full bg-purple items-center justify-center relative shadow-sm">
            <View className="absolute top-2 left-2 size-4 rounded-full bg-white/40" />
            <View className="size-6 rounded-full bg-white/20" />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: textOpacity }} className="items-center">
          <Text className="text-4xl font-extrabold text-white text-center tracking-tight">
            Bubblespace
          </Text>
          <Text className="text-[16px] text-white/80 text-center font-medium mt-4 px-4 leading-6">
            The calm, beautiful team messaging app. Channels, DMs, files, and voice — floating in one delightful place.
          </Text>
        </Animated.View>
      </View>

      {/* Bottom CTA Actions */}
      <Animated.View style={{ opacity: buttonOpacity }} className="w-full gap-4 px-2">
        <TouchableOpacity
          onPress={() => router.push("/login")}
          activeOpacity={0.9}
          className="w-full bg-white py-4 rounded-[20px] items-center justify-center shadow-lg shadow-black/5"
        >
          <Text className="text-purple font-bold text-[16px]">Get Started</Text>
        </TouchableOpacity>
        <Text className="text-white/60 text-center text-xs font-semibold">
          Secure, Encrypted, and Fast
        </Text>
      </Animated.View>
    </View>
  );
}
