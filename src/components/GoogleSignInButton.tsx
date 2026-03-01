"use client";

import { signIn } from "next-auth/react";

import { cn } from "@/lib/utils";
import { GoogleGIcon } from "@/components/GoogleSignInCommon";
import { getAuthProviderId, getAuthProviderLabel } from "@/lib/auth-provider";

export function GoogleSignInButton({
  className,
  callbackUrl,
}: {
  className?: string;
  callbackUrl?: string;
}) {
  const providerId = getAuthProviderId();
  const providerLabel = getAuthProviderLabel();
  const isGoogle = providerId === "google";

  return (
    <button
      type="button"
      onClick={() => signIn(providerId, { callbackUrl })}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border bg-white px-4 text-sm font-medium text-neutral-900",
        "hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      {isGoogle ? <GoogleGIcon className="h-4 w-4" /> : null}
      <span>Sign in with {providerLabel}</span>
    </button>
  );
}
