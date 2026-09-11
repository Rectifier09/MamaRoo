import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

export function ErrorBanner({
  message,
  nextStep,
  onRetry,
  retryLabel = "Try again",
}: {
  message: string;
  nextStep: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div role="alert" className="flex flex-col gap-sm rounded-md bg-surface p-md shadow-1">
      <div className="flex items-start gap-sm">
        <Icon name="WarningCircle" className="text-alert" />
        <div className="flex flex-col gap-xs">
          <p className="text-body">{message}</p>
          <p className="text-body-sm text-text-secondary">{nextStep}</p>
        </div>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
