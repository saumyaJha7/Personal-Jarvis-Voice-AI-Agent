import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

export interface UserSession {
  id: number;
  email: string;
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
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS active_session (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        user_id INTEGER NOT NULL,
        email TEXT NOT NULL,
        logged_in_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
    `);
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

  // Web Fallback handling
  if (Platform.OS === "web") {
    const usersStr = typeof window !== "undefined" ? localStorage.getItem("jarvis_users") : null;
    const users: Record<string, { id: number; email: string; password: string }> = usersStr
      ? JSON.parse(usersStr)
      : {};

    if (users[email]) {
      if (users[email].password !== password) {
        throw new Error("Invalid password for this account.");
      }
      const session = { id: users[email].id, email: users[email].email };
      if (typeof window !== "undefined") {
        localStorage.setItem("jarvis_active_session", JSON.stringify(session));
      }
      return session;
    } else {
      const newId = Date.now();
      users[email] = { id: newId, email, password };
      if (typeof window !== "undefined") {
        localStorage.setItem("jarvis_users", JSON.stringify(users));
      }
      const session = { id: newId, email };
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

  const existingUser = await db.getFirstAsync<{ id: number; email: string; password: string }>(
    "SELECT id, email, password FROM users WHERE LOWER(email) = ?",
    [email]
  );

  if (existingUser) {
    if (existingUser.password !== password) {
      throw new Error("Invalid password for this account.");
    }

    await db.runAsync(
      "INSERT OR REPLACE INTO active_session (id, user_id, email) VALUES (1, ?, ?)",
      [existingUser.id, existingUser.email]
    );

    return { id: existingUser.id, email: existingUser.email };
  } else {
    await db.runAsync(
      "INSERT INTO users (email, password) VALUES (?, ?)",
      [email, password]
    );

    const newUser = await db.getFirstAsync<{ id: number; email: string }>(
      "SELECT id, email FROM users WHERE LOWER(email) = ?",
      [email]
    );

    if (!newUser) {
      throw new Error("Failed to create user record in SQLite.");
    }

    await db.runAsync(
      "INSERT OR REPLACE INTO active_session (id, user_id, email) VALUES (1, ?, ?)",
      [newUser.id, newUser.email]
    );

    return { id: newUser.id, email: newUser.email };
  }
}

export async function getCurrentSession(): Promise<UserSession | null> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return null;
    const sessionStr = localStorage.getItem("jarvis_active_session");
    return sessionStr ? JSON.parse(sessionStr) : null;
  }

  try {
    const db = await getDb();
    if (!db) return null;

    const session = await db.getFirstAsync<{ user_id: number; email: string }>(
      "SELECT user_id, email FROM active_session WHERE id = 1"
    );

    if (!session) return null;
    return { id: session.user_id, email: session.email };
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
