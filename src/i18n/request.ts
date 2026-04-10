import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { defaultLocale, locales } from "@/lib/i18n-config";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(locales, requested) ? requested : defaultLocale;

  const messages =
    locale === "am"
      ? (await import("@/dictionaries/am.json")).default
      : (await import("@/dictionaries/en.json")).default;

  return {
    locale,
    messages
  };
});
