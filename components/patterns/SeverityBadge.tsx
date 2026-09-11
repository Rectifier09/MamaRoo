import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { Severity } from "@/lib/domain/severity";

const CONFIG: Record<Severity, { icon: string; classes: string }> = {
  general: { icon: "Info", classes: "bg-surface text-text-primary border border-divider" },
  contact_clinic: { icon: "Phone", classes: "bg-surface text-accent-secondary border border-accent-secondary" },
  urgent: { icon: "Warning", classes: "bg-alert text-surface-raised" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const t = useTranslations("severity");
  const { icon, classes } = CONFIG[severity];
  return (
    <span
      role={severity === "urgent" ? "alert" : undefined}
      className={cn("inline-flex items-center gap-xs rounded-full px-md py-xs text-body-sm font-medium", classes)}
    >
      <Icon name={icon} size="inline" />
      {t(severity)}
    </span>
  );
}
