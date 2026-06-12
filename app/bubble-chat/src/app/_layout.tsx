import { useEffect } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import * as SplashScreen from "expo-splash-screen";
import { verifyInstallation } from "nativewind";
import "../global.css";
import { initApiFromStorage } from "../lib/api";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  verifyInstallation();
  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    // Pre-load stored token into in-memory cache for synchronous getAuthHeaders()
    initApiFromStorage().catch(() => {});
  }, []);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
