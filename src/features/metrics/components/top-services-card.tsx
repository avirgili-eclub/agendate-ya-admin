import type { TopServiceMetric } from "@/features/metrics/metrics-types";
import { formatCurrency, formatInteger } from "@/features/metrics/metrics-formatters";

type TopServicesCardProps = {
  services: TopServiceMetric[];
  currency: string;
};

export function TopServicesCard({ services, currency }: TopServicesCardProps) {
  return (
    <section className="min-w-0 rounded-lg border border-neutral-dark bg-neutral-light p-3 shadow-sm">
      <h2 className="text-base font-semibold text-primary-dark">Servicios principales</h2>
      <p className="text-xs text-primary-light">Ordenados por ingresos realizados.</p>
      <div className="mt-3 space-y-2.5">
        {services.length === 0 ? (
          <p className="text-xs text-primary-light">No hay servicios con reservas completadas.</p>
        ) : services.map((service) => {
          const displayName = service.serviceName ?? "Servicio sin nombre";
          return (
            <div key={service.serviceId} className="rounded-md border border-neutral-dark bg-white p-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-xs font-semibold text-primary-dark">{displayName}</p>
                  <p className="text-xs text-primary-light">{formatInteger(service.bookingsCount)} reservas</p>
                </div>
                <p className="shrink-0 pl-2 text-right text-xs font-semibold text-primary">{formatCurrency(service.revenueCompleted, currency)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
