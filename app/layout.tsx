import type { Metadata } from "next";
import { Poppins, Hind } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { PRODUCT_NAME } from "@/lib/config";
import { getLocale } from "@/i18n/locale";
import "@/styles/tokens.css";
import "@/styles/globals.css";

const poppins = Poppins({
  subsets: ["latin", "devanagari"],
  weight: ["500"],
  variable: "--font-poppins",
  display: "swap",
});

const hind = Hind({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500"],
  variable: "--font-hind",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} | Coming soon`,
  description:
    "A calm companion through pregnancy. Join the waitlist for your baby's little milestones, your daily care, and a little more peace of mind.",
};

export const viewport = {
  themeColor: "#EDE3D3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={`${poppins.variable} ${hind.variable}`}>
      <body className="min-h-dvh bg-bg text-text-primary font-body">
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
