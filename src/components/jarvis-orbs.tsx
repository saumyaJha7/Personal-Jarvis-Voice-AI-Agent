import type { ConversationStatus } from "@elevenlabs/react-native";
import {
    BlurMask,
    Canvas,
    Circle,
    Group,
    RadialGradient,
    SweepGradient,
    vec,
} from "@shopify/react-native-skia";
import { useEffect } from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useDerivedValue,
    useFrameCallback,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    type SharedValue,
} from "react-native-reanimated";

import { jarvisSpacing, jarvisTheme } from "@/constants/jarvis-theme";

type JarvisOrbProps = {
  status: ConversationStatus;
  isSpeaking: boolean;
  isListening: boolean;
  isStarting: boolean;
  activeTool: string | null;
  onOrbPress: () => void;
  disabled: boolean;
  compact?: boolean;
  amplitude: SharedValue<number>;
};

// Conic sweep palette — no near-black stops so the orb stays visible on #09090b.
// First and last colors match for a seamless 360° loop.
const METALLIC_COLORS = [
  "#0e4f6e",
  "#155e75",
  "#0c4a6e",
  "#0369a1",
  "#0ea5e9",
  "#38bdf8",
  "#a5f3fc",
  "#e0f2fe",
  "#67e8f9",
  "#22d3ee",
  "#0284c7",
  "#1d4ed8",
  "#0e7490",
  "#0891b2",
  "#38bdf8",
  "#0e4f6e",
];

const METALLIC_POSITIONS = [
  0, 0.06, 0.12, 0.2, 0.28, 0.36, 0.42, 0.46, 0.52, 0.58, 0.64, 0.72, 0.8, 0.88,
  0.94, 1,
];

function getOrbLabel(
  status: ConversationStatus,
  isStarting: boolean,
  isSpeaking: boolean,
  isListening: boolean,
  activeTool: string | null,
) {
  if (isStarting || status === "connecting") return "Connecting";
  if (status === "error") return "Connection error";
  if (status === "disconnected") return "Tap to activate";
  if (activeTool) return activeTool;
  if (isSpeaking) return "Speaking";
  if (isListening) return "Listening";
  return "Online";
}

function getStatusTone(
  status: ConversationStatus,
  isStarting: boolean,
  isSpeaking: boolean,
  isListening: boolean,
  activeTool: string | null,
): "idle" | "active" | "busy" | "error" {
  if (status === "error") return "error";
  if (isStarting || status === "connecting") return "busy";
  if (status === "connected" && (isSpeaking || isListening || activeTool))
    return "busy";
  if (status === "connected") return "active";
  return "idle";
}

