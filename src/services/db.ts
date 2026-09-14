import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

export type UserRole = "hod" | "student";

export interface UserSession {
  id: number;
  email: string;
  role: UserRole;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase | null> {
  if (Platform.OS === "web") {
    return null;
  }
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("jarvis_auth.db");
  }
  return dbPromise;
}

export async function authenticateUser(
  emailInput: string,
  passwordInput: string
): Promise<UserSession> {
  const email = emailInput.trim().toLowerCase();
  const password = passwordInput.trim();

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const isHodAttempt = email === "hod@gmail.com";
  if (isHodAttempt && password !== "1234") {
    throw new Error("Invalid password for HOD account.");
  }

  const role: UserRole = isHodAttempt ? "hod" : "student";

  // Web Fallback handling
  if (Platform.OS === "web") {
    const usersStr = typeof window !== "undefined" ? localStorage.getItem("jarvis_users") : null;
    const users: Record<string, { id: number; email: string; password: string; role: UserRole }> = usersStr
      ? JSON.parse(usersStr)
      : {};

    if (users[email]) {
      if (isHodAttempt && users[email].password !== password) {
        throw new Error("Invalid password for HOD account.");
      }
      const session: UserSession = { id: users[email].id, email: users[email].email, role };
      if (typeof window !== "undefined") {
        localStorage.setItem("jarvis_active_session", JSON.stringify(session));
      }
      return session;
    } else {
      const newId = Date.now();
      users[email] = { id: newId, email, password, role };
      if (typeof window !== "undefined") {
        localStorage.setItem("jarvis_users", JSON.stringify(users));
      }
      const session: UserSession = { id: newId, email, role };
      if (typeof window !== "undefined") {
        localStorage.setItem("jarvis_active_session", JSON.stringify(session));
      }
      return session;
    }
  }

  // SQLite Native handling
  const db = await getDb();
  if (!db) {
    throw new Error("Database unavailable.");
  }

  const existingUser = await db.getFirstAsync<{ id: number; email: string; password: string; role?: string }>(
    "SELECT id, email, password, role FROM users WHERE LOWER(email) = ?",
    [email]
  );

  if (existingUser) {
    if (isHodAttempt && existingUser.password !== password) {
      throw new Error("Invalid password for HOD account.");
    }

    await db.runAsync(
      "UPDATE users SET role = ?, password = ? WHERE id = ?",
      [role, password, existingUser.id]
    );

    await db.runAsync(
      "INSERT OR REPLACE INTO active_session (id, user_id, email, role) VALUES (1, ?, ?, ?)",
      [existingUser.id, existingUser.email, role]
    );

    return { id: existingUser.id, email: existingUser.email, role };
  } else {
    await db.runAsync(
      "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
      [email, password, role]
    );

    const newUser = await db.getFirstAsync<{ id: number; email: string; role: string }>(
      "SELECT id, email, role FROM users WHERE LOWER(email) = ?",
      [email]
    );

    if (!newUser) {
      throw new Error("Failed to create user record in SQLite.");
    }

    await db.runAsync(
      "INSERT OR REPLACE INTO active_session (id, user_id, email, role) VALUES (1, ?, ?, ?)",
      [newUser.id, newUser.email, role]
    );

    return { id: newUser.id, email: newUser.email, role };
  }
}

export async function getCurrentSession(): Promise<UserSession | null> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return null;
    const sessionStr = localStorage.getItem("jarvis_active_session");
    if (!sessionStr) return null;
    const parsed = JSON.parse(sessionStr);
    const role: UserRole = parsed.role ?? (parsed.email === "hod@gmail.com" ? "hod" : "student");
    return { ...parsed, role };
  }

  try {
    const db = await getDb();
    if (!db) return null;

    const session = await db.getFirstAsync<{ user_id: number; email: string; role?: string }>(
      "SELECT user_id, email, role FROM active_session WHERE id = 1"
    );

    if (!session) return null;
    const role: UserRole = (session.role as UserRole) ?? (session.email === "hod@gmail.com" ? "hod" : "student");
    return { id: session.user_id, email: session.email, role };
  } catch (error) {
    console.error("Error reading active session from SQLite:", error);
    return null;
  }
}

export interface HodTask {
  id: number | string;
  slotId?: number;
  slotLabel?: string;
  slotTime?: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  title: string;
  description?: string;
  location?: string;
  status: "Scheduled" | "In Progress" | "Completed" | "Available";
  eventDate: string;
  isAvailable: boolean;
}

