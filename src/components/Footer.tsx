import { InstagramIcon, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "./InstagramIcon";

export function Footer() {
  return (
    <footer className="border-t mt-auto" style={{ borderColor: "var(--wr-line)" }}>
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-center">
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-medium hover:opacity-80"
          style={{ color: "var(--wr-mut)" }}
        >
          <InstagramIcon />
          Síguenos en Instagram: @{INSTAGRAM_HANDLE}
        </a>
      </div>
    </footer>
  );
}
