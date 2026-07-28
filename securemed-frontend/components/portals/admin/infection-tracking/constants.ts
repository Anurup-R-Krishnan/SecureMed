/**
 * Colour palettes, sizing, and config for the infection tracking visualisation.
 */

export const NODE_COLORS: Record<string, string> = {
  Patient: "#3b82f6",
  Doctor: "#10b981",
  Room: "#f59e0b",
  Equipment: "#8b5cf6",
  Department: "#6b7280",
};

export const NODE_EMOJI: Record<string, string> = {
  Patient: "🧑",
  Doctor: "👨‍⚕️",
  Room: "🏥",
  Equipment: "⚙️",
  Department: "🏢",
};

export const REL_COLORS: Record<string, string> = {
  SAW: "#3b82f6b3",
  VISITED: "#f59e0bb3",
  WORKED_IN: "#10b981b3",
  USED_EQUIPMENT: "#8b5cf6b3",
  PART_OF: "#94a3b880",
  BELONGS_TO: "#94a3b880",
};

/** Node radius by type. */
export const NODE_RADIUS: Record<string, number> = {
  Patient: 16,
  Doctor: 16,
  Room: 12,
  Equipment: 12,
  Department: 20,
};

export const VECTOR_LABELS: Record<string, string> = {
  shared_room: "Shared Room",
  shared_doctor: "Shared Doctor",
  shared_equipment: "Shared Equipment",
  indirect: "Indirect Chain",
  unknown: "Unknown",
};
