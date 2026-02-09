"use client";

import * as d3 from "d3";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Skill = {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  levelId?: string;
  order?: number;
  status?: string;
  prereqs?: string[];
  taughtByUnits?: string[];
  kitTags?: string[];
};

type Unit = {
  id: string;
  title: string;
  summary?: string;
};

type Manifest = {
  categories: { id: string; title: string }[];
  levels: { id: string; title: string }[];
};

type RatingMap = Record<string, number>; // skillId -> rating (0-3)

function clampRating(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(3, Math.trunc(n)));
}

function levelRank(manifest: Manifest, levelId: string | undefined): number {
  const id = String(levelId || "").trim();
  const idx = manifest.levels.findIndex((l) => l.id === id);
  return idx >= 0 ? idx : 999;
}

function categoryRank(manifest: Manifest, categoryId: string | undefined): number {
  const id = String(categoryId || "").trim();
  const idx = manifest.categories.findIndex((c) => c.id === id);
  return idx >= 0 ? idx : 999;
}

type SkillLink = { from: string; to: string; type: "prereq" };

export function SkillRadar({
  packId,
  skills,
  unitsById,
  manifest,
  skillLinks,
}: {
  packId: string;
  skills: Skill[];
  unitsById: Record<string, Unit>;
  manifest: Manifest;
  skillLinks: SkillLink[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [ratings, setRatings] = useState<RatingMap>({});
  const [loadingRatings, setLoadingRatings] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(false);
  const [showNumbers, setShowNumbers] = useState(false);
  const [showLinks, setShowLinks] = useState(true);
  const [focusSelection, setFocusSelection] = useState(false);

  // Fetch ratings (pack-scoped)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingRatings(true);
      const res = await fetch(`/api/ratings?packId=${encodeURIComponent(packId)}`, { cache: "no-store" });
      if (!res.ok) {
        setLoadingRatings(false);
        return;
      }
      const json = await res.json();
      const map: RatingMap = {};
      for (const r of json.ratings ?? []) map[String(r.skillId)] = clampRating(r.rating);
      if (!cancelled) {
        setRatings(map);
        setLoadingRatings(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [packId]);

  const orderedSkills = useMemo(() => {
    const cats = manifest.categories.map((c) => c.id);
    const lvls = manifest.levels.map((l) => l.id);

    const rankCat = new Map(cats.map((id, i) => [id, i]));
    const rankLvl = new Map(lvls.map((id, i) => [id, i]));

    return skills
      .slice()
      .sort((a, b) => {
        const la = rankLvl.get(String(a.levelId || "")) ?? 999;
        const lb = rankLvl.get(String(b.levelId || "")) ?? 999;
        if (la !== lb) return la - lb;

        const ca = rankCat.get(String(a.categoryId || "")) ?? 999;
        const cb = rankCat.get(String(b.categoryId || "")) ?? 999;
        if (ca !== cb) return ca - cb;

        return (Number(a.order ?? 0) - Number(b.order ?? 0)) || String(a.name).localeCompare(String(b.name));
      });
  }, [skills, manifest]);

  const selectedSkillIndex = useMemo(() => {
    if (!selectedId) return -1;
    return orderedSkills.findIndex((s) => s.id === selectedId);
  }, [orderedSkills, selectedId]);

  const selectedSkill = useMemo(() => {
    if (selectedSkillIndex < 0) return null;
    return orderedSkills[selectedSkillIndex] ?? null;
  }, [orderedSkills, selectedSkillIndex]);

  const prevSkillId = selectedSkillIndex > 0 ? orderedSkills[selectedSkillIndex - 1]?.id : null;
  const nextSkillId =
    selectedSkillIndex >= 0 && selectedSkillIndex < orderedSkills.length - 1
      ? orderedSkills[selectedSkillIndex + 1]?.id
      : null;

  const skillById = useMemo(() => {
    const m = new Map<string, Skill>();
    for (const s of orderedSkills) m.set(s.id, s);
    return m;
  }, [orderedSkills]);

  function selectSkill(id: string | null) {
    if (!id) return;
    setSelectedId(id);
  }

  const { prereqIds, dependentIds, connectedIds } = useMemo(() => {
    const prereq = new Set<string>();
    const dep = new Set<string>();
    if (selectedId) {
      for (const e of skillLinks || []) {
        if (e.to === selectedId) prereq.add(e.from);
        if (e.from === selectedId) dep.add(e.to);
      }
    }
    const connected = new Set<string>([...(selectedId ? [selectedId] : []), ...prereq, ...dep]);
    return { prereqIds: prereq, dependentIds: dep, connectedIds: connected };
  }, [selectedId, skillLinks]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;

    const rect = container.getBoundingClientRect();
    const width = Math.max(600, Math.floor(rect.width));
    const height = 680;

    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height);

    svg.selectAll("*").remove();

    const cx = width / 2;
    const cy = height / 2;
    const margin = 40;
    const rMax = Math.min(width, height) / 2 - margin;

    const levels = manifest.levels.length ? manifest.levels : [{ id: "working", title: "Working" }];

    // Order categories clockwise starting from top-left:
    // TL: setup, TR: pages, BR: components, BL: data
    const categoriesRaw = manifest.categories.length
      ? manifest.categories
      : [{ id: "uncategorised", title: "Uncategorised" }];

    const preferredOrder = [
      "setup-and-deployment",
      "pages-and-layouts",
      "components-and-patterns",
      "data-and-logic",
    ];

    const byId = new Map(categoriesRaw.map((c) => [c.id, c] as const));
    const categories = preferredOrder.every((id) => byId.has(id))
      ? preferredOrder.map((id) => byId.get(id)!)
      : categoriesRaw;

    // Rings: weighted by level (inner ring bigger)
    const ringCount = levels.length;
    const weights = ringCount > 1 ? [0.5, ...Array.from({ length: ringCount - 1 }, () => 0.5 / (ringCount - 1))] : [1];
    const radii: number[] = [0];
    for (let i = 0; i < ringCount; i++) radii.push(radii[i] + rMax * weights[i]);

    // Category slices (quadrants)
    const sliceCount = categories.length;
    const sliceAngle = (Math.PI * 2) / sliceCount;

    // Start so the first category lands in the TOP-LEFT quadrant.
    // Angles here are in [0..2π) with 0 at top (we apply a -π/2 shift when converting to SVG).
    const TAU = Math.PI * 2;
    const sliceStart = (3 * Math.PI) / 2; // 270° (left)

    // Background group
    const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

    // Slices
    const sliceG = g.append("g");
    for (let i = 0; i < sliceCount; i++) {
      const a0 = (sliceStart + i * sliceAngle) % TAU;
      const a1 = a0 + sliceAngle;

      // Convert from our "top=0" angle system to SVG arc system (0 on x-axis)
      const arc = d3
        .arc()
        .innerRadius(0)
        .outerRadius(rMax)
        .startAngle(a0 - Math.PI / 2)
        .endAngle(a1 - Math.PI / 2);

      sliceG
        .append("path")
        .attr("d", arc as any)
        .attr("fill", i % 2 === 0 ? "rgba(0,0,0,0.02)" : "rgba(0,0,0,0.00)")
        .attr("stroke", "rgba(0,0,0,0.05)")
        .attr("stroke-width", 1);

      const labelAngle = (a0 + a1) / 2;
      const labelR = rMax + 18;
      const lx = Math.cos(labelAngle - Math.PI / 2) * labelR;
      const ly = Math.sin(labelAngle - Math.PI / 2) * labelR;

      sliceG
        .append("text")
        .attr("x", lx)
        .attr("y", ly)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 12)
        .attr("fill", "rgba(0,0,0,0.55)")
        .text(categories[i].title);
    }

    // Rings + level labels
    const ringG = g.append("g");
    for (let i = 1; i <= ringCount; i++) {
      ringG
        .append("circle")
        .attr("r", radii[i])
        .attr("fill", "none")
        .attr("stroke", "rgba(0,0,0,0.12)")
        .attr("stroke-width", 1);

      const lvl = levels[i - 1];
      ringG
        .append("text")
        .attr("x", 0)
        .attr("y", -radii[i] + 14)
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .attr("fill", "rgba(0,0,0,0.55)")
        .text(lvl.title);
    }

    const colorByRating = (rating: number) => {
      // Align with our palette-ish: 0 gray, 1 teal, 2 purple-ish, 3 pink-ish
      if (rating <= 0) return "rgba(107,133,145,0.75)"; // wave-light
      if (rating === 1) return "rgba(0,94,93,0.85)"; // wave
      if (rating === 2) return "rgba(111,66,193,0.85)"; // purple
      return "rgba(255,163,181,0.95)"; // flamingo
    };

    function halton(index: number, base: number): number {
      let f = 1;
      let r = 0;
      let i = index;
      while (i > 0) {
        f = f / base;
        r = r + f * (i % base);
        i = Math.floor(i / base);
      }
      return r;
    }

    // Place points deterministically but more evenly (low-discrepancy sequence + collision relax)
    const groupCounters = new Map<string, number>();

    const nodes: any[] = orderedSkills.map((s) => {
      const li = levelRank(manifest, s.levelId);
      const ci = categoryRank(manifest, s.categoryId);

      const ringInner = radii[li] ?? 0;
      const ringOuter = radii[li + 1] ?? rMax;

      const a0 = (sliceStart + ci * sliceAngle) % TAU;
      const a1 = a0 + sliceAngle;
      const wraps = a1 > TAU;

      const key = `${li}|${ci}`;
      const n = (groupCounters.get(key) ?? 0) + 1;
      groupCounters.set(key, n);

      // Halton gives a more even spread than naive RNG.
      const u = 0.05 + 0.9 * halton(n, 2); // angle within slice
      const v = 0.05 + 0.9 * halton(n, 3); // radius within ring

      // Angle in our [0..2π) system, with wrap handled.
      let angle = a0 + sliceAngle * u;
      if (angle >= TAU) angle -= TAU;

      // Uniform-in-area radius distribution inside an annulus
      const r2 = ringInner * ringInner + v * (ringOuter * ringOuter - ringInner * ringInner);
      const radius = Math.sqrt(r2);

      const x0 = Math.cos(angle - Math.PI / 2) * radius;
      const y0 = Math.sin(angle - Math.PI / 2) * radius;

      return {
        ...s,
        li,
        ci,
        ringInner,
        ringOuter,
        a0,
        a1,
        wraps,
        x0,
        y0,
        x: x0,
        y: y0,
      };
    });

    // Relax collisions a bit so dots don't sit on top of each other.
    // Keep it deterministic-ish by running a fixed number of ticks.
    const sim = d3
      .forceSimulation(nodes)
      .alpha(1)
      .alphaDecay(0.08)
      .force("collide", d3.forceCollide(7).strength(0.9))
      .force("x", d3.forceX((d: any) => d.x0).strength(0.08))
      .force("y", d3.forceY((d: any) => d.y0).strength(0.08));

    for (let i = 0; i < 60; i++) {
      sim.tick();
      // Clamp nodes back into their ring+slice bounds
      for (const d of nodes) {
        // Convert to polar (relative to center)
        const ang = Math.atan2(d.y, d.x) + Math.PI / 2; // undo our -pi/2 earlier
        const aNorm = (ang + TAU) % TAU;

        // Clamp angle to slice, handling wrap-around at 0/2π.
        const pad = 0.02;
        let aClamped = aNorm;
        if (!d.wraps) {
          aClamped = Math.min(Math.max(aNorm, d.a0 + pad), d.a1 - pad);
        } else {
          const a1m = d.a1 - TAU; // wrapped end in [0..2π)
          const inSlice = aNorm >= d.a0 + pad || aNorm <= a1m - pad;
          if (!inSlice) {
            // Snap to nearest boundary
            const distToA0 = Math.abs(aNorm - (d.a0 + pad));
            const distToA1 = Math.abs(aNorm - (a1m - pad));
            aClamped = distToA0 < distToA1 ? d.a0 + pad : a1m - pad;
          }
        }

        const rr = Math.sqrt(d.x * d.x + d.y * d.y);
        const rClamped = Math.min(Math.max(rr, d.ringInner + 6), d.ringOuter - 6);

        d.x = Math.cos(aClamped - Math.PI / 2) * rClamped;
        d.y = Math.sin(aClamped - Math.PI / 2) * rClamped;
      }
    }
    sim.stop();

    const nodeById = new Map(nodes.map((n: any) => [n.id, n]));

    const prereqIdsLocal = prereqIds;
    const dependentIdsLocal = dependentIds;
    const connectedIdsLocal = connectedIds;

    const linkG = g.append("g").attr("opacity", showLinks ? 1 : 0);

    const linksToDraw = focusSelection && selectedId
      ? (skillLinks || []).filter((e) => connectedIdsLocal.has(e.from) && connectedIdsLocal.has(e.to))
      : (skillLinks || []);

    // Draw links first (under nodes)
    linksToDraw
      .filter((e) => nodeById.has(e.from) && nodeById.has(e.to))
      .forEach((e) => {
        const a: any = nodeById.get(e.from);
        const b: any = nodeById.get(e.to);

        const isPrereqEdge = selectedId && e.to === selectedId;
        const isNextEdge = selectedId && e.from === selectedId;
        const isConnectedEdge = selectedId && (isPrereqEdge || isNextEdge);

        const stroke = isPrereqEdge
          ? "rgba(111,66,193,0.55)" // prereqs: purple
          : isNextEdge
            ? "rgba(0,94,93,0.55)" // next: teal
            : "rgba(0,0,0,0.12)";

        linkG
          .append("line")
          .attr("x1", a.x)
          .attr("y1", a.y)
          .attr("x2", b.x)
          .attr("y2", b.y)
          .attr("stroke", stroke)
          .attr("stroke-width", isConnectedEdge ? 2 : 1)
          .attr("opacity", !selectedId ? 1 : isConnectedEdge ? 1 : 0.35);
      });

    const nodeG = g.append("g");

    const tooltip = d3
      .select(container)
      .append("div")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("opacity", "0")
      .style("background", "rgba(0,0,0,0.8)")
      .style("color", "white")
      .style("padding", "6px 8px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("max-width", "260px");

    const circles = nodeG
      .selectAll("circle")
      .data(nodes, (d: any) => d.id)
      .join("circle")
      .attr("cx", (d: any) => d.x)
      .attr("cy", (d: any) => d.y)
      .attr("r", (d: any) => (d.id === selectedId ? 6 : prereqIdsLocal.has(d.id) || dependentIdsLocal.has(d.id) ? 5.5 : 5))
      .attr("fill", (d: any) => colorByRating(ratings[d.id] ?? 0))
      .attr("opacity", (d: any) => {
        if (!selectedId) return 1;
        if (!focusSelection) return 1;
        return connectedIdsLocal.has(d.id) ? 1 : 0.15;
      })
      .attr("stroke", (d: any) => {
        if (d.id === selectedId) return "rgba(12,35,64,0.9)";
        if (prereqIdsLocal.has(d.id)) return "rgba(111,66,193,0.9)";
        if (dependentIdsLocal.has(d.id)) return "rgba(0,94,93,0.9)";
        return "white";
      })
      .attr("stroke-width", (d: any) => (d.id === selectedId || prereqIdsLocal.has(d.id) || dependentIdsLocal.has(d.id) ? 2 : 1.5))
      .style("cursor", "pointer")
      .on("mouseenter", (event: any, d: any) => {
        tooltip
          .style("opacity", "1")
          .html(
            `<div style="font-weight:600; margin-bottom:2px;">${d.name}</div>` +
              `<div>rating: <b>${ratings[d.id] ?? 0}</b></div>`
          );
      })
      .on("mousemove", (event: any) => {
        const cr = container.getBoundingClientRect();
        tooltip.style("left", `${event.clientX - cr.left + 12}px`).style("top", `${event.clientY - cr.top + 12}px`);
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", "0");
      })
      .on("click", (_event: any, d: any) => {
        setSelectedId(d.id);
      });

    if (showNumbers) {
      nodeG
        .selectAll("text.skill-num")
        .data(nodes, (d: any) => d.id)
        .join("text")
        .attr("class", "skill-num")
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y + 3.5)
        .attr("text-anchor", "middle")
        .attr("font-size", 9)
        .attr("font-weight", 700)
        .attr("fill", "white")
        .attr("opacity", (d: any) => {
          const r = ratings[d.id] ?? 0;
          return r > 0 ? 0.95 : 0;
        })
        .text((d: any) => String(ratings[d.id] ?? 0));
    }

    if (showLabels) {
      nodeG
        .selectAll("text.skill-label")
        .data(nodes, (d: any) => d.id)
        .join("text")
        .attr("class", "skill-label")
        .attr("x", (d: any) => d.x + 8)
        .attr("y", (d: any) => d.y + 4)
        .attr("font-size", 11)
        .attr("fill", "rgba(0,0,0,0.7)")
        .text((d: any) => d.name);
    }

    // Zoom/pan
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 2.5])
      .on("zoom", (event) => {
        g.attr("transform", `translate(${event.transform.x + cx},${event.transform.y + cy}) scale(${event.transform.k})`);
      });

    svg.call(zoom as any);

    // When a skill is selected, zoom into its quadrant to use the extra space.
    if (selectedId) {
      const n: any = nodeById.get(selectedId);
      if (n) {
        // Zoom to the centre of the slice rather than the exact node (feels more like “quadrant focus”).
        let a1 = n.a1;
        if (n.wraps) a1 = a1 - TAU;
        const mid = (n.a0 + a1) / 2;
        const focusR = rMax * 0.35;
        const fx = Math.cos(mid - Math.PI / 2) * focusR;
        const fy = Math.sin(mid - Math.PI / 2) * focusR;
        const k = 1.85;

        svg
          .transition()
          .duration(450)
          .call(zoom.transform as any, d3.zoomIdentity.translate(-fx * k, -fy * k).scale(k) as any);
      }
    } else {
      svg
        .transition()
        .duration(250)
        .call(zoom.transform as any, d3.zoomIdentity as any);
    }

    // Clean up tooltip on rerender
    return () => {
      tooltip.remove();
      svg.on(".zoom", null);
    };
  }, [orderedSkills, manifest, ratings, selectedId, showLabels, showNumbers, showLinks, focusSelection, skillLinks]);

  const showSkillPanel = Boolean(selectedSkill);

  return (
    <div className={showSkillPanel ? "grid gap-6 lg:grid-cols-[1fr_340px]" : "grid gap-6"}>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>
              <h1 className="text-2xl">Skills tree</h1>
              </CardTitle>
            <CardDescription>
              Visual map of skills by category (slice) and level (ring). Click a dot to inspect. {loadingRatings ? "(loading ratings…)" : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={showLinks}
                onChange={(e) => setShowLinks(e.target.checked)}
              />
              Show links
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={focusSelection}
                onChange={(e) => setFocusSelection(e.target.checked)}
                disabled={!selectedId}
              />
              Focus selection
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={showNumbers}
                onChange={(e) => setShowNumbers(e.target.checked)}
              />
              Show numbers
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
              />
              Show labels
            </label>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={containerRef} className="relative w-full">
            <svg ref={svgRef} className="w-full rounded-lg border bg-white dark:bg-card" />
          </div>
        </CardContent>
      </Card>

      {showSkillPanel ? (
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{selectedSkill!.name}</CardTitle>
              {selectedSkill!.description ? <CardDescription>{selectedSkill!.description}</CardDescription> : null}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">id: {selectedSkill!.id}</div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => selectSkill(prevSkillId)}
                    disabled={!prevSkillId}
                  >
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => selectSkill(nextSkillId)}
                    disabled={!nextSkillId}
                  >
                    Next
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                  level: {manifest.levels.find((l) => l.id === selectedSkill!.levelId)?.title ?? selectedSkill!.levelId ?? "—"}
                </span>
                <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                  category: {manifest.categories.find((c) => c.id === selectedSkill!.categoryId)?.title ?? selectedSkill!.categoryId ?? "—"}
                </span>
                <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                  rating: {ratings[selectedSkill!.id] ?? 0}
                </span>
                {selectedSkill!.status ? (
                  <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">status: {selectedSkill!.status}</span>
                ) : null}
              </div>

              {selectedSkill!.kitTags?.length ? (
                <div className="flex flex-wrap gap-2">
                  {selectedSkill!.kitTags.map((t) => (
                    <span key={t} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-3">
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Prereqs</div>
                  {prereqIds.size ? (
                    <ul className="space-y-1">
                      {[...prereqIds].slice(0, 8).map((id) => (
                        <li key={id} className="text-sm">
                          <button
                            type="button"
                            className="underline text-left"
                            onClick={() => selectSkill(id)}
                            title="Select on radar"
                          >
                            {skillById.get(id)?.name ?? id}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-muted-foreground">None</div>
                  )}
                </div>

                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Next skills</div>
                  {dependentIds.size ? (
                    <ul className="space-y-1">
                      {[...dependentIds].slice(0, 8).map((id) => (
                        <li key={id} className="text-sm">
                          <button
                            type="button"
                            className="underline text-left"
                            onClick={() => selectSkill(id)}
                            title="Select on radar"
                          >
                            {skillById.get(id)?.name ?? id}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-muted-foreground">None</div>
                  )}
                </div>

                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Learning units</div>
                  {selectedSkill!.taughtByUnits?.length ? (
                    <ul className="space-y-1">
                      {selectedSkill!.taughtByUnits.slice(0, 8).map((unitId) => {
                        const u = unitsById[unitId];
                        const title = u?.title ?? unitId;
                        return (
                          <li key={unitId} className="text-sm">
                            <Link className="underline" href={`/p/${packId}/lessons/${unitId}`}>
                              {title}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="text-sm text-muted-foreground">No units linked yet.</div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button asChild>
                  <Link href={`/p/${packId}/skills/${selectedSkill!.id}`}>Open skill page</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      ) : null}
    </div>
  );
}
