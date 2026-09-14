"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// A thin bar across the very top of the screen, shown for the duration of
// any tap that leads somewhere -- the PWA-standard "something is happening"
// signal so a slow connection never reads as a dead tap. Driven entirely by
// clicks on internal <a> elements (every navigation in this app already goes
// through next/link, which renders one) rather than wrapping router.push, so
// no existing screen needs to change to get it.
export function RouteProgressBar() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same destination as the page already showing -- nothing will load.
      if (url.pathname === pathname) return;

      setActive(true);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  // The pathname actually changing is the one reliable signal that the
  // navigation this bar is showing for has finished -- syncing to that
  // external event (not deriving it from render) is why this runs in an
  // effect rather than during render.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- clears the bar in response to usePathname() changing, an external navigation event, not a value derivable during render.
  useEffect(() => setActive(false), [pathname]);

  if (!active) return null;

  return (
    <div aria-hidden="true" data-testid="route-progress-bar" className="fixed inset-x-0 top-0 z-50 h-[3px] overflow-hidden">
      <div className="h-full w-1/3 bg-accent-primary motion-safe:animate-[route-progress-slide_var(--motion-slow)_var(--ease-standard)_infinite]" />
    </div>
  );
}
