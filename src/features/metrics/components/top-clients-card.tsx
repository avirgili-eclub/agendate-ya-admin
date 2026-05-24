import type { TopClientMetric } from "@/features/metrics/metrics-types";
import { formatCurrency, formatInteger } from "@/features/metrics/metrics-formatters";

type TopClientsCardProps = {
  clients: TopClientMetric[];
  currency: string;
};

export function TopClientsCard({ clients, currency }: TopClientsCardProps) {
  return (
    <section className="min-w-0 rounded-lg border border-neutral-dark bg-neutral-light p-3 shadow-sm">
      <h2 className="text-base font-semibold text-primary-dark">Clientes principales</h2>
      <p className="text-xs text-primary-light">Clientes con mayor actividad realizada en el periodo.</p>
      <div className="mt-3 space-y-2.5">
        {clients.length === 0 ? (
          <p className="text-xs text-primary-light">No hay clientes con actividad completada.</p>
        ) : clients.map((client) => {
          const displayName = client.clientName ?? "Cliente sin nombre";
          return (
            <div key={client.clientId} className="rounded-md border border-neutral-dark bg-white p-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-xs font-semibold text-primary-dark">{displayName}</p>
                  <p className="text-xs text-primary-light">{formatInteger(client.visitsCount)} visitas</p>
                </div>
                <p className="shrink-0 pl-2 text-right text-xs font-semibold text-primary">{formatCurrency(client.revenue, currency)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
