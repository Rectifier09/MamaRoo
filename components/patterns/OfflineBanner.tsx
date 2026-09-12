"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { useOnline } from "@/lib/pwa/useOnline";

export function OfflineBanner() {
  const online = useOnline();
  const t = useTranslations("common");

  if (online) return null;

  return (
    <div role="status" className="flex items-center gap-sm bg-surface px-screen py-sm text-caption text-text-secondary">
      <Icon name="WifiSlash" size="inline" />
      <span>{t("offline")}</span>
    </div>
  );
}
