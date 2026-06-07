import * as React from "react";

import { cn } from "@/shared/lib/cn";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  value: string;
  options: SearchableSelectOption[];
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  ariaLabel: string;
  disabled?: boolean;
};

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function SearchableSelect({
  value,
  options,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  ariaLabel,
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const listboxId = React.useId();

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filteredOptions = React.useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query);
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      normalizeSearchValue(`${option.label} ${option.value}`).includes(normalizedQuery),
    );
  }, [options, query]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  function openSelect() {
    if (disabled) {
      return;
    }

    setQuery("");
    setIsOpen(true);
  }

  function handleOptionSelect(nextValue: string) {
    onValueChange(nextValue);
    setIsOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-controls={listboxId}
        aria-expanded={isOpen}
        disabled={disabled}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-md border border-neutral-dark bg-white px-3 py-2 text-left text-sm text-primary-dark outline-none ring-primary-light transition-all",
          "hover:border-primary-light focus:ring-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            return;
          }

          openSelect();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openSelect();
          }
        }}
      >
        <span className="line-clamp-1">{selectedOption?.label ?? placeholder}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 opacity-50"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen ? (
        <div className="absolute z-[80] mt-1 w-full overflow-hidden rounded-md border border-neutral-dark bg-white shadow-lg">
          <div className="border-b border-neutral-dark p-2">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setIsOpen(false);
                }
              }}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-md border border-neutral-dark bg-white px-3 text-sm outline-none ring-primary-light transition focus:border-primary focus:ring-2"
            />
          </div>
          <div id={listboxId} role="listbox" className="max-h-64 overflow-y-auto p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={cn(
                    "flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-sm outline-none transition-colors",
                    "hover:bg-primary/10 focus:bg-primary/10",
                    option.value === value && "bg-primary/10 text-primary",
                  )}
                  onClick={() => handleOptionSelect(option.value)}
                >
                  <span>{option.label}</span>
                  {option.value === value ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-primary"
                      aria-hidden="true"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : null}
                </button>
              ))
            ) : (
              <p className="px-2 py-3 text-sm text-primary-light">{emptyMessage}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
