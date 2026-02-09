"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useSession } from "next-auth/react";

import contentIndex from "../../content/generated/content-index.json";

import { AuthButton } from "@/components/AuthButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HippoLogo } from "@/components/HippoLogo";
import { GoogleBrandingLink } from "@/components/GoogleSignInCommon";

import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PACK_STORAGE_KEY = "raft.pack";

function getPackFromPathname(pathname: string | null): string | null {
  if (!pathname) return null;
  const m = pathname.match(/^\/p\/([^/]+)/);
  return m?.[1] ?? null;
}

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAuthed = !!session?.user?.email;

  const section = useMemo(() => {
    const p = pathname || "";
    const m = p.match(/^\/p\/[^/]+(\/[^/?#]+)?/);
    const tail = m?.[1] || "";
    if (!tail || tail === "/") return "home";
    if (tail.startsWith("/plan")) return "plan";
    if (tail.startsWith("/skills")) return "skills";
    if (tail.startsWith("/lessons")) return "lessons";
    if (tail.startsWith("/assessment")) return "assessment";
    if (tail.startsWith("/radar")) return "radar";
    return "other";
  }, [pathname]);

  const defaultPackId = (contentIndex as any).defaultPackId as string;

  const packIds = useMemo(() => Object.keys((contentIndex as any).packs ?? {}), []);

  // Prefer pack from URL; fall back to persisted choice; then default.
  const [packId, setPackId] = useState<string>(() => getPackFromPathname(pathname) ?? defaultPackId);

  useEffect(() => {
    const fromUrl = getPackFromPathname(pathname);
    if (fromUrl) {
      setPackId(fromUrl);
      try {
        localStorage.setItem(PACK_STORAGE_KEY, fromUrl);
      } catch {
        // ignore
      }
      return;
    }

    // No pack in URL → try restore.
    try {
      const stored = localStorage.getItem(PACK_STORAGE_KEY);
      if (stored && packIds.includes(stored) && stored !== packId) {
        setPackId(stored);
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
        <div className="flex items-center gap-3">
          <Link href={`/p/${packId}`} className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="text-brand-turmeric">
              <HippoLogo className="h-6 w-auto" />
            </span>
            <span className="sr-only">RAFT</span>
          </Link>
          <span className="hidden text-xs text-muted-foreground sm:inline">RAFT — {packName}</span>
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
                          {(contentIndex as any).packs?.[id]?.manifest?.name ?? id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="mb-2 text-xs text-muted-foreground">Theme</div>
                  <ThemeToggle />
                </div>

                <div>
                  <div className="mb-2 text-xs text-muted-foreground">Account</div>
                  <AuthButton />
                  <div className="mt-2 text-xs text-muted-foreground">
                    <GoogleBrandingLink className="underline underline-offset-4 hover:text-foreground" />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </nav>

        {/* Mobile nav */}
        <div className="flex items-center gap-2 sm:hidden">
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
                          {(contentIndex as any).packs?.[id]?.manifest?.name ?? id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="mb-2 text-xs text-muted-foreground">Theme</div>
                  <ThemeToggle />
                </div>

                <div>
                  <div className="mb-2 text-xs text-muted-foreground">Account</div>
                  <AuthButton />
                  <div className="mt-2 text-xs text-muted-foreground">
                    <GoogleBrandingLink className="underline underline-offset-4 hover:text-foreground" />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                Menu
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              <div className="mt-6 flex flex-col gap-2">
                <Button
                  asChild
                  variant={section === "home" ? "secondary" : "ghost"}
                  className="justify-start"
                >
                  <Link href={`/p/${packId}`}>Home</Link>
                </Button>
                {isAuthed ? (
                  <Button
                    asChild
                    variant={section === "plan" ? "secondary" : "ghost"}
                    className="justify-start"
                  >
                    <Link href={`/p/${packId}/plan`}>My plan</Link>
                  </Button>
                ) : null}
                <Button
                  asChild
                  variant={section === "lessons" ? "secondary" : "ghost"}
                  className="justify-start"
                >
                  <Link href={`/p/${packId}/lessons`}>Lessons</Link>
                </Button>
                <Button
                  asChild
                  variant={section === "radar" ? "secondary" : "ghost"}
                  className="justify-start"
                >
                  <Link href={`/p/${packId}/radar`}>Radar</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
