import { ComingSoon } from "@/components/landing/ComingSoon";
import { SplashScreen } from "@/app/(public)/SplashScreen";

interface HomeProps {
  searchParams: Promise<{ next?: string }>;
}

// The waitlist is the live public page until Rochak says every screen is
// done and it can come down (Important/Implementation.md, "Launch gate
// discipline"). Flipping APP_LAUNCHED=true is the entire cutover -- no file
// changes needed here at that point.
export default async function Home({ searchParams }: HomeProps) {
  if (process.env.APP_LAUNCHED !== "true") {
    return <ComingSoon />;
  }
  const { next } = await searchParams;
  return <SplashScreen next={next ?? null} />;
}
