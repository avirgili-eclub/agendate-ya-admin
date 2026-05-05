import { useState } from "react";
import { Settings, Palette, CreditCard, Eye, Plug } from "lucide-react";

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

export function TenantSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const { feedback, dismissFeedback } = useFeedback("system");

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
