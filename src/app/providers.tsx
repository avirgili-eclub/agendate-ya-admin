import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { NotificationProvider } from "@/shared/notifications/notification-store";
import { queryClient } from "@/app/query-client";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>{children}</NotificationProvider>
    </QueryClientProvider>
  );
}
