import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, {
    Defs,
    Line,
    LinearGradient,
    Pattern,
    RadialGradient,
    Rect,
    Stop,
} from "react-native-svg";

import { jarvisTheme } from "@/constants/jarvis-theme";

type JarvisBackgroundProps = {
  compact?: boolean;
};

export function JarvisBackground({ compact = false }: JarvisBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const hatchHeight = height * (compact ? 0.22 : 0.34);
  const glowSize = compact ? 220 : 320;
  const glowTop = compact ? 72 : 96;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <Pattern
            id="jarvisHatch"
            patternUnits="userSpaceOnUse"
            width={10}
            height={10}
            patternTransform="rotate(45)"
          >
            <Line
              x1={0}
              y1={0}
              x2={0}
              y2={10}
              stroke="rgba(250, 250, 250, 0.028)"
              strokeWidth={1}
            />
          </Pattern>
          <LinearGradient id="jarvisHatchFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={jarvisTheme.bg} stopOpacity={0.1} />
            <Stop offset="0.55" stopColor={jarvisTheme.bg} stopOpacity={0.72} />
            <Stop offset="1" stopColor={jarvisTheme.bg} stopOpacity={1} />
          </LinearGradient>
          <RadialGradient id="jarvisOrbGlow" cx="50%" cy="0%" r="50%">
            <Stop offset="0" stopColor="#38bdf8" stopOpacity={0.2} />
            <Stop offset="0.4" stopColor="#0ea5e9" stopOpacity={0.1} />
            <Stop offset="0.75" stopColor="#0369a1" stopOpacity={0.04} />
            <Stop offset="1" stopColor={jarvisTheme.bg} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        <Rect
          x={0}
          y={0}
          width={width}
          height={hatchHeight}
          fill="url(#jarvisHatch)"
        />
        <Rect
          x={0}
          y={0}
          width={width}
          height={hatchHeight}
          fill="url(#jarvisHatchFade)"
        />
        <Rect
          x={(width - glowSize) / 2}
          y={glowTop}
          width={glowSize}
          height={glowSize}
          fill="url(#jarvisOrbGlow)"
        />
      </Svg>
    </View>
  );
}
