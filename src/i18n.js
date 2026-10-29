import messages from "./i18n/translations.json" with { type: "json" };
export const LANGUAGES = {
  en: "English",
  fr: "Français",
  ar: "العربية",
  es: "Español",
};
export const LANGUAGE_KEY = "ab-train-language";
export const THEME_KEY = "ab-train-theme";
export function readPreference(key, fallback) {
  try {
    return globalThis.localStorage?.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}
let language = readPreference(LANGUAGE_KEY, "en");
if (!Object.hasOwn(LANGUAGES, language)) language = "en";
export const getLanguage = () => language;
export const locale = (lang = language) =>
  ({ en: "en-GB", fr: "fr-MA", ar: "ar-MA", es: "es-ES" })[lang] || "en-GB";
export function savePreference(key, value) {
  try {
    globalThis.localStorage?.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
export function setLanguage(value) {
  if (!Object.hasOwn(LANGUAGES, value)) return false;
  language = value;
  return savePreference(LANGUAGE_KEY, value);
}
// English source phrases are stable, readable keys. Data (names, IDs, QR) stays untouched.
export function t(key, params = {}, lang = language) {
  const message =
    messages[lang]?.[key] ?? messages.en[key] ?? String(key ?? "");
  return message.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(params, name) ? String(params[name]) : match,
  );
}
export function displayDuration(minutes, lang = language) {
  return t(
    "{hours}h {minutes}m",
    {
      hours: Math.floor(minutes / 60),
      minutes: String(minutes % 60).padStart(2, "0"),
    },
    lang,
  );
}
export { messages };
export function displayDate(date, lang = language) {
  if (!date || Number.isNaN(Date.parse(date))) return "";
  return new Intl.DateTimeFormat(locale(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}
export function displayPrice(amount, lang = language) {
  return new Intl.NumberFormat(locale(lang), {
    style: "currency",
    currency: "MAD",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(amount);
}
