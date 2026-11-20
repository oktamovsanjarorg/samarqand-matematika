import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./components/AdminLayout";
import { setUnauthorizedHandler } from "./lib/api";
import { clearSession, loadSession } from "./lib/session";
import { ContentPage } from "./pages/ContentPage";
import { LessonEditorPage } from "./pages/LessonEditorPage";
import { LoginPage } from "./pages/LoginPage";
import { ParentsPage } from "./pages/ParentsPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { GroupPage } from "./pages/GroupPage";
import { GroupsPage } from "./pages/GroupsPage";
import { MockEditPage } from "./pages/MockEditPage";
import { MockListPage } from "./pages/MockListPage";
import { WeeklyEditPage } from "./pages/WeeklyEditPage";
import { WeeklyListPage } from "./pages/WeeklyListPage";
import { WeeklyReviewPage } from "./pages/WeeklyReviewPage";
import { TutorChatPage } from "./pages/TutorChatPage";
import { TutorChatsPage } from "./pages/TutorChatsPage";
import { QuestionEditPage } from "./pages/QuestionEditPage";
import { QuestionsPage } from "./pages/QuestionsPage";
import { SignInHint } from "./pages/SignInHint";
import { StudentsPage } from "./pages/StudentsPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export function App() {
  const [session, setSession] = useState(loadSession);
  const refresh = useCallback(() => setSession(loadSession()), []);
  const logout = useCallback(() => {
    clearSession();
    queryClient.clear();
    setSession(null);
  }, []);
  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/admin">
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={refresh} />} />
          {session ? (
            <Route element={<AdminLayout session={session} onLogout={logout} />}>
              <Route index element={<Navigate to="/content" replace />} />
              <Route path="content" element={<ContentPage />} />
              <Route path="content/lessons/:id" element={<LessonEditorPage />} />
              <Route path="content/topics/:topicId/questions" element={<QuestionsPage />} />
              <Route path="content/topics/:topicId/questions/new" element={<QuestionEditPage />} />
              <Route path="content/questions/:id" element={<QuestionEditPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="parents" element={<ParentsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="weekly" element={<WeeklyListPage />} />
              <Route path="weekly/new" element={<WeeklyEditPage />} />
              <Route path="weekly/:id" element={<WeeklyEditPage />} />
              <Route path="weekly/:id/review" element={<WeeklyReviewPage />} />
              <Route path="mocks" element={<MockListPage />} />
              <Route path="groups" element={<GroupsPage />} />
              <Route path="groups/:id" element={<GroupPage />} />
              <Route path="mocks/new" element={<MockEditPage />} />
              <Route path="mocks/:id" element={<MockEditPage />} />
              <Route path="tutor" element={<TutorChatsPage />} />
              <Route path="tutor/:id" element={<TutorChatPage />} />
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
