import { ClerkProvider } from "@clerk/clerk-react";
import { AppUserProvider } from "./AppUserProvider";
import { AuthProvider } from "./AuthProvider";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const ENABLE_DEV_AUTH = import.meta.env.VITE_ENABLE_DEV_AUTH === "true";

export function AppProviders({ children }) {
  const content = (
    <AuthProvider>
      <AppUserProvider>{children}</AppUserProvider>
    </AuthProvider>
  );

  if (ENABLE_DEV_AUTH) {
    return content;
  }

  return <ClerkProvider publishableKey={PUBLISHABLE_KEY}>{content}</ClerkProvider>;
}
