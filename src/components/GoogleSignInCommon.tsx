import Link from "next/link";

export const GOOGLE_BRANDING_URL = "https://developers.google.com/identity/branding-guidelines";

export function GoogleGIcon({ className }: { className?: string }) {
  // Simple inline SVG (Google "G" mark). Kept small for button use.
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.6 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.1-.1-2.2-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.3 35.6 26.8 36 24 36c-5.3 0-9.6-3.4-11.2-8.1l-6.6 5.1C9.5 39.7 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3-3.3 5.4-6.1 6.9l.1.1 6.3 5.2C39.7 36.4 44 31 44 24c0-1.1-.1-2.2-.4-3.5z"
      />
    </svg>
  );
}

export function GoogleBrandingLink({ className }: { className?: string }) {
  return (
    <Link
      href={GOOGLE_BRANDING_URL}
      target="_blank"
      rel="noreferrer"
      className={className}
    >
      Google branding guidelines
    </Link>
  );
}
