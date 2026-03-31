import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { userApi } from "../api/users";

export const useAppProfile = () => {
  const { isSignedIn } = useAuth();

  return useQuery({
    queryKey: ["app-profile"],
    queryFn: userApi.getMe,
    enabled: Boolean(isSignedIn),
    staleTime: 60_000,
  });
};

const useProfileMutation = (mutationKey, mutationFn, successMessage, errorMessage) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [mutationKey],
    mutationFn,
    onSuccess: (data) => {
      toast.success(data?.message || successMessage);
      queryClient.invalidateQueries({ queryKey: ["app-profile"] });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      queryClient.invalidateQueries({ queryKey: ["teacher"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || errorMessage);
    },
  });
};

export const useCompleteOnboarding = () =>
  useProfileMutation("completeOnboarding", userApi.completeOnboarding, "Onboarding completed", "Failed to complete onboarding");

export const useUpdateRole = () =>
  useProfileMutation("updateRole", userApi.updateRole, "Role updated", "Failed to update role");

export const useUpdateProfile = () =>
  useProfileMutation("updateProfile", userApi.updateProfile, "Profile updated", "Failed to update profile");

export const useTeachers = (params = {}) =>
  useQuery({
    queryKey: ["teachers", params],
    queryFn: () => userApi.getTeachers(params),
  });

export const useTeacherById = (teacherId) =>
  useQuery({
    queryKey: ["teacher", teacherId],
    queryFn: () => userApi.getTeacherById(teacherId),
    enabled: Boolean(teacherId),
  });
