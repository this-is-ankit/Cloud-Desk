import { BookOpen, CalendarClock, ClipboardList, Loader2, RadioTower, UserCheck, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

import Navbar from "../components/Navbar";
import WelcomeSection from "../components/WelcomeSection";
import RoleBasedQuickStats from "../components/RoleBasedQuickStats";
import CoursesGrid from "../components/CoursesGrid";
import UpcomingDeadlines from "../components/UpcomingDeadlines";
import CreateSessionModal from "../components/CreateSessionModal";
import Footer from "../components/Footer";
import JoinSessionByCodeModal from "../components/JoinSessionByCodeModal";
import { useCourses, useStartPersistentRoom } from "../hooks/useCourses";
import { useCreateSession, useJoinSessionByCode, useMyRecentSessions } from "../hooks/useSessions";
import { useAppUser } from "../hooks/useAppUser";

function DashboardPage() {
  const navigate = useNavigate();
  const { role } = useAppUser();
  const isTeacher = role === "teacher";

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinByCodeModal, setShowJoinByCodeModal] = useState(false);

  const createSessionMutation = useCreateSession();
  const joinSessionByCodeMutation = useJoinSessionByCode();
  const startPersistentRoomMutation = useStartPersistentRoom();

  const teacherCoursesQuery = useCourses({ scope: "mine", sort: "upcoming", limit: 24 });
  const studentCoursesQuery = useCourses({ scope: "enrolled", sort: "upcoming", limit: 24 });
  const discoverCoursesQuery = useCourses({ scope: "discover", sort: "upcoming", limit: 24 });
  const recentSessionsQuery = useMyRecentSessions();

  const courses = isTeacher ? teacherCoursesQuery.data?.courses || [] : studentCoursesQuery.data?.courses || [];
  const recentSessions = recentSessionsQuery.data?.sessions || [];
  const featuredCourses = courses.slice(0, 5);

  let dashboardData;
  if (isTeacher) {
    const pendingApprovals = courses.reduce((sum, course) => sum + (course.pendingEnrollmentCount || 0), 0);
    const upcomingClasses = courses
      .flatMap((course) =>
        course.nextClass
          ? [
              {
                id: `${course._id}-${course.nextClass._id}`,
                title: course.nextClass.title,
                courseTitle: course.title,
                date: course.nextClass.scheduledStart,
                kind: "live",
              },
            ]
          : [],
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
    const reviewCount = courses.reduce((sum, course) => sum + (course.nextAssignment ? 1 : 0), 0);

    dashboardData = {
      stats: [
        { label: "Active Courses", value: courses.length, icon: BookOpen, iconWrapClass: "bg-primary/10 text-primary" },
        { label: "Pending Enrollments", value: pendingApprovals, icon: UserCheck, iconWrapClass: "bg-warning/10 text-warning" },
        { label: "Upcoming Classes", value: upcomingClasses.length, icon: CalendarClock, iconWrapClass: "bg-secondary/10 text-secondary" },
        { label: "Assignments Live", value: reviewCount, icon: ClipboardList, iconWrapClass: "bg-success/10 text-success" },
      ],
      items: upcomingClasses,
      gridTitle: "My Teaching Courses",
      gridSubtitle: "Manage every live course, roster, schedule, and classroom launch from here",
      emptyLabel: "No teaching courses yet",
      emptyHint: "Create your first live course draft to start scheduling classes.",
      sideTitle: "Upcoming Live Classes",
      sideSubtitle: "Your next scheduled teaching sessions",
      sideEmptyLabel: "No upcoming classes",
      sideEmptyHint: "Schedule the first live class from a course page.",
    };
  } else {
    const approvedCourses = courses.filter((course) => course.viewerEnrollmentStatus === "approved");
    const pendingCourses = discoverCoursesQuery.data?.courses?.filter((course) => course.viewerEnrollmentStatus === "pending") || [];
    const upcomingItems = approvedCourses
      .flatMap((course) => {
        const items = [];
        if (course.nextClass) {
          items.push({
            id: `${course._id}-${course.nextClass._id}`,
            title: course.nextClass.title,
            courseTitle: course.title,
            date: course.nextClass.scheduledStart,
            kind: "live",
          });
        }
        if (course.nextAssignment) {
          items.push({
            id: `${course._id}-${course.nextAssignment._id}`,
            title: course.nextAssignment.title,
            courseTitle: course.title,
            date: course.nextAssignment.dueDate,
            kind: "assignment",
          });
        }
        return items;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);

    dashboardData = {
      stats: [
        { label: "Approved Courses", value: approvedCourses.length, icon: BookOpen, iconWrapClass: "bg-primary/10 text-primary" },
        { label: "Pending Requests", value: pendingCourses.length, icon: Users, iconWrapClass: "bg-warning/10 text-warning" },
        { label: "Upcoming Items", value: upcomingItems.length, icon: CalendarClock, iconWrapClass: "bg-secondary/10 text-secondary" },
        { label: "Completed Sessions", value: recentSessions.length, icon: RadioTower, iconWrapClass: "bg-success/10 text-success" },
      ],
      items: upcomingItems,
      gridTitle: "My Live Courses",
      gridSubtitle: "Courses where you can attend live classes, assignments, and teacher-managed sessions",
      emptyLabel: "No approved live courses yet",
      emptyHint: "Request enrollment from the course catalog and wait for teacher approval.",
      sideTitle: "Upcoming Work",
      sideSubtitle: "Approved classes and assignments",
      sideEmptyLabel: "Nothing upcoming yet",
      sideEmptyHint: "Once teachers approve you and schedule classes, they will appear here.",
    };
  }

  const handleCreateRoom = (data) => {
    if (!data.language) return;

    createSessionMutation.mutate(
      {
        language: data.language,
        sessionType: data.sessionType,
        maxParticipants: data.maxParticipants,
      },
      {
        onSuccess: (response) => {
          setShowCreateModal(false);
          navigate(`/session/${response.session._id}`);
        },
      },
    );
  };

  const handleJoinByCode = (code, resetForm) => {
    joinSessionByCodeMutation.mutate(code, {
      onSuccess: (response) => {
        resetForm();
        setShowJoinByCodeModal(false);
        navigate(`/session/${response.sessionId}`);
      },
    });
  };

  const handleQuickTeacherLaunch = () => {
    const firstPublishedCourse = courses.find((course) => course.status === "published") || courses[0];
    if (!firstPublishedCourse) {
      navigate("/courses");
      return;
    }

    startPersistentRoomMutation.mutate(firstPublishedCourse._id, {
      onSuccess: (data) => {
        navigate(`/session/${data.sessionId}`);
      },
    });
  };

  const activeQuery = isTeacher ? teacherCoursesQuery : studentCoursesQuery;
  if (activeQuery.isLoading) {
    return (
      <div className="min-h-screen bg-base-300 flex items-center justify-center">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-base-300 flex flex-col font-jakarta">
        <Navbar />
        <WelcomeSection
          role={role}
          primaryAction={{
            label: isTeacher ? "Launch Course Room" : "Start Study Room",
            onClick: isTeacher ? handleQuickTeacherLaunch : () => setShowCreateModal(true),
          }}
          secondaryAction={{
            label: isTeacher ? "Create Course" : "Explore Courses",
            onClick: () => navigate("/courses"),
          }}
          tertiaryAction={
            isTeacher
              ? {
                  label: "Schedule Classes",
                  onClick: () => navigate("/courses"),
                }
              : {
                  label: "Join by Code",
                  onClick: () => setShowJoinByCodeModal(true),
                }
          }
        />

        <div className="flex-grow max-w-[1320px] mx-auto w-full px-6 py-8">
          <RoleBasedQuickStats stats={dashboardData.stats} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col">
              <CoursesGrid
                title={dashboardData.gridTitle}
                subtitle={dashboardData.gridSubtitle}
                courses={featuredCourses}
                totalCourses={courses.length}
                onViewAll={() => navigate("/courses")}
                emptyLabel={dashboardData.emptyLabel}
                emptyHint={dashboardData.emptyHint}
              />
            </div>
            <div className="lg:col-span-1 flex flex-col">
              <UpcomingDeadlines
                title={dashboardData.sideTitle}
                subtitle={dashboardData.sideSubtitle}
                items={dashboardData.items}
                emptyLabel={dashboardData.sideEmptyLabel}
                emptyHint={dashboardData.sideEmptyHint}
              />
            </div>
          </div>
        </div>

        <Footer />
      </div>

      {!isTeacher && (
        <CreateSessionModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateRoom={handleCreateRoom}
          isCreating={createSessionMutation.isPending}
        />
      )}

      {!isTeacher && (
        <JoinSessionByCodeModal
          isOpen={showJoinByCodeModal}
          onClose={() => setShowJoinByCodeModal(false)}
          onJoin={handleJoinByCode}
          isJoining={joinSessionByCodeMutation.isPending}
        />
      )}
    </>
  );
}

export default DashboardPage;
