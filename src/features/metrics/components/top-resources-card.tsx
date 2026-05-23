import type { TopResourceMetric } from "@/features/metrics/metrics-types";
import { formatCurrency, formatInteger, formatPercentage } from "@/features/metrics/metrics-formatters";

type TopResourcesCardProps = {
  resources: TopResourceMetric[];
  currency: string;
};

export function TopResourcesCard({ resources, currency }: TopResourcesCardProps) {
  return (
    <section className="rounded-xl border border-neutral-dark bg-neutral-light p-4 shadow-sm lg:col-span-2">
      <h2 className="text-lg font-semibold text-primary-dark">Recursos por ingresos realizados</h2>
      <p className="text-sm text-primary-light">Ranking por ingresos; reservas y ocupacion son datos secundarios.</p>
      <div className="mt-4 overflow-x-auto">
        {resources.length === 0 ? (
          <p className="text-sm text-primary-light">No hay recursos con reservas completadas.</p>
        ) : (
          <table className="min-w-full divide-y divide-neutral-dark text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-primary-light">
                <th className="py-2 pr-4 font-semibold">Recurso</th>
                <th className="px-4 py-2 font-semibold">Tipo</th>
                <th className="px-4 py-2 font-semibold">Reservas</th>
                <th className="px-4 py-2 font-semibold">Ocupacion</th>
                <th className="py-2 pl-4 text-right font-semibold">Ingresos realizados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-dark">
              {resources.map((resource) => (
                <tr key={resource.resourceId} className="text-primary-dark">
                  <td className="py-3 pr-4 font-medium">Recurso {resource.resourceId}</td>
                  <td className="px-4 py-3 text-primary-light">{resource.resourceType}</td>
                  <td className="px-4 py-3">{formatInteger(resource.bookingsCount)}</td>
                  <td className="px-4 py-3">{formatPercentage(resource.occupancyRate)}</td>
                  <td className="py-3 pl-4 text-right font-semibold text-primary">{formatCurrency(resource.revenueCompleted, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
