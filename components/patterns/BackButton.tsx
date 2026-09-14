import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

// The circular back-link pattern already hand-rolled per screen (Summary,
// Notes, Letters, the Guide screens, ...) -- extracted here so the screens
// that never got one (medicines, reports, appointments, vitals, advice, and
// every /me/* sub-page) can add it without inventing a new look.
export function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="tap-target inline-flex shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-primary shadow-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
    >
      <Icon name="ArrowLeft" size="inline" />
    </Link>
  );
}
