'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import {
  AnatomySelectionPayload,
  deriveSymptomsFromRegions,
  REGION_LOOKUP,
} from '@/components/features/anatomy/region-map';
import { ConditionVisualization } from '@/services/anatomy-content';

// ── Types ────────────────────────────────────────────────────────────────────

type ExplorerMode = 'selection' | 'condition';

interface BodyExplorer3DProps {
  onSelectionChange?: (payload: AnatomySelectionPayload) => void;
  className?: string;
  compact?: boolean;
  mode?: ExplorerMode;
  activeCondition?: ConditionVisualization | null;
  activeConditionRegion?: string | null;
  onConditionRegionSelect?: (regionId: string) => void;
}

// ── SVG region definitions ────────────────────────────────────────────────────
// Coordinate space: viewBox="0 0 200 460"  centre-x = 100

const BODY_REGIONS: {
  id: string;
  d: string;    // SVG path
  labelX: number;
  labelY: number;
}[] = [
    {
      id: 'head',
      d: 'M100,14 C121,14 138,28 138,50 C138,72 121,82 100,82 C79,82 62,72 62,50 C62,28 79,14 100,14 Z',
      labelX: 148,
      labelY: 50,
    },
    {
      id: 'throat',
      d: 'M89,82 L111,82 L114,106 L86,106 Z',
      labelX: 148,
      labelY: 94,
    },
    {
      id: 'chest',
      d: 'M58,106 C58,106 74,100 86,106 L114,106 C126,100 142,106 142,106 L148,132 C148,154 140,176 128,186 L100,190 L72,186 C60,176 52,154 52,132 Z',
      labelX: 152,
      labelY: 148,
    },
    {
      id: 'abdomen',
      d: 'M72,186 L128,186 L130,240 C130,252 116,260 100,260 C84,260 70,252 70,240 Z',
      labelX: 152,
      labelY: 222,
    },
    {
      id: 'pelvis',
      d: 'M70,240 C70,252 84,260 100,260 C116,260 130,252 130,240 L136,278 C136,290 120,298 100,298 C80,298 64,290 64,278 Z',
      labelX: 152,
      labelY: 270,
    },
    {
      id: 'left_arm',
      d: 'M52,108 C40,108 28,118 24,134 L16,194 C14,207 22,218 34,218 L46,218 C52,218 56,212 55,206 L48,148 C62,140 60,120 52,108 Z',
      labelX: 2,
      labelY: 163,
    },
    {
      id: 'right_arm',
      d: 'M148,108 C160,108 172,118 176,134 L184,194 C186,207 178,218 166,218 L154,218 C148,218 144,212 145,206 L152,148 C138,140 140,120 148,108 Z',
      labelX: 188,
      labelY: 163,
    },
    {
      id: 'left_leg',
      d: 'M64,278 L100,298 L96,360 C96,372 90,384 82,390 L76,430 C74,442 66,450 58,448 L52,448 C44,448 40,440 42,432 L50,390 C42,380 36,366 36,352 Z',
      labelX: 10,
      labelY: 365,
    },
    {
      id: 'right_leg',
      d: 'M100,298 L136,278 L164,352 C164,366 158,380 150,390 L158,432 C160,440 156,448 148,448 L142,448 C134,450 126,442 124,430 L118,390 C110,384 104,372 104,360 Z',
      labelX: 172,
      labelY: 365,
    },
  ];

// Pin position on the canvas (centre of region approx.)
const REGION_CENTRES: Record<string, [number, number]> = {
  head: [100, 50],
  throat: [100, 94],
  chest: [100, 148],
  abdomen: [100, 222],
  pelvis: [100, 270],
  left_arm: [34, 163],
  right_arm: [166, 163],
  left_leg: [62, 370],
  right_leg: [138, 370],
};

// ── Colour palette ────────────────────────────────────────────────────────────

const REGION_BASE = '#1e3a5f';  // dark navy fill (resting)
const REGION_STROKE = '#2d5a9e';  // border
const REGION_HOVER_FILL = '#2563eb';  // blue hover
const REGION_SEL_FILL = '#ef4444';  // red selected
const REGION_COND_FILL = '#f97316';  // orange — condition highlight
const REGION_HOVER_STROKE = '#60a5fa';
const REGION_SEL_STROKE = '#fca5a5';

// ── Helper ────────────────────────────────────────────────────────────────────

function regionFill(
  id: string,
  selected: boolean,
  hovered: boolean,
  conditionHighlight: boolean,
  conditionFocused: boolean,
): string {
  if (selected) return REGION_SEL_FILL;
  if (conditionFocused) return REGION_COND_FILL;
  if (conditionHighlight) return '#c2410c';
  if (hovered) return REGION_HOVER_FILL;
  return REGION_BASE;
}

function regionStroke(selected: boolean, hovered: boolean): string {
  if (selected) return REGION_SEL_STROKE;
  if (hovered) return REGION_HOVER_STROKE;
  return REGION_STROKE;
}

// ── Pulsing pin dot ───────────────────────────────────────────────────────────

