import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ErrorState, Splash } from "./components/states";
import { login } from "./lib/api";
import { HomePage } from "./pages/HomePage";
import { LessonsPage } from "./pages/LessonsPage";
import { ProfilePage } from "./pages/ProfilePage";

// Faqat dev: production bundle'ga tushmaydi
const KitPage = lazy(() => import("./pages/KitPage").then((m) => ({ default: m.KitPage })));

export function App() {
  const session = useQuery({ queryKey: ["session"], queryFn: login, staleTime: Infinity, retry: false });

  if (session.isPending) return <Splash />;
  if (session.isError)
    return <ErrorState message={session.error.message} onRetry={() => session.refetch()} />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="lessons" element={<LessonsPage />} />
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
