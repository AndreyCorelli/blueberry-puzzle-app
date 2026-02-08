import i18n, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import enJson from "./locales/en.json";
import esJson from "./locales/es.json";
import deJson from "./locales/de.json";

export const SUPPORTED_LANGS = ["en", "es", "de"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

const STORAGE_KEY_LANGUAGE = "settings.language";

// Type the imported JSONs to something i18next accepts
const en = enJson as Record<string, any>;
const es = esJson as Record<string, any>;
const de = deJson as Record<string, any>;

const resources: Resource = {
  en: { translation: en },
  es: { translation: es },
  de: { translation: de },
};

export function isSupportedLang(x: unknown): x is SupportedLang {
  return typeof x === "string" && (SUPPORTED_LANGS as readonly string[]).includes(x);
}

function pickBestSystemLanguage(): SupportedLang {
  const locale = Localization.getLocales?.()?.[0];

  const code = locale?.languageCode;
  if (isSupportedLang(code)) return code;

  const tag = locale?.languageTag;
  const base = typeof tag === "string" ? tag.split("-")[0] : null;
  if (isSupportedLang(base)) return base;

  return "en";
}

export function initI18n(): void {
  if (i18n.isInitialized) return;

  i18n.use(initReactI18next).init({
    resources,
    lng: pickBestSystemLanguage(),
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    compatibilityJSON: "v4",
  });
}

export async function setAppLanguage(lang: SupportedLang): Promise<void> {
  if (!i18n.isInitialized) initI18n();
  if (i18n.resolvedLanguage === lang || i18n.language === lang) return;
  await i18n.changeLanguage(lang);
}

export async function resetToSystemLanguage(): Promise<void> {
  await setAppLanguage(pickBestSystemLanguage());
}

export function getCurrentLanguage(): SupportedLang {
  const current = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const base = typeof current === "string" ? current.split("-")[0] : "en";
  return isSupportedLang(base) ? base : "en";
}

// Export the storage key so App.tsx can reuse it without duplicating strings
export const I18N_STORAGE_KEY_LANGUAGE = STORAGE_KEY_LANGUAGE;