function PinDot({ x, y, severity }: { x: number; y: number; severity?: string }) {
  const color = severity === 'high' ? '#ef4444' : severity === 'low' ? '#10b981' : '#f97316';
  return (
    <g>
      <circle cx={x} cy={y} r={7} fill={color} opacity={0.25}>
        <animate attributeName="r" values="7;13;7" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.25;0;0.25" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={x} cy={y} r={5} fill={color} opacity={0.9} />
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BodyExplorer3D({
  onSelectionChange,
  className = '',
  compact = false,
  mode = 'selection',
  activeCondition = null,
  activeConditionRegion = null,
  onConditionRegionSelect,
}: BodyExplorer3DProps) {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [intensityByRegion, setIntensityByRegion] = useState<Record<string, number>>({});
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ id: string; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const callbackRef = useRef(onSelectionChange);
  useEffect(() => { callbackRef.current = onSelectionChange; }, [onSelectionChange]);

  const conditionRegions = activeCondition?.regions ?? [];
  const conditionPins = activeCondition?.pins ?? [];

  const selectedSymptoms = useMemo(
    () => deriveSymptomsFromRegions(selectedRegions),
    [selectedRegions]
  );

  useEffect(() => {
    if (mode !== 'selection' || !callbackRef.current) return;
    callbackRef.current({ selectedRegions, selectedSymptoms, intensityByRegion });
  }, [mode, selectedRegions, selectedSymptoms, intensityByRegion]);

  const handleRegionClick = (id: string) => {
    if (mode === 'condition') {
      if (conditionRegions.includes(id)) onConditionRegionSelect?.(id);
      return;
    }
    setSelectedRegions((prev) => {
      if (prev.includes(id)) {
        setIntensityByRegion((old) => { const next = { ...old }; delete next[id]; return next; });
        return prev.filter((r) => r !== id);
      }
      setIntensityByRegion((old) => ({ ...old, [id]: old[id] ?? 5 }));
      return [...prev, id];
    });
  };

  const handleRegionEnter = (id: string, evt: React.MouseEvent<SVGElement>) => {
    setHoveredRegion(id);
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cx = ((evt.clientX - rect.left) / rect.width) * 200;
    const cy = ((evt.clientY - rect.top) / rect.height) * 460;
    setTooltip({ id, x: cx, y: cy });
  };

  const handleRegionLeave = () => {
    setHoveredRegion(null);
    setTooltip(null);
  };

  const svgHeight = compact ? 320 : 460;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* SVG canvas */}
      <div
        className="w-full relative select-none"
        style={{ aspectRatio: `200 / ${svgHeight}` }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 200 ${svgHeight}`}
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          style={{ overflow: 'visible' }}
        >
          {/* Definitions */}
          <defs>
            <filter id="region-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="selected-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Subtle body shadow / background silhouette */}
          <ellipse cx="100" cy="460" rx="55" ry="8" fill="#0f172a" opacity="0.4" />

          {/* Body regions */}
          {BODY_REGIONS.map((region) => {
            const isSelected = mode === 'selection' && selectedRegions.includes(region.id);
            const isHovered = hoveredRegion === region.id;
            const isCondition = mode === 'condition' && conditionRegions.includes(region.id);
            const isFocused = mode === 'condition' && activeConditionRegion === region.id;
            const isInteractive = mode === 'selection' || isCondition;

            return (
              <path
                key={region.id}
                d={region.d}
                fill={regionFill(region.id, isSelected, isHovered, isCondition, isFocused)}
                stroke={regionStroke(isSelected, isHovered)}
                strokeWidth={isSelected || isFocused ? 2 : 1}
                opacity={mode === 'condition' && !isCondition ? 0.35 : 1}
                filter={isSelected || isFocused ? 'url(#selected-glow)' : isHovered ? 'url(#region-glow)' : undefined}
                style={{
                  cursor: isInteractive ? 'pointer' : 'default',
                  transition: 'fill 0.15s ease, stroke 0.15s ease, opacity 0.15s ease',
                }}
                onClick={() => handleRegionClick(region.id)}
                onMouseEnter={(e) => handleRegionEnter(region.id, e)}
                onMouseLeave={handleRegionLeave}
              />
            );
          })}

          {/* Condition pins */}
          {mode === 'condition' && conditionPins.map((pin) => {
            const centre = REGION_CENTRES[pin.region_id];
            if (!centre) return null;
            return (
              <PinDot key={pin.id} x={centre[0]} y={centre[1]} severity={pin.severity} />
            );
          })}

          {/* Selected region markers */}
          {mode === 'selection' && selectedRegions.map((id) => {
            const centre = REGION_CENTRES[id];
            if (!centre) return null;
            return (
              <circle key={`sel-${id}`} cx={centre[0]} cy={centre[1]} r={4} fill="#fca5a5" opacity={0.9}>
                <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.8s" repeatCount="indefinite" />
              </circle>
            );
          })}

          {/* Hover tooltip */}
          {tooltip && (
            <g transform={`translate(${Math.min(tooltip.x, 160)},${Math.max(tooltip.y - 30, 10)})`}>
              <rect rx="6" ry="6" x="0" y="0" width="76" height="22" fill="#1e293b" stroke="#334155" strokeWidth="1" />
              <text x="38" y="15" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="600" fontFamily="system-ui,sans-serif">
                {REGION_LOOKUP[tooltip.id]?.label || tooltip.id}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Click hint */}
      {mode === 'selection' && selectedRegions.length === 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Click a body region to select it
        </p>
      )}

      {/* Selected region intensity sliders */}
      {mode === 'selection' && selectedRegions.length > 0 && (
        <div className="space-y-2">
          {selectedRegions.map((regionId) => (
            <div
              key={regionId}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-white/5 px-3 py-2 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">
                  {REGION_LOOKUP[regionId]?.label || regionId}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground font-mono">
                  {intensityByRegion[regionId] ?? 5}/10
                </span>
                <Slider
                  value={[intensityByRegion[regionId] ?? 5]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(value) => {
                    const next = value?.[0] ?? 5;
                    setIntensityByRegion((old) => ({ ...old, [regionId]: next }));
                  }}
                  className="w-24"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
