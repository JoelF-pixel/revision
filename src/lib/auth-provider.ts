export function getAuthProviderId(): string {
  const provider = (process.env.NEXT_PUBLIC_AUTH_PROVIDER || process.env.AUTH_PROVIDER || "google").toLowerCase();
  if (provider === "microsoft" || provider === "azure-ad" || provider === "azure") return "azure-ad";
  if (provider === "mock") return "mock";
  return "google";
}

export function getAuthProviderLabel(): string {
  const id = getAuthProviderId();
  if (id === "azure-ad") return "Microsoft";
  if (id === "mock") return "Mock";
  return "Google";
}

export function getSignInPath(callbackUrl?: string): string {
  const base = `/api/auth/signin/${getAuthProviderId()}`;
  if (!callbackUrl) return base;
  return `${base}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}
