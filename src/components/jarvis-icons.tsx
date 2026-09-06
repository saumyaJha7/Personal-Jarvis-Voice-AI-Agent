import Svg, { Line, Path, Rect } from "react-native-svg";

type IconProps = {
  size?: number;
  color?: string;
};

export function PhoneEndIcon({ size = 18, color = "#09090b" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.2-.2 1 .4 2.1.6 3.2.6.7 0 1.2.5 1.2 1.2V20c0 .7-.5 1.2-1.2 1.2C10.1 21.2 2.8 13.9 2.8 4.4 2.8 3.7 3.3 3.2 4 3.2h3.5c.7 0 1.2.5 1.2 1.2 0 1.1.2 2.2.6 3.2.1.4 0 .9-.3 1.2L6.6 10.8z"
        fill={color}
        transform="rotate(135 12 12)"
      />
    </Svg>
  );
}

export function KeyboardIcon({ size = 18, color = "#fafafa" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3}
        y={6}
        width={18}
        height={12}
        rx={2}
        stroke={color}
        strokeWidth={1.6}
      />
      <Line
        x1={7}
        y1={10}
        x2={7.01}
        y2={10}
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <Line
        x1={11}
        y1={10}
        x2={11.01}
        y2={10}
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <Line
        x1={15}
        y1={10}
        x2={15.01}
        y2={10}
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <Line
        x1={7}
        y1={14}
        x2={13}
        y2={14}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Line
        x1={16}
        y1={14}
        x2={17}
        y2={14}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function SettingsIcon({ size = 18, color = "#fafafa" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"
        stroke={color}
        strokeWidth={1.6}
      />
      <Path
        d="M19.4 13.4a7.6 7.6 0 0 0 .1-2.8l2-1.2-2-3.5-2.3.7a7.4 7.4 0 0 0-2.4-1.4L14.6 2h-4L9.2 5.2a7.4 7.4 0 0 0-2.4 1.4l-2.3-.7-2 3.5 2 1.2a7.6 7.6 0 0 0 0 2.8l-2 1.2 2 3.5 2.3-.7c.7.6 1.5 1.1 2.4 1.4L10.6 22h4l.4-3.2c.9-.3 1.7-.8 2.4-1.4l2.3.7 2-3.5-2-1.2z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MicIcon({
  size = 18,
  color = "#fafafa",
  muted = false,
}: IconProps & { muted?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={9}
        y={3}
        width={6}
        height={11}
        rx={3}
        stroke={color}
        strokeWidth={1.6}
      />
      <Path
        d="M6.5 11.5a5.5 5.5 0 0 0 11 0"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Line
        x1={12}
        y1={17}
        x2={12}
        y2={20}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Line
        x1={9}
        y1={20}
        x2={15}
        y2={20}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {muted ? (
        <Line
          x1={5}
          y1={5}
          x2={19}
          y2={19}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      ) : null}
    </Svg>
  );
}
