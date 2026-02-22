"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useSession } from "next-auth/react";

import contentIndex from "../../content/generated/content-index.json";

import { AuthButton } from "@/components/AuthButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GoogleBrandingLink } from "@/components/GoogleSignInCommon";

import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PACK_STORAGE_KEY = "revtree.pack";
const LEGACY_PACK_STORAGE_KEY = "raft.pack";

function getPackFromPathname(pathname: string | null): string | null {
  if (!pathname) return null;
  const m = pathname.match(/^\/p\/([^/]+)/);
  return m?.[1] ?? null;
}

function getSectionFromPathname(pathname: string | null):
  | "home"
  | "skills"
  | "lessons"
  | "plan"
  | "radar"
  | "assessment"
  | "unknown" {
  if (!pathname) return "unknown";
  if (pathname.match(/^\/p\/[^/]+\/?$/)) return "home";
  if (pathname.includes("/skills")) return "skills";
  if (pathname.includes("/lessons")) return "lessons";
  if (pathname.includes("/plan")) return "plan";
  if (pathname.includes("/radar")) return "radar";
  if (pathname.includes("/assessment")) return "assessment";
  return "unknown";
}

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();

  const { data: session } = useSession();
  const isAuthed = Boolean((session as any)?.user);

  const [packId, setPackId] = useState<string>("govuk-prototyping");

  const section = useMemo(() => getSectionFromPathname(pathname), [pathname]);

  const packIds = useMemo(() => Object.keys((contentIndex as any).packs || {}), []);

  useEffect(() => {
    const fromPath = getPackFromPathname(pathname);
    if (fromPath) {
      setPackId(fromPath);
      return;
    }
    try {
      const stored = localStorage.getItem(PACK_STORAGE_KEY) || localStorage.getItem(LEGACY_PACK_STORAGE_KEY);
      if (stored && packIds.includes(stored)) {
        setPackId(stored);
        // Don't auto-redirect from / — the root page is the pack picker.
        // (Auto-redirecting causes the pack selector to flash open then close.)
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const packName = ((contentIndex as any).packs?.[packId]?.manifest?.name as string) ?? packId;

  function onSelectPack(nextPackId: string) {
    setPackId(nextPackId);
    try {
      localStorage.setItem(PACK_STORAGE_KEY, nextPackId);
    } catch {
      // ignore
    }

    router.push(`/p/${nextPackId}`);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-baseline gap-3">
          <Link href={`/p/${packId}`} className="flex items-center gap-2 font-semibold tracking-tight whitespace-nowrap">
            <span className="text-xl leading-none" aria-label="RevTree">
              <span
                className="font-extrabold text-[1.18em]"
                style={{
                  backgroundImage:
                    "linear-gradient(110deg, color-mix(in oklab, var(--brand-wave) 92%, white 8%), color-mix(in oklab, var(--brand-aurora-purple) 86%, white 14%))",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                R
              </span>
              <span className="text-brand-turmeric">ev</span>
              <span
                className="font-extrabold text-[1.18em]"
                style={{
                  backgroundImage:
                    "linear-gradient(110deg, color-mix(in oklab, var(--brand-wave) 92%, white 8%), color-mix(in oklab, var(--brand-aurora-purple) 86%, white 14%))",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                T
              </span>
              <span className="text-brand-turmeric">ree</span>
            </span>
          </Link>
          <span className="hidden text-xs text-muted-foreground sm:inline whitespace-nowrap">RevTree — {packName}</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 sm:flex">
          <Button asChild variant={section === "home" ? "secondary" : "ghost"} size="sm">
            <Link href={`/p/${packId}`}>Home</Link>
          </Button>
          {isAuthed ? (
            <Button asChild variant={section === "plan" ? "secondary" : "ghost"} size="sm">
              <Link href={`/p/${packId}/plan`}>My plan</Link>
            </Button>
          ) : null}
          <Button asChild variant={section === "skills" ? "secondary" : "ghost"} size="sm">
            <Link href={`/p/${packId}/skills`}>Skills</Link>
          </Button>
          <Button asChild variant={section === "lessons" ? "secondary" : "ghost"} size="sm">
            <Link href={`/p/${packId}/lessons`}>Lessons</Link>
          </Button>

          {/* Settings */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px]">
              <SheetHeader>
                <SheetTitle>Settings</SheetTitle>
              </SheetHeader>

              <div className="mt-6 flex flex-col gap-4">
                <div>
                  <div className="mb-2 text-xs text-muted-foreground">Pack</div>
                  <Select value={packId} onValueChange={onSelectPack}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select pack" />
                    </SelectTrigger>
                    <SelectContent>
                      {packIds.map((id) => (
                        <SelectItem key={id} value={id}>
                          {id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Theme</div>
                    <div className="text-xs text-muted-foreground">Light / Dark</div>
                  </div>
                  <ThemeToggle />
                </div>

                <GoogleBrandingLink />

                <div className="pt-2">
                  <AuthButton />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </nav>

        {/* Mobile nav */}
        <div className="flex items-center gap-2 sm:hidden">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Menu">
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              <div className="mt-6 flex flex-col gap-2">
                <Button asChild variant={section === "home" ? "secondary" : "ghost"}>
                  <Link href={`/p/${packId}`}>Home</Link>
                </Button>
                {isAuthed ? (
                  <Button asChild variant={section === "plan" ? "secondary" : "ghost"}>
                    <Link href={`/p/${packId}/plan`}>My plan</Link>
                  </Button>
                ) : null}
                <Button asChild variant={section === "skills" ? "secondary" : "ghost"}>
                  <Link href={`/p/${packId}/skills`}>Skills</Link>
                </Button>
                <Button asChild variant={section === "lessons" ? "secondary" : "ghost"}>
                  <Link href={`/p/${packId}/lessons`}>Lessons</Link>
                </Button>

                <div className="mt-4">
                  <div className="mb-2 text-xs text-muted-foreground">Pack</div>
                  <Select value={packId} onValueChange={onSelectPack}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select pack" />
                    </SelectTrigger>
                    <SelectContent>
                      {packIds.map((id) => (
                        <SelectItem key={id} value={id}>
                          {id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-4">
                  <GoogleBrandingLink />
                </div>

                <div className="mt-2">
                  <AuthButton />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
