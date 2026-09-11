"use server";

import { revalidatePath } from "next/cache";
import { setLocale } from "@/i18n/locale";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/config";

export async function changeLocale(locale: Locale): Promise<void> {
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) return;
  await setLocale(locale);
  revalidatePath("/", "layout");
}
