"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import {
  AnatomySelectionPayload,
  deriveSymptomsFromRegions,
  REGION_LOOKUP,
} from "@/components/features/anatomy/region-map";
import { ConditionVisualization } from "@/services/anatomy-content";

// ── Types ────────────────────────────────────────────────────────────────────

type ExplorerMode = "selection" | "condition";

interface BodyExplorer3DProps {
  onSelectionChange?: (payload: AnatomySelectionPayload) => void;
  className?: string;
  compact?: boolean;
  mode?: ExplorerMode;
  activeCondition?: ConditionVisualization | null;
  activeConditionRegion?: string | null;
  onConditionRegionSelect?: (regionId: string) => void;
  selection?: AnatomySelectionPayload;
  showSliders?: boolean;
}

// ── Anatomical SVG paths ─────────────────────────────────────────────────────
// viewBox: 0 0 200 500. Smooth human silhouette.

const BODY_REGIONS: {
  id: string;
  d: string;
}[] = [
  {
    // Head — smooth oval
    id: "head",
    d: "M100,20 C115,20 128,30 130,48 C132,62 126,78 118,84 C114,87 106,90 100,90 C94,90 86,87 82,84 C74,78 68,62 70,48 C72,30 85,20 100,20 Z",
  },
  {
    // Neck
    id: "throat",
    d: "M90,90 L110,90 L112,110 L88,110 Z",
  },
  {
    // Chest — broad shoulders tapering to waist
    id: "chest",
    d: "M88,110 L112,110 C120,110 136,112 148,118 C154,122 156,128 154,136 L148,170 C144,180 136,188 126,192 L100,196 L74,192 C64,188 56,180 52,170 L46,136 C44,128 46,122 52,118 C64,112 80,110 88,110 Z",
  },
  {
    // Abdomen — natural torso narrowing
    id: "abdomen",
    d: "M74,192 L126,192 L128,230 C128,244 118,256 100,258 C82,256 72,244 72,230 Z",
  },
  {
    // Pelvis — hip shape
    id: "pelvis",
    d: "M72,230 C72,244 82,256 100,258 C118,256 128,244 128,230 L134,262 C136,274 124,286 100,288 C76,286 64,274 66,262 Z",
  },
  {
    // Left arm — smooth arm shape
    id: "left_arm",
    d: "M46,118 C38,118 28,124 24,134 L14,186 C10,200 12,210 18,216 L26,224 C30,226 34,224 34,220 L34,210 L44,166 C50,150 52,138 46,118 Z",
  },
  {
    // Right arm — mirror
    id: "right_arm",
    d: "M154,118 C162,118 172,124 176,134 L186,186 C190,200 188,210 182,216 L174,224 C170,226 166,224 166,220 L166,210 L156,166 C150,150 148,138 154,118 Z",
  },
  {
    // Left leg
    id: "left_leg",
    d: "M66,262 C64,274 76,286 100,288 L96,320 L90,370 C88,390 82,410 78,430 L76,450 C74,458 68,462 62,460 L58,458 C52,456 50,448 52,442 L60,400 C62,386 58,370 54,350 L50,310 C50,300 54,288 66,262 Z",
  },
  {
    // Right leg — mirror
    id: "right_leg",
    d: "M134,262 C136,274 124,286 100,288 L104,320 L110,370 C112,390 118,410 122,430 L124,450 C126,458 132,462 138,460 L142,458 C148,456 150,448 148,442 L140,400 C138,386 142,370 146,350 L150,310 C150,300 146,288 134,262 Z",
  },
];

const REGION_CENTRES: Record<string, [number, number]> = {
  head: [100, 55],
  throat: [100, 100],
  chest: [100, 155],
  abdomen: [100, 225],
  pelvis: [100, 262],
  left_arm: [34, 170],
  right_arm: [166, 170],
  left_leg: [66, 370],
  right_leg: [134, 370],
};

// ── Color helpers ─────────────────────────────────────────────────────────────

// Pain level drives the color: 1-3 = mild yellow, 4-6 = orange, 7-10 = deep red
function painColor(level: number): string {
  if (level <= 3) return "#fbbf24"; // amber-400
  if (level <= 6) return "#f97316"; // orange-500
  return "#ef4444"; // red-500
}

