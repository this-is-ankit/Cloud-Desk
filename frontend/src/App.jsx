import { Navigate, Route, Routes } from "react-router";
import HomePage from "./pages/HomePage";

import { Toaster } from "react-hot-toast";
import DashboardPage from "./pages/DashboardPage";
import ProblemPage from "./pages/ProblemPage";
import ProblemsPage from "./pages/ProblemsPage";
import SessionPage from "./pages/SessionPage";
import CoursesPage from "./pages/CoursesPage";
import CourseDetailPage from "./pages/CourseDetailPage";
import { useTheme } from "./context/ThemeProvider";
import { useAppUser } from "./hooks/useAppUser";
import { useRuntimeAuth } from "./hooks/useRuntimeAuth";
import OnboardingPage from "./pages/OnboardingPage";
import ProfileSettingsPage from "./pages/ProfileSettingsPage";
import TeachersPage from "./pages/TeachersPage";
import TeacherDetailPage from "./pages/TeacherDetailPage";
import { Loader2 } from "lucide-react";

function ProtectedAppRoute({ children }) {
  const { isSignedIn, isLoaded } = useRuntimeAuth();
  const { onboardingCompleted, isLoading } = useAppUser();

  if (!isLoaded || (isSignedIn && isLoading)) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSignedIn) return <Navigate to="/" />;
  if (!onboardingCompleted) return <Navigate to="/onboarding" />;
  return children;
}

function App() {
  const { isSignedIn, isLoaded } = useRuntimeAuth();
  const { isDark } = useTheme();
  const { onboardingCompleted, isLoading } = useAppUser();

  // this will get rid of the flickering effect
  if (!isLoaded || (isSignedIn && isLoading)) return null;

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            !isSignedIn ? (
              <HomePage />
            ) : (
              <Navigate
                to={onboardingCompleted ? "/dashboard" : "/onboarding"}
              />
            )
          }
        />
        <Route
          path="/onboarding"
          element={
            isSignedIn ? (
              onboardingCompleted ? (
                <Navigate to="/dashboard" />
              ) : (
                <OnboardingPage />
              )
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedAppRoute>
              <DashboardPage />
            </ProtectedAppRoute>
          }
        />
        <Route
          path="/courses"
          element={
            <ProtectedAppRoute>
              <CoursesPage />
            </ProtectedAppRoute>
          }
        />
        <Route
          path="/courses/:id"
          element={
            <ProtectedAppRoute>
              <CourseDetailPage />
            </ProtectedAppRoute>
          }
        />
        <Route
          path="/teachers"
          element={
            <ProtectedAppRoute>
              <TeachersPage />
            </ProtectedAppRoute>
          }
        />
        <Route
          path="/teachers/:id"
          element={
            <ProtectedAppRoute>
              <TeacherDetailPage />
            </ProtectedAppRoute>
          }
        />
        <Route
          path="/settings/profile"
          element={
            <ProtectedAppRoute>
              <ProfileSettingsPage />
            </ProtectedAppRoute>
          }
        />

        <Route
          path="/problems"
          element={
            <ProtectedAppRoute>
              <ProblemsPage />
            </ProtectedAppRoute>
          }
        />
        <Route
          path="/problem/:id"
          element={
            <ProtectedAppRoute>
              <ProblemPage />
            </ProtectedAppRoute>
          }
        />
        <Route
          path="/session/:id"
          element={
            <ProtectedAppRoute>
              <SessionPage />
            </ProtectedAppRoute>
          }
        />
      </Routes>

      <Toaster
        toastOptions={{
          duration: 3000,
          style: {
            background: isDark ? "#111a2b" : "#ffffff",
            color: isDark ? "#eef2ff" : "#111827",
            border: `1px solid ${isDark ? "#26324b" : "#dbe2ee"}`,
          },
        }}
      />
    </>
  );
}

export default App;
