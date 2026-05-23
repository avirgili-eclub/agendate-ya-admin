import type { TopResourceMetric } from "@/features/metrics/metrics-types";
import { formatCurrency, formatInteger, formatPercentage } from "@/features/metrics/metrics-formatters";

type TopResourcesCardProps = {
  resources: TopResourceMetric[];
  currency: string;
};

export function TopResourcesCard({ resources, currency }: TopResourcesCardProps) {
  return (
    <section className="rounded-lg border border-neutral-dark bg-neutral-light p-3 shadow-sm lg:col-span-2">
      <h2 className="text-base font-semibold text-primary-dark">Recursos por ingresos realizados</h2>
      <p className="text-xs text-primary-light">Ranking por ingresos; reservas y ocupación son datos secundarios.</p>
      <div className="mt-3 overflow-x-auto">
        {resources.length === 0 ? (
          <p className="text-xs text-primary-light">No hay recursos con reservas completadas.</p>
        ) : (
          <table className="min-w-full divide-y divide-neutral-dark text-xs">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-primary-light">
                <th className="py-2 pr-4 font-semibold">Recurso</th>
                <th className="px-4 py-2 font-semibold">Tipo</th>
                <th className="px-4 py-2 font-semibold">Reservas</th>
                <th className="px-4 py-2 font-semibold">Ocupacion</th>
                <th className="py-2 pl-4 text-right font-semibold">Ingresos realizados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-dark">
              {resources.map((resource) => {
                const displayName = resource.name ?? "Sin nombre";
                const displayType = resource.resourceType ?? "-";
                return (
                  <tr key={resource.resourceId} className="text-primary-dark">
                    <td className="py-2.5 pr-4 font-medium">{displayName}</td>
                    <td className="px-4 py-2.5 text-primary-light">{displayType}</td>
                    <td className="px-4 py-2.5">{formatInteger(resource.bookingsCount)}</td>
                    <td className="px-4 py-2.5">{formatPercentage(resource.occupancyRate)}</td>
                    <td className="py-2.5 pl-4 text-right font-semibold text-primary">{formatCurrency(resource.revenueCompleted, currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
