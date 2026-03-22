import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { PageCard } from "@/shared/ui/page-card";

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ 
  title = "Algo salio mal",
  message,
  onRetry 
}: ErrorStateProps) {
  return (
    <PageCard>
      <div className="flex items-start gap-3" role="alert" aria-live="assertive">
        <span className="rounded-md bg-red-100 p-2 text-red-700" aria-hidden="true">
          <AlertTriangle className="size-5" />
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-primary">{title}</h2>
          <p className="mt-1 text-sm text-primary-light">{message}</p>
          {onRetry && (
            <Button 
              className="mt-3 gap-2" 
              variant="outline" 
              onClick={onRetry}
              aria-label="Reintentar carga"
            >
              <RefreshCw className="size-4" /> Reintentar
            </Button>
          )}
        </div>
      </div>
    </PageCard>
  );
}
