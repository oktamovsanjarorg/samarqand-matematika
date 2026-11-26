import { STAFF_ROLES, type MyProfile } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ErrorState, Splash } from "./components/states";
import { api, login } from "./lib/api";
import { adminLoginUrl } from "./lib/staff";
import { getInitData } from "./lib/telegram";
import { HomePage } from "./pages/HomePage";

/** T-131: sahifalar alohida chunk'larda: birinchi ochilishda faqat Asosiy yuklanadi, KaTeX esa kerak bo'lganda */
const OnboardingPage = lazy(() =>
  import("./pages/OnboardingPage").then((m) => ({ default: m.OnboardingPage })),
);
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
const OfflineResultPage = lazy(() =>
  import("./pages/OfflineResultPage").then((m) => ({ default: m.OfflineResultPage })),
);
const KitPage = lazy(() => import("./pages/KitPage").then((m) => ({ default: m.KitPage })));

const LandingPage = lazy(() => import("./pages/LandingPage").then((m) => ({ default: m.LandingPage })));

/** T-166: Telegram'dan tashqarida (oddiy brauzer) landing, ichida ilova */
export function App() {
  if (!getInitData())
    return (
      <Suspense fallback={<Splash />}>
        <LandingPage />
      </Suspense>
    );
  return <TelegramApp />;
}

function TelegramApp() {
  const session = useQuery({ queryKey: ["session"], queryFn: login, staleTime: Infinity, retry: false });
  // T-158, T-168: xodim Mini App'ni ochsa har doim admin panelga o'tadi
  const toAdmin = !!session.data && STAFF_ROLES.includes(session.data.role);
  useEffect(() => {
    if (toAdmin) window.location.replace(adminLoginUrl(getInitData()));
  }, [toAdmin]);
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () => api<MyProfile>("/me/profile"),
    enabled: session.isSuccess && !toAdmin,
  });

  const failed = session.error ?? profile.error;
  if (failed)
    return (
      <ErrorState
        message={failed.message}
        onRetry={() => void session.refetch().then(() => profile.refetch())}
      />
    );
  if (toAdmin || !profile.data) return <Splash />;
  // BR-S04: ism yoki telefon yo'q o'quvchi avval onboarding'dan o'tadi
  // Onboarding alohida yuklanadi (T-172): zod faqat shu yerda kerak, asosiy fayl yengil
  if (profile.data.needsOnboarding)
    return (
      <Suspense fallback={<Splash />}>
        <OnboardingPage profile={profile.data} />
      </Suspense>
    );

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
        <Route path="offline/:id" element={<OfflineResultPage />} />
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
