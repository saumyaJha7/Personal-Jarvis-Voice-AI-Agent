"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKING_SLOTS = void 0;
exports.authenticateUser = authenticateUser;
exports.getCurrentSession = getCurrentSession;
exports.minutesToTimeStr = minutesToTimeStr;
exports.initDatabase = initDatabase;
exports.getTodayHodTasks = getTodayHodTasks;
exports.addHodTask = addHodTask;
exports.deleteHodTask = deleteHodTask;
exports.clearSession = clearSession;
const SQLite = require("expo-sqlite");
const react_native_1 = require("react-native");
let dbPromise = null;
async function getDb() {
    if (react_native_1.Platform.OS === "web") {
        return null;
    }
    if (!dbPromise) {
        dbPromise = SQLite.openDatabaseAsync("jarvis_auth.db");
    }
    return dbPromise;
}
async function authenticateUser(emailInput, passwordInput) {
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();
    if (!email || !password) {
        throw new Error("Email and password are required.");
    }
    const isHodAttempt = email === "hod@gmail.com";
    if (isHodAttempt && password !== "1234") {
        throw new Error("Invalid password for HOD account.");
    }
    const role = isHodAttempt ? "hod" : "student";
    // Web Fallback handling
    if (react_native_1.Platform.OS === "web") {
        const usersStr = typeof window !== "undefined" ? localStorage.getItem("jarvis_users") : null;
        const users = usersStr
            ? JSON.parse(usersStr)
            : {};
        if (users[email]) {
            if (isHodAttempt && users[email].password !== password) {
                throw new Error("Invalid password for HOD account.");
            }
            const session = { id: users[email].id, email: users[email].email, role };
            if (typeof window !== "undefined") {
                localStorage.setItem("jarvis_active_session", JSON.stringify(session));
            }
            return session;
        }
        else {
            const newId = Date.now();
            users[email] = { id: newId, email, password, role };
            if (typeof window !== "undefined") {
                localStorage.setItem("jarvis_users", JSON.stringify(users));
            }
            const session = { id: newId, email, role };
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
    const existingUser = await db.getFirstAsync("SELECT id, email, password, role FROM users WHERE LOWER(email) = ?", [email]);
    if (existingUser) {
        if (isHodAttempt && existingUser.password !== password) {
            throw new Error("Invalid password for HOD account.");
        }
        await db.runAsync("UPDATE users SET role = ?, password = ? WHERE id = ?", [role, password, existingUser.id]);
        await db.runAsync("INSERT OR REPLACE INTO active_session (id, user_id, email, role) VALUES (1, ?, ?, ?)", [existingUser.id, existingUser.email, role]);
        return { id: existingUser.id, email: existingUser.email, role };
    }
    else {
        await db.runAsync("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", [email, password, role]);
        const newUser = await db.getFirstAsync("SELECT id, email, role FROM users WHERE LOWER(email) = ?", [email]);
        if (!newUser) {
            throw new Error("Failed to create user record in SQLite.");
        }
        await db.runAsync("INSERT OR REPLACE INTO active_session (id, user_id, email, role) VALUES (1, ?, ?, ?)", [newUser.id, newUser.email, role]);
        return { id: newUser.id, email: newUser.email, role };
    }
}
async function getCurrentSession() {
    if (react_native_1.Platform.OS === "web") {
        if (typeof window === "undefined")
            return null;
        const sessionStr = localStorage.getItem("jarvis_active_session");
        if (!sessionStr)
            return null;
        const parsed = JSON.parse(sessionStr);
        const role = parsed.role ?? (parsed.email === "hod@gmail.com" ? "hod" : "student");
        return { ...parsed, role };
    }
    try {
        const db = await getDb();
        if (!db)
            return null;
        const session = await db.getFirstAsync("SELECT user_id, email, role FROM active_session WHERE id = 1");
        if (!session)
            return null;
        const role = session.role ?? (session.email === "hod@gmail.com" ? "hod" : "student");
        return { id: session.user_id, email: session.email, role };
    }
    catch (error) {
        console.error("Error reading active session from SQLite:", error);
        return null;
    }
}
exports.WORKING_SLOTS = [
    { id: 1, label: "Slot 1", time: "08:30 AM - 10:30 AM", startMinutes: 510, endMinutes: 630 },
    { id: 2, label: "Slot 2", time: "10:30 AM - 12:30 PM", startMinutes: 630, endMinutes: 750 },
    { id: 3, label: "Slot 3", time: "12:30 PM - 02:30 PM", startMinutes: 750, endMinutes: 870 },
    { id: 4, label: "Slot 4", time: "02:30 PM - 04:30 PM", startMinutes: 870, endMinutes: 990 },
];
function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function minutesToTimeStr(totalMinutes) {
    let h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0)
        h = 12;
    const mStr = String(m).padStart(2, "0");
    const hStr = String(h).padStart(2, "0");
    return `${hStr}:${mStr} ${ampm}`;
}
async function initDatabase() {
    if (react_native_1.Platform.OS === "web") {
        if (typeof window !== "undefined" && localStorage.getItem("jarvis_dummy_cleared_v2") !== "true") {
            localStorage.removeItem("jarvis_hod_tasks");
            localStorage.setItem("jarvis_dummy_cleared_v2", "true");
        }
        return;
    }
    try {
        const db = await getDb();
        if (!db)
            return;
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
        event_date TEXT NOT NULL
      );
    `);
        // Migration fallback for existing database instances
        try {
            await db.execAsync("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student';");
        }
        catch { }
        try {
            await db.execAsync("ALTER TABLE active_session ADD COLUMN role TEXT NOT NULL DEFAULT 'student';");
        }
        catch { }
        // Clear old dummy tasks
        try {
            await db.runAsync("DELETE FROM hod_tasks WHERE id <= 10 OR title LIKE '%Consultation%' OR title LIKE '%Faculty%' OR title LIKE '%Departmental%' OR title LIKE '%Mobile%'");
        }
        catch { }
    }
    catch (error) {
        console.error("Failed to initialize SQLite database:", error);
        throw error;
    }
}
function unfoldICalText(text) {
    return text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}
function parseICalPropDate(propVal) {
    if (!propVal)
        return null;
    const matchUtc = propVal.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
    const matchLocal = propVal.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
    const matchDate = propVal.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (matchUtc) {
        return new Date(Date.UTC(parseInt(matchUtc[1], 10), parseInt(matchUtc[2], 10) - 1, parseInt(matchUtc[3], 10), parseInt(matchUtc[4], 10), parseInt(matchUtc[5], 10), parseInt(matchUtc[6], 10)));
    }
    if (matchLocal) {
        return new Date(parseInt(matchLocal[1], 10), parseInt(matchLocal[2], 10) - 1, parseInt(matchLocal[3], 10), parseInt(matchLocal[4], 10), parseInt(matchLocal[5], 10), parseInt(matchLocal[6], 10));
    }
    if (matchDate) {
        return new Date(parseInt(matchDate[1], 10), parseInt(matchDate[2], 10) - 1, parseInt(matchDate[3], 10));
    }
    return null;
}
function isICalEventOnDate(props, targetDate) {
    const startDate = parseICalPropDate(props.DTSTART?.value);
    if (!startDate)
        return false;
    const tY = targetDate.getFullYear();
    const tM = targetDate.getMonth();
    const tD = targetDate.getDate();
    // Exact date match in local time
    if (startDate.getFullYear() === tY &&
        startDate.getMonth() === tM &&
        startDate.getDate() === tD) {
        return true;
    }
    // Recurrence check
    const rruleProp = props.RRULE;
    if (!rruleProp || !rruleProp.value)
        return false;
    const targetMidnight = new Date(tY, tM, tD).getTime();
    const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
    if (startMidnight > targetMidnight)
        return false;
    const rules = {};
    rruleProp.value.split(";").forEach((part) => {
        const [k, v] = part.split("=");
        if (k && v)
            rules[k] = v;
    });
    if (rules.UNTIL) {
        const untilDate = parseICalPropDate(rules.UNTIL);
        if (untilDate && targetDate > untilDate)
            return false;
    }
    const freq = rules.FREQ;
    if (freq === "DAILY") {
        return true;
    }
    else if (freq === "WEEKLY") {
        const days = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
        const targetDayName = days[targetDate.getDay()];
        if (rules.BYDAY) {
            return rules.BYDAY.split(",").some((d) => d.includes(targetDayName));
        }
        return startDate.getDay() === targetDate.getDay();
    }
    else if (freq === "MONTHLY") {
        if (rules.BYMONTHDAY) {
            return targetDate.getDate() === parseInt(rules.BYMONTHDAY, 10);
        }
        return startDate.getDate() === targetDate.getDate();
    }
    else if (freq === "YEARLY") {
        if (rules.BYMONTHDAY && rules.BYMONTH) {
            return (targetDate.getMonth() === parseInt(rules.BYMONTH, 10) - 1 &&
                targetDate.getDate() === parseInt(rules.BYMONTHDAY, 10));
        }
        return startDate.getMonth() === tM && startDate.getDate() === tD;
    }
    return false;
}
async function fetchLiveICalEvents(targetDate) {
    const icalUrl = process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_ICAL_URL ||
        "https://calendar.google.com/calendar/ical/jhasaumya554%40gmail.com/public/basic.ics";
    const events = [];
    try {
        const res = await fetch(icalUrl);
        if (!res.ok)
            return events;
        const text = await res.text();
        const unfolded = unfoldICalText(text);
        const vevents = unfolded.split("BEGIN:VEVENT");
        for (let i = 1; i < vevents.length; i++) {
            const block = vevents[i].split("END:VEVENT")[0];
            const lines = block.split(/\r?\n/);
            const props = {};
            for (const line of lines) {
                if (!line.trim())
                    continue;
                const colonIdx = line.indexOf(":");
                if (colonIdx === -1)
                    continue;
                const keyPart = line.substring(0, colonIdx);
                const valPart = line.substring(colonIdx + 1);
                const keyName = keyPart.split(";")[0].toUpperCase();
                props[keyName] = {
                    key: keyPart,
                    value: valPart.replace(/\\n/g, "\n").replace(/\\,/g, ",").trim(),
                };
            }
            if (!props.SUMMARY || !props.DTSTART)
                continue;
            if (isICalEventOnDate(props, targetDate)) {
                const startDate = parseICalPropDate(props.DTSTART.value);
                const endDate = parseICalPropDate(props.DTEND?.value);
                if (!startDate)
                    continue;
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
    }
    catch (err) {
        console.error("Error fetching live iCal feed:", err);
    }
    return events;
}
async function getTodayHodTasks() {
    const today = getTodayString();
    const targetDate = new Date();
    const rawEvents = [];
    // 1. Live Google Calendar iCal events
    const liveICalEvents = await fetchLiveICalEvents(targetDate);
    rawEvents.push(...liveICalEvents);
    // 2. Add local DB / LocalStorage tasks
    if (react_native_1.Platform.OS === "web") {
        if (typeof window !== "undefined") {
            const tasksStr = localStorage.getItem("jarvis_hod_tasks");
            const allTasks = tasksStr ? JSON.parse(tasksStr) : [];
            const todayTasks = allTasks.filter((t) => t.eventDate === today);
            todayTasks.forEach((t) => {
                let startMin = t.startMinutes;
                let endMin = t.endMinutes;
                if (!startMin && t.slotId) {
                    const slot = exports.WORKING_SLOTS.find((s) => s.id === t.slotId);
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
    }
    else {
        try {
            const db = await getDb();
            if (db) {
                const rows = await db.getAllAsync("SELECT * FROM hod_tasks WHERE event_date = ? ORDER BY slot_id ASC", [today]);
                rows.forEach((r) => {
                    const slot = exports.WORKING_SLOTS.find((s) => s.id === r.slot_id);
                    const startMin = slot ? slot.startMinutes : 510;
                    const endMin = slot ? slot.endMinutes : 630;
                    rawEvents.push({
                        id: r.id,
                        title: r.title,
                        description: r.description || "",
                        location: r.location || "HOD Office",
                        startMinutes: startMin,
                        endMinutes: endMin,
                        status: r.status || "Scheduled",
                    });
                });
            }
        }
        catch (err) {
            console.error("Error reading local HOD tasks from SQLite:", err);
        }
    }
    // 3. Build continuous timeline with dynamic Free Slots
    const sorted = [...rawEvents].sort((a, b) => a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes);
    const timeline = [];
    let dayStartMinutes = 510; // Default 8:30 AM
    let dayEndMinutes = 990; // Default 4:30 PM
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
                eventDate: today,
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
            status: ev.status || "Scheduled",
            eventDate: today,
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
            eventDate: today,
            isAvailable: true,
        });
    }
    return timeline;
}
async function addHodTask(slotIdOrTime, title, description = "", location = "HOD Office") {
    const today = getTodayString();
    let slotId = 1;
    if (typeof slotIdOrTime === "number") {
        slotId = slotIdOrTime;
    }
    else {
        // Determine slotId based on hour
        const match = slotIdOrTime.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
        if (match) {
            let h = parseInt(match[1], 10);
            const ampm = match[3]?.toUpperCase();
            if (ampm === "PM" && h < 12)
                h += 12;
            if (ampm === "AM" && h === 12)
                h = 0;
            if (h < 10.5)
                slotId = 1;
            else if (h < 12.5)
                slotId = 2;
            else if (h < 14.5)
                slotId = 3;
            else
                slotId = 4;
        }
    }
    if (react_native_1.Platform.OS === "web") {
        if (typeof window !== "undefined") {
            const tasksStr = localStorage.getItem("jarvis_hod_tasks");
            let allTasks = tasksStr ? JSON.parse(tasksStr) : [];
            allTasks = allTasks.filter((t) => !(t.slotId === slotId && t.eventDate === today));
            allTasks.push({
                id: Date.now(),
                slotId,
                title,
                description,
                location,
                status: "Scheduled",
                eventDate: today,
            });
            localStorage.setItem("jarvis_hod_tasks", JSON.stringify(allTasks));
        }
        return;
    }
    const db = await getDb();
    if (!db)
        return;
    await db.runAsync("DELETE FROM hod_tasks WHERE slot_id = ? AND event_date = ?", [slotId, today]);
    await db.runAsync("INSERT INTO hod_tasks (slot_id, title, description, location, status, event_date) VALUES (?, ?, ?, ?, ?, ?)", [slotId, title, description, location, "Scheduled", today]);
}
async function deleteHodTask(taskId) {
    if (react_native_1.Platform.OS === "web") {
        if (typeof window !== "undefined") {
            const tasksStr = localStorage.getItem("jarvis_hod_tasks");
            let allTasks = tasksStr ? JSON.parse(tasksStr) : [];
            allTasks = allTasks.filter((t) => t.id !== taskId);
            localStorage.setItem("jarvis_hod_tasks", JSON.stringify(allTasks));
        }
        return;
    }
    const db = await getDb();
    if (!db)
        return;
    await db.runAsync("DELETE FROM hod_tasks WHERE id = ?", [taskId]);
}
async function clearSession() {
    if (react_native_1.Platform.OS === "web") {
        if (typeof window !== "undefined") {
            localStorage.removeItem("jarvis_active_session");
        }
        return;
    }
    try {
        const db = await getDb();
        if (!db)
            return;
        await db.runAsync("DELETE FROM active_session");
    }
    catch (error) {
        console.error("Error clearing session from SQLite:", error);
    }
}
