import React, { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { User, Briefcase, FileText, Check, ChevronRight } from "lucide-react-native";
import { authStorage } from "../lib/authStorage";
import { getAuthHeaders } from "../lib/api";

const PURPLE = "#6c5ce7";
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL?.trim()) || "https://bubble-backend-production-96a0.up.railway.app/api/v1";

const ROLE_OPTIONS = [
  "Developer", "Designer", "Product Manager", "Marketing",
  "Sales", "Operations", "Finance", "HR", "CEO / Founder", "Other",
];

export default function ProfileSetup() {
  const router = useRouter();

  const [bio, setBio] = useState("");
  const [role, setRole] = useState("");
  const [step, setStep] = useState<0 | 1>(0); // 0 = bio & role, 1 = complete
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${BASE_URL}/profile/me`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: bio.trim(),
          org_role: role,
          onboardingComplete: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Update failed");
      }
      const data = await res.json();
      if (data?.data) {
        await authStorage.updateUser(data.data);
      }
      router.replace("/(main)/messages" as any);
    } catch (err: any) {
      setError(err.message || "Could not save profile. You can update it later.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    router.replace("/(main)/messages" as any);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          {/* Progress */}
          <View style={styles.progressRow}>
            <View style={[styles.progressStep, styles.progressDone]} />
            <View style={styles.progressLine} />
            <View style={[styles.progressStep, styles.progressActive]} />
          </View>

          {/* Icon */}
          <View style={styles.iconCircle}>
            <User size={36} color={PURPLE} />
          </View>

          <Text style={styles.title}>Set Up Your Profile</Text>
          <Text style={styles.subtitle}>
            Tell your teammates a bit about yourself. You can always change this later.
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Bio */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              <FileText size={12} color="#6b7280" /> {"  "}Bio
            </Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell your team what you do and what you love 🚀"
              placeholderTextColor="#c4c8d8"
              multiline
              numberOfLines={3}
              style={styles.textArea}
              textAlignVertical="top"
            />
          </View>

          {/* Role picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              <Briefcase size={12} color="#6b7280" /> {"  "}Your Role
            </Text>
            <View style={styles.rolesGrid}>
              {ROLE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setRole(opt)}
                  activeOpacity={0.75}
                  style={[
                    styles.roleChip,
                    role === opt && styles.roleChipActive,
                  ]}
                >
                  {role === opt && <Check size={12} color="#fff" style={{ marginRight: 4 }} />}
                  <Text style={[styles.roleChipText, role === opt && { color: "#fff" }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.88}
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Complete Setup</Text>
                <ChevronRight size={18} color="#fff" style={{ marginLeft: 4 }} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  inner: { flex: 1, paddingHorizontal: 28, paddingTop: 64, paddingBottom: 40 },
  progressRow: { flexDirection: "row", alignItems: "center", marginBottom: 40, alignSelf: "center", gap: 0 },
  progressStep: { width: 12, height: 12, borderRadius: 6 },
  progressLine: { flex: 0, width: 48, height: 2, backgroundColor: "#d1d5db" },
  progressDone: { backgroundColor: "#10b981" },
  progressActive: { backgroundColor: PURPLE },
  iconCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: PURPLE + "15", alignItems: "center", justifyContent: "center", marginBottom: 24, alignSelf: "center" },
  title: { fontSize: 26, fontWeight: "800", color: "#111827", letterSpacing: -0.5, marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 22, marginBottom: 28 },
  errorBox: { backgroundColor: "#fef2f2", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#fecaca", marginBottom: 16 },
  errorText: { color: "#dc2626", fontSize: 13, fontWeight: "500" },
  fieldGroup: { marginBottom: 24 },
  label: { fontSize: 12, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  textArea: {
    backgroundColor: "#f3f4f6", borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "#e5e7eb",
    fontSize: 15, fontWeight: "500", color: "#111827",
    minHeight: 90,
  },
  rolesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleChip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  roleChipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  roleChipText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  primaryBtn: {
    backgroundColor: PURPLE, paddingVertical: 16, borderRadius: 20,
    alignItems: "center", justifyContent: "center", flexDirection: "row",
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
    marginBottom: 12,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  skipBtn: { alignItems: "center", paddingVertical: 10 },
  skipText: { fontSize: 14, color: "#9ca3af", fontWeight: "500" },
});
