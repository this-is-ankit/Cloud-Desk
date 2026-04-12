import { useEffect } from "react";
import { useAppProfile } from "../hooks/useUsers";
import { AppUserContext } from "./AppUserContext";
import { clearAuthIntent } from "../lib/authIntent";

export function AppUserProvider({ children }) {
  const profileQuery = useAppProfile();
  const profile = profileQuery.data?.profile || null;
  const role = profile?.role || "student";
  const roleLocked = Boolean(
    profile?.roleLocked ?? profile?.onboardingCompleted,
  );

  useEffect(() => {
    if (profile?.onboardingCompleted) {
      clearAuthIntent();
    }
  }, [profile?.onboardingCompleted]);

  return (
    <AppUserContext.Provider
      value={{
        profile,
        role,
        roleLocked,
        isTeacher: role === "teacher",
        isStudent: role === "student",
        onboardingCompleted: Boolean(profile?.onboardingCompleted),
        isLoading: profileQuery.isLoading,
        isFetching: profileQuery.isFetching,
        refetchProfile: profileQuery.refetch,
      }}
    >
      {children}
    </AppUserContext.Provider>
  );
}
