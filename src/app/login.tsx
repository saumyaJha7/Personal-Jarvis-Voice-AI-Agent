import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { JarvisBackground } from "@/components/jarvis-background";
import {
  jarvisRadius,
  jarvisSpacing,
  jarvisTheme,
} from "@/constants/jarvis-theme";
import { useAuth } from "@/context/auth-context";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    try {
      setSubmitting(true);
      await login(email, password);
      router.replace("/");
    } catch (err: any) {
      setError(err?.message || "Failed to authenticate.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <JarvisBackground />
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.container,
            {
              paddingTop: insets.top + jarvisSpacing.xxl,
              paddingBottom: Math.max(insets.bottom, jarvisSpacing.xxl),
              paddingLeft: Math.max(insets.left, jarvisSpacing.screen),
              paddingRight: Math.max(insets.right, jarvisSpacing.screen),
            },
          ]}
        >
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>AUTHENTICATION</Text>
            </View>
            <Text style={styles.title}>Jarvis AI</Text>
            <Text style={styles.subtitle}>
              Enter credentials to access your personal AI assistant.
            </Text>
          </Animated.View>

          {error && (
            <Animated.View
              entering={FadeInDown.duration(200)}
              exiting={FadeOutUp.duration(150)}
              style={styles.errorCard}
            >
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor={jarvisTheme.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={jarvisTheme.textMuted}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <Pressable
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleLogin}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={jarvisTheme.text} />
              ) : (
                <Text style={styles.submitButtonText}>Login</Text>
              )}
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: jarvisTheme.bg,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
  },
  header: {
    marginBottom: jarvisSpacing.xl,
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: jarvisRadius.pill,
    backgroundColor: "rgba(34, 211, 238, 0.08)",
    borderWidth: 1,
    borderColor: jarvisTheme.cyanBorder,
    marginBottom: jarvisSpacing.sm,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: jarvisTheme.cyan,
  },
  badgeText: {
    color: jarvisTheme.cyan,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  title: {
    color: jarvisTheme.text,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subtitle: {
    color: jarvisTheme.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
  },
  errorCard: {
    backgroundColor: jarvisTheme.errorBg,
    borderWidth: 1,
    borderColor: jarvisTheme.errorBorder,
    borderRadius: jarvisRadius.md,
    paddingHorizontal: jarvisSpacing.lg,
    paddingVertical: jarvisSpacing.md,
    marginBottom: jarvisSpacing.lg,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 13,
    textAlign: "center",
  },
  form: {
    gap: jarvisSpacing.lg,
    backgroundColor: jarvisTheme.bgSurface,
    padding: jarvisSpacing.xl,
    borderRadius: jarvisRadius.xl,
    borderWidth: 1,
    borderColor: jarvisTheme.borderStrong,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    color: jarvisTheme.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: jarvisTheme.bgElevated,
    borderWidth: 1,
    borderColor: jarvisTheme.border,
    borderRadius: jarvisRadius.md,
    paddingHorizontal: jarvisSpacing.lg,
    paddingVertical: jarvisSpacing.md,
    color: jarvisTheme.text,
    fontSize: 15,
    height: 50,
  },
  submitButton: {
    backgroundColor: jarvisTheme.blue,
    borderRadius: jarvisRadius.md,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: jarvisSpacing.sm,
    shadowColor: jarvisTheme.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: jarvisTheme.text,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  footer: {
    marginTop: jarvisSpacing.xxl,
    alignItems: "center",
  },
  footerText: {
    color: jarvisTheme.textMuted,
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
