'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  AnatomySelectionPayload,
  deriveSymptomsFromRegions,
  REGION_LOOKUP,
} from '@/components/features/anatomy/region-map';
import { ConditionVisualization } from '@/services/anatomy-content';

type RegionShape = 'sphere' | 'capsule' | 'torso' | 'pelvis';
type ExplorerMode = 'selection' | 'condition';

interface RegionMeshDef {
  id: string;
  shape: RegionShape;
  position: [number, number, number];
  scale: [number, number, number];
}

const REGION_MESHES: RegionMeshDef[] = [
  { id: 'head', shape: 'sphere', position: [0, 1.7, 0], scale: [0.45, 0.45, 0.45] },
  { id: 'throat', shape: 'capsule', position: [0, 1.25, 0], scale: [0.22, 0.3, 0.2] },
  { id: 'chest', shape: 'torso', position: [0, 0.65, 0], scale: [0.82, 1.05, 0.45] },
  { id: 'abdomen', shape: 'torso', position: [0, -0.15, 0], scale: [0.74, 0.8, 0.42] },
  { id: 'left_arm', shape: 'capsule', position: [-0.95, 0.45, 0], scale: [0.2, 0.95, 0.2] },
  { id: 'right_arm', shape: 'capsule', position: [0.95, 0.45, 0], scale: [0.2, 0.95, 0.2] },
  { id: 'pelvis', shape: 'pelvis', position: [0, -0.95, 0], scale: [0.7, 0.5, 0.4] },
  { id: 'left_leg', shape: 'capsule', position: [-0.33, -2.0, 0], scale: [0.24, 1.35, 0.24] },
  { id: 'right_leg', shape: 'capsule', position: [0.33, -2.0, 0], scale: [0.24, 1.35, 0.24] },
];

interface BodyExplorer3DProps {
  onSelectionChange?: (payload: AnatomySelectionPayload) => void;
  className?: string;
  compact?: boolean;
  mode?: ExplorerMode;
  activeCondition?: ConditionVisualization | null;
  activeConditionRegion?: string | null;
  onConditionRegionSelect?: (regionId: string) => void;
}

function supportsWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

function PinMesh({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={[position[0], position[1] + 0.35, position[2] + 0.3]}>
      <sphereGeometry args={[0.08, 20, 20]} />
      <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.35} />
    </mesh>
  );
}

function RegionMesh({
  def,
  isSelected,
  onToggle,
}: {
  def: RegionMeshDef;
  isSelected: boolean;
  onToggle: (regionId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = isSelected ? '#ef4444' : hovered ? '#f59e0b' : '#60a5fa';

  const materialProps = {
    color,
    metalness: 0.2,
    roughness: 0.45,
    transparent: true,
    opacity: 0.92,
  };

  if (def.shape === 'sphere') {
    return (
      <mesh
        position={def.position}
        scale={def.scale}
        onClick={() => onToggle(def.id)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    );
  }

  if (def.shape === 'capsule') {
    return (
      <group
        position={def.position}
        scale={def.scale}
        onClick={() => onToggle(def.id)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <mesh position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
        <mesh position={[0, -0.55, 0]}>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.8, 0.8, 1.1, 32]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      </group>
    );
  }

  if (def.shape === 'pelvis') {
    return (
      <mesh
        position={def.position}
        scale={def.scale}
        onClick={() => onToggle(def.id)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <octahedronGeometry args={[1, 1]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    );
  }

  return (
    <mesh
      position={def.position}
      scale={def.scale}
      onClick={() => onToggle(def.id)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  );
}

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
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 6, 5]} intensity={0.9} />
      <directionalLight position={[-4, -2, -3]} intensity={0.35} />

      {REGION_MESHES.map((def) => (
        <RegionMesh
          key={def.id}
          def={def}
          isSelected={selectedRegions.includes(def.id)}
          onToggle={onToggle}
        />
      ))}

      {REGION_MESHES.filter((mesh) => pinRegionIds.includes(mesh.id)).map((mesh) => (
        <PinMesh key={`pin-${mesh.id}`} position={mesh.position} />
      ))}

      <OrbitControls
        enablePan
        enableZoom
        maxDistance={8}
        minDistance={2}
        minPolarAngle={0.3}
        maxPolarAngle={2.8}
      />
    </>
  );
}

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
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [intensityByRegion, setIntensityByRegion] = useState<Record<string, number>>({});
  const selectionCallbackRef = useRef(onSelectionChange);

  useEffect(() => {
    selectionCallbackRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useEffect(() => {
    setWebglReady(supportsWebGL());
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
    if (mode !== 'selection' || !selectionCallbackRef.current) {
      return;
    }
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

  const resetSelection = () => {
    if (mode === 'condition') {
      return;
    }
    setSelectedRegions([]);
    setIntensityByRegion({});
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">3D Anatomy Explorer</h3>
          <p className="text-xs text-muted-foreground">
            {mode === 'condition'
              ? 'Condition visualization mode with region pin overlays.'
              : 'Rotate, zoom, and click regions to add symptom context.'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={resetSelection}
          disabled={mode === 'condition' || selectedRegions.length === 0}
        >
          Reset Selection
        </Button>
      </div>

      {webglReady ? (
        <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'lg:grid-cols-[1.25fr_1fr]'}`}>
          <div className={`${compact ? 'h-[240px]' : 'h-[420px]'} w-full rounded-xl border bg-slate-950/5`}>
            <Canvas camera={{ position: [0, 0.2, 4.4], fov: 44 }} dpr={[1, 1.5]}>
              <Suspense fallback={null}>
                <AnatomyScene
                  selectedRegions={effectiveSelectedRegions}
                  onToggle={toggleRegion}
                  pinRegionIds={activeCondition?.pins.map((pin) => pin.region_id) ?? []}
                />
              </Suspense>
            </Canvas>
          </div>

          <div className="space-y-3 rounded-xl border p-3">
            <p className="text-sm font-medium text-foreground">
              {mode === 'condition' ? 'Highlighted Regions' : 'Selected Regions'}
            </p>
            {effectiveSelectedRegions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No regions selected yet.</p>
            ) : (
              effectiveSelectedRegions.map((regionId) => (
                <div key={regionId} className="rounded-lg border p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{REGION_LOOKUP[regionId]?.label || regionId}</span>
                    {mode === 'selection' && (
                      <span className="text-xs text-muted-foreground">Intensity {intensityByRegion[regionId] ?? 5}/10</span>
                    )}
                  </div>
                  {mode === 'selection' && (
                    <Slider
                      value={[intensityByRegion[regionId] ?? 5]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(value) => {
                        const next = value?.[0] ?? 5;
                        setIntensityByRegion((old) => ({ ...old, [regionId]: next }));
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">
            3D rendering is unavailable in this browser. Use the symptom list to continue triage.
          </p>
        </div>
      )}
    </Card>
  );
}
