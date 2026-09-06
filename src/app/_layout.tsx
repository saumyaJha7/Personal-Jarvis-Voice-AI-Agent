import { ConversationProvider } from "@elevenlabs/react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { jarvisTheme } from "@/constants/jarvis-theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ConversationProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: jarvisTheme.bg },
          }}
        />
      </ConversationProvider>
    </SafeAreaProvider>
  );
}
