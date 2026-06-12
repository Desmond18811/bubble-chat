import React, { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, User, Mail, Lock, Eye, EyeOff, Building2 } from "lucide-react-native";
import { register as apiRegister } from "../lib/api";

const PURPLE = "#6c5ce7";

export default function Signup() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showOrg, setShowOrg] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async () => {
    setError("");
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (!password) { setError("Please create a password."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    try {
      const payload: any = {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      };
      if (orgName.trim()) {
        payload.org_name = orgName.trim();
      }

      await apiRegister(payload);
      // Navigate to OTP screen
      router.push(`/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}&mode=verify` as any);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={20} color="#6b7280" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <View style={styles.logoMark}>
              <View style={styles.logoInner} />
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Join Bubblespace and float together 🫧</Text>

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Full Name */}
            <Field label="Full Name" icon={<User size={18} color="#9ca3af" />}>
              <TextInput
                value={fullName}
                onChangeText={t => { setFullName(t); setError(""); }}
                placeholder="John Doe"
                placeholderTextColor="#c4c8d8"
                autoCapitalize="words"
                style={styles.input}
              />
            </Field>

            {/* Email */}
            <Field label="Email Address" icon={<Mail size={18} color="#9ca3af" />}>
              <TextInput
                value={email}
                onChangeText={t => { setEmail(t); setError(""); }}
                placeholder="name@company.com"
                placeholderTextColor="#c4c8d8"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                autoComplete="email"
              />
            </Field>

            {/* Password */}
            <Field label="Password" icon={<Lock size={18} color="#9ca3af" />} extraRight={
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{ padding: 4 }}>
                {showPassword ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
              </TouchableOpacity>
            }>
              <TextInput
                value={password}
                onChangeText={t => { setPassword(t); setError(""); }}
                placeholder="Min 8 chars with A-Z, 0-9, symbol"
                placeholderTextColor="#c4c8d8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={[styles.input, { flex: 1 }]}
              />
            </Field>

            {/* Optional Org */}
            <TouchableOpacity
              onPress={() => setShowOrg(v => !v)}
              style={styles.orgToggle}
              activeOpacity={0.7}
            >
              <Building2 size={16} color={PURPLE} />
              <Text style={styles.orgToggleText}>
                {showOrg ? "Remove organization" : "Register with an organization (optional)"}
              </Text>
            </TouchableOpacity>

            {showOrg && (
              <Field label="Organization Name" icon={<Building2 size={18} color="#9ca3af" />}>
                <TextInput
                  value={orgName}
                  onChangeText={setOrgName}
                  placeholder="Acme Corp"
                  placeholderTextColor="#c4c8d8"
                  autoCapitalize="words"
                  style={styles.input}
                />
              </Field>
            )}

            {/* Password hint */}
            <Text style={styles.hint}>
              Password needs: 8+ chars, uppercase, lowercase, number, special character
            </Text>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.88}
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => router.push("/login" as any)} style={{ paddingVertical: 8 }}>
              <Text style={styles.footerText}>
                Already have an account?{" "}
                <Text style={{ color: PURPLE, fontWeight: "700" }}>Log in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, icon, extraRight, children }: { label: string; icon: React.ReactNode; extraRight?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <View style={{ marginRight: 10 }}>{icon}</View>
        {children}
        {extraRight && <View>{extraRight}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  inner: { flex: 1, justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 },
  backText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  logoMark: { width: 40, height: 40, borderRadius: 14, backgroundColor: PURPLE + "15", alignItems: "center", justifyContent: "center" },
  logoInner: { width: 20, height: 20, borderRadius: 10, backgroundColor: PURPLE },
  form: { flex: 1, paddingVertical: 28 },
  title: { fontSize: 30, fontWeight: "800", color: "#111827", letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#6b7280", fontWeight: "500", marginBottom: 24 },
  errorBox: { backgroundColor: "#fef2f2", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#fecaca", marginBottom: 16 },
  errorText: { color: "#dc2626", fontSize: 13, fontWeight: "500" },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#f3f4f6", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderColor: "#e5e7eb" },
  input: { flex: 1, fontSize: 15, fontWeight: "500", color: "#111827" },
  orgToggle: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14, paddingVertical: 4 },
  orgToggleText: { fontSize: 13, color: PURPLE, fontWeight: "600" },
  hint: { fontSize: 11, color: "#9ca3af", marginBottom: 20, lineHeight: 16 },
  primaryBtn: { backgroundColor: PURPLE, paddingVertical: 16, borderRadius: 20, alignItems: "center", justifyContent: "center", shadowColor: PURPLE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  footer: { alignItems: "center" },
  footerText: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
});
