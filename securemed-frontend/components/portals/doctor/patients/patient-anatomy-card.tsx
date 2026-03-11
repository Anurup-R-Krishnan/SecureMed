'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { AlertTriangle, Stethoscope, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { REGION_LOOKUP } from '@/components/features/anatomy/region-map';
import {
  ConditionCatalogItem,
  ConditionVisualization,
  fetchConditionCatalog,
  fetchConditionVisualization,
} from '@/services/anatomy-content';

const BodyExplorer3D = dynamic(
  () => import('@/components/features/anatomy/body-explorer-3d'),
  { ssr: false }
);

export default function PatientAnatomyCard() {
  const [conditions, setConditions] = useState<ConditionCatalogItem[]>([]);
  const [activeConditionId, setActiveConditionId] = useState('');
  const [visualization, setVisualization] = useState<ConditionVisualization | null>(null);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchConditionCatalog('top20', 'doctor')
      .then(setConditions)
      .catch(() => setConditions([]));
  }, []);

  useEffect(() => {
    if (!activeConditionId) {
      setVisualization(null);
      setActiveRegion(null);
      return;
    }
    setLoading(true);
    fetchConditionVisualization(activeConditionId, 'doctor')
      .then((data) => {
        setVisualization(data);
        setActiveRegion(data.regions?.[0] || null);
      })
      .catch(() => {
        setVisualization(null);
        setActiveRegion(null);
      })
      .finally(() => setLoading(false));
  }, [activeConditionId]);

  const regionPain = visualization && activeRegion
    ? (visualization.region_pain_levels?.[activeRegion] ?? 5)
    : null;
  const interpretation = visualization && activeRegion
    ? (visualization.pain_interpretations?.[activeRegion] || []).find((rule) => {
      const min = Number(rule.min ?? 1);
      const max = Number(rule.max ?? 10);
      const pain = regionPain ?? 5;
      return pain >= min && pain <= max;
    }) || null
    : null;

  return (
    <Card className="p-5 rounded-2xl border border-border shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Condition Pain Map</p>
        </div>
        {activeConditionId && (
          <span className="text-[10px] text-muted-foreground">Doctor view</span>
        )}
      </div>

      <select
        value={activeConditionId}
        onChange={(e) => setActiveConditionId(e.target.value)}
        className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm"
      >
        <option value="">Select condition</option>
        {conditions.map((condition) => (
          <option key={condition.condition_id} value={condition.condition_id}>
            {condition.name}
          </option>
        ))}
      </select>

      {loading && <p className="text-xs text-muted-foreground">Loading visualization...</p>}

      {visualization ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-white/5 p-3">
            <BodyExplorer3D
              mode="condition"
              compact
              activeCondition={visualization}
              activeConditionRegion={activeRegion}
              onConditionRegionSelect={setActiveRegion}
            />
          </div>

          <div className="rounded-xl border border-border/60 bg-white/5 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Affected Regions</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {visualization.regions.map((region) => (
                <button
                  key={region}
                  onClick={() => setActiveRegion(region)}
                  className={`text-xs rounded-full px-2.5 py-1 border ${activeRegion === region
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white/5 border-border/50 text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {REGION_LOOKUP[region]?.label || region}
                  {typeof visualization.region_pain_levels?.[region] === 'number' && (
                    <span className="ml-1.5 text-[10px]">
                      {visualization.region_pain_levels[region]}/10
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {activeRegion && interpretation && (
            <div className={`rounded-lg border p-3 ${interpretation.urgency === 'emergency' ? 'border-red-500/40 bg-red-500/10' : 'border-border/60 bg-white/5'}`}>
              <p className="text-xs font-semibold text-foreground">
                {REGION_LOOKUP[activeRegion]?.label || activeRegion}: {regionPain}/10
              </p>
              <p className="text-xs text-muted-foreground mt-1">{interpretation.message}</p>
            </div>
          )}

          {visualization.pins?.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-white/5 p-3 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Condition Markers</p>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {visualization.pins.map((pin) => (
                  <div key={pin.id} className="rounded-lg border border-border/50 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{pin.label}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{pin.severity}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{pin.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {interpretation?.urgency === 'emergency' && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/15 p-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5" />
                <p className="text-[11px] text-red-200">
                  Escalate urgently. Pain profile suggests a high-risk clinical pattern.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 bg-white/5 p-6 text-center text-xs text-muted-foreground">
          Select a condition to view region pain map and guidance.
        </div>
      )}
    </Card>
  );
}
