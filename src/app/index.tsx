import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
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
import { addHodTask, getTodayHodTasks, HodTask, timeStrToMinutes } from "@/services/db";

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
  const [hodTasks, setHodTasks] = useState<HodTask[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStartTime, setNewStartTime] = useState("10:00 AM");
  const [newEndTime, setNewEndTime] = useState("11:30 AM");
  const [newLocation, setNewLocation] = useState("HOD Office");
  const [newDescription, setNewDescription] = useState("");

  const fetchHodTasks = useCallback(async (targetDate?: Date) => {
    try {
      const dateToFetch = targetDate || selectedDate;
      const tasks = await getTodayHodTasks(dateToFetch);
      setHodTasks(tasks);
    } catch (err) {
      console.error("Failed to load HOD tasks:", err);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login" as any);
    } else if (user && user.role !== "hod") {
      void fetchHodTasks(selectedDate);
    }
  }, [user, isLoading, router, fetchHodTasks, selectedDate]);

  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const handleTodayReset = () => {
    setSelectedDate(new Date());
  };

  const handleSaveNewTask = async () => {
    if (!newTitle.trim()) return;
    const startMin = timeStrToMinutes(newStartTime);
    const endMin = timeStrToMinutes(newEndTime);
    await addHodTask(
      newStartTime,
      newTitle.trim(),
      newDescription.trim(),
      newLocation.trim() || "HOD Office",
      selectedDate,
      startMin,
      endMin
    );
    setShowAddModal(false);
    setNewTitle("");
    setNewDescription("");
    await fetchHodTasks(selectedDate);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHodTasks(selectedDate);
    setRefreshing(false);
  };

  if (isLoading || !user) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <JarvisBackground />
        <ActivityIndicator size="large" color={jarvisTheme.cyan} />
      </View>
    );
  }

  const isHod = user.role === "hod";
  const isConnected = conversation.status === "connected";
  const canStart = conversation.status === "disconnected" && !isStarting;
  const showEndCall = isConnected;
  const showComposer = isConnected && keyboardVisible;
  const hasMessages = messages.length > 0;
  const showOrb = isHod && !keyboardVisible;
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

  if (!isHod) {
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const dateFormatted = selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return (
      <View style={styles.root}>
        <JarvisBackground />
        <StatusBar style="light" />
        <View
          style={[
            styles.screen,
            {
              paddingTop: insets.top + jarvisSpacing.md,
              paddingBottom: Math.max(insets.bottom, jarvisSpacing.lg),
              paddingLeft: Math.max(insets.left, jarvisSpacing.screen),
              paddingRight: Math.max(insets.right, jarvisSpacing.screen),
            },
          ]}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>Jarvis</Text>
              <Text style={styles.studentBadgeText}>STUDENT PORTAL</Text>
            </View>
            <View style={styles.headerRight}>
              <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.studentScrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={jarvisTheme.cyan}
              />
            }
          >
            <View style={styles.scheduleHeaderBanner}>
              <View style={styles.bannerTopRow}>
                <View>
                  <Text style={styles.scheduleBannerTitle}>
                    {isToday ? "HOD Today's Schedule" : "HOD Schedule"}
                  </Text>
                  <Text style={styles.scheduleBannerSubtitle}>{dateFormatted}</Text>
                </View>

                <View style={styles.bannerActionsRight}>
                  {!isToday ? (
                    <Pressable style={styles.todayResetBtn} onPress={handleTodayReset}>
                      <Text style={styles.todayResetText}>Today</Text>
                    </Pressable>
                  ) : null}

                  <Pressable style={styles.addTaskBtn} onPress={() => setShowAddModal(true)}>
                    <Text style={styles.addTaskBtnText}>+ Add Task</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.dateNavRow}>
                <Pressable style={styles.dateNavBtn} onPress={handlePrevDay}>
                  <Text style={styles.dateNavBtnText}>◀ Prev</Text>
                </Pressable>

                <View style={styles.dateDisplayPill}>
                  <Text style={styles.dateDisplayIcon}>📅</Text>
                  <Text style={styles.dateDisplayText}>
                    {selectedDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>

                <Pressable style={styles.dateNavBtn} onPress={handleNextDay}>
                  <Text style={styles.dateNavBtnText}>Next ▶</Text>
                </Pressable>
              </View>

              <View style={styles.workingHoursPill}>
                <Text style={styles.workingHoursText}>
                  ⏰ Live Calendar & Working Hours Timeline
                </Text>
              </View>
            </View>

            <View style={styles.slotsList}>
              {hodTasks.map((task) => {
                const isAvailable = task.isAvailable || task.status === "Available";
                return (
                  <View
                    key={String(task.id)}
                    style={[
                      styles.slotCard,
                      isAvailable ? styles.slotCardAvailable : styles.slotCardOccupied,
                    ]}
                  >
                    <View style={styles.slotCardHeader}>
                      <View
                        style={[
                          styles.slotBadge,
                          isAvailable && styles.slotBadgeAvailable,
                        ]}
                      >
                        <Text
                          style={[
                            styles.slotBadgeText,
                            isAvailable && styles.slotBadgeTextAvailable,
                          ]}
                        >
                          {task.startTime} – {task.endTime}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.taskStatusPill,
                          isAvailable ? styles.statusPillFree : styles.statusPillBusy,
                        ]}
                      >
                        <Text
                          style={[
                            styles.taskStatusText,
                            isAvailable ? styles.statusTextFree : styles.statusTextBusy,
                          ]}
                        >
                          {isAvailable ? "Free Slot" : "Occupied"}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.taskTitle}>{task.title}</Text>
                    {task.description ? (
                      <Text style={styles.taskDescription}>{task.description}</Text>
                    ) : null}

                    {task.location ? (
                      <View style={styles.locationContainer}>
                        <Text style={styles.locationText}>
                          📍 {task.location}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

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

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Add Task for {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Task Title (e.g. Guest Lecture / Seminar)"
              placeholderTextColor={jarvisTheme.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <View style={styles.modalRow}>
              <View style={styles.flex1}>
                <Text style={styles.modalLabel}>Start Time</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="10:00 AM"
                  placeholderTextColor={jarvisTheme.textMuted}
                  value={newStartTime}
                  onChangeText={setNewStartTime}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.modalLabel}>End Time</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="11:30 AM"
                  placeholderTextColor={jarvisTheme.textMuted}
                  value={newEndTime}
                  onChangeText={setNewEndTime}
                />
              </View>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Location (e.g. HOD Office or Hall 2)"
              placeholderTextColor={jarvisTheme.textMuted}
              value={newLocation}
              onChangeText={setNewLocation}
            />

            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Description (Optional)"
              placeholderTextColor={jarvisTheme.textMuted}
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
            />

            <View style={styles.modalBtnRow}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalSaveBtn,
                  !newTitle.trim() && styles.sendButtonDisabled,
                ]}
                onPress={handleSaveNewTask}
                disabled={!newTitle.trim()}
              >
                <Text style={styles.modalSaveBtnText}>Save Task</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  studentBadgeText: {
    color: jarvisTheme.cyan,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 1,
  },
  studentScrollContent: {
    paddingBottom: jarvisSpacing.xxl,
    gap: jarvisSpacing.lg,
  },
  scheduleHeaderBanner: {
    backgroundColor: jarvisTheme.bgSurface,
    padding: jarvisSpacing.lg,
    borderRadius: jarvisRadius.lg,
    borderWidth: 1,
    borderColor: jarvisTheme.borderStrong,
    gap: 12,
  },
  bannerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scheduleBannerTitle: {
    color: jarvisTheme.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  scheduleBannerSubtitle: {
    color: jarvisTheme.textSecondary,
    fontSize: 13,
  },
  bannerActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  todayResetBtn: {
    backgroundColor: "rgba(34, 211, 238, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: jarvisRadius.pill,
    borderWidth: 1,
    borderColor: jarvisTheme.cyanBorder,
  },
  todayResetText: {
    color: jarvisTheme.cyan,
    fontSize: 11,
    fontWeight: "700",
  },
  addTaskBtn: {
    backgroundColor: jarvisTheme.blue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: jarvisRadius.pill,
  },
  addTaskBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  flex1: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: jarvisSpacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: jarvisTheme.bgSurface,
    borderRadius: jarvisRadius.xl,
    borderWidth: 1,
    borderColor: jarvisTheme.borderStrong,
    padding: jarvisSpacing.xl,
    gap: jarvisSpacing.md,
  },
  modalTitle: {
    color: jarvisTheme.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  modalRow: {
    flexDirection: "row",
    gap: jarvisSpacing.md,
  },
  modalLabel: {
    color: jarvisTheme.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: jarvisTheme.bgElevated,
    borderWidth: 1,
    borderColor: jarvisTheme.border,
    borderRadius: jarvisRadius.md,
    paddingHorizontal: jarvisSpacing.md,
    paddingVertical: 10,
    color: jarvisTheme.text,
    fontSize: 14,
  },
  modalTextArea: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: jarvisSpacing.sm,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: jarvisRadius.md,
    borderWidth: 1,
    borderColor: jarvisTheme.border,
  },
  modalCancelBtnText: {
    color: jarvisTheme.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  modalSaveBtn: {
    backgroundColor: jarvisTheme.cyan,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: jarvisRadius.md,
  },
  modalSaveBtnText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "700",
  },
  dateNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(24, 24, 27, 0.6)",
    padding: 6,
    borderRadius: jarvisRadius.md,
    borderWidth: 1,
    borderColor: jarvisTheme.border,
  },
  dateNavBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: jarvisRadius.sm,
    backgroundColor: "rgba(39, 39, 42, 0.7)",
  },
  dateNavBtnText: {
    color: jarvisTheme.text,
    fontSize: 12,
    fontWeight: "600",
  },
  dateDisplayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateDisplayIcon: {
    fontSize: 14,
  },
  dateDisplayText: {
    color: jarvisTheme.cyan,
    fontSize: 13,
    fontWeight: "700",
  },
  workingHoursPill: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(34, 211, 238, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: jarvisRadius.pill,
    borderWidth: 1,
    borderColor: jarvisTheme.cyanBorder,
  },
  workingHoursText: {
    color: jarvisTheme.cyan,
    fontSize: 11,
    fontWeight: "600",
  },
  slotsList: {
    gap: jarvisSpacing.md,
  },
  slotCard: {
    backgroundColor: jarvisTheme.bgElevated,
    borderWidth: 1,
    borderColor: jarvisTheme.borderStrong,
    borderRadius: jarvisRadius.lg,
    padding: jarvisSpacing.lg,
    gap: 8,
  },
  slotCardAvailable: {
    borderColor: "rgba(34, 211, 238, 0.15)",
    backgroundColor: "rgba(24, 24, 27, 0.4)",
  },
  slotCardOccupied: {
    borderColor: "rgba(139, 92, 246, 0.4)",
    backgroundColor: "rgba(30, 27, 75, 0.35)",
  },
  slotCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  slotBadge: {
    backgroundColor: jarvisTheme.blue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: jarvisRadius.sm,
  },
  slotBadgeAvailable: {
    backgroundColor: "rgba(34, 211, 238, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.3)",
  },
  slotBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  slotBadgeTextAvailable: {
    color: jarvisTheme.cyan,
  },
  slotTimeText: {
    color: jarvisTheme.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  taskStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: jarvisRadius.pill,
    borderWidth: 1,
  },
  statusPillBusy: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  statusPillFree: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  taskStatusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  statusTextBusy: {
    color: "#fca5a5",
  },
  statusTextFree: {
    color: "#86efac",
  },
  taskTitle: {
    color: jarvisTheme.text,
    fontSize: 16,
    fontWeight: "700",
  },
  taskDescription: {
    color: jarvisTheme.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  locationContainer: {
    marginTop: 2,
  },
  locationText: {
    color: jarvisTheme.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
});
