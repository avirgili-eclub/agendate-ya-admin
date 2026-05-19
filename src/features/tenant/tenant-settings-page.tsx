import { useEffect, useState } from "react";
import { Settings, Palette, CreditCard, Eye, Plug } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";

import { useFeedback } from "@/shared/notifications/use-feedback";
import { TransientFeedback } from "@/shared/ui/transient-feedback";
import { Tabs } from "@/shared/ui/tabs";

import { GeneralTab } from "./components/general-tab";
import { BrandingTab } from "./components/branding-tab";
import { SubscriptionTab } from "./components/subscription-tab";
import { PreviewTab } from "./components/preview-tab";
import { IntegrationsTab } from "./components/integrations-tab";

type TabId = "general" | "branding" | "subscription" | "preview" | "integrations";

const TABS = [
  { id: "general" as const, label: "General", icon: <Settings className="size-4" /> },
  { id: "branding" as const, label: "Branding", icon: <Palette className="size-4" /> },
  { id: "subscription" as const, label: "Suscripción", icon: <CreditCard className="size-4" /> },
  { id: "preview" as const, label: "Preview", icon: <Eye className="size-4" /> },
  { id: "integrations" as const, label: "Integraciones", icon: <Plug className="size-4" /> },
];

function normalizeTabId(value: string | null): TabId | null {
  if (!value) {
    return null;
  }

  if (value === "integraciones") {
    return "integrations";
  }

  const validTabs: TabId[] = ["general", "branding", "subscription", "preview", "integrations"];
  return validTabs.includes(value as TabId) ? (value as TabId) : null;
}

function getTabFromSearch(searchStr: string): TabId {
  const search = searchStr.startsWith("?") ? searchStr.slice(1) : searchStr;
  const params = new URLSearchParams(search);
  return normalizeTabId(params.get("tab")) ?? "general";
}

export function TenantSettingsPage() {
  const searchStr = useRouterState({ select: (state) => state.location.searchStr ?? "" });
  const [activeTab, setActiveTab] = useState<TabId>(() => getTabFromSearch(searchStr));
  const { feedback, dismissFeedback } = useFeedback("system");

  useEffect(() => {
    setActiveTab(getTabFromSearch(searchStr));
  }, [searchStr]);

  return (
    <div className="space-y-5">
      {feedback && <TransientFeedback feedback={feedback} onDismiss={dismissFeedback} />}

      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="animate-in">
        {activeTab === "general" && <GeneralTab />}
        {activeTab === "branding" && (
          <BrandingTab onUpgradeClick={() => setActiveTab("subscription")} />
        )}
        {activeTab === "subscription" && <SubscriptionTab />}
        {activeTab === "preview" && <PreviewTab />}
        {activeTab === "integrations" && <IntegrationsTab />}
      </div>
    </div>
  );
}
