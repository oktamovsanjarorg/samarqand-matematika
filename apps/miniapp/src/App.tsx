import type { MyProfile } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ErrorState, Splash } from "./components/states";
import { api, login } from "./lib/api";
import { HomePage } from "./pages/HomePage";
import { AttemptResultPage } from "./pages/AttemptResultPage";
import { BillingPage } from "./pages/BillingPage";
import { LessonPage } from "./pages/LessonPage";
import { LessonsPage } from "./pages/LessonsPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { TopicTestPage } from "./pages/TopicTestPage";
import { ProfilePage } from "./pages/ProfilePage";
import { WeeklyListPage } from "./pages/WeeklyListPage";
import { WeeklyTestPage } from "./pages/WeeklyTestPage";

// Faqat dev: production bundle'ga tushmaydi
const KitPage = lazy(() => import("./pages/KitPage").then((m) => ({ default: m.KitPage })));

export function App() {
  const session = useQuery({ queryKey: ["session"], queryFn: login, staleTime: Infinity, retry: false });
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () => api<MyProfile>("/me/profile"),
    enabled: session.isSuccess,
  });

  const failed = session.error ?? profile.error;
  if (failed)
    return (
      <ErrorState
        message={failed.message}
        onRetry={() => void session.refetch().then(() => profile.refetch())}
      />
    );
  if (!profile.data) return <Splash />;
  // BR-S04: ism yoki telefon yo'q o'quvchi avval onboarding'dan o'tadi
  if (profile.data.needsOnboarding) return <OnboardingPage profile={profile.data} />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="lessons" element={<LessonsPage />} />
        <Route path="lessons/:id" element={<LessonPage />} />
        <Route path="topics/:id/test" element={<TopicTestPage />} />
        <Route path="attempts/:id" element={<AttemptResultPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="weekly" element={<WeeklyListPage />} />
        <Route path="weekly/:id" element={<WeeklyTestPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      {import.meta.env.DEV && (
        <Route
          path="_kit"
          element={
            <Suspense fallback={<Splash />}>
              <KitPage />
            </Suspense>
          }
        />
      )}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
