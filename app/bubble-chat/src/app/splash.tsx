import React, { useRef, useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StyleSheet,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { MessageSquare, Layers, ShieldCheck } from "lucide-react-native";
import { authStorage } from "../lib/authStorage";

const { width: W, height: H } = Dimensions.get("window");

const SLIDES = [
  {
    Icon: MessageSquare,
    color: "#6c5ce7",
    bg: "#f0edff",
    accent: "#a78bfa",
    title: "Real-Time Conversations",
    subtitle:
      "Send messages, join channels, and start DMs — everything in one beautiful place that feels alive.",
  },
  {
    Icon: Layers,
    color: "#0ea5e9",
    bg: "#e0f2fe",
    accent: "#38bdf8",
    title: "Files, Voice & AI",
    subtitle:
      "Share files, hop on voice calls, and let your AI assistant Aida help you stay on top of everything.",
  },
  {
    Icon: ShieldCheck,
    color: "#10b981",
    bg: "#d1fae5",
    accent: "#34d399",
    title: "Secure by Design",
    subtitle:
      "End-to-end encrypted messaging and enterprise-grade security so your team can work with confidence.",
  },
];

export default function Splash() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    setActiveIndex(idx);
  };

  const goToNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (activeIndex + 1) * W, animated: true });
    }
  };

  const handleGetStarted = async () => {
    await authStorage.setOnboardingSeen();
    router.push("/signup" as any);
  };

  const handleLogin = async () => {
    await authStorage.setOnboardingSeen();
    router.push("/login" as any);
  };

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => {
          const { Icon } = slide;
          return (
            <View key={i} style={[styles.slide, { width: W }]}>
              {/* Illustration blob */}
              <View style={[styles.blobOuter, { backgroundColor: slide.bg }]}>
                <View style={[styles.blobInner, { backgroundColor: slide.color + "22" }]}>
                  <View style={[styles.iconCircle, { backgroundColor: slide.color }]}>
                    <Icon color="#fff" size={44} strokeWidth={1.8} />
                  </View>
                </View>
                {/* Decorative circles */}
                <View style={[styles.decCircle, { top: 18, right: 22, backgroundColor: slide.accent + "40", width: 52, height: 52 }]} />
                <View style={[styles.decCircle, { bottom: 30, left: 24, backgroundColor: slide.color + "30", width: 36, height: 36 }]} />
              </View>

              <View style={styles.textBlock}>
                <Text style={[styles.slideTitle, { color: slide.color }]}>{slide.title}</Text>
                <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((s, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeIndex && { width: 28, backgroundColor: SLIDES[activeIndex].color },
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <View style={styles.cta}>
        {isLast ? (
          <>
            <TouchableOpacity
              onPress={handleGetStarted}
              activeOpacity={0.88}
              style={[styles.btnPrimary, { backgroundColor: SLIDES[activeIndex].color }]}
            >
              <Text style={styles.btnPrimaryText}>Get Started</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogin} activeOpacity={0.7} style={styles.btnSecondary}>
              <Text style={styles.btnSecondaryText}>
                Already have an account?{" "}
                <Text style={{ color: SLIDES[activeIndex].color, fontWeight: "700" }}>Log in</Text>
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.nextRow}>
            <TouchableOpacity onPress={handleLogin} activeOpacity={0.7}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={goToNext}
              activeOpacity={0.88}
              style={[styles.nextBtn, { backgroundColor: SLIDES[activeIndex].color }]}
            >
              <Text style={styles.btnPrimaryText}>Next →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  blobOuter: {
    width: W * 0.72,
    height: W * 0.72,
    borderRadius: W * 0.36,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 44,
  },
  blobInner: {
    width: W * 0.52,
    height: W * 0.52,
    borderRadius: W * 0.26,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  decCircle: {
    position: "absolute",
    borderRadius: 100,
  },
  textBlock: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 14,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  slideSubtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "500",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#d1d5db",
  },
  cta: {
    paddingHorizontal: 28,
    paddingBottom: 48,
    gap: 12,
  },
  btnPrimary: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#6c5ce7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  btnSecondary: {
    alignItems: "center",
    paddingVertical: 8,
  },
  btnSecondaryText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  nextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skipText: {
    fontSize: 15,
    color: "#9ca3af",
    fontWeight: "600",
  },
  nextBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 20,
    shadowColor: "#6c5ce7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
});
