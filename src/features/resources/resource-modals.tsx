import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, X } from "lucide-react";

import type {
  ResourceCardItem,
  ResourceServiceCatalogItem,
  ResourceUpsertInput,
} from "@/features/resources/resources-service";
import { Button } from "@/shared/ui/button";

type ModalShellProps = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
};

function ModalShell({ title, children, onClose }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-dark/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-neutral-dark bg-neutral-light p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">{title}</h2>
          <button className="rounded-md p-1 text-primary-light hover:bg-neutral" type="button" onClick={onClose}>
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type ResourceUpsertModalProps = {
  mode: "create" | "edit";
  locations: string[];
  initial?: ResourceCardItem;
  onClose: () => void;
  onSubmit: (payload: ResourceUpsertInput) => Promise<void>;
};

export function ResourceUpsertModal({ mode, locations, initial, onClose, onSubmit }: ResourceUpsertModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [locationName, setLocationName] = useState(initial?.locationName ?? locations[1] ?? "");
  const [type, setType] = useState<ResourceCardItem["type"]>(initial?.type ?? "PROFESSIONAL");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [capacity, setCapacity] = useState(String(initial?.capacity ?? 1));
  const [active, setActive] = useState(initial?.active ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const title = mode === "create" ? "Nuevo recurso" : "Editar recurso";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await onSubmit({
        name,
        locationName,
        type,
        description,
        capacity: capacity ? Number(capacity) : null,
        active,
      });
    } catch (error) {
      const err = error as { message?: string; details?: Array<{ field?: string; message: string }> };
      const nextFieldErrors: Record<string, string> = {};
      for (const detail of err.details ?? []) {
        if (detail.field) {
          nextFieldErrors[detail.field] = detail.message;
        }
      }
      setFieldErrors(nextFieldErrors);
      setFormError(err.message ?? "No pudimos guardar el recurso.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title={title} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p> : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-primary-dark">Nombre</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
            />
            {fieldErrors.name ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.name}</span> : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-primary-dark">Ubicacion</span>
            <select
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="h-10 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
            >
              {locations.filter((item) => item !== "Todas las ubicaciones").map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {fieldErrors.locationName ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.locationName}</span> : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-primary-dark">Tipo de recurso</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ResourceCardItem["type"])}
              disabled={mode === "edit"}
              className="h-10 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
            >
              <option value="PROFESSIONAL">PROFESSIONAL</option>
              <option value="TABLE">TABLE</option>
              <option value="ROOM">ROOM</option>
              <option value="EQUIPMENT">EQUIPMENT</option>
            </select>
            {mode === "edit" ? (
              <span className="mt-1 block text-xs text-primary-light">El tipo se define al crear y no se puede cambiar.</span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-primary-dark">Capacidad</span>
            <input
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              type="number"
              min={1}
              className="h-10 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
            />
            {fieldErrors.capacity ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.capacity}</span> : null}
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm text-primary-dark">Descripcion</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-neutral-dark px-3 py-2 text-sm outline-none ring-primary-light focus:ring-2"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-primary-dark">
          <input checked={active} onChange={(e) => setActive(e.target.checked)} type="checkbox" />
          Recurso activo
        </label>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Guardando..." : "Guardar"}</Button>
        </div>
      </form>
    </ModalShell>
  );
}

type TransferResourceModalProps = {
  resource: ResourceCardItem;
  locations: string[];
  onClose: () => void;
  onSubmit: (payload: { locationName: string; clearSchedule: boolean }) => Promise<void>;
};

export function TransferResourceModal({ resource, locations, onClose, onSubmit }: TransferResourceModalProps) {
  const availableLocations = useMemo(
    () => locations.filter((item) => item !== "Todas las ubicaciones" && item !== resource.locationName),
    [locations, resource.locationName],
  );
  const [locationName, setLocationName] = useState(availableLocations[0] ?? "");
  const [clearSchedule, setClearSchedule] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ locationName, clearSchedule });
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message ?? "No pudimos transferir el recurso.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title={`Transferir ${resource.name}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-sm text-primary-light">Sede actual: {resource.locationName}</p>

        <label className="block">
          <span className="mb-1 block text-sm text-primary-dark">Nueva ubicacion</span>
          <select
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            className="h-10 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
          >
            {availableLocations.length === 0 ? <option value="">Sin ubicaciones disponibles</option> : null}
            {availableLocations.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-lg border border-secondary-light bg-secondary/10 p-3 text-sm text-secondary-dark">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4" />
            <p>
              Si activas <strong>clearSchedule</strong>, se asume cancelacion de turnos futuros antes de mover el recurso.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-primary-dark">
          <input checked={clearSchedule} onChange={(e) => setClearSchedule(e.target.checked)} type="checkbox" />
          clearSchedule (operacion riesgosa)
        </label>

        {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting || !locationName}>
            {isSubmitting ? "Transfiriendo..." : "Transferir"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

type ManageServicesModalProps = {
  resource: ResourceCardItem;
  catalog: ResourceServiceCatalogItem[];
  onClose: () => void;
  onSubmit: (selectedServiceIds: string[]) => Promise<void>;
};

export function ManageServicesModal({ resource, catalog, onClose, onSubmit }: ManageServicesModalProps) {
  const [selected, setSelected] = useState<string[]>(resource.serviceIds);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleService(serviceId: string) {
    setSelected((prev) =>
      prev.includes(serviceId)
        ? prev.filter((item) => item !== serviceId)
        : [...prev, serviceId],
    );
  }

  async function handleSave() {
    setIsSubmitting(true);
    await onSubmit(selected);
    setIsSubmitting(false);
  }

  return (
    <ModalShell title={`Servicios de ${resource.name}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {catalog.map((service) => (
            <label key={service.id} className="flex items-center gap-2 rounded-md border border-neutral-dark px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(service.id)}
                onChange={() => toggleService(service.id)}
              />
              {service.name}
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={handleSave} disabled={isSubmitting}>{isSubmitting ? "Guardando..." : "Guardar servicios"}</Button>
        </div>
      </div>
    </ModalShell>
  );
}
