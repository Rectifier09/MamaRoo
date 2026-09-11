import { notFound } from "next/navigation";
import { ComponentGallery } from "./ComponentGallery";

/**
 * The development-only component gallery. Every primitive and composite,
 * in every state, in both locales. This is the artefact every later
 * session uses for visual review and the bilingual 200%-scale check.
 * It is not a feature and is never linked from the app.
 */
export default function ComponentGalleryPage() {
  // Not NODE_ENV: this project's e2e suite runs `next build && next start`
  // locally, which sets NODE_ENV=production before the axe check in Step 10
  // ever visits this route. VERCEL_ENV is set by the platform itself, only
  // on an actual Vercel deployment, and reads "production" only for the
  // production deployment — never for a local build, a preview deployment,
  // or a Vercel Preview URL used for visual review.
  if (process.env.VERCEL_ENV === "production") notFound();
  return <ComponentGallery />;
}