function painOpacity(level: number): number {
  // Higher pain = more opaque: 0.55 at 1, 1.0 at 10
  return 0.5 + (level / 10) * 0.5;
}

const BASE_FILL = "#60a5fa"; // blue-400
const BASE_STROKE = "#93c5fd"; // blue-300
const HOVER_FILL = "#93c5fd"; // blue-300  (lighter on hover)
const HOVER_STROKE = "#bfdbfe"; // blue-200
function getRegionFill(
  selected: boolean,
  hovered: boolean,
  painLevel: number,
  conditionHighlight: boolean,
  conditionFocused: boolean,
  conditionPainLevel?: number,
): string {
  if (selected) return painColor(painLevel);
  if (conditionFocused) return painColor(conditionPainLevel ?? 7);
  if (conditionHighlight) return painColor(conditionPainLevel ?? 5);
  if (hovered) return HOVER_FILL;
  return BASE_FILL;
}

function getRegionStroke(selected: boolean, hovered: boolean): string {
  if (selected) return "#fecaca"; // red-200
  if (hovered) return HOVER_STROKE;
  return BASE_STROKE;
}

function getRegionOpacity(
  selected: boolean,
  painLevel: number,
  conditionDimmed: boolean,
  conditionPainLevel?: number,
): number {
  if (selected) return painOpacity(painLevel);
  if (typeof conditionPainLevel === "number")
    return painOpacity(conditionPainLevel);
  if (conditionDimmed) return 0.2;
  return 0.65;
}

// ── Pulsing pin ───────────────────────────────────────────────────────────────

function PinDot({
  x,
  y,
  severity,
}: {
  x: number;
  y: number;
  severity?: string;
}) {
  const color =
    severity === "high"
      ? "#ef4444"
      : severity === "low"
        ? "#10b981"
        : "#f97316";
  return (
    <g>
      <circle cx={x} cy={y} r={8} fill={color} opacity={0.2}>
        <animate
          attributeName="r"
          values="8;16;8"
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.2;0;0.2"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx={x} cy={y} r={5} fill={color} />
    </g>
  );
}

// Pain level legend
const PAIN_LABELS: Record<number, string> = {
  1: "Minimal",
  2: "Mild",
  3: "Mild",
  4: "Moderate",
  5: "Moderate",
  6: "Moderate",
  7: "Severe",
  8: "Severe",
  9: "Very Severe",
  10: "Worst",
};

// ── Main component ────────────────────────────────────────────────────────────

