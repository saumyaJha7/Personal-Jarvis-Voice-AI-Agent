import { useConversation } from "@elevenlabs/react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useSharedValue } from "react-native-reanimated";

import { addHodTask } from "@/services/db";

type DisconnectDetails =
  | { reason: "user" }
  | { reason: "agent" }
  | { reason: "error"; message: string };

export type TranscriptMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
};

const TOOL_LABELS: Record<string, string> = {
  tavily_search: "Searching the web",
  google_calendar_create_event: "Creating calendar event",
  google_calendar_list_events: "Checking your calendar",
  google_calendar_check_availability: "Checking availability",
  google_calendar_list_calendars: "Loading calendars",
};

function getToolLabel(toolName: string) {
  return TOOL_LABELS[toolName] ?? `Running ${toolName.replace(/_/g, " ")}`;
}

function getDisconnectMessage(details: DisconnectDetails) {
  if (details.reason === "error") {
    return details.message || "Connection lost. Tap the orb to reconnect.";
  }
  if (details.reason === "agent") {
    return "Session ended by Jarvis.";
  }
  return null;
}

function parseHour(timeStr: string): number {
  if (!timeStr) return 9;
  if (timeStr.includes("T")) {
    const date = new Date(timeStr);
    if (!isNaN(date.getTime())) {
      return date.getHours() + date.getMinutes() / 60;
    }
  }
  const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const ampm = match[3]?.toUpperCase();
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    return hours + minutes / 60;
  }
  return 9;
}

function determineSlotId(timeStr: string): 1 | 2 | 3 | 4 {
  const hour = parseHour(timeStr);
  if (hour < 10.5) return 1;
  if (hour < 12.5) return 2;
  if (hour < 14.5) return 3;
  return 4;
}

async function handleCalendarToolPayload(toolName: string, data: any) {
  if (!toolName || !toolName.toLowerCase().includes("calendar") || !data) return;
  try {
    const items = Array.isArray(data)
      ? data
      : data?.items || data?.events || [data];

    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const title = item.summary || item.title || item.name || "Calendar Event";
      const startStr = item.start?.dateTime || item.start?.time || item.startTime || "";
      const description = item.description || "Synced from Google Calendar";
      const location = item.location || "HOD Office";
      const slotId = determineSlotId(startStr);

      await addHodTask(slotId, title, description, location);
    }
  } catch (err) {
    console.error("Error parsing Google Calendar payload:", err);
  }
}

function extractAndSaveFromText(text: string) {
  if (!text) return;
  const timeMatch = text.match(/(\d{1,2}:?\d{0,2}\s*(?:AM|PM)?)/i);
  const lower = text.toLowerCase();
  if (
    timeMatch &&
    (lower.includes("add") ||
      lower.includes("schedul") ||
      lower.includes("block") ||
      lower.includes("calen") ||
      lower.includes("event") ||
      lower.includes("meet"))
  ) {
    const timeStr = timeMatch[1];
    const slotId = determineSlotId(timeStr);
    const titleMatch = text.match(/(?:meeting|event|lecture|task|session)\s+([a-zA-Z0-9\s]+)/i);
    const title = titleMatch ? titleMatch[1].trim() : "Scheduled Calendar Task";
    void addHodTask(slotId, title, "Synced via Jarvis Voice", "HOD Office");
  }
}