export function JarvisOrb({
  status,
  isSpeaking,
  isListening,
  isStarting,
  activeTool,
  onOrbPress,
  disabled,
  compact = false,
  amplitude,
}: JarvisOrbProps) {
  const { width } = useWindowDimensions();
  const orbSize = Math.min(width - (compact ? 120 : 80), compact ? 196 : 248);
  const center = orbSize / 2;
  const radius = orbSize / 2 - 4;
  const centerVec = vec(center, center);

  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0.6);

  const isActive = status === "connected";
  const isBusy = isSpeaking || isListening || Boolean(activeTool);
  const label = getOrbLabel(
    status,
    isStarting,
    isSpeaking,
    isListening,
    activeTool,
  );
  const tone = getStatusTone(
    status,
    isStarting,
    isSpeaking,
    isListening,
    activeTool,
  );

  useFrameCallback((frame) => {
    const dt = Math.min(frame.timeSincePreviousFrame ?? 16, 48) / 1000;
    const speed = (isBusy ? 0.45 : 0.28) + amplitude.value * 2.6;
    rotation.value = (rotation.value + speed * dt) % (Math.PI * 2);
  });

  useEffect(() => {
    if (isSpeaking) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.04, {
            duration: 420,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0.98, {
            duration: 420,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      );
      glow.value = withTiming(1, { duration: 250 });
      return;
    }

    if (isListening || activeTool) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.025, {
            duration: 900,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      glow.value = withTiming(0.85, { duration: 250 });
      return;
    }

    if (status === "connecting" || isStarting) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.02, {
            duration: 700,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      glow.value = withTiming(0.7, { duration: 250 });
      return;
    }

    pulse.value = withTiming(1, { duration: 300 });
    glow.value = withTiming(isActive ? 0.8 : 0.5, { duration: 300 });
  }, [
    activeTool,
    glow,
    isActive,
    isListening,
    isSpeaking,
    isStarting,
    pulse,
    status,
  ]);

  const gradientTransform = useDerivedValue(() => [{ rotate: rotation.value }]);
  const coreRadius = useDerivedValue(
    () => radius * (0.16 + amplitude.value * 0.14),
  );

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value + amplitude.value * 0.12 }],
    opacity: Math.min(1, glow.value + amplitude.value * 0.35),
  }));

  return (
    <View style={[styles.wrapper, compact && styles.wrapperCompact]}>
      <Pressable
        onPress={onOrbPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.orbPressable,
          pressed && !disabled && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Animated.View
          style={[{ width: orbSize, height: orbSize }, wrapperStyle]}
        >
          <Canvas style={{ width: orbSize, height: orbSize }}>
            {/* Ambient under-glow */}
            <Circle cx={center} cy={center} r={radius * 1.08} color="#22d3ee22">
              <BlurMask blur={radius * 0.28} style="normal" />
            </Circle>

            {/* Base fill so sweep never reveals pure black */}
            <Circle cx={center} cy={center} r={radius} color="#0c4a6e" />

            <Circle cx={center} cy={center} r={radius}>
              <SweepGradient
                c={centerVec}
                origin={centerVec}
                colors={METALLIC_COLORS}
                positions={METALLIC_POSITIONS}
                transform={gradientTransform}
              />
            </Circle>

            {/* Soft depth vignette — lighter rim so the circle stays defined */}
            <Circle cx={center} cy={center} r={radius}>
              <RadialGradient
                c={centerVec}
                r={radius}
                colors={["#00000000", "#00000000", "#0a192818", "#0f274480"]}
                positions={[0, 0.48, 0.86, 1]}
              />
            </Circle>

            <Group>
              <Circle cx={center} cy={center} r={coreRadius} color="#e0fbff">
                <BlurMask blur={radius * 0.14} style="normal" />
              </Circle>
              <Circle
                cx={center}
                cy={center}
                r={radius * 0.05}
                color="#ffffff"
              />
            </Group>

            {/* Outer rim glow + inner edge highlight */}
            <Circle
              cx={center}
              cy={center}
              r={radius + 0.5}
              style="stroke"
              strokeWidth={2}
              color="#38bdf833"
            />
            <Circle
              cx={center}
              cy={center}
              r={radius}
              style="stroke"
              strokeWidth={1}
              color="#67e8f966"
            />
          </Canvas>
        </Animated.View>
      </Pressable>

      <View style={styles.meta}>
        <View style={[styles.statusPill, styles[`status_${tone}`]]}>
          <View style={[styles.statusDot, styles[`dot_${tone}`]]} />
          <Text style={styles.statusText} selectable>
            {label}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: jarvisSpacing.sm,
  },
  wrapperCompact: {
    paddingVertical: 0,
  },
  orbPressable: {
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.88,
  },
  meta: {
    marginTop: jarvisSpacing.lg,
    alignItems: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  status_idle: {
    backgroundColor: "rgba(39, 39, 42, 0.55)",
    borderColor: jarvisTheme.border,
  },
  status_active: {
    backgroundColor: "rgba(34, 211, 238, 0.08)",
    borderColor: jarvisTheme.cyanBorder,
  },
  status_busy: {
    backgroundColor: "rgba(2, 132, 199, 0.12)",
    borderColor: "rgba(2, 132, 199, 0.28)",
  },
  status_error: {
    backgroundColor: jarvisTheme.errorBg,
    borderColor: jarvisTheme.errorBorder,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dot_idle: {
    backgroundColor: jarvisTheme.textMuted,
  },
  dot_active: {
    backgroundColor: jarvisTheme.cyan,
  },
  dot_busy: {
    backgroundColor: jarvisTheme.blue,
  },
  dot_error: {
    backgroundColor: jarvisTheme.error,
  },
  statusText: {
    color: jarvisTheme.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