export default function BodyExplorer3D({
  onSelectionChange,
  className = "",
  compact = false,
  mode = "selection",
  activeCondition = null,
  activeConditionRegion = null,
  onConditionRegionSelect,
  selection,
  showSliders = true,
}: BodyExplorer3DProps) {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [intensityByRegion, setIntensityByRegion] = useState<
    Record<string, number>
  >({});
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const callbackRef = useRef(onSelectionChange);
  useEffect(() => {
    callbackRef.current = onSelectionChange;
  }, [onSelectionChange]);

  const isControlled = Boolean(selection);
  const conditionRegions = activeCondition?.regions ?? [];
  const conditionPins = activeCondition?.pins ?? [];
  const conditionPainLevels = activeCondition?.region_pain_levels ?? {};

  const effectiveSelectedRegions = useMemo(
    () =>
      isControlled ? (selection?.selectedRegions ?? []) : selectedRegions,
    [isControlled, selection?.selectedRegions, selectedRegions],
  );
  const effectiveIntensity = useMemo(
    () =>
      isControlled ? (selection?.intensityByRegion ?? {}) : intensityByRegion,
    [isControlled, selection?.intensityByRegion, intensityByRegion],
  );
  const selectedSymptoms = useMemo(() => {
    if (isControlled) {
      return (
        selection?.selectedSymptoms ??
        deriveSymptomsFromRegions(effectiveSelectedRegions)
      );
    }
    return deriveSymptomsFromRegions(selectedRegions);
  }, [
    isControlled,
    selection?.selectedSymptoms,
    effectiveSelectedRegions,
    selectedRegions,
  ]);

  useEffect(() => {
    if (mode !== "selection" || !callbackRef.current || isControlled) return;
    callbackRef.current({
      selectedRegions,
      selectedSymptoms,
      intensityByRegion,
    });
  }, [
    mode,
    selectedRegions,
    selectedSymptoms,
    intensityByRegion,
    isControlled,
  ]);

  const handleRegionClick = (id: string) => {
    if (mode === "condition") {
      if (conditionRegions.includes(id)) onConditionRegionSelect?.(id);
      return;
    }
    if (isControlled) {
      const prevRegions = effectiveSelectedRegions;
      const prevIntensity = effectiveIntensity;
      let nextRegions = prevRegions;
      let nextIntensity = prevIntensity;
      if (prevRegions.includes(id)) {
        nextRegions = prevRegions.filter((r) => r !== id);
        nextIntensity = { ...prevIntensity };
        delete (nextIntensity as Record<string, number>)[id];
      } else {
        nextRegions = [...prevRegions, id];
        nextIntensity = { ...prevIntensity, [id]: prevIntensity[id] ?? 5 };
      }
      callbackRef.current?.({
        selectedRegions: nextRegions,
        selectedSymptoms: deriveSymptomsFromRegions(nextRegions),
        intensityByRegion: nextIntensity,
      });
      return;
    }
    setSelectedRegions((prev) => {
      if (prev.includes(id)) {
        setIntensityByRegion((old) => {
          const next = { ...old };
          delete next[id];
          return next;
        });
        return prev.filter((r) => r !== id);
      }
      setIntensityByRegion((old) => ({ ...old, [id]: old[id] ?? 5 }));
      return [...prev, id];
    });
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* SVG body */}
      <div className="w-full relative select-none overflow-hidden">
        <svg
          ref={svgRef}
          viewBox="0 0 200 480"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto block"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Body regions */}
          {BODY_REGIONS.map((region) => {
            const isSelected =
              mode === "selection" &&
              effectiveSelectedRegions.includes(region.id);
            const isHovered = hoveredRegion === region.id;
            const isCondition =
              mode === "condition" && conditionRegions.includes(region.id);
            const isFocused =
              mode === "condition" && activeConditionRegion === region.id;
            const isDimmed = mode === "condition" && !isCondition;
            const isInteractive = mode === "selection" || isCondition;
            const pain = effectiveIntensity[region.id] ?? 5;
            const conditionPain = isCondition
              ? (conditionPainLevels[region.id] ?? 5)
              : undefined;

            return (
              <path
                key={region.id}
                d={region.d}
                fill={getRegionFill(
                  isSelected,
                  isHovered,
                  pain,
                  isCondition,
                  isFocused,
                  conditionPain,
                )}
                stroke={getRegionStroke(isSelected, isHovered)}
                strokeWidth={isSelected || isFocused ? 2.5 : 1.5}
                strokeLinejoin="round"
                opacity={getRegionOpacity(
                  isSelected,
                  pain,
                  isDimmed,
                  conditionPain,
                )}
                style={{
                  cursor: isInteractive ? "pointer" : "default",
                  transition:
                    "fill 0.2s ease, stroke 0.2s ease, opacity 0.2s ease, stroke-width 0.2s ease",
                }}
                onClick={() => handleRegionClick(region.id)}
                onMouseEnter={() => setHoveredRegion(region.id)}
                onMouseLeave={() => setHoveredRegion(null)}
              />
            );
          })}

          {/* Condition pins */}
          {mode === "condition" &&
            conditionPins.map((pin) => {
              const centre = REGION_CENTRES[pin.region_id];
              if (!centre) return null;
              return (
                <PinDot
                  key={pin.id}
                  x={centre[0]}
                  y={centre[1]}
                  severity={pin.severity}
                />
              );
            })}

          {/* High-severity condition pulse markers */}
          {mode === "condition" &&
            conditionRegions.map((id) => {
              const centre = REGION_CENTRES[id];
              if (!centre) return null;
              const pain = conditionPainLevels[id] ?? 5;
              if (pain < 7) return null;
              return (
                <circle
                  key={`cond-pulse-${id}`}
                  cx={centre[0]}
                  cy={centre[1]}
                  r={7}
                  fill={painColor(pain)}
                  opacity={0.24}
                >
                  <animate
                    attributeName="r"
                    values="7;13;7"
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.24;0.04;0.24"
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                </circle>
              );
            })}

          {/* Selected region pulsing markers */}
          {mode === "selection" &&
            effectiveSelectedRegions.map((id) => {
              const centre = REGION_CENTRES[id];
              if (!centre) return null;
              const pain = effectiveIntensity[id] ?? 5;
              return (
                <circle
                  key={`sel-${id}`}
                  cx={centre[0]}
                  cy={centre[1]}
                  r={4}
                  fill={painColor(pain)}
                >
                  <animate
                    attributeName="opacity"
                    values="1;0.3;1"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              );
            })}

          {/* Hover label */}
          {hoveredRegion &&
            (() => {
              const centre = REGION_CENTRES[hoveredRegion];
              if (!centre) return null;
              const label =
                REGION_LOOKUP[hoveredRegion]?.label || hoveredRegion;
              const textWidth = label.length * 6 + 16;
              const tx = Math.max(
                textWidth / 2,
                Math.min(200 - textWidth / 2, centre[0]),
              );
              const ty = centre[1] - 22;
              return (
                <g>
                  <rect
                    rx="4"
                    ry="4"
                    x={tx - textWidth / 2}
                    y={ty - 8}
                    width={textWidth}
                    height={18}
                    fill="hsl(var(--card))"
                    stroke="hsl(var(--border))"
                    strokeWidth="1"
                  />
                  <text
                    x={tx}
                    y={ty + 5}
                    textAnchor="middle"
                    fill="hsl(var(--foreground))"
                    fontSize="9"
                    fontWeight="600"
                    fontFamily="system-ui, sans-serif"
                  >
                    {label}
                  </text>
                </g>
              );
            })()}
        </svg>
      </div>

      {/* Hint */}
      {mode === "selection" &&
        effectiveSelectedRegions.length === 0 &&
        !compact && (
          <p className="text-center text-[11px] text-muted-foreground">
            Click a body region to select it
          </p>
        )}

      {/* Pain level sliders */}
      {mode === "selection" &&
        effectiveSelectedRegions.length > 0 &&
        showSliders &&
        !compact && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              Pain Level
            </p>
            {effectiveSelectedRegions.map((regionId) => {
              const pain = effectiveIntensity[regionId] ?? 5;
              return (
                <div
                  key={regionId}
                  className="flex items-center gap-2 rounded-md border border-border/50 bg-white/5 px-2.5 py-1.5"
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: painColor(pain) }}
                  />
                  <span className="text-xs font-medium text-foreground truncate min-w-0 flex-1">
                    {REGION_LOOKUP[regionId]?.label || regionId}
                  </span>
                  <Slider
                    value={[pain]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={(value) => {
                      const next = value?.[0] ?? 5;
                      if (isControlled) {
                        callbackRef.current?.({
                          selectedRegions: effectiveSelectedRegions,
                          selectedSymptoms: deriveSymptomsFromRegions(
                            effectiveSelectedRegions,
                          ),
                          intensityByRegion: {
                            ...effectiveIntensity,
                            [regionId]: next,
                          },
                        });
                        return;
                      }
                      setIntensityByRegion((old) => ({
                        ...old,
                        [regionId]: next,
                      }));
                    }}
                    className="w-20"
                  />
                  <span
                    className="text-[10px] font-bold shrink-0 w-[52px] text-right"
                    style={{ color: painColor(pain) }}
                  >
                    {pain}/10 {pain >= 7 ? "🔴" : pain >= 4 ? "🟠" : "🟡"}
                  </span>
                </div>
              );
            })}
            {/* Pain scale legend */}
            <div className="flex items-center justify-between pt-1 px-1">
              <span className="text-[9px] text-amber-400">1 — Minimal</span>
              <span className="text-[9px] text-orange-500">5 — Moderate</span>
              <span className="text-[9px] text-red-500">10 — Worst</span>
            </div>
          </div>
        )}
    </div>
  );
}
