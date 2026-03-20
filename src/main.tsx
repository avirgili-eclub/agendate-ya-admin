import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import "@/styles/globals.css";
import { AppProviders } from "@/app/providers";
import { configureAuthHandlers } from "@/core/auth/auth-service";
import { router } from "@/router";

configureAuthHandlers(() => {
  void router.navigate({ to: "/login", search: { reason: "session-expired" } });
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </React.StrictMode>,
);