export const WORKING_SLOTS = [
  { id: 1 as const, label: "Slot 1", time: "08:30 AM - 10:30 AM", startMinutes: 510, endMinutes: 630 },
  { id: 2 as const, label: "Slot 2", time: "10:30 AM - 12:30 PM", startMinutes: 630, endMinutes: 750 },
  { id: 3 as const, label: "Slot 3", time: "12:30 PM - 02:30 PM", startMinutes: 750, endMinutes: 870 },
  { id: 4 as const, label: "Slot 4", time: "02:30 PM - 04:30 PM", startMinutes: 870, endMinutes: 990 },
];

export function getFormattedDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function minutesToTimeStr(totalMinutes: number): string {
  let h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const mStr = String(m).padStart(2, "0");
  const hStr = String(h).padStart(2, "0");
  return `${hStr}:${mStr} ${ampm}`;
}

export function timeStrToMinutes(timeStr: string): number {
  if (!timeStr) return 510;
  const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2] ? parseInt(match[2], 10) : 0;
    const ampm = match[3]?.toUpperCase();
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }
  return 510;
}

export async function initDatabase(): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && localStorage.getItem("jarvis_dummy_cleared_v2") !== "true") {
      localStorage.removeItem("jarvis_hod_tasks");
      localStorage.setItem("jarvis_dummy_cleared_v2", "true");
    }
    return;
  }

  try {
    const db = await getDb();
    if (!db) return;

    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS active_session (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        user_id INTEGER NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        logged_in_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
      CREATE TABLE IF NOT EXISTS hod_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slot_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT,
        status TEXT DEFAULT 'Scheduled',
        event_date TEXT NOT NULL,
        start_minutes INTEGER,
        end_minutes INTEGER
      );
    `);

    // Migration fallbacks
    try {
      await db.execAsync("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student';");
    } catch {}
    try {
      await db.execAsync("ALTER TABLE active_session ADD COLUMN role TEXT NOT NULL DEFAULT 'student';");
    } catch {}
    try {
      await db.execAsync("ALTER TABLE hod_tasks ADD COLUMN start_minutes INTEGER;");
    } catch {}
    try {
      await db.execAsync("ALTER TABLE hod_tasks ADD COLUMN end_minutes INTEGER;");
    } catch {}

    // Clear old dummy tasks
    try {
      await db.runAsync(
        "DELETE FROM hod_tasks WHERE id <= 10 OR title LIKE '%Consultation%' OR title LIKE '%Faculty%' OR title LIKE '%Departmental%' OR title LIKE '%Mobile%'"
      );
    } catch {}
  } catch (error) {
    console.error("Failed to initialize SQLite database:", error);
    throw error;
  }
}

function unfoldICalText(text: string): string {
  return text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

function parseICalPropDate(propVal?: string): Date | null {
  if (!propVal) return null;
  const matchUtc = propVal.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  const matchLocal = propVal.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  const matchDate = propVal.match(/^(\d{4})(\d{2})(\d{2})$/);

  if (matchUtc) {
    return new Date(
      Date.UTC(
        parseInt(matchUtc[1], 10),
        parseInt(matchUtc[2], 10) - 1,
        parseInt(matchUtc[3], 10),
        parseInt(matchUtc[4], 10),
        parseInt(matchUtc[5], 10),
        parseInt(matchUtc[6], 10)
      )
    );
  }
  if (matchLocal) {
    return new Date(
      parseInt(matchLocal[1], 10),
      parseInt(matchLocal[2], 10) - 1,
      parseInt(matchLocal[3], 10),
      parseInt(matchLocal[4], 10),
      parseInt(matchLocal[5], 10),
      parseInt(matchLocal[6], 10)
    );
  }
  if (matchDate) {
    return new Date(
      parseInt(matchDate[1], 10),
      parseInt(matchDate[2], 10) - 1,
      parseInt(matchDate[3], 10)
    );
  }
  return null;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isICalEventOnDate(
  props: Record<string, { key: string; value: string }>,
  targetDate: Date
): boolean {
  const startDate = parseICalPropDate(props.DTSTART?.value);
  if (!startDate) return false;

  const tY = targetDate.getFullYear();
  const tM = targetDate.getMonth();
  const tD = targetDate.getDate();
  const targetMidnight = new Date(tY, tM, tD);
  const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  // EXDATE Check
  if (props.EXDATE) {
    const exValues = props.EXDATE.value.split(",");
    for (const exVal of exValues) {
      const exDate = parseICalPropDate(exVal);
      if (exDate && isSameDay(exDate, targetDate)) {
        return false;
      }
    }
  }

  // Exact Date Match
  if (isSameDay(startDate, targetDate)) {
    return true;
  }

  const rruleProp = props.RRULE;
  if (!rruleProp || !rruleProp.value) return false;

  if (startMidnight.getTime() > targetMidnight.getTime()) return false;

  const rules: Record<string, string> = {};
  rruleProp.value.split(";").forEach((part) => {
    const [k, v] = part.split("=");
    if (k && v) rules[k] = v;
  });

  if (rules.UNTIL) {
    const untilDate = parseICalPropDate(rules.UNTIL);
    if (untilDate && targetMidnight.getTime() > untilDate.getTime()) return false;
  }

  const interval = parseInt(rules.INTERVAL || "1", 10);
  const count = rules.COUNT ? parseInt(rules.COUNT, 10) : null;
  const freq = rules.FREQ;

  if (freq === "DAILY") {
    const diffDays = Math.round(
      (targetMidnight.getTime() - startMidnight.getTime()) / (86400 * 1000)
    );
    if (diffDays < 0 || diffDays % interval !== 0) return false;
    if (count !== null) {
      const occurrenceNumber = Math.floor(diffDays / interval) + 1;
      if (occurrenceNumber > count) return false;
    }
    return true;
  } else if (freq === "WEEKLY") {
    const days = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    const targetDayName = days[targetDate.getDay()];
    const diffDays = Math.round(
      (targetMidnight.getTime() - startMidnight.getTime()) / (86400 * 1000)
    );
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks % interval !== 0) return false;

    let dayMatches = false;
    if (rules.BYDAY) {
      const allowedDays = rules.BYDAY.split(",");
      dayMatches = allowedDays.some((d) => d.includes(targetDayName));
    } else {
      dayMatches = startDate.getDay() === targetDate.getDay();
    }

    if (!dayMatches) return false;
    if (count !== null && diffWeeks >= count) return false;
    return true;
  } else if (freq === "MONTHLY") {
    let dayMatches = false;
    if (rules.BYMONTHDAY) {
      dayMatches = targetDate.getDate() === parseInt(rules.BYMONTHDAY, 10);
    } else {
      dayMatches = startDate.getDate() === targetDate.getDate();
    }
    if (!dayMatches) return false;

    const monthDiff = (tY - startDate.getFullYear()) * 12 + (tM - startDate.getMonth());
    if (monthDiff < 0 || monthDiff % interval !== 0) return false;
    if (count !== null && Math.floor(monthDiff / interval) >= count) return false;
    return true;
  } else if (freq === "YEARLY") {
    let dayMatches = false;
    if (rules.BYMONTHDAY && rules.BYMONTH) {
      dayMatches =
        targetDate.getMonth() === parseInt(rules.BYMONTH, 10) - 1 &&
        targetDate.getDate() === parseInt(rules.BYMONTHDAY, 10);
    } else {
      dayMatches = startDate.getMonth() === tM && startDate.getDate() === tD;
    }
    if (!dayMatches) return false;

    const yearDiff = tY - startDate.getFullYear();
    if (yearDiff < 0 || yearDiff % interval !== 0) return false;
    if (count !== null && Math.floor(yearDiff / interval) >= count) return false;
    return true;
  }

  return false;
}

async function fetchLiveICalEvents(
  targetDate: Date
): Promise<
  Array<{
    id: string;
    title: string;
    description: string;
    location: string;
    startMinutes: number;
    endMinutes: number;
  }>
> {
  const icalUrl =
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_ICAL_URL ||
    "https://calendar.google.com/calendar/ical/jhasaumya554%40gmail.com/public/basic.ics";
  const events: Array<{
    id: string;
    title: string;
    description: string;
    location: string;
    startMinutes: number;
    endMinutes: number;
  }> = [];

  try {
    const res = await fetch(icalUrl);
    if (!res.ok) return events;
    const text = await res.text();

    const unfolded = unfoldICalText(text);
    const vevents = unfolded.split("BEGIN:VEVENT");

    for (let i = 1; i < vevents.length; i++) {
      const block = vevents[i].split("END:VEVENT")[0];
      const lines = block.split(/\r?\n/);
      const props: Record<string, { key: string; value: string }> = {};

      for (const line of lines) {
        if (!line.trim()) continue;
        const colonIdx = line.indexOf(":");
        if (colonIdx === -1) continue;
        const keyPart = line.substring(0, colonIdx);
        const valPart = line.substring(colonIdx + 1);
        const keyName = keyPart.split(";")[0].toUpperCase();

        props[keyName] = {
          key: keyPart,
          value: valPart.replace(/\\n/g, "\n").replace(/\\,/g, ",").trim(),
        };
      }

      if (!props.SUMMARY || !props.DTSTART) continue;

      if (isICalEventOnDate(props, targetDate)) {
        const startDate = parseICalPropDate(props.DTSTART.value);
        const endDate = parseICalPropDate(props.DTEND?.value);

        if (!startDate) continue;

        const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
        let endMinutes = endDate
          ? endDate.getHours() * 60 + endDate.getMinutes()
          : startMinutes + 60;

        if (endMinutes <= startMinutes) {
          endMinutes = startMinutes + 60;
        }

        const uid = props.UID?.value || `ical-${i}-${startMinutes}`;
        const title = props.SUMMARY.value;
        const description = props.DESCRIPTION?.value || "Synced from Google Calendar";
        const location = props.LOCATION?.value || "Google Calendar";

        events.push({
          id: uid,
          title,
          description,
          location,
          startMinutes,
          endMinutes,
        });
      }
    }
  } catch (err) {
    console.error("Error fetching live iCal feed:", err);
  }

  return events;
}

export async function getTodayHodTasks(targetDate: Date = new Date()): Promise<HodTask[]> {
  const targetDateStr = getFormattedDateString(targetDate);

  const rawEvents: Array<{
    id: string | number;
    title: string;
    description: string;
    location: string;
    startMinutes: number;
    endMinutes: number;
    status?: string;
  }> = [];

  // 1. Live Google Calendar iCal events for targetDate
  const liveICalEvents = await fetchLiveICalEvents(targetDate);
  rawEvents.push(...liveICalEvents);

  // 2. Add local DB / LocalStorage tasks for targetDate
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      const tasksStr = localStorage.getItem("jarvis_hod_tasks");
      const allTasks: any[] = tasksStr ? JSON.parse(tasksStr) : [];
      const todayTasks = allTasks.filter((t) => t.eventDate === targetDateStr);

      todayTasks.forEach((t) => {
        let startMin = t.startMinutes;
        let endMin = t.endMinutes;
        if (!startMin && t.slotId) {
          const slot = WORKING_SLOTS.find((s) => s.id === t.slotId);
          startMin = slot ? slot.startMinutes : 510;
          endMin = slot ? slot.endMinutes : 630;
        }
        rawEvents.push({
          id: t.id || Date.now(),
          title: t.title,
          description: t.description || "",
          location: t.location || "HOD Office",
          startMinutes: startMin || 510,
          endMinutes: endMin || 630,
          status: t.status || "Scheduled",
        });
      });
    }
  } else {
    try {
      const db = await getDb();
      if (db) {
        const rows = await db.getAllAsync<{
          id: number;
          slot_id: number;
          title: string;
          description?: string;
          location?: string;
          status?: string;
          event_date: string;
          start_minutes?: number;
          end_minutes?: number;
        }>("SELECT * FROM hod_tasks WHERE event_date = ? ORDER BY slot_id ASC", [targetDateStr]);

        rows.forEach((r) => {
          let startMin = r.start_minutes;
          let endMin = r.end_minutes;
          if (!startMin && r.slot_id) {
            const slot = WORKING_SLOTS.find((s) => s.id === r.slot_id);
            startMin = slot ? slot.startMinutes : 510;
            endMin = slot ? slot.endMinutes : 630;
          }
          rawEvents.push({
            id: r.id,
            title: r.title,
            description: r.description || "",
            location: r.location || "HOD Office",
            startMinutes: startMin || 510,
            endMinutes: endMin || 630,
            status: r.status || "Scheduled",
          });
        });
      }
    } catch (err) {
      console.error("Error reading local HOD tasks from SQLite:", err);
    }
  }

  // 3. Build continuous timeline with dynamic Free Slots
  const sorted = [...rawEvents].sort(
    (a, b) => a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes
  );

  const timeline: HodTask[] = [];
  let dayStartMinutes = 510; // Default 8:30 AM
  let dayEndMinutes = 990;   // Default 4:30 PM

  if (sorted.length > 0) {
    if (sorted[0].startMinutes < dayStartMinutes) {
      dayStartMinutes = Math.max(0, sorted[0].startMinutes);
    }
    const maxEnd = Math.max(...sorted.map((e) => e.endMinutes));
    if (maxEnd > dayEndMinutes) {
      dayEndMinutes = Math.min(1440, maxEnd);
    }
  }

  let currentPointer = dayStartMinutes;

  for (let i = 0; i < sorted.length; i++) {
    const ev = sorted[i];

    // Gap before event -> Free slot
    if (ev.startMinutes > currentPointer) {
      timeline.push({
        id: `free-${currentPointer}-${ev.startMinutes}`,
        startTime: minutesToTimeStr(currentPointer),
        endTime: minutesToTimeStr(ev.startMinutes),
        startMinutes: currentPointer,
        endMinutes: ev.startMinutes,
        title: "Free Slot / Available",
        description: "No scheduled department or Google Calendar task during this time.",
        location: "HOD Office",
        status: "Available",
        eventDate: targetDateStr,
        isAvailable: true,
      });
      currentPointer = ev.startMinutes;
    }

    // Occupied Event
    timeline.push({
      id: ev.id,
      startTime: minutesToTimeStr(ev.startMinutes),
      endTime: minutesToTimeStr(ev.endMinutes),
      startMinutes: ev.startMinutes,
      endMinutes: ev.endMinutes,
      title: ev.title,
      description: ev.description,
      location: ev.location,
      status: (ev.status as any) || "Scheduled",
      eventDate: targetDateStr,
      isAvailable: false,
    });

    if (ev.endMinutes > currentPointer) {
      currentPointer = ev.endMinutes;
    }
  }

  // Trailing gap -> Free slot
  if (currentPointer < dayEndMinutes) {
    timeline.push({
      id: `free-${currentPointer}-${dayEndMinutes}`,
      startTime: minutesToTimeStr(currentPointer),
      endTime: minutesToTimeStr(dayEndMinutes),
      startMinutes: currentPointer,
      endMinutes: dayEndMinutes,
      title: "Free Slot / Available",
      description: "No scheduled department or Google Calendar task during this time.",
      location: "HOD Office",
      status: "Available",
      eventDate: targetDateStr,
      isAvailable: true,
    });
  }

  return timeline;
}

export async function addHodTask(
  slotIdOrTime: 1 | 2 | 3 | 4 | string,
  title: string,
  description = "",
  location = "HOD Office",
  targetDate: Date = new Date(),
  customStartMinutes?: number,
  customEndMinutes?: number
): Promise<void> {
  const dateStr = getFormattedDateString(targetDate);
  let slotId = 1;
  let startMinutes = customStartMinutes;
  let endMinutes = customEndMinutes;

  if (typeof slotIdOrTime === "number") {
    slotId = slotIdOrTime;
    const slot = WORKING_SLOTS.find((s) => s.id === slotId);
    if (!startMinutes) startMinutes = slot ? slot.startMinutes : 510;
    if (!endMinutes) endMinutes = slot ? slot.endMinutes : 630;
  } else {
    if (!startMinutes) startMinutes = timeStrToMinutes(slotIdOrTime);
    if (!endMinutes) endMinutes = startMinutes + 60;
    if (startMinutes < 630) slotId = 1;
    else if (startMinutes < 750) slotId = 2;
    else if (startMinutes < 870) slotId = 3;
    else slotId = 4;
  }

  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      const tasksStr = localStorage.getItem("jarvis_hod_tasks");
      let allTasks: any[] = tasksStr ? JSON.parse(tasksStr) : [];
      allTasks.push({
        id: Date.now(),
        slotId,
        startMinutes,
        endMinutes,
        title,
        description,
        location,
        status: "Scheduled",
        eventDate: dateStr,
      });
      localStorage.setItem("jarvis_hod_tasks", JSON.stringify(allTasks));
    }
    return;
  }

  const db = await getDb();
  if (!db) return;

  await db.runAsync(
    "INSERT INTO hod_tasks (slot_id, title, description, location, status, event_date, start_minutes, end_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [slotId, title, description, location, "Scheduled", dateStr, startMinutes, endMinutes]
  );
}

export async function deleteHodTask(taskId: number | string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      const tasksStr = localStorage.getItem("jarvis_hod_tasks");
      let allTasks: any[] = tasksStr ? JSON.parse(tasksStr) : [];
      allTasks = allTasks.filter((t) => t.id !== taskId);
      localStorage.setItem("jarvis_hod_tasks", JSON.stringify(allTasks));
    }
    return;
  }

  const db = await getDb();
  if (!db) return;

  await db.runAsync("DELETE FROM hod_tasks WHERE id = ?", [taskId]);
}

export async function clearSession(): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      localStorage.removeItem("jarvis_active_session");
    }
    return;
  }

  try {
    const db = await getDb();
    if (!db) return;

    await db.runAsync("DELETE FROM active_session");
  } catch (error) {
    console.error("Error clearing session from SQLite:", error);
  }
}
