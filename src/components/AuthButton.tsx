"use client";

import { signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export function AuthButton() {
  const { data, status } = useSession();

  if (status === "loading") {
    return <span className="text-sm text-muted-foreground">Loading…</span>;
  }

  if (!data?.user) {
    return <GoogleSignInButton className="h-8 px-3 text-xs" />;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm text-muted-foreground">{data.user.email}</div>
      <Button size="sm" variant="outline" onClick={() => signOut()}>
        Sign out
      </Button>
    </div>
  );
}
