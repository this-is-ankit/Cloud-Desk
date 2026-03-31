import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth as useClerkAuth, useClerk, useUser as useClerkUser } from "@clerk/clerk-react";
import { AuthContext } from "./AuthContext";

const DEV_AUTH_STORAGE_KEY = "cloud-desk-dev-auth";
const ENABLE_DEV_AUTH = import.meta.env.VITE_ENABLE_DEV_AUTH === "true";

const parseStoredDevAuth = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEV_AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const buildDevClerkId = (value) => {
  const base = (value || "").toString().trim().toLowerCase().replace(/[^a-z0-9@_. -]/g, "-");
  if (!base) return "dev-student";
  return base.startsWith("dev-") ? base : `dev-${base}`;
};

const buildDevUser = (session) => {
  if (!session) return null;

  const role = session.role === "teacher" ? "teacher" : "student";
  const name = session.name || (role === "teacher" ? "Demo Teacher" : "Demo Student");
  const parts = name.split(" ");

  return {
    id: buildDevClerkId(session.id),
    firstName: parts[0] || name,
    lastName: parts.slice(1).join(" "),
    fullName: name,
    imageUrl: session.imageUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`,
    publicMetadata: {
      role,
    },
    primaryEmailAddress: {
      emailAddress: session.email,
    },
  };
};

function DevAuthProvider({ children }) {
  const [session, setSession] = useState(() => parseStoredDevAuth());

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (session) {
      window.localStorage.setItem(DEV_AUTH_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
    }
  }, [session]);

  const signInAs = useCallback((role) => {
    const nextRole = role === "teacher" ? "teacher" : "student";
    setSession({
      id: nextRole,
      role: nextRole,
      name: nextRole === "teacher" ? "Demo Teacher" : "Demo Student",
      email: nextRole === "teacher" ? "teacher@cloud-desk.dev" : "student@cloud-desk.dev",
      imageUrl: "",
    });
  }, []);

  const signOut = useCallback(async () => {
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      authMode: "dev",
      isLoaded: true,
      isSignedIn: Boolean(session),
      user: buildDevUser(session),
      signInAs,
      signOut,
      getToken: async () => null,
      devAuth: session,
    }),
    [session, signInAs, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function ClerkAuthProvider({ children }) {
  const { user, isLoaded, isSignedIn } = useClerkUser();
  const { getToken } = useClerkAuth();
  const { signOut } = useClerk();

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      authMode: "clerk",
      isLoaded,
      isSignedIn,
      user,
      signInAs: null,
      signOut,
      getToken,
      devAuth: null,
    }),
    [getToken, isLoaded, isSignedIn, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }) {
  if (ENABLE_DEV_AUTH) {
    return <DevAuthProvider>{children}</DevAuthProvider>;
  }
  return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
}
