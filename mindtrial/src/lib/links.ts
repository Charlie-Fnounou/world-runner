/** Where beta feedback goes. Override with NEXT_PUBLIC_FEEDBACK_URL (e.g. a form). */
export const FEEDBACK_URL =
  process.env.NEXT_PUBLIC_FEEDBACK_URL ??
  "https://github.com/Charlie-Fnounou/world-runner/issues/new?labels=mindtrial&title=%5BMINDTRIAL%20feedback%5D%20";
