import React, { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);
const ADMIN_PASSCODE =
  import.meta.env.VITE_ADMIN_PASSCODE?.trim() || "admin123";
const TOKEN_KEY = "eatoo:admin-token";
const TOKEN_VALUE = "granted";

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    try {
      return window.localStorage.getItem(TOKEN_KEY) === TOKEN_VALUE;
    } catch {
      return false;
    }
  });

  const login = (passcode) => {
    if ((passcode || "").trim() !== ADMIN_PASSCODE) {
      return { ok: false, message: "Invalid admin passcode." };
    }

    try {
      window.localStorage.setItem(TOKEN_KEY, TOKEN_VALUE);
    } catch {
      /* ignore write issues */
    }
    setIsAdmin(true);
    return { ok: true };
  };

  const logout = () => {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    setIsAdmin(false);
  };

  const value = useMemo(
    () => ({
      isAdmin,
      login,
      logout,
    }),
    [isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
