/**
 * The vine-and-leaf background motif. Permitted ONLY on the splash screen,
 * onboarding screens and empty states (design document §2, as amended by the spec).
 * Purely decorative, so it is always hidden from assistive technology.
 *
 * The artwork is a designer deliverable. Until it arrives, public/motif.svg is a
 * placeholder; swapping the file requires no code change.
 */
export function TextureMotif() {
  return (
    <div
      data-testid="texture-motif"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[url('/motif.svg')] bg-center bg-no-repeat opacity-(--texture-motif-opacity)"
    />
  );
}
