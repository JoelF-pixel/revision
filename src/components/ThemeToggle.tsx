"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  // Avoid hydration mismatch: resolvedTheme is only reliable client-side.
  if (!mounted) {
    return (
      <Button variant="outline" size="sm" disabled>
        Theme
      </Button>
    );
  }

  const current = theme === "system" ? resolvedTheme : theme;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(current === "dark" ? "light" : "dark")}
    >
      Theme: {current === "dark" ? "Dark" : "Light"}
    </Button>
  );
}
