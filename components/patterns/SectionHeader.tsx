import type { ReactNode } from "react";

export function SectionHeader({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-sm mt-lg flex items-baseline justify-between gap-sm">
      <h2 className="text-h2 font-display font-medium">{children}</h2>
      {action}
    </div>
  );
}
