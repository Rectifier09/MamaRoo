import { getLocale } from "@/i18n/locale";
import { BabyNameScreen } from "@/app/(app)/baby/name/BabyNameScreen";
import { saveBabyNames, setBabyNameFavorite } from "@/app/actions/babyName";
import { getBabyNamesData } from "@/lib/supabase/queries/babyNames";

export default async function BabyNamePage() {
  const locale = await getLocale();
  const data = await getBabyNamesData({ locale });
  const babyCount: 1 | 2 = data.pregnancy?.pregnancy_flags.includes("twins") ? 2 : 1;

  return (
    <BabyNameScreen
      babyCount={babyCount}
      catalog={data.names}
      initialFavoriteIds={data.favoriteIds}
      initialNames={data.pregnancy?.baby_name ?? []}
      onSaveNames={saveBabyNames}
      onSetFavorite={setBabyNameFavorite}
    />
  );
}
