import type { ReactNode } from "react";

export function DisclaimerBanner({ children }: { children: ReactNode }) {
  return (
    <p data-testid="disclaimer" className="text-caption text-text-secondary">
      {children}
    </p>
  );
}
