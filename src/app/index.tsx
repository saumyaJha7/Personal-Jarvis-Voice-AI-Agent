import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
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
import { JarvisOrb } from "@/components/jarvis-orbs";
import { JarvisToolbar } from "@/components/jarvis-toolbar";
import { TranscriptPanel } from "@/components/transcript-panel";
import {
  jarvisRadius,
  jarvisSpacing,
  jarvisTheme,
} from "@/constants/jarvis-theme";
import { useAuth } from "@/context/auth-context";
import { useJarvisConversation } from "@/hooks/use-jarvis-conversation";

function getHeaderStatus(
  isConnected: boolean,
  isStarting: boolean,
  status: string,
) {
  if (isStarting || status === "connecting") return "Connecting";
  if (isConnected) return "Live";
  return "Standby";
}

export default function Index() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  const {
    conversation,
    isStarting,
    messages,
    activeTool,
    error,
    amplitude,
    startConversation,
    endConversation,
    sendTextMessage,
    clearError,
  } = useJarvisConversation();

  const [textInput, setTextInput] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login" as any);
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <JarvisBackground />
        <ActivityIndicator size="large" color={jarvisTheme.cyan} />
      </View>
    );
  }

  const isConnected = conversation.status === "connected";
  const canStart = conversation.status === "disconnected" && !isStarting;
  const showEndCall = isConnected;
  const showComposer = isConnected && keyboardVisible;
  const hasMessages = messages.length > 0;
  const showOrb = !keyboardVisible;
  const compactOrb = isConnected && hasMessages;

  const handleOrbPress = () => {
    if (canStart) {
      void startConversation();
    }
  };

  const handleSendText = () => {
    if (!textInput.trim()) return;
    sendTextMessage(textInput.trim());
    setTextInput("");
  };

  const handleToggleKeyboard = () => {
    if (keyboardVisible) {
      Keyboard.dismiss();
      setKeyboardVisible(false);
      return;
    }
    setKeyboardVisible(true);
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login" as any);
  };

  return (
    <View style={styles.root}>
      <JarvisBackground compact={compactOrb || keyboardVisible} />
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View
          style={[
            styles.screen,
            {
              paddingTop: insets.top + jarvisSpacing.md,
              paddingLeft: Math.max(insets.left, jarvisSpacing.screen),
              paddingRight: Math.max(insets.right, jarvisSpacing.screen),
            },
          ]}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>Jarvis</Text>
              <Text style={styles.tagline} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <View
                style={[styles.headerPill, isConnected && styles.headerPillLive]}
              >
                <View
                  style={[styles.headerDot, isConnected && styles.headerDotLive]}
                />
                <Text style={styles.headerStatus}>
                  {getHeaderStatus(isConnected, isStarting, conversation.status)}
                </Text>
              </View>
              <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            </View>
          </View>


          {(error || conversation.message) && (
            <Animated.View
              entering={FadeInDown.duration(220)}
              exiting={FadeOutUp.duration(180)}
            >
              <Pressable
                style={styles.errorBanner}
                onPress={error ? clearError : undefined}
                accessibilityRole={error ? "button" : undefined}
              >
                <Text style={styles.errorText} selectable>
                  {error ?? conversation.message}
                </Text>
              </Pressable>
            </Animated.View>
          )}

          {showOrb ? (
            <View
              style={[
                styles.orbSection,
                compactOrb && styles.orbSectionCompact,
              ]}
            >
              <JarvisOrb
                status={conversation.status}
                isSpeaking={conversation.isSpeaking}
                isListening={conversation.isListening}
                isStarting={isStarting}
                activeTool={activeTool}
                onOrbPress={handleOrbPress}
                disabled={conversation.status === "connecting" || isStarting}
                compact={compactOrb}
                amplitude={amplitude}
              />
            </View>
          ) : null}

          <View style={styles.transcriptSection}>
            <TranscriptPanel
              messages={messages}
              bottomInset={showComposer ? 8 : 0}
            />
          </View>

          <View
            style={[
              styles.bottomSection,
              { paddingBottom: Math.max(insets.bottom, jarvisSpacing.lg) },
            ]}
          >
            {showComposer ? (
              <Animated.View
                entering={FadeInDown.duration(220)}
                exiting={FadeOutUp.duration(180)}
                style={styles.composer}
              >
                <TextInput
                  style={styles.textInput}
                  value={textInput}
                  onChangeText={(text) => {
                    setTextInput(text);
                    if (text.length > 0) {
                      conversation.sendUserActivity();
                    }
                  }}
                  placeholder="Type a message..."
                  placeholderTextColor={jarvisTheme.textMuted}
                  multiline
                  autoFocus
                  onSubmitEditing={handleSendText}
                  returnKeyType="send"
                  blurOnSubmit={false}
                />
                <Pressable
                  style={[
                    styles.sendButton,
                    !textInput.trim() && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSendText}
                  disabled={!textInput.trim()}
                >
                  <Text style={styles.sendButtonText} selectable>
                    Send
                  </Text>
                </Pressable>
              </Animated.View>
            ) : null}

            <JarvisToolbar
              isMuted={isMuted}
              showEndCall={showEndCall}
              keyboardActive={keyboardVisible}
              onToggleMute={() => setIsMuted((value) => !value)}
              onKeyboardPress={handleToggleKeyboard}
              onEndCall={() => void endConversation()}
            />
          </View>
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
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: jarvisSpacing.md,
  },
  brand: {
    color: jarvisTheme.text,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  tagline: {
    marginTop: 2,
    color: jarvisTheme.textMuted,
    fontSize: 12,
    letterSpacing: 0.2,
    maxWidth: 130,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: jarvisRadius.pill,
    backgroundColor: jarvisTheme.errorBg,
    borderWidth: 1,
    borderColor: jarvisTheme.errorBorder,
  },
  logoutText: {
    color: "#fca5a5",
    fontSize: 11,
    fontWeight: "600",
  },
  headerPill: {

    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: jarvisRadius.pill,
    backgroundColor: "rgba(39, 39, 42, 0.65)",
    borderWidth: 1,
    borderColor: jarvisTheme.border,
  },
  headerPillLive: {
    backgroundColor: "rgba(34, 211, 238, 0.08)",
    borderColor: jarvisTheme.cyanBorder,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: jarvisTheme.textMuted,
  },
  headerDotLive: {
    backgroundColor: jarvisTheme.cyan,
  },
  headerStatus: {
    color: jarvisTheme.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  orbSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: jarvisSpacing.sm,
    marginBottom: jarvisSpacing.sm,
  },
  orbSectionCompact: {
    paddingVertical: 0,
    marginBottom: jarvisSpacing.xs,
  },
  transcriptSection: {
    flex: 1,
    minHeight: 0,
  },
  bottomSection: {
    gap: jarvisSpacing.sm,
    paddingTop: jarvisSpacing.sm,
  },
  errorBanner: {
    backgroundColor: jarvisTheme.errorBg,
    borderWidth: 1,
    borderColor: jarvisTheme.errorBorder,
    borderRadius: jarvisRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: jarvisSpacing.lg,
    paddingVertical: jarvisSpacing.md,
    marginBottom: jarvisSpacing.sm,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 13,
    lineHeight: 18,
  },
  composer: {
    flexDirection: "row",
    gap: jarvisSpacing.sm,
    alignItems: "flex-end",
  },
  textInput: {
    flex: 1,
    backgroundColor: jarvisTheme.bgElevated,
    borderWidth: 1,
    borderColor: jarvisTheme.border,
    borderRadius: jarvisRadius.lg,
    borderCurve: "continuous",
    paddingHorizontal: jarvisSpacing.lg,
    paddingVertical: jarvisSpacing.md,
    color: jarvisTheme.text,
    fontSize: 15,
    maxHeight: 120,
    minHeight: 48,
  },
  sendButton: {
    backgroundColor: jarvisTheme.blue,
    borderRadius: jarvisRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: jarvisSpacing.lg,
    height: 48,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: jarvisTheme.bgMuted,
  },
  sendButtonText: {
    color: jarvisTheme.text,
    fontSize: 14,
    fontWeight: "600",
  },
});
