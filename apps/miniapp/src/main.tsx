import "@fontsource-variable/manrope";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { PageBoundary } from "./components/PageBoundary";
import { reportUncaught } from "./lib/report-error";
import { reloadOnStaleChunks } from "./lib/stale-chunks";
import { initTelegram } from "./lib/telegram";

initTelegram();
reloadOnStaleChunks();
reportUncaught();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false } },
});

const root = document.getElementById("root");
if (!root) throw new Error("#root topilmadi");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* T-135: kirish va ro'yxatdan o'tish ekranlari layout'dan tashqarida */}
        <PageBoundary resetKey="root">
          <App />
        </PageBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
