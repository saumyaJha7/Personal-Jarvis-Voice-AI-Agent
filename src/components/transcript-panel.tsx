import { useEffect, useRef } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import {
    jarvisRadius,
    jarvisSpacing,
    jarvisTheme,
} from "@/constants/jarvis-theme";
import type { TranscriptMessage } from "@/hooks/use-jarvis-conversation";

type TranscriptPanelProps = {
  messages: TranscriptMessage[];
  bottomInset?: number;
};

function MessageBubble({ message }: { message: TranscriptMessage }) {
  const isUser = message.role === "user";

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAgent]}>
      <Text style={styles.roleLabel}>{isUser ? "You" : "Jarvis"}</Text>
      <View
        style={[styles.bubble, isUser ? styles.userBubble : styles.agentBubble]}
      >
        <Text selectable style={styles.text}>
          {message.text}
        </Text>
      </View>
    </View>
  );
}

export function TranscriptPanel({
  messages,
  bottomInset = 0,
}: TranscriptPanelProps) {
  const listRef = useRef<FlatList<TranscriptMessage>>(null);

  useEffect(() => {
    if (messages.length === 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages, bottomInset]);

  if (messages.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Ready when you are</Text>
        <Text style={styles.emptySubtitle}>
          Tap the orb to start a voice session, or use the keyboard below.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(item) => item.id}
      style={styles.list}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: bottomInset + jarvisSpacing.md },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item, index }) => (
        <Animated.View
          entering={FadeInDown.duration(200).delay(Math.min(index * 20, 80))}
        >
          <MessageBubble message={item} />
        </Animated.View>
      )}
      onContentSizeChange={() =>
        listRef.current?.scrollToEnd({ animated: true })
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingTop: jarvisSpacing.sm,
  },
  separator: {
    height: jarvisSpacing.md,
  },
  row: {
    width: "100%",
    gap: jarvisSpacing.xs,
  },
  rowUser: {
    alignItems: "flex-end",
  },
  rowAgent: {
    alignItems: "flex-start",
  },
  roleLabel: {
    color: jarvisTheme.textMuted,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: jarvisSpacing.xs,
  },
  bubble: {
    borderRadius: jarvisRadius.lg,
    borderCurve: "continuous",
    paddingHorizontal: jarvisSpacing.lg,
    paddingVertical: jarvisSpacing.md,
    maxWidth: "88%",
  },
  userBubble: {
    backgroundColor: jarvisTheme.cyanMuted,
    borderWidth: 1,
    borderColor: jarvisTheme.cyanBorder,
    borderBottomRightRadius: jarvisRadius.sm,
  },
  agentBubble: {
    backgroundColor: jarvisTheme.bgElevated,
    borderWidth: 1,
    borderColor: jarvisTheme.border,
    borderBottomLeftRadius: jarvisRadius.sm,
  },
  text: {
    color: jarvisTheme.text,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: jarvisSpacing.xxl,
    gap: jarvisSpacing.sm,
  },
  emptyTitle: {
    color: jarvisTheme.textSecondary,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  emptySubtitle: {
    color: jarvisTheme.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
