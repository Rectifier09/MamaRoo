"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Owns the animated-illustration contract once, so no screen reimplements it:
 * - respects prefers-reduced-motion by never loading the animation at all
 * - always renders the static fallback, so a failed load is never blank space
 * - alt text is required, because every illustration must be described
 */
export function IllustrationContainer({
  lottieUrl,
  staticSrc,
  alt,
  loop = true,
}: {
  lottieUrl: string;
  staticSrc: string;
  alt: string;
  loop?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion() || !host.current) return;
    let destroy: (() => void) | undefined;

    void (async () => {
      try {
        const lottie = (await import("lottie-web")).default;
        const animation = lottie.loadAnimation({
          container: host.current!,
          renderer: "svg",
          loop,
          autoplay: true,
          path: lottieUrl,
        });
        destroy = () => animation.destroy();
        // A bad/missing lottieUrl (e.g. a stage illustration not sourced yet)
        // doesn't make loadAnimation throw -- it fetches the JSON
        // asynchronously and lottie-web reports success or failure through
        // these events instead. Flipping `animated` unconditionally right
        // after the call (the previous behaviour here) would hide the static
        // <img> the instant a 404'ing path was requested, leaving a blank
        // space rather than the fallback image this component exists to
        // guarantee. Only a real render flips it now.
        animation.addEventListener("data_failed", () => setAnimated(false));
        animation.addEventListener("DOMLoaded", () => setAnimated(true));
      } catch {
        setAnimated(false); // static fallback stays visible
      }
    })();

    return () => destroy?.();
  }, [lottieUrl, loop]);

  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      <div ref={host} aria-hidden="true" className="absolute inset-0" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={staticSrc}
        alt={alt}
        className={animated ? "invisible w-full" : "w-full"}
      />
    </div>
  );
}
