import { useRef, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";

const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

type ImageUploadProps = {
  label: string;
  description?: string;
  currentUrl?: string | null;
  aspectRatio?: "square" | "wide";
  isUploading?: boolean;
  error?: string | null;
  onFileSelected: (file: File) => void;
  onRemove?: () => void;
};

export function ImageUpload({
  label,
  description,
  currentUrl,
  aspectRatio = "wide",
  isUploading = false,
  error,
  onFileSelected,
  onRemove,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const displayError = error ?? localError;

  function validate(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Formato no soportado. Usá JPG, PNG, WebP o AVIF.";
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `La imagen supera el límite de ${MAX_SIZE_MB}MB.`;
    }
    return null;
  }

  function handleFile(file: File) {
    const validationError = validate(file);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError(null);
    onFileSelected(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const previewAspect = aspectRatio === "square" ? "aspect-square" : "aspect-[4/1]";

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-primary-light">{label}</span>

      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl border-2 border-dashed transition-colors",
          previewAspect,
          dragOver ? "border-primary bg-primary/5" : "border-neutral-dark",
          isUploading && "pointer-events-none opacity-60",
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {currentUrl ? (
          <>
            <img
              src={currentUrl}
              alt={label}
              className="size-full bg-neutral object-contain"
            />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all hover:bg-black/30 hover:opacity-100">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-primary shadow-sm hover:bg-white"
              >
                <Upload className="mr-1.5 inline size-3.5" />
                Cambiar
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm hover:bg-white"
                >
                  <X className="mr-1.5 inline size-3.5" />
                  Quitar
                </button>
              )}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex size-full flex-col items-center justify-center gap-2 p-4 text-center"
          >
            {isUploading ? (
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <ImageIcon className="size-8 text-primary-light opacity-50" />
            )}
            <span className="text-sm font-medium text-primary-light">
              {isUploading ? "Subiendo imagen..." : "Arrastrá o hacé clic para subir"}
            </span>
            {description && !isUploading && (
              <span className="text-xs text-primary-light opacity-70">{description}</span>
            )}
          </button>
        )}
      </div>

      {displayError && (
        <p className="text-xs text-red-600">{displayError}</p>
      )}

      {!displayError && description && currentUrl && (
        <p className="text-xs text-primary-light opacity-70">{description}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="sr-only"
        onChange={handleInputChange}
      />
    </div>
  );
}
