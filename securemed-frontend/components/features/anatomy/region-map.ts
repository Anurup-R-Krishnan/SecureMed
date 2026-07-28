export interface AnatomyRegionConfig {
  id: string;
  label: string;
  defaultSymptoms: string[];
}

export const ANATOMY_REGIONS: AnatomyRegionConfig[] = [
  {
    id: "head",
    label: "Head",
    defaultSymptoms: ["Headache", "Dizziness", "Blurred vision"],
  },
  {
    id: "throat",
    label: "Throat",
    defaultSymptoms: ["Sore throat", "Difficulty swallowing", "Hoarseness"],
  },
  {
    id: "chest",
    label: "Chest",
    defaultSymptoms: ["Chest pain", "Shortness of breath", "Palpitations"],
  },
  {
    id: "abdomen",
    label: "Abdomen",
    defaultSymptoms: ["Abdominal pain", "Nausea", "Bloating"],
  },
  {
    id: "left_arm",
    label: "Left Arm",
    defaultSymptoms: ["Numbness", "Weakness", "Joint pain"],
  },
  {
    id: "right_arm",
    label: "Right Arm",
    defaultSymptoms: ["Numbness", "Weakness", "Joint pain"],
  },
  {
    id: "pelvis",
    label: "Pelvis",
    defaultSymptoms: [
      "Pelvic pain",
      "Urinary discomfort",
      "Lower abdominal pressure",
    ],
  },
  {
    id: "left_leg",
    label: "Left Leg",
    defaultSymptoms: ["Leg pain", "Swelling", "Muscle cramps"],
  },
  {
    id: "right_leg",
    label: "Right Leg",
    defaultSymptoms: ["Leg pain", "Swelling", "Muscle cramps"],
  },
];

export const REGION_LOOKUP: Record<string, AnatomyRegionConfig> =
  ANATOMY_REGIONS.reduce(
    (acc, region) => {
      acc[region.id] = region;
      return acc;
    },
    {} as Record<string, AnatomyRegionConfig>,
  );

export function deriveSymptomsFromRegions(regionIds: string[]): string[] {
  const symptoms = new Set<string>();
  for (const regionId of regionIds) {
    const region = REGION_LOOKUP[regionId];
    if (!region) continue;
    for (const symptom of region.defaultSymptoms) {
      symptoms.add(symptom);
    }
  }
  return Array.from(symptoms);
}

export interface AnatomySelectionPayload {
  selectedRegions: string[];
  selectedSymptoms: string[];
  intensityByRegion: Record<string, number>;
}
