"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

function getCodeTextFromPre(pre: HTMLElement | null): string {
  if (!pre) return "";
  const code = pre.querySelector("code");
  if (!code) return pre.innerText || "";
  // innerText preserves newlines as rendered.
  return code.innerText || "";
}

function getLanguageFromClassName(cls: string): string {
  const m = cls.match(/language-([a-z0-9_-]+)/i);
  return m?.[1] ?? "";
}

type PreProps = React.HTMLAttributes<HTMLPreElement> & {
  // from rehype-pretty-code
  "data-language"?: string;
};

function getLanguageFromProps(props: PreProps): string {
  // rehype-pretty-code sets data-language on <pre> (and <code>) for blocks.
  const dataLang = props["data-language"];
  if (dataLang) return dataLang;

  // Fallback: className like "language-ts".
  const cls = String(props.className || "");
  const fromCls = getLanguageFromClassName(cls);
  if (fromCls) return fromCls;

  return "";
}

export function PreWithCopy(props: PreProps) {
  const { children, className = "", ...rest } = props;
  const preRef = useRef<HTMLPreElement | null>(null);

  const [copied, setCopied] = useState(false);
  const label = copied ? "Copied" : "Copy";

  const canCopy = useMemo(() => typeof navigator !== "undefined", []);

  const onCopy = useCallback(async () => {
    const text = getCodeTextFromPre(preRef.current);
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Fallback for older browsers.
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.top = "0";
        ta.style.left = "0";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      } catch {
        // ignore
      }
    }
  }, []);

  // Important: don't read from `preRef.current` here; refs are null during render.
  // rehype-pretty-code provides `data-language` directly on props.
  const language = useMemo(() => getLanguageFromProps(props), [props]);

  return (
    <div className="not-prose my-4">
      <div className="overflow-hidden rounded-lg border">
        <div
          data-slot="code-header"
          className="flex items-center justify-between gap-3 border-b bg-white px-3 py-2 dark:bg-neutral-950"
        >
          <div className="min-w-0 truncate font-mono text-sm text-muted-foreground dark:text-white">
            {language ? language : "Code"}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={
              "h-8 rounded-full bg-muted px-3 text-xs hover:bg-muted/80 " +
              (copied ? "opacity-90" : "")
            }
            onClick={onCopy}
            disabled={!canCopy}
          >
            {label}
          </Button>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-900">
          <pre
            ref={preRef}
            className={
              "m-0 overflow-x-auto bg-transparent px-4 py-3 text-sm leading-6 " + className
            }
            {...rest}
          >
            {children}
          </pre>
        </div>
      </div>
    </div>
  );
}
