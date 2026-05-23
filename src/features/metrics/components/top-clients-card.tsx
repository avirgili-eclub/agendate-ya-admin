import type { TopClientMetric } from "@/features/metrics/metrics-types";
import { formatCurrency, formatInteger } from "@/features/metrics/metrics-formatters";

type TopClientsCardProps = {
  clients: TopClientMetric[];
  currency: string;
};

export function TopClientsCard({ clients, currency }: TopClientsCardProps) {
  return (
    <section className="rounded-xl border border-neutral-dark bg-neutral-light p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-primary-dark">Clientes principales</h2>
      <p className="text-sm text-primary-light">Clientes con mayor actividad realizada en el periodo.</p>
      <div className="mt-4 space-y-3">
        {clients.length === 0 ? (
          <p className="text-sm text-primary-light">No hay clientes con actividad completada.</p>
        ) : clients.map((client) => (
          <div key={client.clientId} className="rounded-lg border border-neutral-dark bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary-dark">Cliente {client.clientId}</p>
                <p className="text-xs text-primary-light">{formatInteger(client.visitsCount)} visitas</p>
              </div>
              <p className="text-sm font-semibold text-primary">{formatCurrency(client.revenue, currency)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
