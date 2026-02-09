"use client";

import { ReactNode, useEffect, useRef } from "react";

export function StickyPanelScrollReset({
  selectedKey,
  className,
  children,
}: {
  selectedKey: string | null;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Only reset the panel scroll; do not affect page scroll.
    el.scrollTo({ top: 0 });
  }, [selectedKey]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
