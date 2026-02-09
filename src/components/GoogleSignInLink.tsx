import Link from "next/link";

import { cn } from "@/lib/utils";
import { GoogleGIcon } from "@/components/GoogleSignInCommon";

export function GoogleSignInLink({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border bg-white px-4 text-sm font-medium text-neutral-900",
        "hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <GoogleGIcon className="h-4 w-4" />
      <span>Sign in with Google</span>
    </Link>
  );
}
