import { useContext } from "react";
import { AppUserContext } from "../context/AppUserContext";

export function useAppUser() {
  const context = useContext(AppUserContext);
  if (!context) {
    throw new Error("useAppUser must be used within AppUserProvider");
  }
  return context;
}
