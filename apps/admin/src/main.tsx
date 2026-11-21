import "@fontsource-variable/manrope";
import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { PageBoundary } from "./components/PageBoundary";
import { reloadOnStaleChunks } from "./lib/stale-chunks";

reloadOnStaleChunks();

const root = document.getElementById("root");
if (!root) throw new Error("#root topilmadi");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    {/* T-135: kirish sahifasi layout'dan tashqarida */}
    <PageBoundary resetKey="root">
      <App />
    </PageBoundary>
  </React.StrictMode>,
);
