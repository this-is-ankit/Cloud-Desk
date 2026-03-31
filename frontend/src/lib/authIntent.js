const AUTH_INTENT_STORAGE_KEY = "cloud-desk-auth-intent";

const normalizeRole = (value) => (value === "teacher" ? "teacher" : value === "student" ? "student" : null);

export const setAuthIntent = (role) => {
  if (typeof window === "undefined") return;
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return;
  window.localStorage.setItem(AUTH_INTENT_STORAGE_KEY, normalizedRole);
};

export const getAuthIntent = () => {
  if (typeof window === "undefined") return null;
  return normalizeRole(window.localStorage.getItem(AUTH_INTENT_STORAGE_KEY));
};

export const clearAuthIntent = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_INTENT_STORAGE_KEY);
};
