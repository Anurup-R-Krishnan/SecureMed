'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
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

// ── Geometry helpers ─────────────────────────────────────────────────────────

function createLatheProfile(points: [number, number][], segments = 48): THREE.LatheGeometry {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, y]) => new THREE.Vector3(x, y, 0)),
    false,
    'catmullrom',
    0.5
  );
  const profile = curve.getPoints(64).map((p) => new THREE.Vector2(p.x, p.y));
  return new THREE.LatheGeometry(profile, segments);
}

function createLimbGeometry(
  radiusTop: number,
  radiusBottom: number,
  length: number,
  segments = 32
): THREE.LatheGeometry {
  const mid = length / 2;
  const bulge = Math.max(radiusTop, radiusBottom) * 1.08;
  const profile: [number, number][] = [
    [0, -length / 2],
    [radiusBottom * 0.85, -length / 2],
    [radiusBottom, -length / 2 + 0.04],
    [bulge, -mid * 0.3],
    [bulge * 1.02, 0],
    [bulge, mid * 0.3],
    [radiusTop, length / 2 - 0.04],
    [radiusTop * 0.85, length / 2],
    [0, length / 2],
  ];
  return createLatheProfile(profile, segments);
}

// ── Region mesh definitions ──────────────────────────────────────────────────

interface RegionDef {
  id: string;
  position: [number, number, number];
  labelOffset: [number, number, number];
}

const REGIONS: RegionDef[] = [
  { id: 'head', position: [0, 1.72, 0], labelOffset: [0.35, 0.25, 0] },
  { id: 'throat', position: [0, 1.32, 0], labelOffset: [0.2, 0, 0.15] },
  { id: 'chest', position: [0, 0.85, 0], labelOffset: [0.5, 0, 0] },
  { id: 'abdomen', position: [0, 0.15, 0], labelOffset: [0.45, 0, 0] },
  { id: 'pelvis', position: [0, -0.45, 0], labelOffset: [0.4, 0, 0] },
  { id: 'left_arm', position: [-0.72, 0.65, 0], labelOffset: [-0.3, 0, 0] },
  { id: 'right_arm', position: [0.72, 0.65, 0], labelOffset: [0.3, 0, 0] },
  { id: 'left_leg', position: [-0.22, -1.55, 0], labelOffset: [-0.28, 0, 0] },
  { id: 'right_leg', position: [0.22, -1.55, 0], labelOffset: [0.28, 0, 0] },
];

// ── Color palette ────────────────────────────────────────────────────────────

const COLORS = {
  base: new THREE.Color('#4a90d9'),
  hover: new THREE.Color('#38bdf8'),
  selected: new THREE.Color('#ef4444'),
  pin: new THREE.Color('#f97316'),
  glow: new THREE.Color('#60a5fa'),
};

// ── Animated region mesh ─────────────────────────────────────────────────────

