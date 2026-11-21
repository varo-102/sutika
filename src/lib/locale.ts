export type Locale = "es" | "en";

export function localized(locale: Locale, path: string) {
  return locale === "en" ? "/en" + path.replace(/^\/(?=[?#]|$)/, "") : path;
}

export function unlocalized(pathname: string) {
  return pathname.replace(/^\/(?:en|es)(?=\/|$)/, "") || "/";
}

export const translate = (locale: Locale) => (es: string, en: string) =>
  locale === "en" ? en : es;

export function boliviaTime(locale: Locale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-BO" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/La_Paz",
  });
}
