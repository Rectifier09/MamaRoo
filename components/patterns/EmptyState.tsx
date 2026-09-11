import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { TextureMotif } from "@/components/patterns/TextureMotif";

export function EmptyState({
  iconName,
  message,
  action,
}: {
  iconName: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-[220px] flex-col items-center justify-center gap-md px-lg py-xl text-center">
      <TextureMotif />
      <Icon name={iconName} size="hero" weight="duotone" className="text-accent-primary" />
      <p className="text-body text-text-secondary">{message}</p>
      {action}
    </div>
  );
}
