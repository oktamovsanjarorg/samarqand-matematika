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
              <Route path="students" element={<StudentsPage />} />
              <Route path="parents" element={<ParentsPage />} />
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
