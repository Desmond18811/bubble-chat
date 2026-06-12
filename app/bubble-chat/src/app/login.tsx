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
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react-native";
import { login as apiLogin } from "../lib/api";
import { authStorage } from "../lib/authStorage";

const PURPLE = "#6c5ce7";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (!password) { setError("Please enter your password."); return; }

    setLoading(true);
    try {
      const res = await apiLogin({ email: email.trim().toLowerCase(), password });
      const { data } = res;

      if (data?.requiresVerification) {
        // Account not verified — send to OTP screen
        router.push(`/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}&mode=verify` as any);
        return;
      }

      if (data?.accessToken && data?.refreshToken) {
        await authStorage.setSession(data.accessToken, data.refreshToken, data.user);
        router.replace("/(main)/messages" as any);
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
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
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Log in to your Bubblespace account</Text>

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputRow}>
                <Mail size={18} color="#9ca3af" style={{ marginRight: 10 }} />
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
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity onPress={() => router.push("/forgot-password" as any)}>
                  <Text style={styles.forgotLink}>Forgot?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputRow}>
                <Lock size={18} color="#9ca3af" style={{ marginRight: 10 }} />
                <TextInput
                  value={password}
                  onChangeText={t => { setPassword(t); setError(""); }}
                  placeholder="Enter your password"
                  placeholderTextColor="#c4c8d8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={[styles.input, { flex: 1 }]}
                  autoComplete="password"
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{ padding: 4 }}>
                  {showPassword ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Log In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google */}
            <TouchableOpacity activeOpacity={0.8} style={styles.googleBtn}>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => router.push("/signup" as any)} style={{ paddingVertical: 8 }}>
              <Text style={styles.footerText}>
                Don't have an account?{" "}
                <Text style={{ color: PURPLE, fontWeight: "700" }}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  inner: { flex: 1, justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 },
  backText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  logoMark: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: PURPLE + "15",
    alignItems: "center", justifyContent: "center",
  },
  logoInner: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: PURPLE,
  },
  form: { flex: 1, paddingVertical: 32 },
  title: {
    fontSize: 30, fontWeight: "800", color: "#111827",
    letterSpacing: -0.5, marginBottom: 6,
  },
  subtitle: { fontSize: 14, color: "#6b7280", fontWeight: "500", marginBottom: 28 },
  errorBox: {
    backgroundColor: "#fef2f2", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#fecaca", marginBottom: 16,
  },
  errorText: { color: "#dc2626", fontSize: 13, fontWeight: "500" },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  forgotLink: { fontSize: 13, fontWeight: "700", color: PURPLE },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f3f4f6", borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: "#e5e7eb",
  },
  input: { flex: 1, fontSize: 15, fontWeight: "500", color: "#111827" },
  primaryBtn: {
    backgroundColor: PURPLE, paddingVertical: 16,
    borderRadius: 20, alignItems: "center", justifyContent: "center",
    marginTop: 8,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e5e7eb" },
  dividerText: { fontSize: 13, color: "#9ca3af", fontWeight: "500" },
  googleBtn: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb",
    paddingVertical: 14, borderRadius: 20, alignItems: "center",
  },
  googleBtnText: { fontSize: 15, fontWeight: "600", color: "#111827" },
  footer: { alignItems: "center" },
  footerText: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
});
