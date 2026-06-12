import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import * as SplashScreen from "expo-splash-screen";
import { initAuthStorage } from "../lib/api";
import "../global.css";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [authInitialized, setAuthInitialized] = useState(false);
  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    initAuthStorage()
      .catch((err) => console.error("Error initializing auth storage in layout:", err))
      .finally(() => setAuthInitialized(true));
  }, []);

  useEffect(() => {
    if ((loaded || error) && authInitialized) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error, authInitialized]);

  if ((!loaded && !error) || !authInitialized) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
