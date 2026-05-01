import { useId } from "react";
import { cn } from "@/shared/lib/cn";

type ColorInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function ColorInput({ label, value, onChange, className }: ColorInputProps) {
  const id = useId();

  const handleHexChange = (raw: string) => {
    const withHash = raw.startsWith("#") ? raw : `#${raw}`;
    onChange(withHash.toUpperCase());
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value.toUpperCase());
  };

  const displayValue = value.startsWith("#") ? value : `#${value}`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-xs font-medium text-primary-light uppercase tracking-wide">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-neutral-dark shadow-sm">
          <input
            type="color"
            value={isValidHex(displayValue) ? displayValue : "#000000"}
            onChange={handleColorPickerChange}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            tabIndex={-1}
            aria-hidden
          />
          <div
            className="size-full"
            style={{ backgroundColor: isValidHex(displayValue) ? displayValue : "#000000" }}
          />
        </div>
        <input
          id={id}
          type="text"
          value={displayValue}
          onChange={(e) => handleHexChange(e.target.value)}
          maxLength={7}
          spellCheck={false}
          className={cn(
            "w-full rounded-md border bg-white px-3 py-2 font-mono text-sm text-primary uppercase",
            "focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light",
            isValidHex(displayValue) ? "border-neutral-dark" : "border-red-400 ring-1 ring-red-400",
          )}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}
