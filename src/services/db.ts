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

export async function initDatabase(): Promise<void> {
  if (Platform.OS === "web") {
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
    `);

    // Migration fallback for existing database instances
    try {
      await db.execAsync("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student';");
    } catch {}
    try {
      await db.execAsync("ALTER TABLE active_session ADD COLUMN role TEXT NOT NULL DEFAULT 'student';");
    } catch {}
  } catch (error) {
    console.error("Failed to initialize SQLite database:", error);
    throw error;
  }
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
