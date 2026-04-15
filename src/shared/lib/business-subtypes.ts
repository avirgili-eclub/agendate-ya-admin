import { httpRequest } from "@/core/api/http-client";

export type BusinessSubTypeOption = {
  value: string;
  label: string;
  type?: string;
};

type BusinessSubTypeFallback = {
  value: string;
  type: string;
};

type ApiBusinessSubTypeItem =
  | string
  | {
      value?: string;
      code?: string;
      name?: string;
      label?: string;
      subType?: string;
      type?: string;
      businessType?: string;
    };

const DEFAULT_BUSINESS_SUBTYPES: BusinessSubTypeFallback[] = [
  { value: "PILATES", type: "FITNESS" },
  { value: "YOGA", type: "FITNESS" },
  { value: "CROSSFIT", type: "FITNESS" },
  { value: "PERSONAL_TRAINING", type: "FITNESS" },
  { value: "GYM", type: "FITNESS" },
  { value: "NUTRITION", type: "HEALTH" },
  { value: "PSYCHOLOGY", type: "HEALTH" },
  { value: "THERAPY", type: "HEALTH" },
  { value: "GENERAL_MEDICINE", type: "HEALTH" },
  { value: "DENTISTRY", type: "HEALTH" },
  { value: "SPA", type: "BEAUTY" },
  { value: "NAIL_SPA", type: "BEAUTY" },
  { value: "HAIR_SALON", type: "BEAUTY" },
  { value: "BARBERSHOP", type: "BEAUTY" },
  { value: "MAKEUP", type: "BEAUTY" },
  { value: "RESTAURANT", type: "HOSPITALITY" },
  { value: "BAR", type: "HOSPITALITY" },
  { value: "COURSES", type: "EDUCATION" },
  { value: "TUTORING", type: "EDUCATION" },
  { value: "WORKSHOPS", type: "EDUCATION" },
  { value: "OTHER", type: "OTHER" },
];

const LABEL_OVERRIDES: Record<string, string> = {
  PILATES: "Pilates",
  YOGA: "Yoga",
  CROSSFIT: "CrossFit",
  PERSONAL_TRAINING: "Entrenamiento Personal",
  GYM: "Gimnasio",
  NUTRITION: "Nutrición",
  PSYCHOLOGY: "Psicología",
  THERAPY: "Terapia",
  GENERAL_MEDICINE: "Medicina General",
  DENTISTRY: "Odontología",
  SPA: "Spa",
  NAIL_SPA: "Nail Spa",
  HAIR_SALON: "Salón de Belleza",
  BARBERSHOP: "Barbería",
  MAKEUP: "Maquillaje",
  RESTAURANT: "Restaurante",
  BAR: "Bar",
  COURSES: "Cursos",
  TUTORING: "Tutorías",
  WORKSHOPS: "Talleres",
  OTHER: "Otro",
};

const TYPE_LABEL_OVERRIDES: Record<string, string> = {
  FITNESS: "Fitness",
  HEALTH: "Salud",
  BEAUTY: "Belleza",
  EDUCATION: "Educación",
  HOSPITALITY: "Hospitalidad",
  OTHER: "Otro",
};

function toTitleCase(input: string): string {
  return input
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatBusinessSubTypeLabel(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (LABEL_OVERRIDES[normalized]) {
    return LABEL_OVERRIDES[normalized];
  }

  return toTitleCase(normalized.replaceAll("_", " "));
}

export function formatBusinessTypeLabel(type: string): string {
  const normalized = type.trim().toUpperCase();
  if (TYPE_LABEL_OVERRIDES[normalized]) {
    return TYPE_LABEL_OVERRIDES[normalized];
  }

  return toTitleCase(normalized.replaceAll("_", " "));
}

function normalizeSubTypeItem(item: ApiBusinessSubTypeItem): BusinessSubTypeOption | null {
  if (typeof item === "string") {
    const normalized = item.trim().toUpperCase();
    if (!normalized) {
      return null;
    }

    return {
      value: normalized,
      label: formatBusinessSubTypeLabel(normalized),
    };
  }

  const candidate = item.value ?? item.code ?? item.subType ?? item.name ?? item.label;
  if (!candidate || typeof candidate !== "string") {
    return null;
  }

  const normalizedValue = candidate.trim().toUpperCase();
  if (!normalizedValue) {
    return null;
  }

  const rawType = item.type ?? item.businessType;
  const normalizedType =
    typeof rawType === "string" && rawType.trim().length > 0
      ? rawType.trim().toUpperCase()
      : undefined;

  return {
    value: normalizedValue,
    label: formatBusinessSubTypeLabel(normalizedValue),
    type: normalizedType,
  };
}

function toOptions(items: BusinessSubTypeOption[]): BusinessSubTypeOption[] {
  const byValue = new Map<string, BusinessSubTypeOption>();

  for (const item of items) {
    const existing = byValue.get(item.value);
    if (!existing) {
      byValue.set(item.value, item);
      continue;
    }

    // Prefer preserving type info when duplicate values exist.
    if (!existing.type && item.type) {
      byValue.set(item.value, { ...existing, type: item.type });
    }
  }

  return Array.from(byValue.values())
    .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
}

function fallbackOptions(): BusinessSubTypeOption[] {
  return toOptions(
    DEFAULT_BUSINESS_SUBTYPES.map((item) => ({
      value: item.value,
      label: formatBusinessSubTypeLabel(item.value),
      type: item.type,
    })),
  );
}

export async function fetchBusinessSubTypes(): Promise<BusinessSubTypeOption[]> {
  const fetchFromPath = async (path: string) => {
    const response = await httpRequest<unknown>(path, {
      method: "GET",
      skipAuth: true,
      skipAuthRefresh: true,
      timeoutMs: 8000,
    });

    const envelope = response as { data?: unknown };
    return envelope && typeof envelope === "object" && "data" in envelope ? envelope.data : response;
  };

  try {
    let raw: unknown;

    try {
      raw = await fetchFromPath("/tenant/business-subtypes");
    } catch {
      raw = await fetchFromPath("/business-subtypes");
    }

    if (!Array.isArray(raw)) {
      return fallbackOptions();
    }

    const normalized = raw
      .map((item) => normalizeSubTypeItem(item as ApiBusinessSubTypeItem))
      .filter((item): item is BusinessSubTypeOption => Boolean(item));

    if (normalized.length === 0) {
      return fallbackOptions();
    }

    return toOptions(normalized);
  } catch {
    return fallbackOptions();
  }
}
