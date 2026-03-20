import { PageCard } from "@/shared/ui/page-card";

type ModulePlaceholderPageProps = {
  moduleName: string;
  routePath: string;
};

export function ModulePlaceholderPage({ moduleName, routePath }: ModulePlaceholderPageProps) {
  return (
    <PageCard>
      <h2 className="text-lg font-semibold text-primary">{moduleName}</h2>
      <p className="mt-2 text-sm text-primary-light">
        Placeholder conectado para Slice 2. En los siguientes slices se implementa la funcionalidad completa.
      </p>
      <p className="mt-3 text-xs text-primary-light">Ruta: {routePath}</p>
    </PageCard>
  );
}
