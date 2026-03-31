import { useAppProfile } from "../hooks/useUsers";
import { AppUserContext } from "./AppUserContext";

export function AppUserProvider({ children }) {
  const profileQuery = useAppProfile();
  const profile = profileQuery.data?.profile || null;
  const role = profile?.role || "student";

  return (
    <AppUserContext.Provider
      value={{
        profile,
        role,
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