function RegionPart({
  regionId,
  geometry,
  position,
  rotation,
  scale,
  isSelected,
  labelOffset,
  onToggle,
}: {
  regionId: string;
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  isSelected: boolean;
  labelOffset: [number, number, number];
  onToggle: (id: string) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const baseColor = isSelected ? COLORS.selected : hovered ? COLORS.hover : COLORS.base;
  const emissiveColor = isSelected ? COLORS.selected : hovered ? COLORS.glow : new THREE.Color('#000000');

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    if (isSelected) {
      mat.emissiveIntensity = 0.3 + Math.sin(clock.elapsedTime * 3) * 0.15;
    } else if (hovered) {
      mat.emissiveIntensity = 0.15;
    } else {
      mat.emissiveIntensity = 0.02;
    }
    const s = scale || [1, 1, 1];
    const factor = hovered ? 1.03 : 1;
    meshRef.current.scale.set(s[0] * factor, s[1] * factor, s[2] * factor);
  });

  const label = REGION_LOOKUP[regionId]?.label || regionId;

  return (
    <group position={position} rotation={rotation ? rotation.map((r) => (r * Math.PI) / 180) as [number, number, number] : undefined}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        scale={scale}
        onClick={(e) => { e.stopPropagation(); onToggle(regionId); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <meshPhysicalMaterial
          color={baseColor}
          emissive={emissiveColor}
          emissiveIntensity={0.02}
          metalness={0.1}
          roughness={0.35}
          clearcoat={0.4}
          clearcoatRoughness={0.2}
          transparent
          opacity={isSelected ? 0.95 : 0.82}
          envMapIntensity={0.6}
        />
      </mesh>

      {hovered && (
        <Html position={labelOffset} center distanceFactor={5} style={{ pointerEvents: 'none' }}>
          <div className="rounded-lg bg-card/95 backdrop-blur-sm px-3 py-1.5 shadow-xl border border-border">
            <span className="text-xs font-semibold text-foreground whitespace-nowrap">{label}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Pin overlay ──────────────────────────────────────────────────────────────

function PinOverlay({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current || !ringRef.current) return;
    groupRef.current.position.y = position[1] + 0.3 + Math.sin(clock.elapsedTime * 2) * 0.05;
    ringRef.current.rotation.z = clock.elapsedTime * 1.5;
    const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.15;
    ringRef.current.scale.set(s, s, 1);
  });

  return (
    <group ref={groupRef} position={[position[0], position[1] + 0.3, position[2] + 0.25]}>
      <mesh>
        <sphereGeometry args={[0.06, 24, 24]} />
        <meshStandardMaterial color={COLORS.pin} emissive={COLORS.pin} emissiveIntensity={0.6} />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.09, 0.12, 32]} />
        <meshStandardMaterial
          color={COLORS.pin}
          emissive={COLORS.pin}
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ── Anatomical body scene ────────────────────────────────────────────────────

function AnatomyBody({
  selectedRegions,
  onToggle,
  pinRegionIds,
}: {
  selectedRegions: string[];
  onToggle: (regionId: string) => void;
  pinRegionIds: string[];
}) {
  const geometries = useMemo(() => {
    const head = new THREE.SphereGeometry(1, 48, 48);
    head.scale(0.22, 0.26, 0.22);

    const neck = createLimbGeometry(0.1, 0.09, 0.18, 24);

    const torso = createLatheProfile([
      [0, -0.35], [0.28, -0.34], [0.30, -0.2], [0.28, -0.05],
      [0.32, 0.1], [0.36, 0.25], [0.34, 0.35], [0.18, 0.38], [0, 0.38],
    ], 48);

    const abdomen = createLatheProfile([
      [0, -0.25], [0.26, -0.24], [0.30, -0.1],
      [0.32, 0.05], [0.30, 0.18], [0.28, 0.25], [0, 0.26],
    ], 48);

    const pelvis = createLatheProfile([
      [0, -0.2], [0.18, -0.19], [0.22, -0.1], [0.30, 0],
      [0.33, 0.08], [0.30, 0.15], [0.14, 0.2], [0, 0.21],
    ], 48);

    const arm = createLimbGeometry(0.1, 0.07, 0.9, 24);
    const leg = createLimbGeometry(0.14, 0.08, 1.15, 24);

    return { head, neck, torso, abdomen, pelvis, arm, leg };
  }, []);

  const regionGeometryMap: Record<string, { geometry: THREE.BufferGeometry; rotation?: [number, number, number]; scale?: [number, number, number] }> = {
    head: { geometry: geometries.head },
    throat: { geometry: geometries.neck },
    chest: { geometry: geometries.torso },
    abdomen: { geometry: geometries.abdomen },
    pelvis: { geometry: geometries.pelvis },
    left_arm: { geometry: geometries.arm, rotation: [0, 0, 15] },
    right_arm: { geometry: geometries.arm, rotation: [0, 0, -15] },
    left_leg: { geometry: geometries.leg },
    right_leg: { geometry: geometries.leg },
  };

  return (
    <group position={[0, 0.3, 0]}>
      {REGIONS.map((region) => {
        const { geometry, rotation, scale } = regionGeometryMap[region.id] || {
          geometry: new THREE.SphereGeometry(0.15, 24, 24),
        };
        return (
          <RegionPart
            key={region.id}
            regionId={region.id}
            geometry={geometry}
            position={region.position}
            rotation={rotation}
            scale={scale}
            isSelected={selectedRegions.includes(region.id)}
            labelOffset={region.labelOffset}
            onToggle={onToggle}
          />
        );
      })}
      {REGIONS.filter((r) => pinRegionIds.includes(r.id)).map((r) => (
        <PinOverlay key={`pin-${r.id}`} position={r.position} />
      ))}
    </group>
  );
}

// ── Full 3D scene ────────────────────────────────────────────────────────────

function AnatomyScene({
  selectedRegions,
  onToggle,
  pinRegionIds,
}: {
  selectedRegions: string[];
  onToggle: (regionId: string) => void;
  pinRegionIds: string[];
}) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} color="#e0e8ff" />
      <directionalLight position={[-4, 3, -3]} intensity={0.4} color="#b0c4ff" />
      <pointLight position={[0, -2, 4]} intensity={0.6} color="#60a5fa" distance={8} />
      <spotLight position={[0, 6, 0]} angle={0.5} penumbra={0.8} intensity={0.5} color="#c084fc" />
      <Environment preset="city" environmentIntensity={0.3} />

      <AnatomyBody selectedRegions={selectedRegions} onToggle={onToggle} pinRegionIds={pinRegionIds} />

      <ContactShadows position={[0, -2.55, 0]} opacity={0.35} scale={6} blur={2.5} far={4} color="#1e3a5f" />
      <gridHelper args={[6, 24, '#1e3a5f', '#0f1a2e']} position={[0, -2.55, 0]} />

      <OrbitControls
        enablePan={false}
        enableZoom
        autoRotate
        autoRotateSpeed={0.4}
        maxDistance={7}
        minDistance={2.5}
        minPolarAngle={0.4}
        maxPolarAngle={2.6}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}

// ── WebGL check ──────────────────────────────────────────────────────────────

function supportsWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

// ── Loading spinner ──────────────────────────────────────────────────────────

function SceneLoader() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <span className="text-xs text-muted-foreground font-medium">Loading 3D Model</span>
      </div>
    </Html>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
// No Card wrapper — this component just renders the 3D canvas and region panel.
// The parent (anatomy-education-card or ai-triage-widget) controls the container.

export default function BodyExplorer3D({
  onSelectionChange,
  className = '',
  compact = false,
  mode = 'selection',
  activeCondition = null,
  activeConditionRegion = null,
  onConditionRegionSelect,
}: BodyExplorer3DProps) {
  const [webglReady, setWebglReady] = useState(false);
  const [render3DEnabled, setRender3DEnabled] = useState(true);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [intensityByRegion, setIntensityByRegion] = useState<Record<string, number>>({});
  const selectionCallbackRef = useRef(onSelectionChange);

  useEffect(() => { selectionCallbackRef.current = onSelectionChange; }, [onSelectionChange]);
  useEffect(() => { setWebglReady(supportsWebGL()); }, []);
  useEffect(() => {
    const handle = () => setRender3DEnabled(false);
    window.addEventListener('error', handle);
    return () => window.removeEventListener('error', handle);
  }, []);

  const conditionRegions = activeCondition?.regions ?? [];
  const effectiveSelectedRegions = mode === 'condition'
    ? (activeConditionRegion ? [activeConditionRegion] : conditionRegions)
    : selectedRegions;

  const selectedSymptoms = useMemo(
    () => deriveSymptomsFromRegions(selectedRegions),
    [selectedRegions]
  );

  useEffect(() => {
    if (mode !== 'selection' || !selectionCallbackRef.current) return;
    selectionCallbackRef.current({ selectedRegions, selectedSymptoms, intensityByRegion });
  }, [mode, selectedRegions, selectedSymptoms, intensityByRegion]);

  const toggleRegion = (regionId: string) => {
    if (mode === 'condition') {
      if (conditionRegions.includes(regionId)) {
        onConditionRegionSelect?.(regionId);
      }
      return;
    }
    setSelectedRegions((prev) => {
      if (prev.includes(regionId)) {
        setIntensityByRegion((old) => {
          const next = { ...old };
          delete next[regionId];
          return next;
        });
        return prev.filter((id) => id !== regionId);
      }
      setIntensityByRegion((old) => ({ ...old, [regionId]: old[regionId] ?? 5 }));
      return [...prev, regionId];
    });
  };

  const canvasHeight = compact ? 'h-[260px]' : 'h-[420px]';

  if (!webglReady || !render3DEnabled) {
    return (
      <div className={`rounded-xl border border-border/50 p-4 bg-muted/10 ${className}`}>
        <p className="text-sm text-muted-foreground">
          3D rendering is unavailable. Use region and symptom context to continue triage safely.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 3D Canvas */}
      <div className={`${canvasHeight} w-full rounded-xl overflow-hidden relative border border-white/10`}>
        <Canvas
          camera={{ position: [0, 0.5, 4.2], fov: 42 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          style={{ background: 'linear-gradient(180deg, #0c1222 0%, #0a0f1e 50%, #070b14 100%)' }}
        >
          <Suspense fallback={<SceneLoader />}>
            <AnatomyScene
              selectedRegions={effectiveSelectedRegions}
              onToggle={toggleRegion}
              pinRegionIds={activeCondition?.pins.map((pin) => pin.region_id) ?? []}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Selected regions list */}
      {mode === 'selection' && effectiveSelectedRegions.length > 0 && (
        <div className="space-y-2">
          {effectiveSelectedRegions.map((regionId) => (
            <div
              key={regionId}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-white/5 p-3 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.4)] shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{REGION_LOOKUP[regionId]?.label || regionId}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground font-mono">{intensityByRegion[regionId] ?? 5}/10</span>
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
