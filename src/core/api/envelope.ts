export type DataEnvelope<T> = {
  data: T;
};

export type PagedEnvelope<T> = {
  data: T[];
  meta: {
    page: number;
    size: number;
    total: number;
  };
};

export type ErrorEnvelope = {
  error: {
    code?: string;
    message?: string;
    details?: Array<{ field?: string; message: string }>;
  };
};

export function unwrapData<T>(input: unknown): T {
  if (typeof input !== "object" || input === null || !("data" in input)) {
    throw new Error("Invalid data envelope");
  }

  return (input as DataEnvelope<T>).data;
}
