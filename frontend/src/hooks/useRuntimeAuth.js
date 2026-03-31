import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export function useRuntimeAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useRuntimeAuth must be used within AuthProvider");
  }
  return context;
}
