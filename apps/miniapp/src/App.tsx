import type { MyProfile } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ErrorState, Splash } from "./components/states";
import { api, login } from "./lib/api";
import { HomePage } from "./pages/HomePage";
import { OnboardingPage } from "./pages/OnboardingPage";

/** T-131: sahifalar alohida chunk'larda: birinchi ochilishda faqat Asosiy yuklanadi, KaTeX esa kerak bo'lganda */
const AttemptResultPage = lazy(() =>
  import("./pages/AttemptResultPage").then((m) => ({ default: m.AttemptResultPage })),
);
const BillingPage = lazy(() => import("./pages/BillingPage").then((m) => ({ default: m.BillingPage })));
const LessonPage = lazy(() => import("./pages/LessonPage").then((m) => ({ default: m.LessonPage })));
const LessonsPage = lazy(() => import("./pages/LessonsPage").then((m) => ({ default: m.LessonsPage })));
const TopicTestPage = lazy(() => import("./pages/TopicTestPage").then((m) => ({ default: m.TopicTestPage })));
const MistakesPage = lazy(() => import("./pages/MistakesPage").then((m) => ({ default: m.MistakesPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const TutorPage = lazy(() => import("./pages/TutorPage").then((m) => ({ default: m.TutorPage })));
const MockListPage = lazy(() => import("./pages/MockListPage").then((m) => ({ default: m.MockListPage })));
const MockTestPage = lazy(() => import("./pages/MockTestPage").then((m) => ({ default: m.MockTestPage })));
const WeeklyListPage = lazy(() =>
  import("./pages/WeeklyListPage").then((m) => ({ default: m.WeeklyListPage })),
);
const WeeklyTestPage = lazy(() =>
  import("./pages/WeeklyTestPage").then((m) => ({ default: m.WeeklyTestPage })),
);

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
        <Route path="children/:studentId/billing" element={<BillingPage />} />
        <Route path="weekly" element={<WeeklyListPage />} />
        <Route path="weekly/:id" element={<WeeklyTestPage />} />
        <Route path="mocks" element={<MockListPage />} />
        <Route path="mocks/:id" element={<MockTestPage />} />
        <Route path="tutor" element={<TutorPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="mistakes" element={<MistakesPage />} />
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
