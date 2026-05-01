import { cn } from "@/shared/lib/cn";

type Tab<T extends string> = {
  id: T;
  label: string;
  icon?: React.ReactNode;
};

type TabsProps<T extends string> = {
  tabs: Tab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  className?: string;
};

export function Tabs<T extends string>({ tabs, activeTab, onTabChange, className }: TabsProps<T>) {
  return (
    <div className={cn("border-b border-neutral-dark", className)}>
      <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-primary-light hover:border-neutral-dark hover:text-primary",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
