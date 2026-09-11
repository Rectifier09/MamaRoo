import { PRODUCT_NAME } from "@/lib/config";

/**
 * Placeholder root route. Session 14 replaces this with the landing screen,
 * built from the designer's asset. Nothing here is design work: it exists so the
 * app boots and the smoke test has a route to hit.
 */
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-md p-screen">
      <h1 className="font-display text-h1 text-text-primary">{PRODUCT_NAME}</h1>
      <p className="text-body text-text-secondary">A calm companion through pregnancy.</p>
    </main>
  );
}
