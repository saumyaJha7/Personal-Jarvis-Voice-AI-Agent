import { ConversationProvider } from "@elevenlabs/react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { jarvisTheme } from "@/constants/jarvis-theme";
import { AuthProvider } from "@/context/auth-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ConversationProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: jarvisTheme.bg },
            }}
          />
        </ConversationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

