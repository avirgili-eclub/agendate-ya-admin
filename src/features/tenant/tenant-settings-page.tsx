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
type SettingsSearch = {
  tab?: string;
  whatsapp?: string;
};

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

function getTabFromSearch(searchStr: string, routeSearch?: SettingsSearch): TabId | null {
  if (routeSearch?.whatsapp) {
    return "integrations";
  }

  const routeTab = normalizeTabId(routeSearch?.tab ?? null);
  if (routeTab) {
    return routeTab;
  }

  const browserSearch = typeof window === "undefined" ? "" : window.location.search;
  const browserParams = new URLSearchParams(browserSearch.startsWith("?") ? browserSearch.slice(1) : browserSearch);
  if (browserParams.has("whatsapp")) {
    return "integrations";
  }

  const search = searchStr.startsWith("?") ? searchStr.slice(1) : searchStr;
  const params = new URLSearchParams(search);
  if (params.has("whatsapp")) {
    return "integrations";
  }

  return normalizeTabId(params.get("tab"));
}

type WhatsappOnboardingResult = "connected" | "failed" | "error";

function getWhatsappOnboardingResult(): WhatsappOnboardingResult | null {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const result = params.get("whatsapp");
  return result === "connected" || result === "failed" || result === "error" ? result : null;
}

function notifyOpenerFromWhatsappPopup() {
  if (typeof window === "undefined") {
    return;
  }

  if (!window.opener || window.opener.closed || window.name !== "wa-onboarding") {
    return;
  }

  const result = getWhatsappOnboardingResult();
  if (!result) {
    return;
  }

  window.opener.postMessage({ type: "wa-onboarding", result }, window.location.origin);
  window.close();
}

function isWhatsappOnboardingPopupReturn() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.opener && !window.opener.closed && window.name === "wa-onboarding" && getWhatsappOnboardingResult());
}

export function TenantSettingsPage() {
  const routeSearch = useRouterState({ select: (state) => state.location.search as SettingsSearch });
  const searchStr = useRouterState({ select: (state) => state.location.searchStr ?? "" });
  const [activeTab, setActiveTab] = useState<TabId>(() => getTabFromSearch(searchStr, routeSearch) ?? "general");
  const { feedback, dismissFeedback } = useFeedback("system");
  const isWhatsappPopupReturn = isWhatsappOnboardingPopupReturn();

  useEffect(() => {
    if (isWhatsappPopupReturn) {
      notifyOpenerFromWhatsappPopup();
    }
  }, [isWhatsappPopupReturn]);

  useEffect(() => {
    const nextTab = getTabFromSearch(searchStr, routeSearch);
    if (nextTab) {
      setActiveTab(nextTab);
    }
  }, [routeSearch.tab, routeSearch.whatsapp, searchStr]);

  if (isWhatsappPopupReturn) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-neutral-dark bg-neutral-light p-8 text-center">
        <div className="max-w-sm space-y-2">
          <h1 className="text-lg font-semibold text-primary">Finalizando conexión</h1>
          <p className="text-sm text-primary-light">
            Estamos volviendo a la pestaña principal para confirmar tu WhatsApp Business.
          </p>
        </div>
      </div>
    );
  }

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
