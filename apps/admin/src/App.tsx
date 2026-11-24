import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, useCallback, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { AdminLayout } from "./components/AdminLayout";
import { setUnauthorizedHandler } from "./lib/api";
import { SESSION_KEY, clearSession, loadSession } from "./lib/session";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SignInHint } from "./pages/SignInHint";

/** T-132: kirish va bosh sahifadan boshqa sahifalar alohida chunk'larda yuklanadi */
const AiPage = lazy(() => import("./pages/AiPage").then((m) => ({ default: m.AiPage })));
const AgentPage = lazy(() => import("./pages/AgentPage").then((m) => ({ default: m.AgentPage })));
const StatsPage = lazy(() => import("./pages/StatsPage").then((m) => ({ default: m.StatsPage })));
const AuditPage = lazy(() => import("./pages/AuditPage").then((m) => ({ default: m.AuditPage })));
const TrashPage = lazy(() => import("./pages/TrashPage").then((m) => ({ default: m.TrashPage })));
const ContentPage = lazy(() => import("./pages/ContentPage").then((m) => ({ default: m.ContentPage })));
const LessonEditorPage = lazy(() =>
  import("./pages/LessonEditorPage").then((m) => ({ default: m.LessonEditorPage })),
);
const ParentsPage = lazy(() => import("./pages/ParentsPage").then((m) => ({ default: m.ParentsPage })));
const PaymentsPage = lazy(() => import("./pages/PaymentsPage").then((m) => ({ default: m.PaymentsPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const BroadcastPage = lazy(() => import("./pages/BroadcastPage").then((m) => ({ default: m.BroadcastPage })));
const GroupPage = lazy(() => import("./pages/GroupPage").then((m) => ({ default: m.GroupPage })));
const GroupsPage = lazy(() => import("./pages/GroupsPage").then((m) => ({ default: m.GroupsPage })));
const MockEditPage = lazy(() => import("./pages/MockEditPage").then((m) => ({ default: m.MockEditPage })));
const OfflineListPage = lazy(() =>
  import("./pages/OfflineListPage").then((m) => ({ default: m.OfflineListPage })),
);
const OfflineTestPage = lazy(() =>
  import("./pages/OfflineTestPage").then((m) => ({ default: m.OfflineTestPage })),
);
const MockListPage = lazy(() => import("./pages/MockListPage").then((m) => ({ default: m.MockListPage })));
const WeeklyEditPage = lazy(() =>
  import("./pages/WeeklyEditPage").then((m) => ({ default: m.WeeklyEditPage })),
);
const WeeklyListPage = lazy(() =>
  import("./pages/WeeklyListPage").then((m) => ({ default: m.WeeklyListPage })),
);
const WeeklyReviewPage = lazy(() =>
  import("./pages/WeeklyReviewPage").then((m) => ({ default: m.WeeklyReviewPage })),
);
const TutorChatPage = lazy(() => import("./pages/TutorChatPage").then((m) => ({ default: m.TutorChatPage })));
const TutorChatsPage = lazy(() =>
  import("./pages/TutorChatsPage").then((m) => ({ default: m.TutorChatsPage })),
);
const QuestionEditPage = lazy(() =>
  import("./pages/QuestionEditPage").then((m) => ({ default: m.QuestionEditPage })),
);
const QuestionsPage = lazy(() => import("./pages/QuestionsPage").then((m) => ({ default: m.QuestionsPage })));
const StudentPage = lazy(() => import("./pages/StudentPage").then((m) => ({ default: m.StudentPage })));
const StudentsPage = lazy(() => import("./pages/StudentsPage").then((m) => ({ default: m.StudentsPage })));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

/** T-153: boshqa tabda qayta kirilsa (bot havolasi), shu tab ham o'sha sahifaga qaytadi, qoralama tiklanadi */
function useSessionSync(refresh: () => void) {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);
}

function OldChatLink() {
  const { id = "" } = useParams();
  return <Navigate to={`/ai/chats/${id}`} replace />;
}

/** T-177: AI bo'limi; eski /agent va /tutor manzillari ham shu yerga o'tadi */
const aiRoutes = (
  <>
    <Route path="ai" element={<AiPage />}>
      <Route index element={<AgentPage />} />
      <Route path="chats" element={<TutorChatsPage />} />
      <Route path="chats/:id" element={<TutorChatPage />} />
    </Route>
    <Route path="agent" element={<Navigate to="/ai" replace />} />
    <Route path="tutor" element={<Navigate to="/ai/chats" replace />} />
    <Route path="tutor/:id" element={<OldChatLink />} />
  </>
);

export function App() {
  const [session, setSession] = useState(loadSession);
  const refresh = useCallback(() => setSession(loadSession()), []);
  const logout = useCallback(() => {
    clearSession();
    queryClient.clear();
    setSession(null);
  }, []);
  useEffect(() => setUnauthorizedHandler(logout), [logout]);
  useSessionSync(refresh);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/admin">
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={refresh} />} />
          {session ? (
            <Route element={<AdminLayout session={session} onLogout={logout} />}>
              <Route index element={<DashboardPage />} />
              <Route path="content" element={<ContentPage />} />
              <Route path="content/lessons/:id" element={<LessonEditorPage />} />
              <Route path="content/topics/:topicId/questions" element={<QuestionsPage />} />
              <Route path="content/topics/:topicId/questions/new" element={<QuestionEditPage />} />
              <Route path="content/questions/:id" element={<QuestionEditPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="students/:id" element={<StudentPage />} />
              <Route path="parents" element={<ParentsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="trash" element={<TrashPage />} />
              <Route path="broadcast" element={<BroadcastPage />} />
              <Route path="weekly" element={<WeeklyListPage />} />
              <Route path="weekly/new" element={<WeeklyEditPage />} />
              <Route path="weekly/:id" element={<WeeklyEditPage />} />
              <Route path="weekly/:id/review" element={<WeeklyReviewPage />} />
              <Route path="mocks" element={<MockListPage />} />
              <Route path="groups" element={<GroupsPage />} />
              <Route path="groups/:id" element={<GroupPage />} />
              <Route path="offline" element={<OfflineListPage />} />
              <Route path="offline/:id" element={<OfflineTestPage />} />
              <Route path="mocks/new" element={<MockEditPage />} />
              <Route path="mocks/:id" element={<MockEditPage />} />
              {aiRoutes}
              <Route path="stats" element={<StatsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          ) : (
            <Route path="*" element={<SignInHint />} />
          )}
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
