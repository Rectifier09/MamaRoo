import { LanguageSelect } from "@/app/(public)/welcome/LanguageSelect";
import { changeLocale } from "@/app/actions/locale";

interface WelcomePageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  const { next } = await searchParams;
  return <LanguageSelect next={next ?? null} onChooseLocale={changeLocale} />;
}
