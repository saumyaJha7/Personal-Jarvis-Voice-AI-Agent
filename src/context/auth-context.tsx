import React, { createContext, useContext, useEffect, useState } from "react";
import {
  authenticateUser,
  clearSession,
  getCurrentSession,
  initDatabase,
  UserSession,
} from "@/services/db";

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<UserSession>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        await initDatabase();
        const activeUser = await getCurrentSession();
        setUser(activeUser);
      } catch (error) {
        console.error("Failed to load auth session:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, []);

  const login = async (email: string, pass: string): Promise<UserSession> => {
    const session = await authenticateUser(email, pass);
    setUser(session);
    return session;
  };

  const logout = async (): Promise<void> => {
    await clearSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
