import type { TopServiceMetric } from "@/features/metrics/metrics-types";
import { formatCurrency, formatInteger } from "@/features/metrics/metrics-formatters";

type TopServicesCardProps = {
  services: TopServiceMetric[];
  currency: string;
};

export function TopServicesCard({ services, currency }: TopServicesCardProps) {
  return (
    <section className="rounded-xl border border-neutral-dark bg-neutral-light p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-primary-dark">Servicios principales</h2>
      <p className="text-sm text-primary-light">Ordenados por ingresos realizados.</p>
      <div className="mt-4 space-y-3">
        {services.length === 0 ? (
          <p className="text-sm text-primary-light">No hay servicios con reservas completadas.</p>
        ) : services.map((service) => (
          <div key={service.serviceId} className="rounded-lg border border-neutral-dark bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary-dark">Servicio {service.serviceId}</p>
                <p className="text-xs text-primary-light">{formatInteger(service.bookingsCount)} reservas</p>
              </div>
              <p className="text-sm font-semibold text-primary">{formatCurrency(service.revenueCompleted, currency)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