export function useJarvisConversation() {
  const [isStarting, setIsStarting] = useState(false);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isEndingRef = useRef(false);

  const appendMessage = useCallback((role: "user" | "agent", text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === role && last.text === trimmed) {
        return prev;
      }

      return [
        ...prev,
        { id: `${Date.now()}-${prev.length}`, role, text: trimmed },
      ];
    });
  }, []);

  const conversation = useConversation({
    dynamicVariables: {
      platform: Platform.OS,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    onConnect: () => {
      setError(null);
      setIsStarting(false);

      // Auto-Sync: Request Jarvis to check/sync today's Google Calendar events on connect
      setTimeout(() => {
        try {
          conversation.sendUserMessage("Check my Google Calendar for today and list all scheduled events.");
        } catch {}
      }, 1200);
    },
    onDisconnect: (details) => {
      setActiveTool(null);
      setIsStarting(false);
      isEndingRef.current = false;

      const message = getDisconnectMessage(details);
      if (message && details.reason !== "user") {
        setError(message);
      }
    },
    onError: (message) => {
      setIsStarting(false);
      setError(message || "Something went wrong with the voice connection.");
    },
    onStatusChange: ({ status }) => {
      if (
        status === "connected" ||
        status === "disconnected" ||
        status === "disconnecting"
      ) {
        setIsStarting(false);
      }
    },
    onMessage: (payload) => {
      const isUser =
        payload.role === "user" ||
        ("source" in payload && payload.source === "user");
      appendMessage(isUser ? "user" : "agent", payload.message);

      if (!isUser && payload.message) {
        extractAndSaveFromText(payload.message);
      }
    },
    onAgentToolRequest: ({ tool_name }) => {
      setActiveTool(getToolLabel(tool_name));
    },
    onAgentToolResponse: (props: any) => {
      setActiveTool(null);
      if (props?.tool_name && props?.tool_response) {
        void handleCalendarToolPayload(props.tool_name, props.tool_response);
      }
    },
    onMCPToolCall: (props: any) => {
      if (props.state === "loading" || props.state === "awaiting_approval") {
        setActiveTool(getToolLabel(props.tool_name));
      } else {
        setActiveTool(null);
        if (props.result) {
          void handleCalendarToolPayload(props.tool_name, props.result);
        }
      }
    },
  });

  const startConversation = () => {
    if (isStarting || conversation.status !== "disconnected") return;

    const agentId = process.env.EXPO_PUBLIC_AGENT_ID;
    if (!agentId) {
      setError(
        "Missing EXPO_PUBLIC_AGENT_ID. Add it to .env for local dev, or set it in EAS environment variables for preview/production builds.",
      );
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      conversation.startSession({
        agentId,
        dynamicVariables: {
          platform: Platform.OS,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
    } catch (err) {
      setIsStarting(false);
      const message =
        err instanceof Error ? err.message : "Failed to start conversation";
      setError(message);
    }
  };

  const endConversation = () => {
    if (isEndingRef.current || conversation.status !== "connected") return;

    isEndingRef.current = true;
    setActiveTool(null);

    try {
      conversation.endSession();
    } catch (err) {
      isEndingRef.current = false;
      const message =
        err instanceof Error ? err.message : "Failed to end conversation";
      setError(message);
    }
  };

  const sendTextMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || conversation.status !== "connected") return;
    appendMessage("user", trimmed);
    conversation.sendUserMessage(trimmed);
  };

  // Live audio amplitude (0-1), smoothed, for driving the orb visuals.
  const amplitude = useSharedValue(0);
  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;

  useEffect(() => {
    if (conversation.status !== "connected") {
      amplitude.value = 0;
      return;
    }

    let raf: number;
    const readLevel = (fn: unknown) => {
      if (typeof fn !== "function") return 0;
      try {
        const value = (fn as () => number)();
        return typeof value === "number" && Number.isFinite(value) ? value : 0;
      } catch {
        return 0;
      }
    };

    const tick = () => {
      const c = conversationRef.current;
      const level = Math.max(
        readLevel(c.getOutputVolume),
        readLevel(c.getInputVolume),
      );
      amplitude.value = amplitude.value * 0.75 + level * 0.25;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [amplitude, conversation.status]);

  return {
    conversation,
    isStarting,
    messages,
    activeTool,
    error,
    amplitude,
    startConversation,
    endConversation,
    sendTextMessage,
    clearError: () => setError(null),
  };
}
