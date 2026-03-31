import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { courseApi } from "../api/courses";

export const useCourses = (params = {}) =>
  useQuery({
    queryKey: ["courses", params],
    queryFn: () => courseApi.getCourses(params),
  });

export const useCourseById = (courseId) =>
  useQuery({
    queryKey: ["course", courseId],
    queryFn: () => courseApi.getCourseById(courseId),
    enabled: Boolean(courseId),
  });

const invalidateCourses = (queryClient, courseId) => {
  queryClient.invalidateQueries({ queryKey: ["courses"] });
  if (courseId) {
    queryClient.invalidateQueries({ queryKey: ["course", courseId] });
  } else {
    queryClient.invalidateQueries({ queryKey: ["course"] });
  }
};

const createCourseMutation = (mutationKey, mutationFn, successMessage, errorMessage) => () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [mutationKey],
    mutationFn,
    onSuccess: (data, variables) => {
      toast.success(data?.message || successMessage);
      const courseId = data?.course?._id || variables?.courseId || variables;
      invalidateCourses(queryClient, courseId);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || errorMessage);
    },
  });
};

export const useCreateCourse = createCourseMutation(
  "createCourse",
  courseApi.createCourse,
  "Course created successfully",
  "Failed to create course",
);

export const useUpdateCourse = createCourseMutation(
  "updateCourse",
  courseApi.updateCourse,
  "Course updated successfully",
  "Failed to update course",
);

export const usePublishCourse = createCourseMutation(
  "publishCourse",
  courseApi.publishCourse,
  "Course published successfully",
  "Failed to publish course",
);

export const useArchiveCourse = createCourseMutation(
  "archiveCourse",
  courseApi.archiveCourse,
  "Course archived",
  "Failed to archive course",
);

export const useRequestEnrollment = createCourseMutation(
  "requestEnrollment",
  courseApi.requestEnrollment,
  "Enrollment request sent",
  "Failed to request enrollment",
);

export const useJoinCourseWithInvite = createCourseMutation(
  "joinCourseWithInvite",
  courseApi.joinCourseWithInvite,
  "Invite accepted",
  "Failed to join with invite code",
);

export const useApproveEnrollment = createCourseMutation(
  "approveEnrollment",
  courseApi.approveEnrollment,
  "Enrollment approved",
  "Failed to approve enrollment",
);

export const useRejectEnrollment = createCourseMutation(
  "rejectEnrollment",
  courseApi.rejectEnrollment,
  "Enrollment rejected",
  "Failed to reject enrollment",
);

export const useCreateClassSession = createCourseMutation(
  "createClassSession",
  courseApi.createClassSession,
  "Class scheduled successfully",
  "Failed to schedule class",
);

export const useUpdateClassSession = createCourseMutation(
  "updateClassSession",
  courseApi.updateClassSession,
  "Class updated",
  "Failed to update class",
);

export const useStartClassSession = createCourseMutation(
  "startClassSession",
  courseApi.startClassSession,
  "Class started",
  "Failed to start class",
);

export const useStartPersistentRoom = createCourseMutation(
  "startPersistentRoom",
  courseApi.startPersistentRoom,
  "Persistent room is ready",
  "Failed to start persistent room",
);

export const useCreateAssignment = createCourseMutation(
  "createAssignment",
  courseApi.createAssignment,
  "Assignment created",
  "Failed to create assignment",
);

export const useSubmitAssignment = createCourseMutation(
  "submitAssignment",
  courseApi.submitAssignment,
  "Assignment submitted",
  "Failed to submit assignment",
);

export const useReviewAssignmentSubmission = createCourseMutation(
  "reviewAssignmentSubmission",
  courseApi.reviewAssignmentSubmission,
  "Submission reviewed",
  "Failed to review submission",
);
