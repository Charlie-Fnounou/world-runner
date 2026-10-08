import { en, type Messages } from "./en";

export type Locale = "en";
const dictionaries: Record<Locale, Messages> = { en };

/** Current locale. Spanish ("es") is planned; add it to `dictionaries`. */
export const locale: Locale = "en";
export const messages: Messages = dictionaries[locale];
export const t = messages;
