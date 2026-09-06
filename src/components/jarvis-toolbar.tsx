import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { KeyboardIcon, MicIcon, PhoneEndIcon } from "@/components/jarvis-icons";
import { jarvisSpacing, jarvisTheme } from "@/constants/jarvis-theme";

type JarvisToolbarProps = {
  isMuted: boolean;
  showEndCall: boolean;
  keyboardActive: boolean;
  onToggleMute: () => void;
  onKeyboardPress: () => void;
  onEndCall: () => void;
};

type ToolbarAction = {
  id: string;
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
  renderIcon: (color: string) => ReactNode;
};

export function JarvisToolbar({
  isMuted,
  showEndCall,
  keyboardActive,
  onToggleMute,
  onKeyboardPress,
  onEndCall,
}: JarvisToolbarProps) {
  const actions: ToolbarAction[] = [
    {
      id: "keyboard",
      label: keyboardActive ? "Hide" : "Keyboard",
      onPress: onKeyboardPress,
      active: keyboardActive,
      renderIcon: (color) => <KeyboardIcon size={20} color={color} />,
    },
    {
      id: "mute",
      label: isMuted ? "Unmute" : "Mute",
      onPress: onToggleMute,
      active: isMuted,
      renderIcon: (color) => (
        <MicIcon size={20} color={color} muted={isMuted} />
      ),
    },
  ];

  if (showEndCall) {
    actions.push({
      id: "end",
      label: "End",
      onPress: onEndCall,
      danger: true,
      renderIcon: (color) => <PhoneEndIcon size={18} color={color} />,
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.divider} />
      <View style={styles.row}>
        {actions.map((action) => {
          const iconColor = action.danger
            ? "#fca5a5"
            : action.active
              ? jarvisTheme.cyan
              : jarvisTheme.textSecondary;

          return (
            <Pressable
              key={action.id}
              onPress={action.onPress}
              style={({ pressed }) => [styles.slot, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <View
                style={[
                  styles.iconRing,
                  action.active && styles.iconRingActive,
                  action.danger && styles.iconRingDanger,
                ]}
              >
                {action.renderIcon(iconColor)}
              </View>
              <Text
                style={[
                  styles.label,
                  action.active && styles.labelActive,
                  action.danger && styles.labelDanger,
                ]}
                selectable
              >
                {action.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: jarvisSpacing.lg,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: jarvisTheme.borderStrong,
    marginBottom: jarvisSpacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  slot: {
    flex: 1,
    alignItems: "center",
    gap: jarvisSpacing.sm,
    paddingVertical: jarvisSpacing.xs,
  },
  iconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  iconRingActive: {
    backgroundColor: jarvisTheme.cyanMuted,
    borderColor: jarvisTheme.cyanBorder,
  },
  iconRingDanger: {
    backgroundColor: jarvisTheme.errorBg,
    borderColor: jarvisTheme.errorBorder,
  },
  label: {
    color: jarvisTheme.textMuted,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.4,
  },
  labelActive: {
    color: jarvisTheme.cyan,
  },
  labelDanger: {
    color: "#fca5a5",
  },
  pressed: {
    opacity: 0.72,
  },
});
