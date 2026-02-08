import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import en from "./locales/en.json";
import es from "./locales/es.json";
import de from "./locales/de.json";

const resources = {
  en: { translation: en },
  de: { translation: de },
  es: { translation: es },
};

function pickBestLanguageTag(): string {
  // Expo Localization gives tags like "en-US", "de-DE", "ru-RU"
  const locale = Localization.getLocales?.()?.[0];
  const tag = locale?.languageTag || "en";
  const languageCode = locale?.languageCode || "en";

  // If you only ship base languages (en, de, ...), prefer that.
  // e.g. "en-US" -> "en"
  return resources[languageCode as keyof typeof resources] ? languageCode : "en";
}

export function initI18n(): void {
  if (i18n.isInitialized) return;

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: pickBestLanguageTag(),
      fallbackLng: "en",
      interpolation: {
        escapeValue: false, // React already escapes
      },
      compatibilityJSON: "v4",
    });
}
