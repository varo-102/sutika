import type { Locale } from "./locale.ts";

export class PublicError extends Error {
  readonly english: string;

  constructor(spanish: string, english: string) {
    super(spanish);
    this.english = english;
  }

  inLocale(locale: Locale) {
    return locale === "en" ? this.english : this.message;
  }
}
